import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { join } from "path";

const ffmpegPath = join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe");

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  effect: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: "ithalo",
    name: "Íthalo Real (Voz Natural)",
    description: "Voz jovem brasileira descontraída, estilo WhatsApp pessoal",
    effect: "natural"
  },
  {
    id: "silvio_santos",
    name: "Silvio Santos (Voz do Baú)",
    description: "Voz clássica animada e vibrante ('Ma-ma-oe!')",
    effect: "silvio_santos"
  },
  {
    id: "bob_esponja",
    name: "Bob Esponja",
    description: "Voz aguda, engraçada e hilária da Fenda do Biquíni",
    effect: "bob_esponja"
  },
  {
    id: "narrador_cinema",
    name: "Narrador de Cinema / Galvão",
    description: "Voz ultra grave, imponente e marcante",
    effect: "narrador_cinema"
  },
  {
    id: "esquilo",
    name: "Alvin / Esquilo Engraçado",
    description: "Voz acelerada e super fina para brincadeiras",
    effect: "esquilo"
  },
  {
    id: "robo",
    name: "Robô Futurista",
    description: "Modulação cibernética metálica estilo ficção científica",
    effect: "robo"
  }
];

/**
 * Baixa áudio sintetizado em alta qualidade e sem limites de cota
 */
async function fetchBaseTTSAudio(text: string): Promise<Buffer | null> {
  try {
    const encoded = encodeURIComponent(text.substring(0, 300));
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encoded}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  } catch (err: any) {
    console.error("[TTS Engine] Erro ao baixar áudio base:", err?.message || err);
  }
  return null;
}

/**
 * Converte qualquer áudio para Ogg Opus nativo com efeitos especiais de voz
 */
export async function convertToOpusVoice(inputBuffer: Buffer, effect = "natural"): Promise<Buffer> {
  const rand = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const tempIn = join(process.cwd(), `temp_${rand}.mp3`);
  const tempOut = join(process.cwd(), `temp_${rand}.opus`);

  try {
    writeFileSync(tempIn, inputBuffer);

    let audioFilter = "";
    if (effect === "bob_esponja") {
      // Bob Esponja: pitch agudo e acelerado
      audioFilter = '-af "asetrate=24000*1.38,aresample=24000,atempo=1/1.12"';
    } else if (effect === "silvio_santos") {
      // Silvio Santos: pitch mais alto, alegre e animado
      audioFilter = '-af "asetrate=24000*1.18,aresample=24000,atempo=1/1.05"';
    } else if (effect === "narrador_cinema") {
      // Narrador: barítono grave e encorpado
      audioFilter = '-af "asetrate=24000*0.82,aresample=24000,atempo=1/0.82"';
    } else if (effect === "esquilo") {
      // Alvin e os Esquilos
      audioFilter = '-af "asetrate=24000*1.65,aresample=24000,atempo=1/1.2"';
    } else if (effect === "robo") {
      // Robô metálico
      audioFilter = '-af "flanger=delay=10:depth=5:regen=70:width=70:speed=2"';
    } else {
      // Íthalo Natural
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
 * Função mestre: gera o áudio e entrega em formato Ogg Opus 100% pronto para o WhatsApp
 */
export async function generateFullSpeechOpus(text: string, voiceId = "ithalo"): Promise<Buffer | null> {
  const voiceDef = AVAILABLE_VOICES.find(v => v.id === voiceId) || AVAILABLE_VOICES[0];
  const effect = voiceDef.effect || "natural";

  const baseAudio = await fetchBaseTTSAudio(text);
  if (!baseAudio) return null;

  return await convertToOpusVoice(baseAudio, effect);
}
