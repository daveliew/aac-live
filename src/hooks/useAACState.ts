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
const CONTEXT_CHANGE_THRESHOLD = 1;  // Immediate: 1 frame for fast response
const DEBOUNCE_INTERVAL_MS = 100;    // Aggressive: 100ms for near-instant updates

// Session location shift detection
const SHIFT_THRESHOLD = 3;  // 3 consecutive frames of new category to trigger shift

// Session location state
export interface SessionLocation {
    placeName: string | null;      // "McDonald's"
    areaName: string | null;       // "Mapletree Business City"
    context: ContextType | null;   // "restaurant_counter"
    lockedAt: Date | null;
}

// Helper to get category from context (e.g., "restaurant" from "restaurant_counter")
function getContextCategory(context: ContextType | null): string | null {
    if (!context) return null;
    return context.split('_')[0];
}

// Context state with history for debouncing
interface ContextState {
    current: ContextType | null;
    previous: ContextType | null;
    classification: ContextClassification | null;
    affirmation: AffirmationResult | null;
    confirmedAt: Date | null;
    transitionPending: boolean;
}

// Connection mode
export type ConnectionMode = 'live' | 'rest';

// Full app state
export interface AACState {
    isLoading: boolean;

    // Connection state
    connectionMode: ConnectionMode;
    liveSessionActive: boolean;

    context: ContextState;

    // Context locking
    contextLocked: boolean;
    lockedContext: ContextType | null;
    lockedAt: Date | null;

    // Background detection (while locked)
    backgroundContext: ContextType | null;
    backgroundConfidence: number;
    majorShiftDetected: boolean;

    // Place name from GPS (e.g., "McDonald's")
    placeName: string | null;

    // Session location (stable, locked for session)
    sessionLocation: SessionLocation | null;
    showLocationPicker: boolean;
    shiftCounter: number;
    pendingShiftContext: ContextType | null;

    // Entity detection (objects in view)
    detectedEntities: string[];
    focusedEntity: string | null;

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
    | { type: 'API_RESPONSE'; payload: APIResponse }
    | { type: 'LIVE_TILES'; payload: DisplayTile[] }
    | { type: 'AFFIRM_CONTEXT'; payload: ContextType }
    | { type: 'DEBOUNCE_CONTEXT'; payload: ContextType }
    | { type: 'APPLY_PENDING_CONTEXT' }
    | { type: 'DISMISS_AFFIRMATION' }
    | { type: 'CLEAR_NOTIFICATION' }
    | { type: 'SET_FALLBACK_TILES' }
    // Connection mode actions
    | { type: 'SET_CONNECTION_MODE'; payload: ConnectionMode }
    | { type: 'LIVE_SESSION_START' }
    | { type: 'LIVE_SESSION_END' }
    // Context locking actions
    | { type: 'LOCK_CONTEXT'; payload: ContextType }
    | { type: 'UNLOCK_CONTEXT' }
    | { type: 'BACKGROUND_UPDATE'; payload: { context: ContextType; confidence: number } }
    | { type: 'MAJOR_SHIFT_ALERT'; payload: ContextType }
    | { type: 'DISMISS_SHIFT_ALERT' }
    // Place name action
    | { type: 'SET_PLACE_NAME'; payload: string | null }
    // Entity detection actions
    | { type: 'SET_ENTITIES'; payload: string[] }
    | { type: 'FOCUS_ENTITY'; payload: string | null }
    // Session location actions
    | { type: 'SET_SESSION_LOCATION'; payload: { placeName: string | null; areaName: string | null; context: ContextType } }
    | { type: 'SHOW_LOCATION_PICKER' }
    | { type: 'HIDE_LOCATION_PICKER' }
    | { type: 'SELECT_LOCATION'; payload: ContextType }
    | { type: 'CHECK_SHIFT'; payload: { context: ContextType; confidence: number } }
    | { type: 'TRIGGER_SHIFT_REFETCH' }
    | { type: 'RESET_SHIFT_COUNTER' };

// Major shift threshold
const MAJOR_SHIFT_CONFIDENCE = 0.8;

// Initial state
const INITIAL_STATE: AACState = {
    isLoading: false,

    // Connection - start with rest (default), upgrade to live if key available
    connectionMode: 'rest',
    liveSessionActive: false,

    context: {
        current: null,
        previous: null,
        classification: null,
        affirmation: null,
        confirmedAt: null,
        transitionPending: false
    },

    // Context locking - starts unlocked
    contextLocked: false,
    lockedContext: null,
    lockedAt: null,

    // Background detection
    backgroundContext: null,
    backgroundConfidence: 0,
    majorShiftDetected: false,

    // Place name from GPS
    placeName: null,

    // Session location (stable for session)
    sessionLocation: null,
    showLocationPicker: false,
    shiftCounter: 0,
    pendingShiftContext: null,

    // Entity detection
    detectedEntities: [],
    focusedEntity: null,

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

        case 'API_RESPONSE': {
            const { classification, affirmation, tiles } = action.payload;

            // Convert GridTile[] to DisplayTile[] (excluding core tiles)
            const contextTiles = tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            // Special case: "unknown" = feelings mode (selfie detected)
            // Always show tiles immediately, no confirmation needed
            const isFeelingsMode = classification.primaryContext === 'unknown';

            // Determine if we need to show UI (not for feelings mode)
            const showUI = !isFeelingsMode && affirmation.showUI && !affirmation.affirmed;

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
                    current: isFeelingsMode ? 'unknown' as ContextType : affirmation.finalContext,
                    previous: state.context.current,
                    classification,
                    affirmation,
                    confirmedAt: (affirmation.affirmed || isFeelingsMode) ? new Date() : null,
                    transitionPending: !affirmation.affirmed && !isFeelingsMode
                },
                // Accept tiles if affirmed OR in feelings mode
                contextTiles: (affirmation.affirmed || isFeelingsMode) ? contextTiles : state.contextTiles,
                // Store detected entities from classification
                detectedEntities: classification.entitiesDetected || [],
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
            // If context is locked, don't update tiles
            if (state.contextLocked) {
                return state;
            }
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

        case 'SET_FALLBACK_TILES': {
            // Generate fallback tiles from 'unknown' context
            const grid = generateGrid({
                affirmedContext: 'unknown',
                gridSize: 9
            });

            const fallbackTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                isLoading: false,
                context: {
                    ...state.context,
                    current: 'unknown',
                    confirmedAt: new Date()
                },
                contextTiles: fallbackTiles,
                notification: {
                    type: 'context_changed',
                    message: 'Offline - using fallbacks',
                    timestamp: new Date()
                }
            };
        }

