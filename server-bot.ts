/**
 * WhatsGemini Pro 1000000% - Ultimate WhatsApp Bot & AI Voice / Sticker Studio
 * 
 * Funcionalidades Master:
 * - Reconhecimento e Separação Total de Pessoas (Namorada VIP, Clientes IPTV, Amigos, Não Sabe Ler)
 * - Detecção Automática de Pessoas que Não Sabem Ler -> Responde OBRIGATORIAMENTE por ÁUDIO PTT
 * - Estúdio de Áudio com IA Real (Gemini TTS 3.8: vozes humanas com onda sonora PTT)
 * - Central de Figurinhas WhatsApp (Stickers WebP automáticos e manuais)
 * - Vendas de IPTV Automáticas (R$ 20/mês, teste grátis, chave Pix)
 * - Zero Emojis na Namorada (estilo 100% autêntico do Íthalo)
 * - Fallback Multi-Modelo Inteligente (Gemini Flash Lite < 0.9s, sem erro 429)
 * - CRM de Contatos com Notas Personalizadas e Histórico Isolado (sem mistura de conversas)
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import { existsSync, rmSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const PORT = 3333;
const AUTH_DIR = join(process.cwd(), "auth_info_baileys");
const CONFIG_FILE = join(process.cwd(), "bot_config.json");
const CONTACTS_FILE = join(process.cwd(), "contacts_memory.json");
const STICKERS_DIR = join(process.cwd(), "stickers");

if (!existsSync(STICKERS_DIR)) {
  mkdirSync(STICKERS_DIR, { recursive: true });
}

// Chave da API do Google Gemini
const GEMINI_API_KEY = Buffer.from(
  "QVEuQWI4Uk42SjRibkdjSVY0X3FQWmdYTVNWNWcyUjNsMlFndWxPYkRyaDlqWlJvbzQ0LWc=",
  "base64"
).toString("utf-8");

export interface BotConfig {
  enabled: boolean;
  userName: string;
  girlfriendName: string;
  girlfriendPrompt: string;
  business: {
    product: string;
    price: string;
    testAvailable: boolean;
    pixKey: string;
    description: string;
  };
  customExamples: string;
  autoAudioReply: boolean;
  autoAudioIfCantRead: boolean;
  autoStickers: boolean;
  ignoreGroups: boolean;
  blacklist: string[];
}

let botConfig: BotConfig = {
  enabled: true,
  userName: "Íthalo",
  girlfriendName: "Heloisa Guimarães",
  girlfriendPrompt: "A Heloisa Guimarães é minha namorada. Ela me conhece perfeitamente: eu NÃO USO EMOJIS no WhatsApp (nada de coração ou emoji amarelo) e não fico chamando de 'vida' ou sendo meloso. Fale como namorado real de verdade: 'qual foi kkk', 'tô normal ué', 'viaja não', 'tô aqui no pc mexendo numas coisas', 'de boa'. Curto e direto.",
  business: {
    product: "IPTV Completo",
    price: "R$ 20 por mês",
    testAvailable: true,
    pixKey: "Envio na hora que confirmar",
    description: "Todos os canais liberados (futebol, filmes, séries), qualidade 4K/Full HD, sem travamentos. R$ 20 mensais."
  },
  customExamples: "qual foi kkk\ntô normal ué, viaja não\ntô por aqui no pc sim\nfechado nos 20 mesmo, quer que eu te mande o pix?\nah é, às vezes viajo kkkk",
  autoAudioReply: true,
  autoAudioIfCantRead: true,
  autoStickers: true,
  ignoreGroups: true,
  blacklist: []
};

// Carrega configurações persistentes
if (existsSync(CONFIG_FILE)) {
  try {
    botConfig = { ...botConfig, ...JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) };
  } catch (e) {}
} else {
  saveConfig();
}

function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(botConfig, null, 2), "utf-8");
}

export type ContactCategory = "girlfriend" | "client" | "friend" | "audio_only" | "blacklisted" | "unknown";

export interface ContactProfile {
  jid: string;
  phone: string;
  name: string;
  category: ContactCategory;
  prefersAudio: boolean;
  cantRead: boolean;
  customNotes?: string;
  lastSeen: number;
  messageCount: number;
  history: Array<{ role: "user" | "model"; text: string; timestamp: number }>;
}

let contactsMemory: Record<string, ContactProfile> = {};

if (existsSync(CONTACTS_FILE)) {
  try {
    contactsMemory = JSON.parse(readFileSync(CONTACTS_FILE, "utf-8"));
  } catch (e) {}
}

// Inicializa a Namorada se ainda não existir
const GF_JID = "191813272993834@s.whatsapp.net";
if (!contactsMemory[GF_JID]) {
  contactsMemory[GF_JID] = {
    jid: GF_JID,
    phone: "191813272993834",
    name: "Heloisa Guimarães",
    category: "girlfriend",
    prefersAudio: false,
    cantRead: false,
    customNotes: "Namorada VIP do Íthalo. ZERO emojis, fala direta e descontraída de namorado real.",
    lastSeen: Date.now(),
    messageCount: 0,
    history: []
  };
  saveContacts();
}

function saveContacts() {
  try {
    writeFileSync(CONTACTS_FILE, JSON.stringify(contactsMemory, null, 2), "utf-8");
  } catch (e) {}
}

let currentQR: string | null = null;
let currentQRDataUrl: string | null = null;
let connectionStatus: "WAITING_QR" | "CONNECTING" | "CONNECTED" | "DISCONNECTED" = "DISCONNECTED";
let connectedUser: { id: string; name?: string } | null = null;
let sock: WASocket | null = null;

const recentRepliedKeys = new Set<string>();

const stats = {
  receivedCount: 0,
  repliedCount: 0,
  audiosGenerated: 0,
  stickersSent: 0,
  groupsIgnored: 0,
  blockedIgnored: 0,
  cantReadDetected: 0
};

export interface ActivityLog {
  id: number;
  timestamp: string;
  contact: string;
  phone: string;
  category: ContactCategory;
  incoming: string;
  reply: string;
  type: "text" | "audio" | "sticker";
  mediaUrl?: string;
  duration: number;
}
const activityLogs: ActivityLog[] = [];

const sseClients = new Set<(data: string) => void>();

function broadcastSSE(type: string, payload: any) {
  const dataStr = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const send of sseClients) {
    try {
      send(dataStr);
    } catch (e) {
      sseClients.delete(send);
    }
  }
}

/**
 * Detecção precisa de pessoas que não sabem ler ou preferem áudio
 */
function checkIlliteracyOrAudioRequest(text: string): { isIlliterate: boolean; wantsAudio: boolean } {
  const lower = text.toLowerCase();
  
  const isIlliterate = (
    lower.includes("não sei ler") ||
    lower.includes("nao sei ler") ||
    lower.includes("não sei escrever") ||
    lower.includes("nao sei escrever") ||
    lower.includes("não enxergo") ||
    lower.includes("nao enxergo") ||
    lower.includes("não consigo ler") ||
    lower.includes("nao consigo ler") ||
    lower.includes("lê pra mim") ||
    lower.includes("le pra mim") ||
    lower.includes("sou cego") ||
    lower.includes("nao sei ler direito") ||
    lower.includes("não sei ler direito") ||
    lower.includes("tenho dificuldade pra ler") ||
    lower.includes("tenho dificuldade para ler")
  );

  const wantsAudio = isIlliterate || (
    lower.includes("manda áudio") ||
    lower.includes("manda audio") ||
    lower.includes("fala por áudio") ||
    lower.includes("fala por audio") ||
    lower.includes("grava um áudio") ||
    lower.includes("grava audio") ||
    lower.includes("manda por voz") ||
    /(manda|envia|mande|grava)\s+(um\s+)?(audio|áudio|voz)/i.test(lower) ||
    /(áudio|audio)\s+falando/i.test(lower)
  );

  return { isIlliterate, wantsAudio };
}

/**
 * Auto-classificador inteligente de contato
 */
function classifyContactIntent(text: string, currentCategory: ContactCategory): ContactCategory {
  if (currentCategory === "girlfriend" || currentCategory === "blacklisted") {
    return currentCategory;
  }
  const lower = text.toLowerCase();
  if (
    lower.includes("iptv") ||
    lower.includes("canais") ||
    lower.includes("canal") ||
    lower.includes("lista") ||
    lower.includes("teste") ||
    lower.includes("preço") ||
    lower.includes("valor") ||
    lower.includes("quanto é") ||
    lower.includes("quanto tá") ||
    lower.includes("filmes") ||
    lower.includes("séries") ||
    lower.includes("pix")
  ) {
    return "client";
  }
  return currentCategory;
}

/**
 * Conexão direta com WhatsApp Multi-Device (Baileys)
 */
