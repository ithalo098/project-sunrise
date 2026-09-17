import fs from 'node:fs';

const filePath = 'C:/Users/grautecnico/.gemini/antigravity-ide/scratch/project-sunrise/src/data/smm-services.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Replacements for category names
content = content.replace(/category:\s*"Instagram ➡️/g, 'category: "📸 Instagram ➡️');
content = content.replace(/category:\s*"TikTok ➡️/g, 'category: "🎵 TikTok (TTK) ➡️');
content = content.replace(/category:\s*"YouTube ➡️/g, 'category: "📺 YouTube (YT) ➡️');
content = content.replace(/category:\s*"Kwai ➡️/g, 'category: "🔥 Kwai ➡️');
content = content.replace(/category:\s*"Spotify ➡️/g, 'category: "🎧 Spotify ➡️');
content = content.replace(/category:\s*"Kick ➡️/g, 'category: "🟢 Kick ➡️');
content = content.replace(/category:\s*"Twitch ➡️/g, 'category: "💜 Twitch ➡️');
content = content.replace(/category:\s*"Facebook ➡️/g, 'category: "🔵 Facebook ➡️');
content = content.replace(/category:\s*"Twitter \(X\) ➡️/g, 'category: "🐦 Twitter (X) ➡️');
content = content.replace(/category:\s*"Telegram ➡️/g, 'category: "💬 Telegram ➡️');
content = content.replace(/category:\s*"WhatsApp ➡️/g, 'category: "💬 WhatsApp ➡️');

// Add Promo category at the beginning of SMM_SERVICES
const promoServices = `export const SMM_SERVICES: SMMService[] = [
  // ==================== PROMOÇÃO BRSMM (BARATO & RECOMENDADO) ====================
  {
    id: 1001,
    platform: "instagram",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Instagram Visualizações ➡️ [ Alta Qualidade | 100K/Dia | Queda: Não ] ⛔🚀",
    pricePerThousand: 0.0089,
    minQuantity: 100,
    maxQuantity: 1000000000,
    averageTime: "19 minutos",
    refill: false,
    speed: "100.000 por dia",
    description: "Visualizações instantâneas no menor preço do Brasil. Ideal para Reels e vídeos.",
    badge: "Super Promo ⚡",
  },
  {
    id: 1002,
    platform: "tiktok",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "TikTok Visualizações ➡️ [ Velocidade: 5M+/Dia | Recarga: Não ] 🚀",
    pricePerThousand: 0.0495,
    minQuantity: 100,
    maxQuantity: 1000000000,
    averageTime: "10 horas 34 min",
    refill: false,
    speed: "5.000.000 por dia",
    description: "Visualizações ultra baratas para viralizar vídeos no TikTok em escala.",
    badge: "Viral 🔥",
  },
  {
    id: 1003,
    platform: "instagram",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Instagram Curtidas Brasileiras ➡️ [ Alta Qualidade | +5K/Dia | Recarga: 30 Dias ] 🇧🇷♻️🚀",
    pricePerThousand: 2.079,
    minQuantity: 10,
    maxQuantity: 20000,
    averageTime: "1 hora 52 min",
    refill: true,
    refillDays: 30,
    speed: "5.000 por dia",
    description: "Curtidas de contas brasileiras ativas com garantia de reposição de 30 dias.",
    badge: "Brasil 🇧🇷",
  },
  {
    id: 1004,
    platform: "instagram",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Instagram Seguidores Brasileiros ➡️ [ Alta Qualidade | +5K/Dia | Recarga: 30 Dias ] 🇧🇷♻️🚀",
    pricePerThousand: 42.075,
    minQuantity: 20,
    maxQuantity: 100000,
    averageTime: "7 horas 8 min",
    refill: true,
    refillDays: 30,
    speed: "5.000 por dia",
    description: "Seguidores brasileiros com foto, bio e publicações. Reposição garantida por 30 dias.",
    badge: "Mais Vendido 🔥",
  },
  {
    id: 1005,
    platform: "youtube",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "YouTube Visualizações ➡️ [ Início Rápido | 50K/Dia | Não Cai ] 🚀",
    pricePerThousand: 9.50,
    minQuantity: 100,
    maxQuantity: 10000000,
    averageTime: "1 hora",
    refill: true,
    refillDays: 30,
    speed: "50.000 por dia",
    description: "Visualizações de retenção orgânica para impulsionar o algoritmo do YouTube.",
    badge: "YouTube 📺",
  },
  {
    id: 1006,
    platform: "spotify",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Spotify Reproduções (Streams) ➡️ [ 100% Monetizáveis | Tráfego Real ] 🎵",
    pricePerThousand: 7.90,
    minQuantity: 500,
    maxQuantity: 5000000,
    averageTime: "2 horas",
    refill: true,
    refillDays: 60,
    speed: "10.000 por dia",
    description: "Streams monetizáveis elegíveis para royalties de distribuidoras.",
    badge: "Spotify 🎧",
  },
  {
    id: 1007,
    platform: "kick",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Kick Seguidores de Canal ➡️ [ Alta Qualidade | Instantâneo ] 🟢",
    pricePerThousand: 5.35,
    minQuantity: 50,
    maxQuantity: 100000,
    averageTime: "15 minutos",
    refill: true,
    refillDays: 30,
    speed: "5.000 por dia",
    description: "Seguidores para monetizar seu canal no Kick rapidamente.",
    badge: "Kick 🟢",
  },
  {
    id: 1008,
    platform: "twitch",
    category: "⚡ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Twitch Espectadores em Live ➡️ [ 60 Minutos | Estáveis ] 🟣",
    pricePerThousand: 0.59,
    minQuantity: 10,
    maxQuantity: 5000,
    averageTime: "5 minutos",
    refill: false,
    speed: "Instantâneo",
    description: "Espectadores simultâneos para bater metas de afiliado na Twitch.",
    badge: "Twitch 💜",
  },
`;

content = content.replace('export const SMM_SERVICES: SMMService[] = [', promoServices);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Categories updated successfully!');
