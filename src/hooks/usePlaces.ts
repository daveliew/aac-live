/**
 * usePlaces Hook
 * Fetches nearby places from Google Places API based on GPS location
 * Used to show actual place names (e.g., "McDonald's") in context confirmation
 */

import { useState, useEffect, useCallback } from 'react';

export interface Place {
  name: string;
  types: string[];
  address?: string;
}

interface PlacesState {
  places: Place[];
  nearestPlace: Place | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: Date | null;
}

// Map Google Places types to our context types
const TYPE_TO_CONTEXT: Record<string, string> = {
  restaurant: 'restaurant_counter',
  fast_food_restaurant: 'restaurant_counter',
  cafe: 'restaurant_counter',
  food: 'restaurant_counter',
  playground: 'playground',
  park: 'playground',
  school: 'classroom',
  hospital: 'medical_office',
  doctor: 'medical_office',
  store: 'store_checkout',
  supermarket: 'store_checkout',
  grocery_store: 'store_checkout',
};

export function usePlaces(location: { lat: number; lng: number } | null) {
  const [state, setState] = useState<PlacesState>({
    places: [],
    nearestPlace: null,
    isLoading: false,
    error: null,
    lastFetchedAt: null,
  });

  const fetchPlaces = useCallback(async (lat: number, lng: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch places');
      }

      const data = await response.json();

      // Parse places from the response
      const places: Place[] = (data.places || []).map((p: { displayName?: { text?: string }; types?: string[]; formattedAddress?: string }) => ({
        name: p.displayName?.text || 'Unknown',
        types: p.types || [],
        address: p.formattedAddress,
      }));

      // Find the nearest relevant place (first one that maps to a context)
      const nearestPlace = places.find(p =>
        p.types.some(t => TYPE_TO_CONTEXT[t])
      ) || places[0] || null;

      setState({
        places,
        nearestPlace,
        isLoading: false,
        error: null,
        lastFetchedAt: new Date(),
      });
    } catch {
      // Silent fail - Places API is optional enhancement
      // App works fine without it, just shows generic context names
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Places unavailable',
        lastFetchedAt: new Date(), // Prevent retry spam
      }));
    }
  }, []);

  // Fetch places ONCE when location first becomes available
  // User is stationary during app usage, no need to refetch
  useEffect(() => {
    if (!location || state.lastFetchedAt) return; // Only fetch once
    fetchPlaces(location.lat, location.lng);
  }, [location, fetchPlaces, state.lastFetchedAt]);

  // Get the context type from nearest place
  const getContextFromPlace = useCallback((): string | null => {
    if (!state.nearestPlace) return null;

    for (const type of state.nearestPlace.types) {
      if (TYPE_TO_CONTEXT[type]) {
        return TYPE_TO_CONTEXT[type];
      }
    }
    return null;
  }, [state.nearestPlace]);

  return {
    ...state,
    refetch: location ? () => fetchPlaces(location.lat, location.lng) : undefined,
    getContextFromPlace,
  };
}