        // Connection mode actions (no notification - silent in hybrid mode)
        case 'SET_CONNECTION_MODE':
            return {
                ...state,
                connectionMode: action.payload
            };

        case 'LIVE_SESSION_START':
            return {
                ...state,
                liveSessionActive: true,
                connectionMode: 'live'
            };

        case 'LIVE_SESSION_END':
            return {
                ...state,
                liveSessionActive: false
            };

        // Context locking actions
        case 'LOCK_CONTEXT': {
            const contextToLock = action.payload;

            // Generate tiles for locked context
            const grid = generateGrid({
                affirmedContext: contextToLock,
                gridSize: 9
            });

            const lockedTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                contextLocked: true,
                lockedContext: contextToLock,
                lockedAt: new Date(),
                context: {
                    ...state.context,
                    current: contextToLock,
                    confirmedAt: new Date()
                },
                contextTiles: lockedTiles,
                showAffirmationUI: false,
                majorShiftDetected: false,
                notification: {
                    type: 'context_confirmed',
                    message: `Locked: ${formatContext(contextToLock)}`,
                    toContext: contextToLock,
                    timestamp: new Date()
                }
            };
        }

        case 'UNLOCK_CONTEXT':
            return {
                ...state,
                contextLocked: false,
                lockedContext: null,
                lockedAt: null,
                backgroundContext: null,
                backgroundConfidence: 0,
                majorShiftDetected: false,
                notification: {
                    type: 'context_changed',
                    message: 'Context unlocked - scanning...',
                    timestamp: new Date()
                }
            };

        case 'BACKGROUND_UPDATE': {
            const { context, confidence } = action.payload;

            // If not locked, ignore background updates
            if (!state.contextLocked) {
                return state;
            }

            // Check for major shift
            const isMajorShift = context !== state.lockedContext && confidence >= MAJOR_SHIFT_CONFIDENCE;

            return {
                ...state,
                backgroundContext: context,
                backgroundConfidence: confidence,
                majorShiftDetected: isMajorShift
            };
        }

        case 'MAJOR_SHIFT_ALERT':
            return {
                ...state,
                majorShiftDetected: true,
                backgroundContext: action.payload
            };

        case 'DISMISS_SHIFT_ALERT':
            return {
                ...state,
                majorShiftDetected: false
            };

        case 'SET_PLACE_NAME':
            return {
                ...state,
                placeName: action.payload
            };

        // Entity detection actions
        case 'SET_ENTITIES':
            return {
                ...state,
                detectedEntities: action.payload,
                // Clear focus if focused entity is no longer detected
                focusedEntity: action.payload.includes(state.focusedEntity || '')
                    ? state.focusedEntity
                    : null
            };

        case 'FOCUS_ENTITY': {
            const focusedEntity = action.payload;

            // If focusing on an entity, regenerate tiles with that entity boosted
            if (focusedEntity && state.context.current) {
                const grid = generateGrid({
                    affirmedContext: state.context.current,
                    gridSize: 9,
                    entities: [focusedEntity, ...state.detectedEntities.filter(e => e !== focusedEntity)]
                });

                const newContextTiles = grid.tiles
                    .filter(t => !t.alwaysShow)
                    .map(gridTileToDisplayTile);

                return {
                    ...state,
                    focusedEntity,
                    contextTiles: newContextTiles
                };
            }

            return {
                ...state,
                focusedEntity
            };
        }

        // Session location actions
        case 'SET_SESSION_LOCATION': {
            const { placeName, areaName, context } = action.payload;

            // Generate tiles for this context
            const grid = generateGrid({
                affirmedContext: context,
                gridSize: 9
            });

            const contextTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                sessionLocation: {
                    placeName,
                    areaName,
                    context,
                    lockedAt: new Date()
                },
                context: {
                    ...state.context,
                    current: context,
                    confirmedAt: new Date()
                },
                contextTiles,
                shiftCounter: 0,
                pendingShiftContext: null,
                showLocationPicker: false
            };
        }

        case 'SHOW_LOCATION_PICKER':
            return {
                ...state,
                showLocationPicker: true
            };

        case 'HIDE_LOCATION_PICKER':
            return {
                ...state,
                showLocationPicker: false
            };

        case 'SELECT_LOCATION': {
            const selectedContext = action.payload;

            // Generate tiles for selected context
            const grid = generateGrid({
                affirmedContext: selectedContext,
                gridSize: 9
            });

            const contextTiles = grid.tiles
                .filter(t => !t.alwaysShow)
                .map(gridTileToDisplayTile);

            return {
                ...state,
                sessionLocation: {
                    ...state.sessionLocation,
                    placeName: state.sessionLocation?.placeName || null,
                    areaName: state.sessionLocation?.areaName || null,
                    context: selectedContext,
                    lockedAt: new Date()
                },
                context: {
                    ...state.context,
                    current: selectedContext,
                    confirmedAt: new Date()
                },
                contextTiles,
                showLocationPicker: false,
                shiftCounter: 0,
                pendingShiftContext: null
            };
        }

        case 'CHECK_SHIFT': {
            const { context: incomingContext, confidence } = action.payload;

            // No session location yet - nothing to check
            if (!state.sessionLocation?.context) {
                return state;
            }

            // Check if this is a different category
            const currentCategory = getContextCategory(state.sessionLocation.context);
            const incomingCategory = getContextCategory(incomingContext);
            const isDifferentCategory = currentCategory !== incomingCategory;

            // If same category or low confidence, reset counter
            if (!isDifferentCategory || confidence < MAJOR_SHIFT_CONFIDENCE) {
                if (state.shiftCounter > 0) {
                    return {
                        ...state,
                        shiftCounter: 0,
                        pendingShiftContext: null
                    };
                }
                return state;
            }

            // Different category with high confidence - increment counter
            const newCount = state.shiftCounter + 1;

            // Threshold reached? Signal that we need to refetch
            if (newCount >= SHIFT_THRESHOLD) {
                return {
                    ...state,
                    shiftCounter: newCount,
                    pendingShiftContext: incomingContext,
                    majorShiftDetected: true  // Signal to trigger refetch
                };
            }

            return {
                ...state,
                shiftCounter: newCount,
                pendingShiftContext: incomingContext
            };
        }

        case 'TRIGGER_SHIFT_REFETCH':
            // Called after GPS/Places refetch - reset counter, keep pending context
            return {
                ...state,
                shiftCounter: 0,
                majorShiftDetected: false
            };

        case 'RESET_SHIFT_COUNTER':
            return {
                ...state,
                shiftCounter: 0,
                pendingShiftContext: null,
                majorShiftDetected: false
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
    // Deduplicate by ID to prevent React key warnings
    const seenIds = new Set<string>();
    const displayTiles = [...state.coreTiles, ...state.contextTiles].filter(tile => {
        if (seenIds.has(tile.id)) return false;
        seenIds.add(tile.id);
        return true;
    });

    return {
        state,
        dispatch,
        displayTiles,
        applyContextIfReady
    };
}
