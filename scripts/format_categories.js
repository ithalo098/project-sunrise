import fs from 'node:fs';

const filePath = 'C:/Users/grautecnico/.gemini/antigravity-ide/scratch/project-sunrise/src/data/smm-services.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Mapping for clean, organized categories matching BRSMM and user request
const categoryMap = [
  // Instagram
  { old: 'Instagram ➡️ Visualizações (Vídeos, Reels, Post)', new: '📸 Instagram ➖ Visualizações (Vídeos, Reels, Post)' },
  { old: 'Instagram ➡️ Visualizações em Stories', new: '📸 Instagram ➖ Visualização em Stories' },
  { old: 'Instagram ➡️ Seguidores Brasileiros', new: '📸 Instagram ➖ Seguidores Brasileiros 🇧🇷' },
  { old: 'Instagram ➡️ Seguidores Mundiais', new: '📸 Instagram ➖ Seguidores Mundiais 🌍' },
  { old: 'Instagram ➡️ Curtidas Brasileiras', new: '📸 Instagram ➖ Curtidas Brasileiras 🇧🇷' },
  { old: 'Instagram ➡️ Curtidas Mundiais', new: '📸 Instagram ➖ Curtidas Mundiais 🌍' },
  { old: 'Instagram ➡️ Comentários Brasileiros', new: '📸 Instagram ➖ Comentários Brasileiros 🇧🇷' },
  { old: 'Instagram ➡️ Repost & Compartilhamento', new: '📸 Instagram ➖ Repost & Compartilhamento' },
  { old: 'Instagram ➡️ Salvamentos & Alcance', new: '📸 Instagram ➖ Salvamentos, Impressões & Alcance' },

  // TikTok
  { old: 'TikTok ➡️ Visualizações', new: '🎵 TikTok (TTK) ➖ Visualizações 🚀' },
  { old: 'TikTok ➡️ Seguidores', new: '🎵 TikTok (TTK) ➖ Seguidores 👥' },
  { old: 'TikTok ➡️ Curtidas', new: '🎵 TikTok (TTK) ➖ Curtidas ❤️' },
  { old: 'TikTok ➡️ Comentários', new: '🎵 TikTok (TTK) ➖ Comentários 💬' },
  { old: 'TikTok ➡️ Transmissão ao Vivo (Live)', new: '🎵 TikTok (TTK) ➖ Transmissão ao Vivo (Live) 🔴' },
  { old: 'TikTok ➡️ Salvamentos & Compartilhamentos', new: '🎵 TikTok (TTK) ➖ Salvamentos & Compartilhamento' },

  // YouTube
  { old: 'YouTube ➡️ Visualizações', new: '📺 YouTube (yt) ➖ Visualizações 🚀' },
  { old: 'YouTube ➡️ Shorts', new: '📺 YouTube (yt) ➖ Shorts ⚡' },
  { old: 'YouTube ➡️ Inscritos', new: '📺 YouTube (yt) ➖ Inscritos 🔔' },
  { old: 'YouTube ➡️ Curtidas (Likes)', new: '📺 YouTube (yt) ➖ Curtidas (Likes) 👍' },
  { old: 'YouTube ➡️ Comentários', new: '📺 YouTube (yt) ➖ Comentários 💬' },
  { old: 'YouTube ➡️ Watch Time (Horas de Exibição)', new: '📺 YouTube (yt) ➖ Watch Time (Horas de Exibição) ⏱️' },

  // Kwai
  { old: 'Kwai ➡️ Seguidores', new: '🔥 Kwai ➖ Seguidores 👥' },
  { old: 'Kwai ➡️ Shop Seguidores', new: '🔥 Kwai ➖ Shop Seguidores 🛍️' },
  { old: 'Kwai ➡️ Curtidas', new: '🔥 Kwai ➖ Curtidas ❤️' },
  { old: 'Kwai ➡️ Visualizações', new: '🔥 Kwai ➖ Visualizações 👁️' },
  { old: 'Kwai ➡️ Comentários', new: '🔥 Kwai ➖ Comentários 💬' },

  // Spotify
  { old: 'Spotify ➡️ Reproduções (Streams)', new: '🎧 Spotify ➖ Reproduções (Streams) 🎵' },
  { old: 'Spotify ➡️ Seguidores', new: '🎧 Spotify ➖ Seguidores de Artista / Playlist 👥' },

  // Kick
  { old: 'Kick ➡️ Transmissão ao Vivo (Live)', new: '🟢 Kick ➖ Transmissão ao Vivo (Live) 🟢' },
  { old: 'Kick ➡️ Seguidores', new: '🟢 Kick ➖ Seguidores de Canal 👥' },
  { old: 'Kick ➡️ Visualizações', new: '🟢 Kick ➖ Visualizações de Vídeo 👁️' },

  // Twitch
  { old: 'Twitch ➡️ Espectadores em Live', new: '💜 Twitch ➖ Espectadores em Live 💜' },
  { old: 'Twitch ➡️ Seguidores', new: '💜 Twitch ➖ Seguidores de Canal 👥' },

  // Facebook
  { old: 'Facebook ➡️ Seguidores', new: '🔵 Facebook ➖ Seguidores de Página / Perfil 👍' },
  { old: 'Facebook ➡️ Curtidas & Reações', new: '🔵 Facebook ➖ Curtidas & Reações ❤️' },
  { old: 'Facebook ➡️ Visualizações', new: '🔵 Facebook ➖ Visualizações em Vídeos 👁️' },

  // Twitter
  { old: 'Twitter (X) ➡️ Seguidores', new: '🐦 Twitter (X) ➖ Seguidores 👥' },
  { old: 'Twitter (X) ➡️ Retweets', new: '🐦 Twitter (X) ➖ Retweets 🔄' },
  { old: 'Twitter (X) ➡️ Curtidas', new: '🐦 Twitter (X) ➖ Curtidas ❤️' },

  // Telegram / WhatsApp
  { old: 'Telegram ➡️ Membros', new: '💬 Telegram ➖ Membros em Canais & Grupos 👥' },
  { old: 'WhatsApp ➡️ Canais & Comunidades', new: '💬 WhatsApp ➖ Canais & Comunidades 👥' },
];

for (const map of categoryMap) {
  content = content.replaceAll(`category: "${map.old}"`, `category: "${map.new}"`);
}

// Add Promo Services if not already present
if (!content.includes('✈️ Promoção BRSMM ⚡ [Barato & Recomendado]')) {
  const promoSection = `export const SMM_SERVICES: SMMService[] = [
  // ==================== ✈️ PROMOÇÃO BRSMM (BARATO & RECOMENDADO) ====================
  {
    id: 1001,
    platform: "instagram",
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
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
  {
    id: 1009,
    platform: "kwai",
    category: "✈️ Promoção BRSMM ⚡ [Barato & Recomendado]",
    name: "Kwai Visualizações em Vídeo ➡️ [ Rápido | Sem Queda ] 🔥",
    pricePerThousand: 0.25,
    minQuantity: 100,
    maxQuantity: 1000000,
    averageTime: "12 minutos",
    refill: false,
    speed: "100.000 por dia",
    description: "Visualizações para impulsionar qualquer vídeo no Kwai rapidamente.",
    badge: "Kwai 🔥",
  },
`;
  content = content.replace('export const SMM_SERVICES: SMMService[] = [', promoSection);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Categories updated successfully!');
