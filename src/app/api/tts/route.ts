import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

// Disable caching for real-time TTS
export const dynamic = 'force-dynamic';

const TTS_MODEL = 'gemini-2.5-flash-preview-tts';
const DEFAULT_VOICE = 'Leda'; // Youthful - age-appropriate for child AAC

export async function POST(request: NextRequest) {
  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // TTS model requires explicit instruction to speak (not generate text)
    const ttsPrompt = `Say exactly: "${text}"`;
    console.log('[TTS] Generating speech for:', text.substring(0, 50), '...');

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: ttsPrompt }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice || DEFAULT_VOICE,
            },
          },
        },
      },
    });

    console.log('[TTS] Response received, extracting audio...');

    // Extract audio data from response
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    console.log('[TTS] Audio data present:', !!audioData, audioData ? `${audioData.length} chars` : 'none');

    if (!audioData) {
      console.error('[TTS] No audio data in response:', JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: 'No audio data returned from TTS' },
        { status: 500 }
      );
    }

    // Decode base64 to binary
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Return raw PCM audio (24kHz, 16-bit, mono)
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/pcm',
        'X-Audio-Sample-Rate': '24000',
        'X-Audio-Bit-Depth': '16',
        'X-Audio-Channels': '1',
      },
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    return NextResponse.json(
      { error: 'TTS generation failed', details: String(error) },
      { status: 500 }
    );
  }
}
