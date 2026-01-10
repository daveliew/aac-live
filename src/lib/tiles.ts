/**
 * AAC Tile System Logic
 * Based on aac_module_specs.md
 */

export type ContextType =
    | 'restaurant_counter'
    | 'restaurant_table'
    | 'playground'
    | 'classroom'
    | 'home_kitchen'
    | 'home_living'
    | 'store_checkout'
    | 'medical_office'
    | 'bathroom'
    | 'greeting'
    | 'unknown';

export interface TileDefinition {
    id: string;
    label: string;
    tts: string | null;
    emoji: string;
    priority: number;
    alwaysShow?: boolean;
    action?: 'expand_grid' | 'navigate';
}

export interface ContextClassification {
    primaryContext: ContextType;
    secondaryContexts: ContextType[];
    confidenceScore: number;        // 0.0 - 1.0
    entitiesDetected: string[];
    situationInference: string;
}

export interface AffirmationResult {
    affirmed: boolean;
    method: 'auto' | 'quick_confirm' | 'disambiguation' | 'manual';
    finalContext: ContextType | null;
    showUI: boolean;
    uiOptions?: {
        type: 'binary' | 'multi_choice' | 'full_picker';
        prompt: string;
        options: { label: string; icon: string; context: ContextType | null; action?: string }[];
    };
}

export interface ScoredTile {
    tile: TileDefinition;
    score: number;
    reason: 'core' | 'context_match' | 'custom' | 'fallback';
}

export interface GridTile extends TileDefinition {
    position: number;
    row: number;
    col: number;
    relevanceScore: number;
}

/**
 * Unified tile type for UI display
 */
export interface DisplayTile {
    id: string;
    text: string;
    tts: string | null;
    emoji: string;
    isCore: boolean;
    isSuggested?: boolean;
    relevanceScore?: number;
}

/**
 * Notification for context changes
 */
export interface ContextNotification {
    type: 'context_changed' | 'context_confirmed' | 'awaiting_confirmation';
    message: string;
    fromContext?: ContextType;
    toContext?: ContextType;
    timestamp: Date;
}

export interface GridInstance {
    gridId: string;
    contextId: ContextType;
    tiles: GridTile[];
    generatedAt: Date;
    gridSize: number;
}

export const CORE_TILES: TileDefinition[] = [
    { id: 'core_yes', label: 'Yes', tts: 'Yes', emoji: '✅', priority: 100, alwaysShow: true },
    { id: 'core_no', label: 'No', tts: 'No', emoji: '❌', priority: 100, alwaysShow: true },
    { id: 'core_help', label: 'Help', tts: 'I need help', emoji: '🙋', priority: 100, alwaysShow: true },
    { id: 'core_more', label: 'More', tts: null, emoji: '➕', priority: 100, alwaysShow: true, action: 'expand_grid' },
];

