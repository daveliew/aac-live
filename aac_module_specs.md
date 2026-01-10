# AAC System - Core Module Specifications

## Overview

Two modules are critical for the hackathon MVP:
1. **Context Affirmation Module** - Ensures we show the RIGHT grid for the situation
2. **Grid Generation Engine** - Composes the optimal tile arrangement

---

## Module 1: Context Affirmation

### Why This Matters
A child shown the wrong tiles loses trust in the system. False positives (wrong context) are worse than asking for confirmation. This module is the "guardrail" that prevents confusing the user.

### Input Contract
```typescript
interface ContextClassification {
  captureId: string;
  primaryContext: ContextType;
  secondaryContexts: ContextType[];
  confidenceScore: number;        // 0.0 - 1.0
  entitiesDetected: Entity[];
  situationInference: string;     // Natural language description
  rawGeminiResponse: string;
}

type ContextType = 
  | 'restaurant_counter' 
  | 'restaurant_table'
  | 'playground' 
  | 'classroom' 
  | 'home_kitchen'
  | 'home_living'
  | 'store_checkout'
  | 'medical_office'
  | 'unknown';
```

### Affirmation Logic
```typescript
function affirmContext(classification: ContextClassification): AffirmationResult {
  const { confidenceScore, primaryContext, secondaryContexts } = classification;
  
  // HIGH CONFIDENCE: Auto-proceed
  if (confidenceScore >= 0.85) {
    return {
      affirmed: true,
      method: 'auto',
      finalContext: primaryContext,
      showUI: false
    };
  }
  
  // MEDIUM CONFIDENCE: Quick confirm
  if (confidenceScore >= 0.6) {
    return {
      affirmed: false,
      method: 'quick_confirm',
      finalContext: null,
      showUI: true,
      uiOptions: {
        type: 'binary',
        prompt: `Are you at a ${formatContext(primaryContext)}?`,
        options: [
          { label: 'Yes', icon: '✓', context: primaryContext },
          { label: 'No', icon: '✗', context: null, action: 'show_alternatives' }
        ]
      }
    };
  }
  
  // LOW CONFIDENCE: Disambiguation
  if (confidenceScore >= 0.3) {
    const topContexts = [primaryContext, ...secondaryContexts].slice(0, 3);
    return {
      affirmed: false,
      method: 'disambiguation',
      finalContext: null,
      showUI: true,
      uiOptions: {
        type: 'multi_choice',
        prompt: 'Where are you?',
        options: topContexts.map(ctx => ({
          label: formatContext(ctx),
          icon: getContextIcon(ctx),
          context: ctx
        }))
      }
    };
  }
  
  // VERY LOW CONFIDENCE: Manual selection
  return {
    affirmed: false,
    method: 'manual',
    finalContext: null,
    showUI: true,
    uiOptions: {
      type: 'full_picker',
      prompt: 'Choose your situation',
      options: ALL_CONTEXTS
    }
  };
}
```

### Output Contract
```typescript
interface AffirmationResult {
  affirmed: boolean;
  method: 'auto' | 'quick_confirm' | 'disambiguation' | 'manual';
  finalContext: ContextType | null;
  showUI: boolean;
  uiOptions?: AffirmationUI;
}
```

---

## Module 2: Grid Generation Engine

### Why This Matters
The grid is the child's "voice." Wrong tiles = frustration. Right tiles in wrong order = slow communication. This module balances relevance, priority, and personalization.

### Input Contract
```typescript
interface GridRequest {
  affirmedContext: ContextType;
  clientProfile: ClientProfile;
  sessionHistory?: TileInteraction[];  // For recency weighting
  gridSize: 6 | 9 | 12;
  layoutPreference?: 'standard' | 'priority_top' | 'categorical';
}

interface ClientProfile {
  clientId: string;
  age: number;
  communicationLevel: 'emerging' | 'developing' | 'fluent';
  frequentTiles: string[];      // Tile IDs used often
  avoidedTiles: string[];       // Tiles marked as not useful
  customTiles: CustomTile[];
}
```

### Generation Logic
```typescript
function generateGrid(request: GridRequest): GridInstance {
  const { affirmedContext, clientProfile, gridSize } = request;
  
  // STEP 1: Gather candidate tiles
  const candidates: ScoredTile[] = [];
  
  // Core tiles always included (Help, Yes, No, More)
  const coreTiles = getTilesByType('core');
  coreTiles.forEach(tile => {
    candidates.push({ tile, score: 100, reason: 'core' });
  });
  
  // Context-matched tiles
  const contextTiles = getTilesByContext(affirmedContext);
  contextTiles.forEach(tile => {
    const baseScore = tile.displayPriority * 10;
    const frequencyBonus = clientProfile.frequentTiles.includes(tile.id) ? 20 : 0;
    candidates.push({ 
      tile, 
      score: baseScore + frequencyBonus, 
      reason: 'context_match' 
    });
  });
  
  // Custom tiles for this client
  clientProfile.customTiles
    .filter(ct => ct.contexts.includes(affirmedContext))
    .forEach(customTile => {
      candidates.push({ 
        tile: customTile, 
        score: 90,  // High priority for personalized
        reason: 'custom' 
      });
    });
  
  // STEP 2: Filter and rank
  const filtered = candidates
    .filter(c => !clientProfile.avoidedTiles.includes(c.tile.id))
    .sort((a, b) => b.score - a.score);
  
  // STEP 3: Select top N for grid
  const selected = filtered.slice(0, gridSize);
  
  // STEP 4: Arrange in layout
  const layout = arrangeInLayout(selected, gridSize, request.layoutPreference);
  
  return {
    gridId: generateId(),
    contextId: affirmedContext,
    tiles: layout,
    generatedAt: new Date(),
    gridSize
  };
}

function arrangeInLayout(
  tiles: ScoredTile[], 
  size: number, 
  preference: string
): GridTile[] {
  const cols = size === 6 ? 3 : size === 9 ? 3 : 4;
  const rows = size / cols;
  
  // Standard layout: Core tiles in corners, context in middle
  if (preference === 'standard') {
    return tiles.map((t, i) => ({
      tileId: t.tile.id,
      position: i,
      row: Math.floor(i / cols),
      col: i % cols,
      relevanceScore: t.score
    }));
  }
  
  // Priority top: Most relevant at top-left (reading order)
  // Already sorted by score, so just assign positions
  return tiles.map((t, i) => ({
    tileId: t.tile.id,
    position: i,
    row: Math.floor(i / cols),
    col: i % cols,
    relevanceScore: t.score
  }));
}
```

