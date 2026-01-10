import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    // Use dedicated Google Places API key
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'GOOGLE_PLACES_API_KEY not configured',
        hint: 'Get a key from console.cloud.google.com with Places API enabled'
      }, { status: 503 });
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.types,places.formattedAddress'
      },
      body: JSON.stringify({
        includedTypes: ['restaurant', 'playground', 'school', 'hospital', 'store'],
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 100
          }
        },
        maxResultCount: 3
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Places API error:', data);
      return NextResponse.json({ error: data.error?.message || 'Places API failed', details: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Places route error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Test endpoint - GET with hardcoded Singapore location
export async function GET() {
  const testLat = 1.2966;
  const testLng = 103.7764;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'GOOGLE_PLACES_API_KEY not set', keyPreview: 'not set' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.types'
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        locationRestriction: {
          circle: {
            center: { latitude: testLat, longitude: testLng },
            radius: 500
          }
        },
        maxResultCount: 3
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    return NextResponse.json({
      status: response.status,
      keyWorks: response.ok,
      keyPreview: apiKey.substring(0, 8) + '...',
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: message,
      keyPreview: apiKey.substring(0, 8) + '...',
      hint: message.includes('aborted') ? 'Request timed out - API may be rejecting the key' : null
    });
  }
}
