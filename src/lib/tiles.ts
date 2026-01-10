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
    home_kitchen: [],
    home_living: [],
    store_checkout: [],
    medical_office: [],
    unknown: []
};

export interface GridRequest {
    affirmedContext: ContextType;
    gridSize: 6 | 9 | 12;
    layoutPreference?: 'standard' | 'priority_top';
}

/**
 * Generates an optimal grid based on affirmed context
 */
export function generateGrid(request: GridRequest): GridInstance {
    const { affirmedContext, gridSize } = request;

    const candidates: ScoredTile[] = [];

    // 1. Add Core Tiles
    CORE_TILES.forEach(tile => {
        candidates.push({ tile, score: 200, reason: 'core' });
    });

    // 2. Add Context Tiles
    const contextTiles = TILE_SETS[affirmedContext] || [];
    contextTiles.forEach(tile => {
        candidates.push({
            tile,
            score: tile.priority * 10,
            reason: 'context_match'
        });
    });

    // 3. Filter & Sort
    const sorted = candidates.sort((a, b) => b.score - a.score);

    // 4. Select top N
    const selected = sorted.slice(0, gridSize);

    // 5. Arrange
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
