import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) assistant for a non-verbal child.

Analyze the image and return 3-5 contextual communication options that the child might want to express.

Return ONLY a valid JSON array with this exact structure:
[
  {"id": 1, "text": "I want that", "emoji": "👉"},
  {"id": 2, "text": "I'm hungry", "emoji": "🍽️"},
  {"id": 3, "text": "Help me please", "emoji": "🙋"}
]

Rules:
- Keep phrases short (2-5 words)
- Use first person ("I want", "I need", "I like", NOT "The child wants")
- Include a relevant emoji for visual recognition
- Prioritize likely needs and desires based on what you see
- Consider common AAC needs: wants, needs, feelings, greetings, questions
- Always include at least one "help" or "more options" type tile
- Make responses appropriate for a child's perspective

Examples by context:
- Food/Kitchen: "I'm hungry", "I want that", "More please", "All done", "I want juice"
- People/Social: "Hello!", "Thank you", "I love you", "Play with me", "Bye bye"
- Outdoors/Park: "I want to play", "Push me!", "Help me", "I'm tired", "Let's go"
- Toys/Play: "My turn", "I want that one", "More!", "Fun!", "All done"
- General: "Yes", "No", "Help me", "I don't know", "Wait"`;

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
      model: 'gemini-2.5-flash-preview-05-20',
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

    const text = response.text || '';

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Parse the JSON
    const tiles = JSON.parse(jsonStr.trim());

    // Validate structure
    if (!Array.isArray(tiles)) {
      throw new Error('Response is not an array');
    }

    // Ensure each tile has required fields
    const validTiles = tiles
      .filter(
        (t): t is { id: number; text: string; emoji: string } =>
          typeof t.text === 'string' && typeof t.emoji === 'string'
      )
      .map((t, i) => ({
        id: t.id || i + 1,
        text: t.text,
        emoji: t.emoji
      }));

    return NextResponse.json({ tiles: validTiles });
  } catch (error) {
    console.error('Tiles API error:', error);

    // Return fallback tiles on error
    return NextResponse.json({
      tiles: [
        { id: 1, text: 'Help me', emoji: '🙋' },
        { id: 2, text: 'Yes', emoji: '✅' },
        { id: 3, text: 'No', emoji: '❌' },
        { id: 4, text: 'More options', emoji: '➕' }
      ]
    });
  }
}
