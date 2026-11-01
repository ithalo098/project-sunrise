import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const ffmpegPath = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  source: "edge" | "tiktok" | "gtts";
  edgeVoice?: string;
  tiktokVoice?: string;
  effect?: string;
  category: "realistic" | "character";
  badge: string;
  gender: "male" | "female";
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // ==========================================
  // VOZES NEURAIS ULTRA-REALISTAS E NÍTIDAS (ILIMITADAS)
  // ==========================================
  {
    id: "antonio",
    name: "Íthalo Real / Antonio (Voz Neural Masculina)",
    description: "Voz masculina brasileira ultra-nítida, respiração natural e dicção perfeita para WhatsApp e vendas",
    source: "edge",
    edgeVoice: "pt-BR-AntonioNeural",
    category: "realistic",
    badge: "💎 Ultra-Realista (Nítida)",
    gender: "male"
  },
  {
    id: "francisca",
    name: "Francisca (Voz Neural Feminina)",
    description: "Voz feminina brasileira suave, nítida, expressiva e profissional para atendimento de excelência",
    source: "edge",
    edgeVoice: "pt-BR-FranciscaNeural",
    category: "realistic",
    badge: "💎 Ultra-Realista (Nítida)",
    gender: "female"
  },
  {
    id: "thalita",
    name: "Thalita (Voz Neural Jovem & Dinâmica)",
    description: "Voz feminina jovem brasileira descontraída e alegre, ótima para conversas pessoais informais",
    source: "edge",
    edgeVoice: "pt-BR-ThalitaMultilingualNeural",
    category: "realistic",
    badge: "💎 Ultra-Realista (Nítida)",
    gender: "female"
  },

  // ==========================================
  // VOZES DE PERSONAGENS & VIRAIS (TIKTOK / LIVEPIX)
  // ==========================================
  {
    id: "bob_esponja",
    name: "Bob Esponja (Verdadeiro LivePix)",
    description: "A voz oficial clássica do Bob Esponja usada nas doações do LivePix e TikTok",
    source: "tiktok",
    tiktokVoice: "br_005",
    category: "character",
    badge: "🎭 Personagem Viral",
    gender: "male"
  },
  {
    id: "silvio_santos",
    name: "Silvio Santos (LivePix Clássico)",
    description: "A voz clássica do Silvio Santos / Seu Madruga das lives e doações do TikTok",
    source: "tiktok",
    tiktokVoice: "br_004",
    effect: "silvio_santos",
    category: "character",
    badge: "🎭 Personagem Viral",
    gender: "male"
  },
  {
    id: "narrador_livepix",
    name: "Narrador Oficial LivePix",
    description: "A voz clássica e imponente dos vídeos e doações do TikTok",
    source: "tiktok",
    tiktokVoice: "br_001",
    category: "character",
    badge: "🎭 Voz de Streamer",
    gender: "male"
  },
  {
    id: "mulher_livepix",
    name: "Voz Feminina LivePix",
    description: "A famosa voz feminina padrão das transmissões e doações",
    source: "tiktok",
    tiktokVoice: "br_003",
    category: "character",
    badge: "🎭 Voz de Streamer",
    gender: "female"
  },
  {
    id: "alvin",
    name: "Alvin / Esquilo Engraçado",
    description: "Voz acelerada e divertida para zoeira com amigos",
    source: "gtts",
    effect: "esquilo",
    category: "character",
    badge: "🐿️ Efeito Cômico",
    gender: "male"
  }
];

/**
 * Síntese Neural Ultra-Nítida via Microsoft Edge Neural TTS (100% Ilimitada & Sem Custos)
 */
async function fetchEdgeTTSAudio(text: string, voiceName = "pt-BR-AntonioNeural"): Promise<Buffer | null> {
  let tts: MsEdgeTTS | null = null;
  let tempFilePath: string | null = null;
  try {
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "")
      .replace(/[*_~`]/g, "")
      .trim();
    if (!cleanText) return null;

    tts = new MsEdgeTTS();
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
    const tempDir = tmpdir();
    const res = await tts.toFile(tempDir, cleanText.substring(0, 1000));
    if (res && res.audioFilePath && existsSync(res.audioFilePath)) {
      tempFilePath = res.audioFilePath;
      const buf = readFileSync(tempFilePath);
      return buf;
    }
  } catch (err: any) {
    console.warn(`[Edge Neural TTS] Falha ao sintetizar com ${voiceName}:`, err?.message);
  } finally {
    if (tempFilePath) {
      try { unlinkSync(tempFilePath); } catch (e) {}
    }
    if (tts) {
      try { tts.close(); } catch (e) {}
    }
  }
  return null;
}

/**
 * Busca áudio na API oficial de vozes do LivePix / TikTok TTS
 */
async function fetchTikTokLivepixAudio(text: string, voice = "br_005"): Promise<Buffer | null> {
  try {
    const cleanText = text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "")
      .replace(/[*_~`]/g, "")
      .trim();
    if (!cleanText) return null;

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
 * Função mestre com vozes neurais ultra-nítidas, LivePix e fallback
 */
export async function generateFullSpeechOpus(text: string, voiceId = "antonio"): Promise<Buffer | null> {
  const voiceDef = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
  let baseAudio: Buffer | null = null;

  // 1. Tenta sintetizar com a engine primária selecionada
  if (voiceDef.source === "edge" && voiceDef.edgeVoice) {
    baseAudio = await fetchEdgeTTSAudio(text, voiceDef.edgeVoice);
  } else if (voiceDef.source === "tiktok" && voiceDef.tiktokVoice) {
    baseAudio = await fetchTikTokLivepixAudio(text, voiceDef.tiktokVoice);
  }

  // 2. Se falhar, tenta Microsoft Edge Neural como fallback de alta fidelidade
  if (!baseAudio) {
    baseAudio = await fetchEdgeTTSAudio(text, "pt-BR-AntonioNeural");
  }

  // 3. Se ainda falhar, fallback para Google TTS
  if (!baseAudio) {
    baseAudio = await fetchGoogleTTSAudio(text);
  }

  if (!baseAudio) return null;

  return await convertToOpusVoice(baseAudio, voiceDef.effect || "natural");
}