### Output Contract
```typescript
interface GridInstance {
  gridId: string;
  contextId: ContextType;
  tiles: GridTile[];
  generatedAt: Date;
  gridSize: number;
}

interface GridTile {
  tileId: string;
  position: number;
  row: number;
  col: number;
  relevanceScore: number;
}
```

---

## Tile Bank Schema

### Pre-built Context Tile Sets (MVP)

```typescript
const TILE_SETS: Record<ContextType, TileDefinition[]> = {
  restaurant_counter: [
    { id: 'rc_1', label: 'I want to order', tts: 'I would like to order please', priority: 10 },
    { id: 'rc_2', label: 'Menu please', tts: 'Can I see the menu please?', priority: 9 },
    { id: 'rc_3', label: 'How much?', tts: 'How much does that cost?', priority: 8 },
    { id: 'rc_4', label: 'Water please', tts: 'Can I have some water please?', priority: 7 },
    { id: 'rc_5', label: 'That one', tts: 'I would like that one please', priority: 8 },
    { id: 'rc_6', label: 'No thank you', tts: 'No thank you', priority: 6 },
    { id: 'rc_7', label: 'Pay now', tts: 'I would like to pay please', priority: 7 },
    { id: 'rc_8', label: 'Bathroom?', tts: 'Where is the bathroom?', priority: 5 },
  ],
  
  playground: [
    { id: 'pg_1', label: 'Can I play?', tts: 'Can I play with you?', priority: 10 },
    { id: 'pg_2', label: 'My turn', tts: 'It is my turn now', priority: 9 },
    { id: 'pg_3', label: 'Push me', tts: 'Can you push me please?', priority: 8 },
    { id: 'pg_4', label: 'Higher!', tts: 'Higher please!', priority: 7 },
    { id: 'pg_5', label: 'I need help', tts: 'I need help please', priority: 10 },
    { id: 'pg_6', label: 'Stop', tts: 'Stop please', priority: 9 },
    { id: 'pg_7', label: 'Again!', tts: 'Again! Let us do it again!', priority: 7 },
    { id: 'pg_8', label: 'I am tired', tts: 'I am tired', priority: 6 },
  ],
  
  // ... other contexts
};

const CORE_TILES: TileDefinition[] = [
  { id: 'core_yes', label: 'Yes', tts: 'Yes', priority: 100, alwaysShow: true },
  { id: 'core_no', label: 'No', tts: 'No', priority: 100, alwaysShow: true },
  { id: 'core_help', label: 'Help', tts: 'I need help', priority: 100, alwaysShow: true },
  { id: 'core_more', label: 'More options', tts: null, priority: 100, action: 'expand_grid' },
];
```

---

## Gemini Integration Points

### Context Classification Prompt
```typescript
const CLASSIFICATION_PROMPT = `
You are analyzing an image to help a child with communication needs.

Identify:
1. PRIMARY_CONTEXT: The main situation (restaurant, playground, classroom, etc.)
2. ENTITIES: Objects and people visible that might be relevant for communication
3. SITUATION: A brief description of what's happening

Respond in JSON:
{
  "primary_context": "restaurant_counter",
  "confidence": 0.87,
  "secondary_contexts": ["store_checkout"],
  "entities": ["cashier", "menu_board", "queue"],
  "situation": "Child appears to be at a fast food counter ready to order"
}

Be conservative with confidence. If unsure, use lower confidence so we can ask the child to confirm.
`;
```

### API Call
```typescript
async function classifyScene(imageBase64: string): Promise<ContextClassification> {
  const response = await gemini.generateContent({
    model: 'gemini-3-flash',
    contents: [
      { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
      { text: CLASSIFICATION_PROMPT }
    ],
    generationConfig: {
      thinking_level: 'low',      // Speed over deep reasoning
      media_resolution: 'medium', // Balance quality/latency
      response_mime_type: 'application/json'
    }
  });
  
  return JSON.parse(response.text);
}
```

---

## Hackathon MVP Scope

### Must Have (Demo-able)
- [ ] Camera capture → Gemini classification
- [ ] Affirmation UI (at least the high-confidence auto path)
- [ ] Grid display with 9 tiles
- [ ] TTS on tile tap
- [ ] One context fully built out (restaurant)

### Nice to Have
- [ ] Multiple contexts (playground, classroom)
- [ ] Disambiguation UI for medium confidence
- [ ] Client profile / preferences
- [ ] Interaction logging

### Stretch
- [ ] Agentic helper (Gemini Pro) for complex situations
- [ ] Real-time video context updates
- [ ] Caregiver dashboard
