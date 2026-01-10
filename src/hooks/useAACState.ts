/**
 * AAC State Management Hook
 * Manages context tracking, tile stability, and affirmation flow
 */

import { useReducer, useCallback, useRef } from 'react';
import {
    ContextType,
    ContextClassification,
    AffirmationResult,
    DisplayTile,
    ContextNotification,
    GridTile,
    getCoreTiles,
    gridTileToDisplayTile,
    generateGrid,
    formatContext
} from '@/lib/tiles';

// Debounce settings
const CONTEXT_CHANGE_THRESHOLD = 3;  // Need 3 frames agreeing before transition
const DEBOUNCE_INTERVAL_MS = 500;    // Minimum time between context changes

// Context state with history for debouncing
interface ContextState {
    current: ContextType | null;
    previous: ContextType | null;
    classification: ContextClassification | null;
    affirmation: AffirmationResult | null;
    confirmedAt: Date | null;
    transitionPending: boolean;
}

// Full app state
export interface AACState {
    mode: 'snapshot' | 'live';
    isLoading: boolean;

    context: ContextState;

    coreTiles: DisplayTile[];
    contextTiles: DisplayTile[];

    showAffirmationUI: boolean;
    notification: ContextNotification | null;

    pendingContext: ContextType | null;
    contextDebounceCount: number;
}

// API response shape
export interface APIResponse {
    classification: ContextClassification;
    affirmation: AffirmationResult;
    tiles: GridTile[];
}

// Actions
export type AACAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_MODE'; payload: 'snapshot' | 'live' }
    | { type: 'API_RESPONSE'; payload: APIResponse }
    | { type: 'LIVE_TILES'; payload: DisplayTile[] }
    | { type: 'AFFIRM_CONTEXT'; payload: ContextType }
    | { type: 'DEBOUNCE_CONTEXT'; payload: ContextType }
    | { type: 'APPLY_PENDING_CONTEXT' }
    | { type: 'DISMISS_AFFIRMATION' }
    | { type: 'CLEAR_NOTIFICATION' }
    | { type: 'SET_FALLBACK_TILES' };

// Initial state
const INITIAL_STATE: AACState = {
    mode: 'snapshot',
    isLoading: false,

    context: {
        current: null,
        previous: null,
        classification: null,
        affirmation: null,
        confirmedAt: null,
        transitionPending: false
    },

    coreTiles: getCoreTiles(),
    contextTiles: [],

    showAffirmationUI: false,
    notification: null,

    pendingContext: null,
    contextDebounceCount: 0
};

function aacReducer(state: AACState, action: AACAction): AACState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_MODE':
            return {
                ...state,
                mode: action.payload,
                pendingContext: null,
                contextDebounceCount: 0
            };

        case 'API_RESPONSE': {
            const { classification, affirmation, tiles } = action.payload;

            // Convert GridTile[] to DisplayTile[] (excluding core tiles)
            const contextTiles = tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            // Determine if we need to show UI
            const showUI = affirmation.showUI && !affirmation.affirmed;

            // Context changed notification
            const contextChanged = state.context.current !== null &&
                state.context.current !== affirmation.finalContext;

            let notification: ContextNotification | null = null;

            if (contextChanged && affirmation.affirmed && affirmation.finalContext) {
                notification = {
                    type: 'context_changed',
                    message: `Now at ${formatContext(affirmation.finalContext)}`,
                    fromContext: state.context.current!,
                    toContext: affirmation.finalContext,
                    timestamp: new Date()
                };
            } else if (showUI) {
                notification = {
                    type: 'awaiting_confirmation',
                    message: affirmation.uiOptions?.prompt || 'Confirm your location',
                    timestamp: new Date()
                };
            }

            return {
                ...state,
                isLoading: false,
                context: {
                    current: affirmation.finalContext,
                    previous: state.context.current,
                    classification,
                    affirmation,
                    confirmedAt: affirmation.affirmed ? new Date() : null,
                    transitionPending: !affirmation.affirmed
                },
                contextTiles: affirmation.affirmed ? contextTiles : state.contextTiles,
                showAffirmationUI: showUI,
                notification
            };
        }

        case 'AFFIRM_CONTEXT': {
            const confirmedContext = action.payload;

            // Generate new tiles for this context
            const grid = generateGrid({
                affirmedContext: confirmedContext,
                gridSize: 9
            });

            const contextTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                context: {
                    ...state.context,
                    current: confirmedContext,
                    previous: state.context.current,
                    confirmedAt: new Date(),
                    transitionPending: false
                },
                contextTiles,
                showAffirmationUI: false,
                notification: {
                    type: 'context_confirmed',
                    message: `Confirmed: ${formatContext(confirmedContext)}`,
                    toContext: confirmedContext,
                    timestamp: new Date()
                }
            };
        }

        case 'DEBOUNCE_CONTEXT': {
            const incomingContext = action.payload;

            // Same as pending? Increment count
            if (incomingContext === state.pendingContext) {
                const newCount = state.contextDebounceCount + 1;

                // Threshold reached? Mark for transition
                if (newCount >= CONTEXT_CHANGE_THRESHOLD) {
                    return {
                        ...state,
                        context: {
                            ...state.context,
                            transitionPending: true
                        },
                        contextDebounceCount: newCount
                    };
                }

                return { ...state, contextDebounceCount: newCount };
            }

            // Different context - reset counter
            return {
                ...state,
                pendingContext: incomingContext,
                contextDebounceCount: 1
            };
        }

        case 'APPLY_PENDING_CONTEXT': {
            if (!state.pendingContext || !state.context.transitionPending) {
                return state;
            }

            // Generate tiles for new context
            const grid = generateGrid({
                affirmedContext: state.pendingContext,
                gridSize: 9
            });

            const contextTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                context: {
                    current: state.pendingContext,
                    previous: state.context.current,
                    classification: state.context.classification,
                    affirmation: state.context.affirmation,
                    confirmedAt: new Date(),
                    transitionPending: false
                },
                contextTiles,
                pendingContext: null,
                contextDebounceCount: 0,
                notification: {
                    type: 'context_changed',
                    message: `Context updated: ${formatContext(state.pendingContext)}`,
                    fromContext: state.context.current ?? undefined,
                    toContext: state.pendingContext,
                    timestamp: new Date()
                }
            };
        }

        case 'LIVE_TILES': {
            // In live mode, update context tiles
            return {
                ...state,
                contextTiles: action.payload.filter(t => !t.isCore)
            };
        }

        case 'DISMISS_AFFIRMATION':
            return { ...state, showAffirmationUI: false };

        case 'CLEAR_NOTIFICATION':
            return { ...state, notification: null };

        case 'SET_FALLBACK_TILES':
            return {
                ...state,
                isLoading: false,
                notification: {
                    type: 'context_changed',
                    message: 'Offline - using fallbacks',
                    timestamp: new Date()
                }
            };

        default:
            return state;
    }
}

export function useAACState() {
    const [state, dispatch] = useReducer(aacReducer, INITIAL_STATE);
    const lastContextChangeRef = useRef<number>(0);

    // Debounced context application for live mode
    const applyContextIfReady = useCallback(() => {
        const now = Date.now();
        if (now - lastContextChangeRef.current >= DEBOUNCE_INTERVAL_MS) {
            dispatch({ type: 'APPLY_PENDING_CONTEXT' });
            lastContextChangeRef.current = now;
        }
    }, []);

    // Combined tiles for display (core in top row + context below)
    const displayTiles = [...state.coreTiles, ...state.contextTiles];

    return {
        state,
        dispatch,
        displayTiles,
        applyContextIfReady
    };
}
