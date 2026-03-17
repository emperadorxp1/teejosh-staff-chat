import { NextResponse } from 'next/server';
import { getAuthenticatedStaff } from '@/lib/auth';
import { transcribeAudio } from '@/lib/services/voice';

export async function POST(request: Request) {
  const auth = await getAuthenticatedStaff();
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;

  if (!audioFile) return NextResponse.json({ error: 'No se recibio audio' }, { status: 400 });

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const transcription = await transcribeAudio(buffer, audioFile.name || 'audio.webm');

  return NextResponse.json({ transcription });
}
