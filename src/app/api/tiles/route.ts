import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { generateGrid, ContextType } from '@/lib/tiles';

// Disable Next.js data cache - real-time vision should never be cached
export const dynamic = 'force-dynamic';

// Define the schema for Context Classification
const responseSchema = {
  type: 'OBJECT',
  properties: {
    primaryContext: {
      type: 'STRING',
      enum: ['restaurant_counter', 'restaurant_table', 'playground', 'classroom', 'home_kitchen', 'home_living', 'store_checkout', 'medical_office', 'bathroom', 'greeting', 'unknown']
    },
    confidenceScore: { type: 'NUMBER' },
    secondaryContexts: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    entitiesDetected: {
      type: 'ARRAY',
      items: { type: 'STRING' }
    },
    situationInference: { type: 'STRING' },
  },
  required: ['primaryContext', 'confidenceScore', 'secondaryContexts', 'entitiesDetected', 'situationInference'],
};

const SYSTEM_PROMPT = `You are analyzing an image to help a non-verbal child with communication needs.

Identify:
1. PRIMARY_CONTEXT: The main situation (restaurant_counter, playground, etc.)
2. ENTITIES: Objects and people visible that might be relevant for communication
3. SITUATION: A brief description of what's happening

Allowed Contexts: restaurant_counter, restaurant_table, playground, classroom, home_kitchen, home_living, store_checkout, medical_office, bathroom, greeting, unknown.

Special context rules:
- bathroom: toilets, sinks, restrooms, bathroom fixtures
- greeting: faces visible (especially in selfie/front camera mode), meeting people, social situations

Be conservative with confidence. If unsure, use lower confidence (0.0 - 1.0).

Generate a JSON object following the schema.`;

export async function POST(request: NextRequest) {
  try {
    const { image, location, placeName } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Build location context if available
    let locationContext = '';
    if (placeName) {
      locationContext = `\n\nLocation Context: The child is currently at or near "${placeName}". Use this to inform your context classification.`;
    } else if (location) {
      locationContext = `\n\nGeolocation hint: User is at coordinates (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}). Use this to help determine if they might be indoors/outdoors.`;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
      tools: [{ googleSearch: {} } as unknown as Record<string, unknown>],
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: image } },
            { text: SYSTEM_PROMPT + locationContext }
          ]
        }
      ]
    });

    const text = response.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const classification = JSON.parse(text);

    // Generate tiles directly based on classification (no affirmation flow)
    const grid = generateGrid({
      affirmedContext: classification.primaryContext as ContextType,
      gridSize: 9,
      entities: classification.entitiesDetected,
      situationInference: classification.situationInference
    });

    return NextResponse.json({
      classification,
      tiles: grid.tiles
    });

  } catch (error) {
    console.error('Tiles API error:', error);

    // Fallback classification and tiles
    const fallbackGrid = generateGrid({
      affirmedContext: 'unknown' as ContextType,
      gridSize: 9
    });

    return NextResponse.json({
      classification: {
        primaryContext: 'unknown',
        confidenceScore: 0,
        secondaryContexts: [],
        entitiesDetected: [],
        situationInference: 'Error processing image'
      },
      tiles: fallbackGrid.tiles
    });
  }
}
