import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';
import { uploadInterviewAudio } from '@/lib/adaptation';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    // Upload audio to Supermemory via multimodal extractor (non-blocking).
    // Supermemory will extract structured insights from the audio for
    // future interview learning without storing raw transcripts.
    const userName = formData.get('userName') as string | null;
    const sessionId = formData.get('sessionId') as string | null;
    if (userName && sessionId) {
      const blob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
      uploadInterviewAudio(userName, blob, sessionId).catch((err) => {
        console.error('Background audio upload failed (non-critical):', err);
      });
    }

    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error('Transcription failed:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}