export const TILE_SETS: Record<ContextType, TileDefinition[]> = {
    restaurant_counter: [
        { id: 'rc_1', label: 'I want to order', tts: 'I would like to order please', emoji: '🍔', priority: 10 },
        { id: 'rc_2', label: 'Menu please', tts: 'Can I see the menu please?', emoji: '📜', priority: 9 },
        { id: 'rc_3', label: 'How much?', tts: 'How much does that cost?', emoji: '💰', priority: 8 },
        { id: 'rc_4', label: 'Water please', tts: 'Can I have some water please?', emoji: '💧', priority: 7 },
        { id: 'rc_5', label: 'That one', tts: 'I would like that one please', emoji: '👉', priority: 8 },
        { id: 'rc_6', label: 'No thank you', tts: 'No thank you', emoji: '🚫', priority: 6 },
        { id: 'rc_7', label: 'Pay now', tts: 'I would like to pay please', emoji: '💳', priority: 7 },
        { id: 'rc_8', label: 'Bathroom?', tts: 'Where is the bathroom?', emoji: '🚻', priority: 5 },
    ],
    playground: [
        { id: 'pg_1', label: 'Can I play?', tts: 'Can I play with you?', emoji: '🤝', priority: 10 },
        { id: 'pg_2', label: 'My turn', tts: 'It is my turn now', emoji: '🏃', priority: 9 },
        { id: 'pg_3', label: 'Push me', tts: 'Can you push me please?', emoji: '🫷', priority: 8 },
        { id: 'pg_4', label: 'Higher!', tts: 'Higher please!', emoji: '⬆️', priority: 7 },
        { id: 'pg_5', label: 'I need help', tts: 'I need help please', emoji: '🙋', priority: 10 },
        { id: 'pg_6', label: 'Stop', tts: 'Stop please', emoji: '✋', priority: 9 },
        { id: 'pg_7', label: 'Again!', tts: 'Again! Let us do it again!', emoji: '🔄', priority: 7 },
        { id: 'pg_8', label: 'I am tired', tts: 'I am tired', emoji: '😴', priority: 6 },
    ],
    restaurant_table: [],
    classroom: [],
    home_kitchen: [
        { id: 'hk_1', label: 'Hungry', tts: 'I am hungry, can I have a snack?', emoji: '🥨', priority: 10 },
        { id: 'hk_2', label: 'Thirsty', tts: 'I am thirsty, can I have a drink?', emoji: '🥤', priority: 10 },
        { id: 'hk_3', label: 'Juice', tts: 'Can I have some juice please?', emoji: '🧃', priority: 9 },
        { id: 'hk_4', label: 'Milk', tts: 'Can I have some milk please?', emoji: '🥛', priority: 9 },
        { id: 'hk_5', label: 'Cookie', tts: 'Can I have a cookie please?', emoji: '🍪', priority: 8 },
        { id: 'hk_6', label: 'Fruit', tts: 'Can I have some fruit please?', emoji: '🍎', priority: 8 },
        { id: 'hk_7', label: 'Open this', tts: 'Can you help me open this please?', emoji: '👐', priority: 9 },
        { id: 'hk_8', label: 'All done', tts: 'I am all done now', emoji: '✅', priority: 7 },
    ],
    home_living: [],
    store_checkout: [],
    medical_office: [],
    // Bathroom - urgent needs
    bathroom: [
        { id: 'bt_1', label: 'I need to go', tts: 'I need to use the bathroom', emoji: '🚽', priority: 10 },
        { id: 'bt_2', label: 'Help please', tts: 'I need help please', emoji: '🙋', priority: 10 },
        { id: 'bt_3', label: 'Wash hands', tts: 'I want to wash my hands', emoji: '🧼', priority: 8 },
        { id: 'bt_4', label: 'All done', tts: 'I am all done', emoji: '✅', priority: 9 },
        { id: 'bt_5', label: 'Paper please', tts: 'I need toilet paper please', emoji: '🧻', priority: 8 },
        { id: 'bt_6', label: 'Privacy', tts: 'I need privacy please', emoji: '🚪', priority: 7 },
    ],
    // Greeting/Social - selfie mode, meeting people
    greeting: [
        { id: 'gr_1', label: 'Hello', tts: 'Hello! Nice to meet you!', emoji: '👋', priority: 10 },
        { id: 'gr_2', label: 'I am happy', tts: 'I am feeling happy', emoji: '😊', priority: 9 },
        { id: 'gr_3', label: 'I am sad', tts: 'I am feeling sad', emoji: '😢', priority: 9 },
        { id: 'gr_4', label: 'Thank you', tts: 'Thank you very much', emoji: '🙏', priority: 10 },
        { id: 'gr_5', label: 'Goodbye', tts: 'Goodbye! See you later!', emoji: '👋', priority: 8 },
        { id: 'gr_6', label: 'My name is', tts: 'My name is', emoji: '📛', priority: 7 },
    ],
    // Feelings mode - activated when selfie/face detected or context unknown
    // "How are you feeling?" tiles for self-expression
    unknown: [
        { id: 'feel_1', label: 'Happy', tts: 'I am feeling happy', emoji: '😊', priority: 10 },
        { id: 'feel_2', label: 'Sad', tts: 'I am feeling sad', emoji: '😢', priority: 10 },
        { id: 'feel_3', label: 'Tired', tts: 'I am feeling tired', emoji: '😴', priority: 9 },
        { id: 'feel_4', label: 'Hungry', tts: 'I am hungry', emoji: '🍽️', priority: 9 },
        { id: 'feel_5', label: 'Hurt', tts: 'Something hurts', emoji: '🤕', priority: 10 },
    ]
};