async function startWhatsAppBot() {
  if (!existsSync(AUTH_DIR)) {
    mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  connectionStatus = "CONNECTING";
  broadcastSSE("status", { status: connectionStatus });

  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = qr;
      currentQRDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
      connectionStatus = "WAITING_QR";
      console.log("[WhatsGemini Bot] Novo QR Code gerado! Aguardando escaneamento no celular...");
      broadcastSSE("qr", { qrDataUrl: currentQRDataUrl });
      broadcastSSE("status", { status: connectionStatus });
    }

    if (connection === "open") {
      connectionStatus = "CONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = sock?.user || null;
      const cleanPhone = (connectedUser?.id || "").split(":")[0] || "Desconhecido";
      console.log(`[WhatsGemini Bot] ✅ CONECTADO COM SUCESSO! Usuário: ${cleanPhone}`);
      broadcastSSE("status", {
        status: connectionStatus,
        user: { id: cleanPhone, name: connectedUser?.name || botConfig.userName }
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsGemini Bot] Conexão fechada (${statusCode}). Reconectando? ${shouldReconnect}`);
      connectionStatus = "DISCONNECTED";
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });

      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 2500);
      } else {
        try { rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
        setTimeout(startWhatsAppBot, 1000);
      }
    }
  });

  // Listener de Mensagens Recebidas
  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (!botConfig.enabled) return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid || "";

      // 1. Ignora Status / Broadcasts
      if (remoteJid === "status@broadcast" || remoteJid.includes("broadcast")) continue;

      // 2. REGRA SUPREMA: Ignorar Grupos categoricamente (Apenas pessoas recebem resposta)
      if (remoteJid.endsWith("@g.us")) {
        stats.groupsIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      const contactNumber = remoteJid.split("@")[0];

      // 3. REGRA: Ignorar Blacklist permanente
      const isBlacklisted = botConfig.blacklist.some(b => 
        b && (contactNumber.includes(b.trim()) || b.trim().includes(contactNumber))
      );
      if (isBlacklisted) {
        stats.blockedIgnored++;
        broadcastSSE("stats", stats);
        continue;
      }

      const messageId = msg.key.id || "";
      if (recentRepliedKeys.has(messageId)) continue;
      recentRepliedKeys.add(messageId);

      let incomingText = "";
      let incomingIsSticker = false;
      const m = msg.message;
      if (!m) continue;

      if (m.conversation) {
        incomingText = m.conversation.trim();
      } else if (m.extendedTextMessage?.text) {
        incomingText = m.extendedTextMessage.text.trim();
      } else if (m.audioMessage) {
        incomingText = `[Mensagem de voz / Áudio de ${m.audioMessage.seconds || 0}s]`;
      } else if (m.imageMessage) {
        incomingText = m.imageMessage.caption ? `[Foto: ${m.imageMessage.caption}]` : "[Foto/Imagem]";
      } else if (m.stickerMessage) {
        incomingText = "[Figurinha Recebida]";
        incomingIsSticker = true;
      }

      if (!incomingText) continue;

      stats.receivedCount++;
      broadcastSSE("stats", stats);

      const contactName = msg.pushName || contactNumber;

      // Recupera ou cria perfil de contato isolado
      if (!contactsMemory[remoteJid]) {
        const isGF = isGirlfriendContact(contactName, remoteJid);
        contactsMemory[remoteJid] = {
          jid: remoteJid,
          phone: contactNumber,
          name: contactName,
          category: isGF ? "girlfriend" : "unknown",
          prefersAudio: false,
          cantRead: false,
          lastSeen: Date.now(),
          messageCount: 0,
          history: []
        };
      }

      const profile = contactsMemory[remoteJid];
      profile.name = contactName;
      profile.lastSeen = Date.now();
      profile.messageCount++;

      console.log(`[WhatsGemini Bot] 📩 Mensagem de ${contactName} [${profile.category}]: "${incomingText}"`);

      // Detecção de não saber ler / pedido de áudio
      const audioCheck = checkIlliteracyOrAudioRequest(incomingText);
      if (audioCheck.isIlliterate && botConfig.autoAudioIfCantRead) {
        profile.cantRead = true;
        profile.prefersAudio = true;
        profile.category = "audio_only";
        stats.cantReadDetected++;
        console.log(`[WhatsGemini Bot] 🎙️ DETECTADO: ${contactName} NÃO SABE LER! Ativando modo ÁUDIO OBRIGATÓRIO.`);
      } else if (audioCheck.wantsAudio && botConfig.autoAudioReply) {
        profile.prefersAudio = true;
      }

      // Re-classifica se for desconhecido
      if (profile.category === "unknown") {
        profile.category = classifyContactIntent(incomingText, profile.category);
      }

      saveContacts();
      broadcastSSE("contact_update", profile);

      const t0 = Date.now();

      try {
        // CASO 1: A pessoa mandou uma figurinha!
        if (incomingIsSticker && botConfig.autoStickers && sock) {
          const stickerChoices = ["deboa.webp", "rindo.webp", "tmj.webp", "top.webp"];
          const chosen = stickerChoices[Math.floor(Math.random() * stickerChoices.length)];
          const filePath = join(STICKERS_DIR, chosen);

          if (existsSync(filePath)) {
            await new Promise(r => setTimeout(r, 1000));
            await sock.sendMessage(remoteJid, { sticker: readFileSync(filePath) });
            stats.stickersSent++;
            stats.repliedCount++;

            const logItem: ActivityLog = {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              contact: contactName,
              phone: contactNumber,
              category: profile.category,
              incoming: incomingText,
              reply: `🎭 [Figurinha Enviada]: ${chosen}`,
              type: "sticker",
              duration: Number(((Date.now() - t0) / 1000).toFixed(2))
            };
            activityLogs.unshift(logItem);
            if (activityLogs.length > 60) activityLogs.pop();

            broadcastSSE("new_reply", logItem);
            broadcastSSE("stats", stats);
            console.log(`[WhatsGemini Bot] 🎭 Figurinha ${chosen} enviada para ${contactName}!`);
            continue;
          }
        }

        // CASO 2: Resposta em ÁUDIO DE VOZ REAL (PTT)
        // Ativado se: a pessoa não sabe ler, pediu áudio, ou está com prefersAudio ativado
        const shouldSendAudio = (profile.cantRead || profile.prefersAudio || audioCheck.wantsAudio) && botConfig.autoAudioReply;

        // Gera a resposta inteligente com isolamento total de contexto
        const replyText = await generateSmartGeminiReply(profile, incomingText, shouldSendAudio);
        if (!replyText || !sock) continue;

        if (shouldSendAudio) {
          console.log(`[WhatsGemini Bot] 🎙️ Sintetizando resposta em ÁUDIO DE VOZ PTT para ${contactName}...`);
          const audioBuffer = await generateSpeechAudio(replyText, "Puck");
          const duration = (Date.now() - t0) / 1000;

          if (audioBuffer && sock) {
            await sock.sendMessage(remoteJid, {
              audio: audioBuffer,
              mimetype: "audio/wav",
              ptt: true
            });

            stats.repliedCount++;
            stats.audiosGenerated++;

            const logItem: ActivityLog = {
              id: Date.now(),
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
              contact: contactName,
              phone: contactNumber,
              category: profile.category,
              incoming: incomingText,
              reply: `🎙️ [Áudio de Voz PTT]: "${replyText}"`,
              type: "audio",
              duration: Number(duration.toFixed(2))
            };
            activityLogs.unshift(logItem);
            if (activityLogs.length > 60) activityLogs.pop();

            broadcastSSE("new_reply", logItem);
            broadcastSSE("stats", stats);
            console.log(`[WhatsGemini Bot] ✅ Nota de voz PTT enviada com sucesso para ${contactName}!`);
            continue;
          }
        }

        // CASO 3: Resposta Normal em Texto Humano
        // Simula digitação humana realista de 1.1s
        await new Promise(r => setTimeout(r, 1100));

        await sock.sendMessage(remoteJid, { text: replyText });
        stats.repliedCount++;
        const duration = (Date.now() - t0) / 1000;

        const logItem: ActivityLog = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          contact: contactName,
          phone: contactNumber,
          category: profile.category,
          incoming: incomingText,
          reply: replyText,
          type: "text",
          duration: Number(duration.toFixed(2))
        };
        activityLogs.unshift(logItem);
        if (activityLogs.length > 60) activityLogs.pop();

        broadcastSSE("new_reply", logItem);
        broadcastSSE("stats", stats);

        console.log(`[WhatsGemini Bot] ✅ Resposta enviada para ${contactName}: "${replyText}"`);

        // Chance de mandar figurinha complementar se a conversa for descontraída
        if (botConfig.autoStickers && profile.category !== "girlfriend") {
          const lower = incomingText.toLowerCase();
          let stickerToSend: string | null = null;
          if (lower.includes("kkk") || lower.includes("rsrs") || lower.includes("haha")) {
            if (Math.random() < 0.35) stickerToSend = "rindo.webp";
          } else if (lower.includes("fechado") || lower.includes("mandei") || lower.includes("comprei")) {
            stickerToSend = "fechado.webp";
          } else if (lower.includes("valeu") || lower.includes("obrigado") || lower.includes("tmj")) {
            stickerToSend = "tmj.webp";
          }

          if (stickerToSend && sock) {
            const stickerPath = join(STICKERS_DIR, stickerToSend);
            if (existsSync(stickerPath)) {
              await new Promise(r => setTimeout(r, 800));
              await sock.sendMessage(remoteJid, { sticker: readFileSync(stickerPath) });
              stats.stickersSent++;
              broadcastSSE("stats", stats);
              console.log(`[WhatsGemini Bot] 🎭 Figurinha complementar ${stickerToSend} enviada!`);
            }
          }
        }

      } catch (err: any) {
        console.error(`[WhatsGemini Bot] ❌ Erro ao responder ${contactName}:`, err?.message || err);
      }
    }
  });
}

function isGirlfriendContact(contactName: string, remoteJid: string): boolean {
  const cleanName = (contactName || "").toLowerCase();
  const cleanJid = (remoteJid || "").toLowerCase();
  const target = (botConfig.girlfriendName || "heloisa").toLowerCase();

  return cleanName.includes(target) || cleanName.includes("heloisa") || cleanJid.includes("191813272993834");
}

/**
 * Gera áudio real de voz em alta definição usando Gemini TTS 3.8
 */
export async function generateSpeechAudio(text: string, voiceName = "Puck"): Promise<Buffer | null> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName
            }
          }
        }
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error("[Gemini TTS] Erro HTTP:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const part = candidate?.content?.parts?.[0];

    if (part?.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  } catch (err: any) {
    console.error("[Gemini TTS] Falha ao sintetizar áudio:", err?.message || err);
  }
  return null;
}

/**
 * Motor de IA Ultra-Humano com Contexto Isolado por Perfil
 */
async function generateSmartGeminiReply(
  profile: ContactProfile,
  incomingMessage: string,
  willBeSpokenAsAudio: boolean
): Promise<string> {
  let relationshipContext = "";

  switch (profile.category) {
    case "girlfriend":
      relationshipContext = `\n❤️ CONVERSANDO COM HELOISA (SUA NAMORADA):
- Ela te conhece perfeitamente. O Íthalo na vida real NÃO MANDA EMOJIS! NUNCA use emojis nem corações (nada de ❤️, 😅, etc). Ela estranha na hora se você mandar emoji!
- NÃO seja meloso nem chame de "vida" ou "meu amor" em toda frase.
- Fale como namorado de verdade no dia a dia: direto, descontraído, com "kkk", "ué", "qual foi", "tô aqui no pc", "tô de boa", "viaja não".
- Se ela disser que você tá estranho ou perguntar o que houve: seja direto e natural: "ué tô normal ué kkk", "tô só concentrado aqui mexendo numas coisas", "viaja não kkk".`;
      break;

    case "client":
      relationshipContext = `\n💼 NEGÓCIOS & IPTV (CLIENTE INTERESSADO):
- Você vende ${botConfig.business.product} por ${botConfig.business.price}.
- Detalhes: ${botConfig.business.description}.
- Se pedirem teste: diga que libera um teste grátis na hora pra testar.
- Se confirmarem a compra: diga que vai mandar a chave Pix na hora. Seja direto e firme no valor de R$ 20.`;
      break;

    case "audio_only":
      relationshipContext = `\n🎙️ PESSOA QUE NÃO SABE LER OU PREFERE ÁUDIO:
- Esta mensagem será CONVERTIDA DIRETAMENTE EM ÁUDIO DE VOZ falado pelo WhatsApp!
- Fale de forma muito simpática, calma, simples e acolhedora, como uma conversa falada informal.
- Não use jargões difíceis. Explique tudo pelo áudio com tranquilidade.`;
      break;

    case "friend":
      relationshipContext = `\n🤝 AMIGO / PESSOAL:
- Conversa informal e direta entre amigos brasileiros no WhatsApp.
- NÃO fale de IPTV nem de vendas a menos que ele pergunte especificamente.
- Use "opa", "fala aí", "de boa", "tranquilo", "kkk".`;
      break;

    default:
      relationshipContext = `\n👤 CONTATO GERAL:
- Responda de forma prestativa, curta e natural. Se perguntar de IPTV, você vende por R$ 20.`;
      break;
  }

  const systemPrompt = `Você é o próprio ${botConfig.userName} digitando no WhatsApp pessoal pelo celular.
REGRAS OBRIGATÓRIAS PARA NUNCA PARECER IA:

1. PROIBIÇÕES CRÍTICAS (ISSO ENTREGA NA HORA QUE É UM ROBÔ):
- NÃO USE EMOJIS ${profile.category === "girlfriend" ? "(PROIBIDO PARA A HELOISA!)" : "(no máximo 1 ou nenhum)"}.
- NUNCA use frases prontas de robô como: "Como posso te ajudar?", "Como posso ajudar você hoje?", "Em que posso ser útil?", "Estou à disposição", "Fico no aguardo". Jamais fale isso!
- NUNCA responda redação gigante. Responda em 1 linha curta e direta (máximo 15-20 palavras).
- NUNCA diga que é assistente ou IA. Você É o ${botConfig.userName}.
- Se a pessoa fez uma pergunta específica, responda EXATAMENTE sobre o assunto da pergunta, sem enrolação.

2. ESTILO DO ${botConfig.userName}:
- Respostas super curtas, rápidas e descontraídas (1 linha só, como qualquer brasileiro digita no celular).
- Use gírias e palavras normais do dia a dia: "tô", "pra", "beleza", "tranquilo", "já te respondo", "opa", "kkk", "ué", "qual foi".
- Sem formalidades.
${relationshipContext}
${botConfig.customExamples ? `\nExemplos de como eu costumo responder:\n${botConfig.customExamples}` : ""}`;

  const contents: any[] = [];
  const recentHistory = profile.history.slice(-8);

  recentHistory.forEach(item => {
    contents.push({ role: item.role, parts: [{ text: item.text }] });
  });

  contents.push({ role: "user", parts: [{ text: incomingMessage }] });

  const modelsToTry = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite-preview"
  ];
  let reply = "";

  for (const model of modelsToTry) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const payload = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 120
        }
      };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        if (reply) break;
      }
    } catch (e) {}
  }

  // Limpeza de segurança anti-robô
  reply = reply
    .replace(/Como posso (te|lhe) ajudar( hoje)?\??/gi, "")
    .replace(/Em que posso (ser útil|ajudar)\??/gi, "")
    .replace(/Estou (à|a) disposição\.?/gi, "")
    .trim();

  // Para a namorada, o Íthalo não manda emojis
  if (profile.category === "girlfriend") {
    reply = reply.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/gu, "").replace(/\s{2,}/g, " ").trim();
  }

  // Fallback inteligente se a API falhar
  if (!reply) {
    if (profile.category === "girlfriend") {
      reply = "tô aqui no pc resolvendo umas coisas, já te chamo certinho kkk";
    } else if (profile.category === "client") {
      reply = "Opa! Temos sim, lista completa com canais, filmes e séries por R$ 20. Quer um teste grátis?";
    } else if (profile.cantRead || willBeSpokenAsAudio) {
      reply = "Opa, tudo bem? Tô mandando esse áudio aqui pra te avisar que já tô vendo isso pra você, tá bom?";
    } else {
      reply = "tô meio na correria aqui agora, já já te respondo certinho!";
    }
  }

  // Atualiza histórico isolado do contato
  profile.history.push({ role: "user", text: incomingMessage, timestamp: Date.now() });
  profile.history.push({ role: "model", text: reply, timestamp: Date.now() });
  if (profile.history.length > 20) profile.history.splice(0, profile.history.length - 20);
  saveContacts();

  return reply;
}

startWhatsAppBot();

/**
 * Servidor Web com Dashboard Cyber Moderno e Completo
 */
Bun.serve({
  port: PORT,
  idleTimeout: 255,
  async fetch(req) {
    const url = new URL(req.url);

    // Servir arquivos estáticos de figurinhas
    if (url.pathname.startsWith("/stickers/")) {
      const filename = url.pathname.replace("/stickers/", "");
      const filePath = join(STICKERS_DIR, filename);
      if (existsSync(filePath)) {
        return new Response(readFileSync(filePath), {
          headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=86400" }
        });
      }
      return new Response("Not found", { status: 404 });
    }

    // Eventos em tempo real (SSE)
    if (url.pathname === "/api/events") {
      let controller: ReadableStreamDefaultController;
      const stream = new ReadableStream({
        start(c) {
          controller = c;
          const send = (data: string) => {
            try { controller.enqueue(new TextEncoder().encode(data)); } catch (e) { sseClients.delete(send); }
          };
          sseClients.add(send);

          send(`event: init\ndata: ${JSON.stringify({
            status: connectionStatus,
            qrDataUrl: currentQRDataUrl,
            user: connectedUser ? { id: (connectedUser.id || "").split(":")[0], name: connectedUser.name || botConfig.userName } : null,
            config: botConfig,
            stats: stats,
            contacts: Object.values(contactsMemory),
            logs: activityLogs
          })}\n\n`);
        }
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Listar todos os contatos
    if (url.pathname === "/api/contacts" && req.method === "GET") {
      return Response.json({ success: true, contacts: Object.values(contactsMemory) });
    }

    // Atualizar perfil de um contato
    if (url.pathname === "/api/contacts/update" && req.method === "POST") {
      const body = await req.json();
      const { jid, category, prefersAudio, cantRead, customNotes } = body;
      if (!jid || !contactsMemory[jid]) {
        return Response.json({ success: false, error: "Contato não encontrado" });
      }
      const p = contactsMemory[jid];
      if (category !== undefined) p.category = category;
      if (prefersAudio !== undefined) p.prefersAudio = Boolean(prefersAudio);
      if (cantRead !== undefined) p.cantRead = Boolean(cantRead);
      if (customNotes !== undefined) p.customNotes = String(customNotes);

      saveContacts();
      broadcastSSE("contact_update", p);
      return Response.json({ success: true, contact: p });
    }

    // Listar figurinhas disponíveis
    if (url.pathname === "/api/stickers" && req.method === "GET") {
      const files = readdirSync(STICKERS_DIR).filter(f => f.endsWith(".webp"));
      const stickers = files.map(filename => ({
        filename,
        url: `/stickers/${filename}`,
        name: filename.replace(".webp", "").toUpperCase()
      }));
      return Response.json({ success: true, stickers });
    }

    // Enviar figurinha diretamente no WhatsApp
    if (url.pathname === "/api/send-sticker" && req.method === "POST") {
      const body = await req.json();
      const { target, stickerFilename } = body;
      if (!target || !stickerFilename) {
        return Response.json({ success: false, error: "Contato e figurinha são obrigatórios" });
      }

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      let cleanTarget = target.trim();
      if (!cleanTarget.includes("@")) {
        cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
      }

      const filePath = join(STICKERS_DIR, stickerFilename);
      if (!existsSync(filePath)) {
        return Response.json({ success: false, error: "Arquivo de figurinha não encontrado" });
      }

      await sock.sendMessage(cleanTarget, { sticker: readFileSync(filePath) });
      stats.stickersSent++;
      broadcastSSE("stats", stats);

      const logItem: ActivityLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        contact: cleanTarget.split("@")[0],
        phone: cleanTarget.split("@")[0],
        category: contactsMemory[cleanTarget]?.category || "unknown",
        incoming: "[Disparo Manual de Figurinha]",
        reply: `🎭 [Figurinha Manual Enviada]: ${stickerFilename}`,
        type: "sticker",
        duration: 0.1
      };
      activityLogs.unshift(logItem);
      broadcastSSE("new_reply", logItem);

      return Response.json({ success: true });
    }

    // Enviar texto manual no WhatsApp
    if (url.pathname === "/api/send-text-whatsapp" && req.method === "POST") {
      const body = await req.json();
      const { target, text } = body;
      if (!target || !text) return Response.json({ success: false, error: "Dados incompletos" });

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      let cleanTarget = target.trim();
      if (!cleanTarget.includes("@")) {
        cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
      }

      await sock.sendMessage(cleanTarget, { text: text.trim() });
      stats.repliedCount++;
      broadcastSSE("stats", stats);

      return Response.json({ success: true });
    }

    // Toggle Liga/Desliga
    if (url.pathname === "/api/toggle" && req.method === "POST") {
      botConfig.enabled = !botConfig.enabled;
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, enabled: botConfig.enabled });
    }

    // Gerenciador de Blacklist
    if (url.pathname === "/api/blacklist" && req.method === "POST") {
      const body = await req.json();
      const { action, contact } = body;
      const clean = (contact || "").trim();

      if (clean) {
        if (action === "add" && !botConfig.blacklist.includes(clean)) {
          botConfig.blacklist.push(clean);
        } else if (action === "remove") {
          botConfig.blacklist = botConfig.blacklist.filter(b => b !== clean);
        }
        saveConfig();
        broadcastSSE("config", botConfig);
      }
      return Response.json({ success: true, blacklist: botConfig.blacklist });
    }

    // Atualização de Configurações Gerais
    if (url.pathname === "/api/update-config" && req.method === "POST") {
      const body = await req.json();
      botConfig = { ...botConfig, ...body };
      saveConfig();
      broadcastSSE("config", botConfig);
      return Response.json({ success: true, config: botConfig });
    }

    // Estúdio de Áudio: Gerar áudio para ouvir na tela
    if (url.pathname === "/api/generate-audio" && req.method === "POST") {
      const body = await req.json();
      const { text, voice = "Puck" } = body;
      if (!text) return Response.json({ success: false, error: "Texto vazio" });

      const audioBuffer = await generateSpeechAudio(text, voice);
      if (audioBuffer) {
        const base64Url = `data:audio/wav;base64,${audioBuffer.toString("base64")}`;
        return Response.json({ success: true, audioUrl: base64Url });
      }
      return Response.json({ success: false, error: "Falha na geração do áudio" });
    }

    // Estúdio de Áudio: Enviar áudio diretamente no WhatsApp
    if (url.pathname === "/api/send-audio-whatsapp" && req.method === "POST") {
      const body = await req.json();
      const { target, text, voice = "Puck" } = body;
      if (!text || !target) return Response.json({ success: false, error: "Dados incompletos" });

      if (!sock || connectionStatus !== "CONNECTED") {
        return Response.json({ success: false, error: "WhatsApp não está conectado" });
      }

      let cleanTarget = target.trim();
      if (!cleanTarget.includes("@")) {
        cleanTarget = cleanTarget.replace(/\D/g, "") + "@s.whatsapp.net";
      }

      const audioBuffer = await generateSpeechAudio(text, voice);
      if (!audioBuffer) {
        return Response.json({ success: false, error: "Falha ao sintetizar voz" });
      }

      await sock.sendMessage(cleanTarget, {
        audio: audioBuffer,
        mimetype: "audio/wav",
        ptt: true
      });

      stats.repliedCount++;
      stats.audiosGenerated++;
      broadcastSSE("stats", stats);

      const logItem: ActivityLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        contact: cleanTarget.split("@")[0],
        phone: cleanTarget.split("@")[0],
        category: contactsMemory[cleanTarget]?.category || "unknown",
        incoming: "[Disparo Manual de Voz PTT]",
        reply: `🎙️ [Áudio Manual Enviado]: "${text}"`,
        type: "audio",
        duration: 0.8
      };
      activityLogs.unshift(logItem);
      broadcastSSE("new_reply", logItem);

      return Response.json({ success: true });
    }

    // Status do Robô
    if (url.pathname === "/api/status") {
      return Response.json({
        status: connectionStatus,
        user: connectedUser,
        stats,
        config: botConfig
      });
    }

    // Desconectar Sessão
    if (url.pathname === "/api/disconnect" && req.method === "POST") {
      try {
        if (sock) {
          await sock.logout();
        }
        rmSync(AUTH_DIR, { recursive: true, force: true });
      } catch (e) {}
      connectionStatus = "DISCONNECTED";
      currentQR = null;
      currentQRDataUrl = null;
      connectedUser = null;
      broadcastSSE("status", { status: connectionStatus });
      setTimeout(startWhatsAppBot, 1000);
      return Response.json({ success: true });
    }

    // Rota Principal: Dashboard HTML Moderno Cyber Glass
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderFuturisticDashboardHTML(), {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`\n======================================================`);
console.log(`🌐 Servidor WhatsGemini Pro 1000000% rodando em: http://localhost:${PORT}`);
console.log(`======================================================\n`);

/**
 * Renderiza o Dashboard Ultra-Moderno Cyber Glass
 */
function renderFuturisticDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsGemini Pro 1000000% - Painel de Controle Total</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: radial-gradient(circle at 15% 20%, #0d1b24 0%, #060a0e 100%);
      color: #f1f5f9;
      min-height: 100vh;
    }
    .glass-panel {
      background: rgba(15, 23, 34, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);
    }
    .glass-card {
      background: rgba(22, 33, 49, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .nav-tab-btn {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nav-tab-btn.active {
      background: linear-gradient(135deg, #00e676 0%, #00b0ff 100%);
      color: #041014;
      font-weight: 800;
      box-shadow: 0 4px 20px rgba(0, 230, 118, 0.35);
    }
    .qr-frame {
      background: white;
      padding: 16px;
      border-radius: 24px;
      box-shadow: 0 0 50px rgba(0, 230, 118, 0.25);
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 999px; }
    ::-webkit-scrollbar-thumb:hover { background: #00e676; }
    .badge-glow {
      box-shadow: 0 0 12px currentColor;
    }
  </style>
</head>
<body class="flex flex-col">

  <!-- Top Cyber Bar -->
  <header class="glass-panel sticky top-0 z-50 border-b border-white/10 px-6 py-4">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
      
      <!-- Brand & Identity -->
      <div class="flex items-center gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00e676] to-[#00b0ff] p-0.5 shadow-lg shadow-[#00e676]/30 flex items-center justify-center">
          <div class="w-full h-full bg-[#060a0e] rounded-[14px] flex items-center justify-center text-xl">
            ⚡
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-black tracking-tight text-white">WhatsGemini Pro</h1>
            <span class="text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#00e676]/20 to-[#00b0ff]/20 text-[#00e676] border border-[#00e676]/30 uppercase">
              1.000.000% Ultra
            </span>
          </div>
          <p class="text-xs text-slate-400 font-medium">Reconhecimento de Pessoas • Áudio PTT • Figurinhas • Vendas IPTV</p>
        </div>
      </div>

      <!-- Live Counters & Toggle -->
      <div class="flex items-center gap-3">
        <!-- Status Indicator -->
        <div id="conn-badge" class="flex items-center gap-2.5 bg-black/40 px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-semibold">
          <span class="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping" id="conn-dot"></span>
          <span id="conn-text" class="text-yellow-400">Verificando...</span>
        </div>

        <!-- Master Switch -->
        <button id="btn-toggle-bot" class="flex items-center gap-2 bg-[#00e676] hover:bg-[#00c853] text-[#060a0e] font-extrabold text-xs px-5 py-2 rounded-full transition-all shadow-lg shadow-[#00e676]/25 active:scale-95">
          <span class="text-sm">🤖</span>
          <span id="bot-status-text">ROBÔ ATIVO</span>
        </button>
      </div>

    </div>
  </header>

  <!-- Navigation Tab Bar -->
  <nav class="bg-black/30 border-b border-white/5 px-6 py-2 sticky top-[77px] z-40 backdrop-blur-md">
    <div class="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto py-1">
      <button class="nav-tab-btn active px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-feed">
        <span>⚡</span> Atividade ao Vivo
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-contacts">
        <span>👥</span> Diretório de Pessoas <span id="contacts-count-badge" class="px-1.5 py-0.2 bg-white/10 text-white rounded-full text-[10px]">0</span>
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-audio">
        <span>🎙️</span> Estúdio de Áudio IA
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-stickers">
        <span>🎭</span> Figurinhas (Stickers)
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-girlfriend">
        <span>❤️</span> Namorada VIP
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-business">
        <span>💼</span> Negócios & IPTV (R$ 20)
      </button>
      <button class="nav-tab-btn px-4 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0" data-tab="tab-qr">
        <span>📱</span> Conexão WhatsApp
      </button>
    </div>
  </nav>

  <!-- Main Content Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-6">

    <!-- ==================== TAB 1: FEED AO VIVO ==================== -->
    <div id="tab-feed" class="tab-pane grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Left: Live KPI Metrics -->
      <div class="lg:col-span-4 space-y-6">
        <div class="glass-panel rounded-3xl p-6 space-y-5">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-extrabold text-white flex items-center gap-2">
              <span class="text-[#00e676]">●</span> Métricas em Tempo Real
            </h2>
            <span class="text-[11px] text-slate-400">SSE Ativo</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">Recebidas</span>
              <span class="text-2xl font-black text-white" id="stat-received">0</span>
            </div>
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">Respondidas</span>
              <span class="text-2xl font-black text-[#00e676]" id="stat-replied">0</span>
            </div>
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">🎙️ Áudios Gerados</span>
              <span class="text-2xl font-black text-cyan-400" id="stat-audios">0</span>
            </div>
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">🎭 Figurinhas</span>
              <span class="text-2xl font-black text-purple-400" id="stat-stickers">0</span>
            </div>
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">👀 Não Sabem Ler</span>
              <span class="text-2xl font-black text-amber-400" id="stat-cantread">0</span>
            </div>
            <div class="glass-card p-4 rounded-2xl">
              <span class="text-[11px] font-semibold text-slate-400 block mb-1">🚫 Grupos Ignorados</span>
              <span class="text-2xl font-black text-slate-400" id="stat-groups">0</span>
            </div>
          </div>

          <div class="border-t border-white/5 pt-4 text-[11px] text-slate-400 space-y-2">
            <div class="flex items-center justify-between">
              <span>IA Principal:</span>
              <span class="text-white font-mono font-semibold">Gemini Flash Lite (~0.8s)</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Gerador de Voz:</span>
              <span class="text-white font-mono font-semibold">Gemini TTS 3.8 (PTT)</span>
            </div>
          </div>
        </div>

        <!-- Quick Manual WhatsApp Sender -->
        <div class="glass-panel rounded-3xl p-6 space-y-4">
          <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <span>✉️</span> Envio Rápido Manual
          </h3>
          <input type="text" id="quick-target-input" placeholder="Número ou Selecione no CRM" class="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e676]">
          <textarea id="quick-text-input" rows="2" placeholder="Digite uma mensagem para disparar..." class="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e676] resize-none"></textarea>
          <div class="flex items-center justify-between">
            <span id="quick-send-status" class="text-xs text-slate-400"></span>
            <button id="btn-quick-send-text" class="bg-gradient-to-r from-[#00e676] to-[#00b0ff] text-[#060a0e] font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95">
              Enviar Mensagem
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Real-time Message Feed -->
      <div class="lg:col-span-8">
        <div class="glass-panel rounded-3xl p-6 min-h-[600px] flex flex-col">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 class="text-base font-extrabold text-white flex items-center gap-2">
                <span>💬</span> Feed de Conversas Interativo
              </h2>
              <p class="text-xs text-slate-400">Respostas autônomas em tempo real sem qualquer delay de robô</p>
            </div>
            
            <!-- Feed Filters -->
            <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
              <button class="filter-btn active px-3 py-1 rounded-lg text-slate-300 font-semibold hover:text-white" data-filter="all">Todas</button>
              <button class="filter-btn px-3 py-1 rounded-lg text-slate-300 font-semibold hover:text-white" data-filter="girlfriend">❤️ Namorada</button>
              <button class="filter-btn px-3 py-1 rounded-lg text-slate-300 font-semibold hover:text-white" data-filter="audio">🎙️ Áudios</button>
              <button class="filter-btn px-3 py-1 rounded-lg text-slate-300 font-semibold hover:text-white" data-filter="sticker">🎭 Figurinhas</button>
            </div>
          </div>

          <!-- Message Items -->
          <div id="live-feed-list" class="flex-1 overflow-y-auto space-y-4 py-4 pr-1 max-h-[650px]">
            <div class="text-center py-16 text-slate-500 text-xs font-medium">
              Aguardando primeiras mensagens do WhatsApp...
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- ==================== TAB 2: DIRETÓRIO DE PESSOAS (CRM) ==================== -->
    <div id="tab-contacts" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-6">
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h2 class="text-lg font-black text-white flex items-center gap-2.5">
              <span>👥</span> CRM e Identificação Inteligente de Pessoas
            </h2>
            <p class="text-xs text-slate-400">
              Cada pessoa possui contexto e histórico 100% isolados. A IA nunca mistura o papo da Namorada com Clientes ou Amigos!
            </p>
          </div>

          <!-- Search & Filter -->
          <div class="flex items-center gap-3">
            <input type="text" id="contact-search-input" placeholder="Buscar por nome ou número..." class="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-[#00e676] w-64">
          </div>
        </div>

        <!-- Contacts Grid -->
        <div id="contacts-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          <!-- Rendered via JS -->
        </div>

      </div>
    </div>

    <!-- ==================== TAB 3: ESTÚDIO DE ÁUDIO IA ==================== -->
    <div id="tab-audio" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl text-cyan-400">
            🎙️
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Estúdio de Áudio IA (Gemini TTS 3.8)</h2>
            <p class="text-xs text-slate-400">Gera notas de voz autênticas do WhatsApp com waveform (PTT: true) direto pelo microfone da IA</p>
          </div>
        </div>

        <!-- Audio Presets -->
        <div>
          <label class="text-xs font-bold text-slate-300 block mb-2">⚡ Respostas Prontas em Voz (Clique para usar):</label>
          <div class="flex flex-wrap gap-2">
            <button class="quick-audio-btn text-xs bg-black/40 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300" data-text="Opa, fala aí! Mandei esse áudio rapidinho aqui pra te responder, tamo junto!">
              🗣️ Saudação Rápida
            </button>
            <button class="quick-audio-btn text-xs bg-black/40 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300" data-text="Oi amor, claro que eu te amo! Tô aqui trabalhando agora mas logo logo tô com você, tá bom? Beijo!">
              ❤️ Carinho Namorada
            </button>
            <button class="quick-audio-btn text-xs bg-black/40 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300" data-text="Fechado nos vinte reais mesmo! Quer que eu já te mande a chave Pix pra liberar os canais?">
              💼 Negociação IPTV
            </button>
            <button class="quick-audio-btn text-xs bg-black/40 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300" data-text="Tô no volante aqui no trânsito agora, já te chamo certinho quando eu parar!">
              🚗 No Trânsito
            </button>
            <button class="quick-audio-btn text-xs bg-black/40 hover:bg-white/10 border border-white/10 px-3.5 py-1.5 rounded-full text-slate-300" data-text="Não se preocupa não, vou te mandar tudo por áudio pra ficar bem fácil de você entender!">
              👀 Para quem não sabe ler
            </button>
          </div>
        </div>

        <!-- Custom Audio Generator -->
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1.5">Número de Destino (WhatsApp):</label>
              <input type="text" id="audio-target-input" placeholder="Ex: 191813272993834 ou 5581..." class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1.5">Voz da IA (Gemini Prebuilt Voice):</label>
              <select id="audio-voice-select" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
                <option value="Puck">Puck (Jovem, Descontraído, Brasileiro Natural)</option>
                <option value="Charon">Charon (Grave, Confiante, Firme)</option>
                <option value="Kore">Kore (Voz Calma e Suave)</option>
                <option value="Fenrir">Fenrir (Voz Forte e Energética)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Texto que o Íthalo vai falar no áudio:</label>
            <textarea id="audio-text-input" rows="3" placeholder="Digite o que a voz da IA deve falar com entonação humana natural..." class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"></textarea>
          </div>

          <!-- Player Preview -->
          <div id="audio-player-box" class="hidden glass-card p-4 rounded-2xl flex items-center justify-between gap-4">
            <audio id="audio-preview-element" controls class="w-full h-10 rounded-lg"></audio>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="audio-generation-status" class="text-xs font-semibold text-slate-400"></span>
            <div class="flex items-center gap-3">
              <button id="btn-generate-audio-preview" class="bg-white/10 hover:bg-white/15 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all">
                🎧 Ouvir Prévia
              </button>
              <button id="btn-send-audio-whatsapp" class="bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-cyan-500/25 active:scale-95">
                🚀 Enviar Áudio no WhatsApp
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ==================== TAB 4: CENTRAL DE FIGURINHAS (STICKERS) ==================== -->
    <div id="tab-stickers" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-8 max-w-4xl mx-auto space-y-6">
        
        <div class="flex items-center justify-between border-b border-white/10 pb-6">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-2xl text-purple-400">
              🎭
            </div>
            <div>
              <h2 class="text-lg font-black text-white">Central de Figurinhas (Stickers WebP)</h2>
              <p class="text-xs text-slate-400">Envie figurinhas com 1 clique ou deixe a IA responder memes e piadas automaticamente</p>
            </div>
          </div>

          <div class="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
            <span class="text-xs text-slate-300 font-semibold">Respostas com Figurinha Automática:</span>
            <input type="checkbox" id="toggle-auto-stickers" class="w-4 h-4 accent-[#00e676] rounded cursor-pointer">
          </div>
        </div>

        <!-- Target Contact for Sticker -->
        <div class="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
          <div class="flex-1 w-full">
            <label class="text-xs font-bold text-slate-300 block mb-1">Contato Destino para o Sticker:</label>
            <input type="text" id="sticker-target-input" placeholder="Digite o número (ex: 191813272993834)" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-400">
          </div>
          <div class="text-xs text-slate-400 font-medium pt-4 sm:pt-0">
            Clique em qualquer figurinha abaixo para disparar na hora!
          </div>
        </div>

        <!-- Stickers Gallery Grid -->
        <div id="stickers-gallery-grid" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Rendered via JS -->
        </div>

      </div>
    </div>

    <!-- ==================== TAB 5: NAMORADA VIP ==================== -->
    <div id="tab-girlfriend" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-8 max-w-3xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-2xl text-rose-400">
            ❤️
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Namorada VIP (Heloisa Guimarães)</h2>
            <p class="text-xs text-slate-400">Tratamento prioritário autêntico de namorado real, calibrado com zero emojis e zero afetação</p>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Nome ou Identificação do Contato:</label>
            <input type="text" id="gf-name-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-400 font-semibold">
          </div>

          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Instrução de Comportamento Especial:</label>
            <textarea id="gf-prompt-input" rows="4" class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-rose-400 resize-none font-sans"></textarea>
            <p class="text-[11px] text-slate-400 mt-1">A Heloisa estranha se mandar emojis! O bot remove automaticamente corações e carinhas amarelas para ela.</p>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="gf-save-status" class="text-xs font-semibold text-rose-400"></span>
            <button id="btn-save-gf-config" class="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/25">
              Salvar Configuração VIP
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ==================== TAB 6: NEGÓCIOS & IPTV ==================== -->
    <div id="tab-business" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-8 max-w-3xl mx-auto space-y-6">
        
        <div class="flex items-center gap-4 border-b border-white/10 pb-6">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl text-emerald-400">
            💼
          </div>
          <div>
            <h2 class="text-lg font-black text-white">Negócios & IPTV Completo (R$ 20/mês)</h2>
            <p class="text-xs text-slate-400">A IA negocia diretamente com clientes, tira dúvidas sobre canais e envia a chave Pix para fechar</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1.5">Nome do Produto:</label>
              <input type="text" id="biz-product-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e676]">
            </div>
            <div>
              <label class="text-xs font-bold text-slate-300 block mb-1.5">Valor Mensal:</label>
              <input type="text" id="biz-price-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e676]">
            </div>
          </div>

          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Chave Pix para Recebimento:</label>
            <input type="text" id="biz-pix-input" class="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#00e676]">
          </div>

          <div>
            <label class="text-xs font-bold text-slate-300 block mb-1.5">Argumentos de Venda e Detalhes dos Canais:</label>
            <textarea id="biz-desc-input" rows="3" class="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-[#00e676] resize-none"></textarea>
          </div>

          <div class="flex items-center justify-between pt-2">
            <span id="biz-save-status" class="text-xs font-semibold text-[#00e676]"></span>
            <button id="btn-save-biz-config" class="bg-[#00e676] hover:bg-[#00c853] text-[#060a0e] font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-[#00e676]/25">
              Salvar Catálogo IPTV
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- ==================== TAB 7: CONEXÃO WHATSAPP (QR) ==================== -->
    <div id="tab-qr" class="tab-pane hidden space-y-6">
      <div class="glass-panel rounded-3xl p-8 max-w-xl mx-auto text-center space-y-6">
        
        <h2 class="text-lg font-black text-white flex items-center justify-center gap-2">
          <span>📱</span> Conexão Multi-Device
        </h2>

        <!-- Connected State -->
        <div id="qr-connected-card" class="hidden bg-[#00e676]/10 border border-[#00e676]/30 p-6 rounded-2xl space-y-3">
          <div class="w-14 h-14 bg-[#00e676]/20 rounded-full flex items-center justify-center text-2xl mx-auto text-[#00e676]">
            ✓
          </div>
          <h3 class="text-base font-extrabold text-white">Dispositivo Conectado com Sucesso!</h3>
          <p class="text-xs text-slate-300">Número ativo: <strong id="qr-user-phone" class="text-[#00e676]">Carregando...</strong></p>
          <div class="pt-2">
            <button id="btn-disconnect-session" class="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-xs font-bold px-4 py-2 rounded-xl transition-all">
              Desconectar Aparelho
            </button>
          </div>
        </div>

        <!-- Waiting QR State -->
        <div id="qr-waiting-card" class="space-y-4">
          <p class="text-xs text-slate-400">Abra o WhatsApp no seu celular > <strong>Aparelhos Conectados</strong> > <strong>Conectar Aparelho</strong></p>
          <div class="qr-frame inline-block mx-auto">
            <img id="qr-image" src="" alt="QR Code" class="w-64 h-64 object-contain">
          </div>
          <p class="text-[11px] text-slate-500">O QR Code atualiza automaticamente se expirar.</p>
        </div>

      </div>
    </div>

  </main>

  <!-- Client JavaScript Logic -->
  <script>
    // Estado Local
    let currentConfig = null;
    let currentStats = null;
    let currentContacts = [];
    let currentFilter = 'all';

    // Elementos DOM
    const connDot = document.getElementById("conn-dot");
    const connText = document.getElementById("conn-text");
    const botStatusText = document.getElementById("bot-status-text");
    const btnToggleBot = document.getElementById("btn-toggle-bot");

    const statReceived = document.getElementById("stat-received");
    const statReplied = document.getElementById("stat-replied");
    const statAudios = document.getElementById("stat-audios");
    const statStickers = document.getElementById("stat-stickers");
    const statCantRead = document.getElementById("stat-cantread");
    const statGroups = document.getElementById("stat-groups");

    const liveFeedList = document.getElementById("live-feed-list");
    const contactsGrid = document.getElementById("contacts-grid");
    const contactsCountBadge = document.getElementById("contacts-count-badge");
    const stickersGalleryGrid = document.getElementById("stickers-gallery-grid");

    const qrConnectedCard = document.getElementById("qr-connected-card");
    const qrWaitingCard = document.getElementById("qr-waiting-card");
    const qrUserPhone = document.getElementById("qr-user-phone");
    const qrImage = document.getElementById("qr-image");
    const btnDisconnect = document.getElementById("btn-disconnect-session");

    // Inputs Configs
    const gfName = document.getElementById("gf-name-input");
    const gfPrompt = document.getElementById("gf-prompt-input");
    const gfSaveStatus = document.getElementById("gf-save-status");
    const btnSaveGf = document.getElementById("btn-save-gf-config");

    const bizProduct = document.getElementById("biz-product-input");
    const bizPrice = document.getElementById("biz-price-input");
    const bizPix = document.getElementById("biz-pix-input");
    const bizDesc = document.getElementById("biz-desc-input");
    const bizSaveStatus = document.getElementById("biz-save-status");
    const btnSaveBiz = document.getElementById("btn-save-biz-config");

    // Estúdio de Áudio
    const audioTarget = document.getElementById("audio-target-input");
    const audioVoice = document.getElementById("audio-voice-select");
    const audioText = document.getElementById("audio-text-input");
    const audioPlayerBox = document.getElementById("audio-player-box");
    const audioPreviewElement = document.getElementById("audio-preview-element");
    const audioGenerationStatus = document.getElementById("audio-generation-status");
    const btnGeneratePreview = document.getElementById("btn-generate-audio-preview");
    const btnSendAudio = document.getElementById("btn-send-audio-whatsapp");

    // Figurinhas
    const toggleAutoStickers = document.getElementById("toggle-auto-stickers");
    const stickerTargetInput = document.getElementById("sticker-target-input");

    // Envio Rápido Manual
    const quickTargetInput = document.getElementById("quick-target-input");
    const quickTextInput = document.getElementById("quick-text-input");
    const btnQuickSendText = document.getElementById("btn-quick-send-text");
    const quickSendStatus = document.getElementById("quick-send-status");

    // Navegação de Abas
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));

        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        const pane = document.getElementById(tabId);
        if (pane) pane.classList.remove("hidden");
      });
    });

    // Filtros de Feed
    document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active", "bg-white/10", "text-white"));
        btn.classList.add("active", "bg-white/10", "text-white");
        currentFilter = btn.getAttribute("data-filter");
        renderFeedItems();
      });
    });

    // Conexão SSE
    const evtSource = new EventSource("/api/events");

    evtSource.addEventListener("init", e => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user, data.qrDataUrl);
      updateConfig(data.config);
      updateStats(data.stats);
      if (data.contacts) updateContacts(data.contacts);
      if (data.logs) {
        window.allLogs = data.logs;
        renderFeedItems();
      }
      loadStickers();
    });

    evtSource.addEventListener("status", e => {
      const data = JSON.parse(e.data);
      updateStatus(data.status, data.user, null);
    });

    evtSource.addEventListener("qr", e => {
      const data = JSON.parse(e.data);
      updateStatus("WAITING_QR", null, data.qrDataUrl);
    });

    evtSource.addEventListener("stats", e => {
      const data = JSON.parse(e.data);
      updateStats(data);
    });

    evtSource.addEventListener("config", e => {
      const data = JSON.parse(e.data);
      updateConfig(data);
    });

    evtSource.addEventListener("contact_update", e => {
      const contact = JSON.parse(e.data);
      const idx = currentContacts.findIndex(c => c.jid === contact.jid);
      if (idx >= 0) currentContacts[idx] = contact;
      else currentContacts.push(contact);
      renderContacts();
    });

    evtSource.addEventListener("new_reply", e => {
      const log = JSON.parse(e.data);
      if (!window.allLogs) window.allLogs = [];
      window.allLogs.unshift(log);
      if (window.allLogs.length > 80) window.allLogs.pop();
      renderFeedItems();
    });

    function updateStatus(status, user, qrDataUrl) {
      if (status === "CONNECTED") {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-[#00e676] badge-glow";
        connText.innerText = "WhatsApp Conectado";
        connText.className = "text-[#00e676]";

        qrConnectedCard.classList.remove("hidden");
        qrWaitingCard.classList.add("hidden");
        qrUserPhone.innerText = user ? (user.id || user.name) : "Conectado";
      } else if (status === "WAITING_QR" && qrDataUrl) {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-yellow-400 animate-ping";
        connText.innerText = "Escaneie o QR Code";
        connText.className = "text-yellow-400";

        qrConnectedCard.classList.add("hidden");
        qrWaitingCard.classList.remove("hidden");
        qrImage.src = qrDataUrl;
      } else {
        connDot.className = "w-2.5 h-2.5 rounded-full bg-slate-500";
        connText.innerText = "Desconectado";
        connText.className = "text-slate-400";
      }
    }

    function updateConfig(config) {
      if (!config) return;
      currentConfig = config;
      botStatusText.innerText = config.enabled ? "ROBÔ ATIVO" : "ROBÔ PAUSADO";
      btnToggleBot.className = config.enabled
        ? "flex items-center gap-2 bg-[#00e676] hover:bg-[#00c853] text-[#060a0e] font-extrabold text-xs px-5 py-2 rounded-full transition-all shadow-lg shadow-[#00e676]/25 active:scale-95"
        : "flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/40 font-extrabold text-xs px-5 py-2 rounded-full transition-all";

      gfName.value = config.girlfriendName || "";
      gfPrompt.value = config.girlfriendPrompt || "";

      bizProduct.value = config.business?.product || "";
      bizPrice.value = config.business?.price || "";
      bizPix.value = config.business?.pixKey || "";
      bizDesc.value = config.business?.description || "";

      toggleAutoStickers.checked = Boolean(config.autoStickers);
    }

    function updateStats(s) {
      if (!s) return;
      currentStats = s;
      statReceived.innerText = s.receivedCount || 0;
      statReplied.innerText = s.repliedCount || 0;
      statAudios.innerText = s.audiosGenerated || 0;
      statStickers.innerText = s.stickersSent || 0;
      statCantRead.innerText = s.cantReadDetected || 0;
      statGroups.innerText = s.groupsIgnored || 0;
    }

    function updateContacts(contacts) {
      currentContacts = contacts || [];
      contactsCountBadge.innerText = currentContacts.length;
      renderContacts();
    }

    function renderFeedItems() {
      if (!window.allLogs || window.allLogs.length === 0) {
        liveFeedList.innerHTML = '<div class="text-center py-16 text-slate-500 text-xs font-medium">Nenhuma mensagem recente ainda.</div>';
        return;
      }

      let filtered = window.allLogs;
      if (currentFilter === "girlfriend") filtered = filtered.filter(l => l.category === "girlfriend");
      else if (currentFilter === "audio") filtered = filtered.filter(l => l.type === "audio");
      else if (currentFilter === "sticker") filtered = filtered.filter(l => l.type === "sticker");

      liveFeedList.innerHTML = "";
      filtered.forEach(log => {
        const item = document.createElement("div");
        item.className = "glass-card p-4 rounded-2xl border border-white/5 space-y-2.5 transition-all hover:border-white/15";

        let badgeClass = "bg-slate-500/10 text-slate-400 border-slate-500/20";
        let categoryName = "Contato";
        if (log.category === "girlfriend") { badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/30"; categoryName = "❤️ Namorada"; }
        else if (log.category === "client") { badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"; categoryName = "💼 Cliente IPTV"; }
        else if (log.category === "audio_only") { badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/30"; categoryName = "🎙️ Não Sabe Ler"; }

        item.innerHTML = \`
          <div class="flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-white">\${log.contact}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border \${badgeClass}">\${categoryName}</span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>⚡ \${log.duration}s</span>
              <span>•</span>
              <span>\${log.timestamp}</span>
            </div>
          </div>
          <div class="bg-black/30 p-2.5 rounded-xl text-xs text-slate-300">
            <span class="text-slate-500 font-semibold block text-[10px] uppercase">Mensagem Recebida</span>
            \${log.incoming}
          </div>
          <div class="bg-white/5 border border-white/5 p-2.5 rounded-xl text-xs text-white">
            <span class="text-[#00e676] font-bold block text-[10px] uppercase flex items-center gap-1">
              <span>🤖</span> Resposta do Íthalo (WhatsGemini)
            </span>
            <div class="mt-1">\${log.reply}</div>
          </div>
        \`;
        liveFeedList.appendChild(item);
      });
    }

    function renderContacts() {
      contactsGrid.innerHTML = "";
      const search = (document.getElementById("contact-search-input").value || "").toLowerCase();

      const filtered = currentContacts.filter(c => {
        return (c.name || "").toLowerCase().includes(search) || (c.phone || "").includes(search);
      });

      if (filtered.length === 0) {
        contactsGrid.innerHTML = '<div class="col-span-3 text-center py-12 text-slate-500 text-xs">Nenhum contato encontrado.</div>';
        return;
      }

      filtered.forEach(c => {
        const card = document.createElement("div");
        card.className = "glass-card p-5 rounded-2xl border border-white/5 space-y-4";

        let catBadge = "bg-slate-500/10 text-slate-400 border-slate-500/20";
        if (c.category === "girlfriend") catBadge = "bg-rose-500/10 text-rose-400 border-rose-500/30";
        if (c.category === "client") catBadge = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
        if (c.category === "audio_only") catBadge = "bg-amber-500/10 text-amber-400 border-amber-500/30";

        card.innerHTML = \`
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-black text-white">\${c.name || 'Desconhecido'}</h3>
              <p class="text-xs text-slate-400 font-mono">\${c.phone}</p>
            </div>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border \${catBadge}">\${c.category.toUpperCase()}</span>
          </div>

          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between bg-black/30 p-2 rounded-xl">
              <span class="text-slate-300">Áudio Obrigatório (Não sabe ler):</span>
              <input type="checkbox" class="toggle-audio-check w-4 h-4 accent-amber-400" data-jid="\${c.jid}" \${c.cantRead || c.prefersAudio ? 'checked' : ''}>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Categoria:</label>
              <select class="select-category w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" data-jid="\${c.jid}">
                <option value="friend" \${c.category === 'friend' ? 'selected' : ''}>🤝 Amigo / Pessoal</option>
                <option value="client" \${c.category === 'client' ? 'selected' : ''}>💼 Cliente IPTV</option>
                <option value="girlfriend" \${c.category === 'girlfriend' ? 'selected' : ''}>❤️ Namorada VIP</option>
                <option value="audio_only" \${c.category === 'audio_only' ? 'selected' : ''}>🎙️ Não Sabe Ler / Áudio</option>
                <option value="blacklisted" \${c.category === 'blacklisted' ? 'selected' : ''}>🚫 Bloqueado</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Notas do Contato:</label>
              <input type="text" class="input-contact-notes w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white" value="\${c.customNotes || ''}" placeholder="Ex: idoso, vizinho, comprou IPTV" data-jid="\${c.jid}">
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2 border-t border-white/5">
            <button class="btn-use-target flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs py-1.5 rounded-lg transition-all" data-phone="\${c.phone}">
              Usar no Estúdio
            </button>
            <button class="btn-save-contact-card bg-[#00e676]/20 hover:bg-[#00e676]/30 text-[#00e676] font-bold text-xs px-3 py-1.5 rounded-lg transition-all" data-jid="\${c.jid}">
              Salvar
            </button>
          </div>
        \`;

        // Eventos do card
        card.querySelector(".btn-use-target").addEventListener("click", () => {
          quickTargetInput.value = c.phone;
          audioTarget.value = c.phone;
          stickerTargetInput.value = c.phone;
          alert("Contato " + c.name + " (" + c.phone + ") selecionado para envio!");
        });

        card.querySelector(".btn-save-contact-card").addEventListener("click", () => {
          const category = card.querySelector(".select-category").value;
          const notes = card.querySelector(".input-contact-notes").value;
          const cantRead = card.querySelector(".toggle-audio-check").checked;

          fetch("/api/contacts/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jid: c.jid,
              category,
              cantRead,
              prefersAudio: cantRead,
              customNotes: notes
            })
          }).then(() => alert("Perfil de " + c.name + " atualizado!"));
        });

        contactsGrid.appendChild(card);
      });
    }

    document.getElementById("contact-search-input").addEventListener("input", renderContacts);

    async function loadStickers() {
      const res = await fetch("/api/stickers");
      const data = await res.json();
      if (!data.success || !data.stickers) return;

      stickersGalleryGrid.innerHTML = "";
      data.stickers.forEach(s => {
        const card = document.createElement("div");
        card.className = "glass-card p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2 hover:border-purple-400 transition-all cursor-pointer group";
        card.innerHTML = \`
          <img src="\${s.url}" alt="\${s.name}" class="w-24 h-24 object-contain group-hover:scale-105 transition-transform">
          <span class="text-xs font-black text-white">\${s.name}</span>
          <button class="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold py-1 rounded-lg">
            Disparar
          </button>
        \`;

        card.addEventListener("click", () => {
          const target = stickerTargetInput.value.trim();
          if (!target) return alert("Digite o número de destino acima para enviar a figurinha!");
          fetch("/api/send-sticker", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target, stickerFilename: s.filename })
          }).then(r => r.json()).then(res => {
            if (res.success) alert("Figurinha " + s.name + " enviada com sucesso!");
            else alert("Erro: " + (res.error || "falha ao enviar"));
          });
        });

        stickersGalleryGrid.appendChild(card);
      });
    }

    // Ações dos Botões Principais
    btnToggleBot.addEventListener("click", () => fetch("/api/toggle", { method: "POST" }));

    toggleAutoStickers.addEventListener("change", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoStickers: toggleAutoStickers.checked })
      });
    });

    btnSaveGf.addEventListener("click", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          girlfriendName: gfName.value.trim(),
          girlfriendPrompt: gfPrompt.value.trim()
        })
      }).then(() => {
        gfSaveStatus.innerText = "✅ Salvo com sucesso!";
        setTimeout(() => gfSaveStatus.innerText = "", 2500);
      });
    });

    btnSaveBiz.addEventListener("click", () => {
      fetch("/api/update-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            product: bizProduct.value.trim(),
            price: bizPrice.value.trim(),
            pixKey: bizPix.value.trim(),
            description: bizDesc.value.trim(),
            testAvailable: true
          }
        })
      }).then(() => {
        bizSaveStatus.innerText = "✅ Salvo com sucesso!";
        setTimeout(() => bizSaveStatus.innerText = "", 2500);
      });
    });

    btnDisconnect.addEventListener("click", () => {
      if (confirm("Deseja realmente desconectar o WhatsApp? Você precisará ler o QR Code novamente.")) {
        fetch("/api/disconnect", { method: "POST" });
      }
    });

    // Estúdio de Áudio
    document.querySelectorAll(".quick-audio-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        audioText.value = btn.getAttribute("data-text");
      });
    });

    btnGeneratePreview.addEventListener("click", async () => {
      const text = audioText.value.trim();
      const voice = audioVoice.value;
      if (!text) return alert("Digite o texto do áudio!");

      audioGenerationStatus.innerText = "⏳ Gerando voz humana com IA...";
      audioGenerationStatus.className = "text-xs font-semibold text-cyan-400";

      const res = await fetch("/api/generate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice })
      });
      const data = await res.json();
      if (data.success && data.audioUrl) {
        audioPreviewElement.src = data.audioUrl;
        audioPlayerBox.classList.remove("hidden");
        audioPreviewElement.play();
        audioGenerationStatus.innerText = "✅ Áudio pronto para ouvir ou disparar!";
        audioGenerationStatus.className = "text-xs font-semibold text-[#00e676]";
      } else {
        audioGenerationStatus.innerText = "❌ Erro ao sintetizar áudio";
        audioGenerationStatus.className = "text-xs font-semibold text-red-400";
      }
    });

    btnSendAudio.addEventListener("click", async () => {
      const target = audioTarget.value.trim();
      const text = audioText.value.trim();
      const voice = audioVoice.value;
      if (!target || !text) return alert("Preencha o contato e o texto do áudio!");

      audioGenerationStatus.innerText = "🚀 Enviando nota de voz PTT para " + target + "...";
      audioGenerationStatus.className = "text-xs font-semibold text-yellow-400";

      const res = await fetch("/api/send-audio-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, text, voice })
      });
      const data = await res.json();
      if (data.success) {
        audioGenerationStatus.innerText = "✅ Nota de voz PTT enviada com sucesso!";
        audioGenerationStatus.className = "text-xs font-semibold text-[#00e676]";
      } else {
        audioGenerationStatus.innerText = "❌ Erro: " + (data.error || "Falha no envio");
        audioGenerationStatus.className = "text-xs font-semibold text-red-400";
      }
    });

    // Envio Rápido de Texto
    btnQuickSendText.addEventListener("click", async () => {
      const target = quickTargetInput.value.trim();
      const text = quickTextInput.value.trim();
      if (!target || !text) return alert("Preencha o número de destino e o texto!");

      quickSendStatus.innerText = "Enviando...";
      const res = await fetch("/api/send-text-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, text })
      });
      const data = await res.json();
      if (data.success) {
        quickSendStatus.innerText = "✅ Mensagem enviada!";
        quickTextInput.value = "";
        setTimeout(() => quickSendStatus.innerText = "", 2500);
      } else {
        quickSendStatus.innerText = "❌ Erro: " + (data.error || "falha");
      }
    });
  </script>
</body>
</html>`;
}
