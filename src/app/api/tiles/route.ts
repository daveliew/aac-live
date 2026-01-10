import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { affirmContext, generateGrid, ContextType, GridTile } from '@/lib/tiles';

// Define the schema for Context Classification
const responseSchema = {
  type: 'OBJECT',
  properties: {
    primaryContext: {
      type: 'STRING',
      enum: ['restaurant_counter', 'restaurant_table', 'playground', 'classroom', 'home_kitchen', 'home_living', 'store_checkout', 'medical_office', 'unknown']
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

Allowed Contexts: restaurant_counter, restaurant_table, playground, classroom, home_kitchen, home_living, store_checkout, medical_office, unknown.

Be conservative with confidence. If unsure, use lower confidence (0.0 - 1.0).

Generate a JSON object following the schema.`;

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
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
      model: 'gemini-3-flash',
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
            { text: SYSTEM_PROMPT }
          ]
        }
      ]
    });

    const text = response.text;

    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const classification = JSON.parse(text);

    // Apply Affirmation Logic
    const affirmation = affirmContext(classification);

    let tiles: GridTile[] = [];
    if (affirmation.affirmed && affirmation.finalContext) {
      // Auto-generate grid if affirmed
      const grid = generateGrid({
        affirmedContext: affirmation.finalContext as ContextType,
        gridSize: 9
      });
      tiles = grid.tiles;
    }

    return NextResponse.json({
      classification,
      affirmation,
      tiles // Will be empty if not auto-affirmed
    });

  } catch (error) {
    console.error('Tiles API error:', error);

    // Fallback classification and tiles
    return NextResponse.json({
      classification: {
        primaryContext: 'unknown',
        confidenceScore: 0,
        secondaryContexts: [],
        entitiesDetected: [],
        situationInference: 'Error processing image'
      },
      affirmation: {
        affirmed: false,
        method: 'manual',
        finalContext: null,
        showUI: true,
        uiOptions: {
          type: 'full_picker',
          prompt: 'Choose your situation',
          options: [
            { label: 'Help', icon: '🙋', context: 'restaurant_counter' } // Minimal fallback
          ]
        }
      },
      tiles: [
        { id: 'core_help', label: 'Help', tts: 'I need help', emoji: '🙋', priority: 100, position: 0, row: 0, col: 0, relevanceScore: 100 },
        { id: 'core_yes', label: 'Yes', tts: 'Yes', emoji: '✅', priority: 100, position: 1, row: 0, col: 1, relevanceScore: 100 },
        { id: 'core_no', label: 'No', tts: 'No', emoji: '❌', priority: 100, position: 2, row: 0, col: 2, relevanceScore: 100 }
      ]
    });
  }
}