/**
 * Entity-to-Tile mapping for dynamic tile boosting
 * When an entity is detected, tiles with matching IDs get score boost
 */
export const ENTITY_TILE_MAP: Record<string, string[]> = {
    // Playground entities
    'swing': ['pg_3', 'pg_4', 'pg_2'],           // Push me, Higher, My turn
    'swings': ['pg_3', 'pg_4', 'pg_2'],
    'slide': ['pg_2', 'pg_7'],                   // My turn, Again
    'other_children': ['pg_1', 'pg_2'],          // Can I play?, My turn
    'children': ['pg_1', 'pg_2'],
    'kid': ['pg_1', 'pg_2'],
    'kids': ['pg_1', 'pg_2'],
    'sandbox': ['pg_1', 'pg_2'],
    'climbing_frame': ['pg_5', 'pg_6'],          // I need help, Stop

    // Restaurant entities
    'cashier': ['rc_3', 'rc_7'],                 // How much?, Pay now
    'counter': ['rc_1', 'rc_2'],                 // Order, Menu please
    'menu_board': ['rc_1', 'rc_2'],
    'menu': ['rc_2'],
    'food': ['rc_5', 'rc_1'],                    // That one, Order
    'drink': ['rc_4', 'rc_5'],                   // Water, That one
    'ice_cream': ['rc_5', 'rc_3'],               // That one, How much?

    // Generic/Cross-context
    'water_fountain': ['rc_4'],                  // Water please
    'bathroom_sign': ['rc_8'],                   // Bathroom?

    // Bathroom entities
    'toilet': ['bt_1', 'bt_4'],                  // I need to go, All done
    'restroom': ['bt_1', 'bt_4'],
    'sink': ['bt_3'],                            // Wash hands
    'faucet': ['bt_3'],
    'soap': ['bt_3'],                            // Wash hands
    'soap_dispenser': ['bt_3'],
    'toilet_paper': ['bt_5'],                    // Paper please
    'paper_towel': ['bt_3'],                     // Wash hands
    'mirror': ['bt_4'],                          // All done (checking appearance)
    'towel': ['bt_3', 'bt_4'],                   // Wash hands, All done
    // Greeting/Social entities
    'face': ['gr_1', 'gr_2'],                    // Hello, I am happy
    'person': ['gr_1', 'gr_4'],                  // Hello, Thank you
    'adult': ['gr_1', 'core_help', 'pg_5'],      // Hello, Help tiles
    'parent': ['gr_1', 'gr_4', 'core_help'],     // Hello, Thank you
    'teacher': ['gr_1', 'gr_4', 'core_help'],    // Hello, Thank you
    'friend': ['gr_1', 'gr_2'],                  // Hello, I am happy
    'family': ['gr_1', 'gr_2', 'gr_4'],          // Hello, Happy, Thank you
    // Kitchen/Pantry entities
    'refrigerator': ['hk_2', 'hk_3', 'hk_4'],    // Thirsty, Juice, Milk
    'fridge': ['hk_2', 'hk_3', 'hk_4'],
    'pantry': ['hk_1', 'hk_5', 'hk_6'],          // Hungry, Cookie, Fruit
    'cabinet': ['hk_1', 'hk_5', 'hk_7'],         // Hungry, Cookie, Open this
    'shelf': ['hk_1', 'hk_5'],
    'bottle': ['hk_2', 'hk_3', 'hk_7'],          // Thirsty, Juice, Open this
    'cup': ['hk_2', 'hk_4'],                     // Thirsty, Milk
    'glass': ['hk_2', 'hk_4'],
    'juice_box': ['hk_3', 'hk_7'],               // Juice, Open this
    'snack_bag': ['hk_1', 'hk_5', 'hk_7'],       // Hungry, Cookie, Open this
};

export interface GridRequest {
    affirmedContext: ContextType;
    gridSize: 6 | 9 | 12;
    layoutPreference?: 'standard' | 'priority_top';
    entities?: string[];           // Detected entities for dynamic boosting
    situationInference?: string;   // For ad-hoc tile generation
}

