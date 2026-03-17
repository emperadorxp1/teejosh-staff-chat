import Groq from 'groq-sdk';

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: 'audio/webm' });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: 'whisper-large-v3',
    language: 'es',
  });

  return transcription.text;
}
