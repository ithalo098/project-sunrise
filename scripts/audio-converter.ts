import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

const ffmpegPath = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  source: "tiktok" | "gtts";
  tiktokVoice?: string;
  effect?: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: "bob_esponja",
    name: "Bob Esponja (Verdadeiro LivePix)",
    description: "A voz oficial clássica do Bob Esponja usada no LivePix e TikTok",
    source: "tiktok",
    tiktokVoice: "br_005"
  },
  {
    id: "silvio_santos",
    name: "Silvio Santos (Verdadeiro LivePix)",
    description: "A voz clássica do Seu Madruga / Silvio Santos do LivePix",
    source: "tiktok",
    tiktokVoice: "br_004",
    effect: "silvio_santos"
  },
  {
    id: "ithalo",
    name: "Íthalo Real (Voz Natural Jovem)",
    description: "Voz jovem brasileira descontraída, estilo WhatsApp pessoal",
    source: "gtts",
    effect: "natural"
  },
  {
    id: "narrador_livepix",
    name: "Narrador Oficial LivePix",
    description: "A voz oficial de narrador de doações do TikTok e LivePix",
    source: "tiktok",
    tiktokVoice: "br_001"
  },
  {
    id: "mulher_livepix",
    name: "Voz Feminina LivePix",
    description: "A famosa voz feminina padrão das streams e doações",
    source: "tiktok",
    tiktokVoice: "br_003"
  },
  {
    id: "alvin",
    name: "Alvin / Esquilo Engraçado",
    description: "Voz acelerada e divertida para zoeira com amigos",
    source: "gtts",
    effect: "esquilo"
  }
];

/**
 * Busca áudio na API oficial de vozes do LivePix / TikTok TTS
 */
async function fetchTikTokLivepixAudio(text: string, voice = "br_005"): Promise<Buffer | null> {
  try {
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").trim();
    const res = await fetch("https://tiktok-tts.weilnet.workers.dev/api/generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleanText.substring(0, 280),
        voice: voice
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.data) {
        return Buffer.from(data.data, "base64");
      }
    }
  } catch (err: any) {
    console.warn("[LivePix TTS] Falha no endpoint TikTok TTS, usando fallback...", err?.message);
  }
  return null;
}

/**
 * Fallback via Google TTS sem limites de cota
 */
async function fetchGoogleTTSAudio(text: string): Promise<Buffer | null> {
  try {
    const encoded = encodeURIComponent(text.substring(0, 300));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encoded}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  } catch (e) {}
  return null;
}

/**
 * Converte para Ogg Opus nativo do WhatsApp com suporte a efeitos
 */
export async function convertToOpusVoice(inputBuffer: Buffer, effect = "natural"): Promise<Buffer> {
  const rand = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempIn = join(process.cwd(), `temp_${rand}.mp3`);
  const tempOut = join(process.cwd(), `temp_${rand}.opus`);

  try {
    writeFileSync(tempIn, inputBuffer);

    let audioFilter = "";
    if (effect === "silvio_santos") {
      audioFilter = '-af "asetrate=24000*1.15,aresample=24000,atempo=1/1.05"';
    } else if (effect === "esquilo") {
      audioFilter = '-af "asetrate=24000*1.65,aresample=24000,atempo=1/1.2"';
    } else {
      audioFilter = '-af "aresample=24000"';
    }

    const cmd = `"${ffmpegPath}" -y -i "${tempIn}" ${audioFilter} -c:a libopus -b:a 32k -vbr on "${tempOut}"`;
    execSync(cmd, { stdio: "pipe" });

    return readFileSync(tempOut);
  } finally {
    try { unlinkSync(tempIn); } catch (e) {}
    try { unlinkSync(tempOut); } catch (e) {}
  }
}

/**
 * Função mestre com vozes verdadeiras do LivePix (Bob Esponja, Silvio Santos, etc)
 */
export async function generateFullSpeechOpus(text: string, voiceId = "bob_esponja"): Promise<Buffer | null> {
  const voiceDef = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
  let baseAudio: Buffer | null = null;

  if (voiceDef.source === "tiktok" && voiceDef.tiktokVoice) {
    baseAudio = await fetchTikTokLivepixAudio(text, voiceDef.tiktokVoice);
  }

  // Fallback se necessário
  if (!baseAudio) {
    baseAudio = await fetchGoogleTTSAudio(text);
  }

  if (!baseAudio) return null;

  return await convertToOpusVoice(baseAudio, voiceDef.effect);
}