/**
 * Generates an optimal grid based on affirmed context and detected entities
 * Entity boosting: +50 score when tile matches detected entity
 * Ad-hoc tiles: Generated for unmapped entities with observation format
 */
export function generateGrid(request: GridRequest): GridInstance {
    const { affirmedContext, gridSize, entities = [] } = request;

    const candidates: ScoredTile[] = [];
    const normalizedEntities = entities.map(e => e.toLowerCase().replace(/\s+/g, '_'));

    // 1. Add Core Tiles (highest priority, always shown)
    CORE_TILES.forEach(tile => {
        candidates.push({ tile, score: 200, reason: 'core' });
    });

    // 2. Add Context Tiles with entity boosting
    const contextTiles = TILE_SETS[affirmedContext] || [];
    contextTiles.forEach(tile => {
        let score = tile.priority * 10;

        // Boost score if tile matches any detected entity
        for (const entity of normalizedEntities) {
            const boostedIds = ENTITY_TILE_MAP[entity] || [];
            if (boostedIds.includes(tile.id)) {
                score += 50;  // Entity match bonus
                break;
            }
        }

        candidates.push({
            tile,
            score,
            reason: 'context_match'
        });
    });

    // 3. Generate ad-hoc tiles for unmapped entities
    const seenAdhoc = new Set<string>();
    for (const entity of normalizedEntities) {
        // Skip if entity has a tile mapping already
        if (ENTITY_TILE_MAP[entity]) continue;
        // Skip duplicates
        if (seenAdhoc.has(entity)) continue;
        seenAdhoc.add(entity);

        // Create observation tile for novel entity
        const displayName = entity.replace(/_/g, ' ');
        candidates.push({
            tile: {
                id: `adhoc_${entity}`,
                label: `Look, ${displayName}!`,
                tts: `Look! I see a ${displayName}!`,
                emoji: '👀',
                priority: 8
            },
            score: 80,  // Above low-priority context tiles, below high-priority
            reason: 'custom'
        });
    }

    // 4. Sort by score (descending)
    const sorted = candidates.sort((a, b) => b.score - a.score);

    // 5. Select top N tiles
    const selected = sorted.slice(0, gridSize);

    // 6. Arrange in grid layout
    const cols = gridSize <= 6 ? 3 : gridSize <= 9 ? 3 : 4;
    const layout: GridTile[] = selected.map((s, i) => ({
        ...s.tile,
        position: i,
        row: Math.floor(i / cols),
        col: i % cols,
        relevanceScore: s.score
    }));

    return {
        gridId: Math.random().toString(36).substring(7),
        contextId: affirmedContext,
        tiles: layout,
        generatedAt: new Date(),
        gridSize
    };
}

/**
 * Implements the affirmation logic from aac_module_specs.md
 */
export function affirmContext(classification: ContextClassification): AffirmationResult {
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
                    label: formatContext(ctx as ContextType),
                    icon: '📍', // Default icon for now
                    context: ctx as ContextType
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
            options: [
                { label: 'Restaurant', icon: '🍴', context: 'restaurant_counter' },
                { label: 'Playground', icon: '🛝', context: 'playground' },
            ]
        }
    };
}

export function formatContext(context: ContextType): string {
    return context.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Convert TileDefinition to DisplayTile
 */
export function toDisplayTile(tile: TileDefinition, isCore: boolean = false): DisplayTile {
    return {
        id: tile.id,
        text: tile.label,
        tts: tile.tts,
        emoji: tile.emoji,
        isCore,
        relevanceScore: tile.priority
    };
}

/**
 * Convert GridTile to DisplayTile
 */
export function gridTileToDisplayTile(tile: GridTile): DisplayTile {
    return {
        id: tile.id,
        text: tile.label,
        tts: tile.tts,
        emoji: tile.emoji,
        isCore: tile.alwaysShow ?? false,
        relevanceScore: tile.relevanceScore
    };
}

/**
 * Get core tiles as DisplayTiles
 */
export function getCoreTiles(): DisplayTile[] {
    return CORE_TILES.map(t => toDisplayTile(t, true));
}
