import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const responseSchema = {
  type: 'OBJECT',
  properties: {
    phrases: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          tts: { type: 'STRING' },
          emoji: { type: 'STRING' },
        },
        required: ['label', 'tts', 'emoji'],
      },
    },
  },
  required: ['phrases'],
};

const SYSTEM_PROMPT = `You are helping a non-verbal child communicate about something they see.

Given an ENTITY (object or person attribute), generate 4-6 SHORT phrases the child could say about it.

Guidelines:
- Use "I" statements where appropriate
- Keep labels SHORT (1-4 words max)
- TTS can be slightly longer but still conversational
- Include mix of: compliments, questions, observations, requests
- Be age-appropriate and friendly
- Choose relevant emojis

Examples:
ENTITY: "glasses"
→ "Nice glasses!" (compliment), "Can I try?" (request), "I like those" (observation)

ENTITY: "wireless earbuds"
→ "What song?" (question), "Music?" (observation), "I like music" (statement)

ENTITY: "dog"
→ "Cute dog!" (compliment), "Can I pet?" (request), "What's their name?" (question)

Generate diverse, contextual phrases for social interaction.`;

export async function POST(request: NextRequest) {
  try {
    const { entity, context } = await request.json();

    if (!entity) {
      return NextResponse.json({ error: 'No entity provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `ENTITY: "${entity}"${context ? `\nCONTEXT: ${context}` : ''}

Generate 4-6 short phrases a child could say about this.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            { text: prompt },
          ],
        },
      ],
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response from Gemini');
    }

    const data = JSON.parse(text);

    // Convert to tile format with IDs
    const tiles = (data.phrases || []).map((phrase: { label: string; tts: string; emoji: string }, i: number) => ({
      id: `entity_${entity.replace(/\s+/g, '_')}_${i}`,
      label: phrase.label,
      tts: phrase.tts,
      emoji: phrase.emoji,
      relevanceScore: 90 - i * 5, // Decreasing relevance
    }));

    return NextResponse.json({ tiles, entity });

  } catch (error) {
    console.error('Entity phrases API error:', error);

    // Fallback phrases
    return NextResponse.json({
      tiles: [
        { id: 'fallback_1', label: 'I see that!', tts: 'I see that!', emoji: '👀', relevanceScore: 80 },
        { id: 'fallback_2', label: 'Cool!', tts: 'That is cool!', emoji: '😎', relevanceScore: 75 },
        { id: 'fallback_3', label: 'I like it', tts: 'I like that', emoji: '👍', relevanceScore: 70 },
      ],
      entity: 'unknown',
    });
  }
}
