import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const stickersDir = join(process.cwd(), "stickers");
if (!existsSync(stickersDir)) {
  mkdirSync(stickersDir, { recursive: true });
}

interface StickerDef {
  filename: string;
  emoji: string;
  text: string;
  color: string;
}

const list: StickerDef[] = [
  { filename: "tmj.webp", emoji: "🤝", text: "TAMU JUNTO!", color: "#10B981" },
  { filename: "fechado.webp", emoji: "🚀", text: "FECHADO!", color: "#3B82F6" },
  { filename: "rindo.webp", emoji: "🤣", text: "KKKKKKKK", color: "#F59E0B" },
  { filename: "deboa.webp", emoji: "😎", text: "DE BOA!", color: "#6366F1" },
  { filename: "top.webp", emoji: "🔥", text: "TOP DEMAIS!", color: "#EF4444" },
  { filename: "valeu.webp", emoji: "👍", text: "VALEU!", color: "#059669" },
  { filename: "show.webp", emoji: "⭐", text: "SHOW DE BOLA!", color: "#8B5CF6" },
  { filename: "pensativo.webp", emoji: "🤔", text: "SERÁ?", color: "#64748B" }
];

async function generate() {
  for (const s of list) {
    const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${s.color}" stop-opacity="1" />
          <stop offset="100%" stop-color="#0b141a" stop-opacity="0.9" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
        </filter>
      </defs>
      <rect x="24" y="24" width="464" height="464" rx="90" fill="url(#grad)" stroke="#ffffff" stroke-width="8" filter="url(#shadow)"/>
      <text x="256" y="250" font-size="160" text-anchor="middle" dominant-baseline="middle">${s.emoji}</text>
      <rect x="56" y="360" width="400" height="74" rx="24" fill="#000000" fill-opacity="0.55"/>
      <text x="256" y="412" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="900" font-size="40" fill="#ffffff" text-anchor="middle" letter-spacing="2">${s.text}</text>
    </svg>`;

    const dest = join(stickersDir, s.filename);
    await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(dest);
    console.log("Sticker pronto:", s.filename);
  }
  console.log("✅ Todos os stickers foram gerados com sucesso!");
}

generate();

