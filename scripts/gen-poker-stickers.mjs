/** Write poker-themed SVG stickers with transparent backgrounds. */
import fs from "fs";
import path from "path";

const dir = path.resolve("public/stickers");
fs.mkdirSync(dir, { recursive: true });

function wrap(inner, view = "0 0 128 128") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="256" height="256" fill="none">
${inner}
</svg>
`;
}

const stickers = {
  "ace-spades": wrap(`
  <defs>
    <linearGradient id="g" x1="20" y1="8" x2="108" y2="120" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2a2a32"/><stop offset="1" stop-color="#0b0b10"/>
    </linearGradient>
  </defs>
  <rect x="18" y="10" width="92" height="108" rx="12" fill="url(#g)" stroke="#F5C518" stroke-width="3"/>
  <text x="30" y="36" fill="#F5C518" font-family="Georgia,serif" font-size="22" font-weight="700">A</text>
  <path d="M64 44c-10 14-22 24-22 36 0 10 8 18 22 18s22-8 22-18c0-12-12-22-22-36z" fill="#F5C518"/>
  <path d="M64 86v18M56 98h16" stroke="#F5C518" stroke-width="3" stroke-linecap="round"/>
  <text x="86" y="108" fill="#F5C518" font-family="Georgia,serif" font-size="18" font-weight="700" transform="rotate(180 94 100)">A</text>
`),

  "ace-hearts": wrap(`
  <rect x="18" y="10" width="92" height="108" rx="12" fill="#1a1014" stroke="#ff4d6d" stroke-width="3"/>
  <text x="30" y="36" fill="#ff4d6d" font-family="Georgia,serif" font-size="22" font-weight="700">A</text>
  <path d="M64 92c18-16 28-28 28-40 0-10-7-16-14-16-5 0-10 3-14 10-4-7-9-10-14-10-7 0-14 6-14 16 0 12 10 24 28 40z" fill="#ff4d6d"/>
  <text x="86" y="108" fill="#ff4d6d" font-family="Georgia,serif" font-size="18" font-weight="700" transform="rotate(180 94 100)">A</text>
`),

  "ace-diamonds": wrap(`
  <rect x="18" y="10" width="92" height="108" rx="12" fill="#1a1210" stroke="#F5C518" stroke-width="3"/>
  <text x="30" y="36" fill="#F5C518" font-family="Georgia,serif" font-size="22" font-weight="700">A</text>
  <path d="M64 38 86 64 64 90 42 64Z" fill="#F5C518"/>
  <text x="86" y="108" fill="#F5C518" font-family="Georgia,serif" font-size="18" font-weight="700" transform="rotate(180 94 100)">A</text>
`),

  "ace-clubs": wrap(`
  <rect x="18" y="10" width="92" height="108" rx="12" fill="#101418" stroke="#7dd3fc" stroke-width="3"/>
  <text x="30" y="36" fill="#7dd3fc" font-family="Georgia,serif" font-size="22" font-weight="700">A</text>
  <circle cx="64" cy="52" r="12" fill="#7dd3fc"/>
  <circle cx="50" cy="68" r="12" fill="#7dd3fc"/>
  <circle cx="78" cy="68" r="12" fill="#7dd3fc"/>
  <path d="M64 70v24M54 90h20" stroke="#7dd3fc" stroke-width="4" stroke-linecap="round"/>
  <text x="86" y="108" fill="#7dd3fc" font-family="Georgia,serif" font-size="18" font-weight="700" transform="rotate(180 94 100)">A</text>
`),

  spade: wrap(`
  <circle cx="64" cy="64" r="56" fill="#111018" stroke="#F5C518" stroke-width="4"/>
  <path d="M64 28c-14 20-30 34-30 50 0 14 11 24 30 24s30-10 30-24c0-16-16-30-30-50z" fill="#F5C518"/>
  <path d="M64 88v22M52 104h24" stroke="#F5C518" stroke-width="5" stroke-linecap="round"/>
`),

  heart: wrap(`
  <circle cx="64" cy="64" r="56" fill="#180e12" stroke="#ff4d6d" stroke-width="4"/>
  <path d="M64 98c26-22 40-38 40-54 0-14-10-22-20-22-8 0-14 4-20 14-6-10-12-14-20-14-10 0-20 8-20 22 0 16 14 32 40 54z" fill="#ff4d6d"/>
`),

  diamond: wrap(`
  <circle cx="64" cy="64" r="56" fill="#16120a" stroke="#F5C518" stroke-width="4"/>
  <path d="M64 22 98 64 64 106 30 64Z" fill="#F5C518"/>
`),

  club: wrap(`
  <circle cx="64" cy="64" r="56" fill="#0e1418" stroke="#86efac" stroke-width="4"/>
  <circle cx="64" cy="44" r="16" fill="#86efac"/>
  <circle cx="46" cy="66" r="16" fill="#86efac"/>
  <circle cx="82" cy="66" r="16" fill="#86efac"/>
  <path d="M64 68v32M50 94h28" stroke="#86efac" stroke-width="6" stroke-linecap="round"/>
`),

  "all-in": wrap(`
  <rect x="8" y="28" width="112" height="72" rx="18" fill="#1a1208" stroke="#F5C518" stroke-width="4"/>
  <text x="64" y="72" text-anchor="middle" fill="#F5C518" font-family="Arial Black,Arial,sans-serif" font-size="28" font-weight="900" letter-spacing="2">ALL-IN</text>
`),

  "royal-flush": wrap(`
  <rect x="14" y="18" width="44" height="64" rx="6" fill="#f8f4ec" stroke="#F5C518" stroke-width="2" transform="rotate(-12 36 50)"/>
  <rect x="42" y="22" width="44" height="64" rx="6" fill="#f8f4ec" stroke="#F5C518" stroke-width="2" transform="rotate(-4 64 54)"/>
  <rect x="70" y="26" width="44" height="64" rx="6" fill="#f8f4ec" stroke="#ff4d6d" stroke-width="2" transform="rotate(8 92 58)"/>
  <text x="64" y="112" text-anchor="middle" fill="#F5C518" font-family="Arial Black,Arial,sans-serif" font-size="14" font-weight="900">ROYAL</text>
`),

  "four-aces": wrap(`
  <text x="64" y="40" text-anchor="middle" fill="#F5C518" font-size="28">♠</text>
  <text x="36" y="72" text-anchor="middle" fill="#ff4d6d" font-size="28">♥</text>
  <text x="92" y="72" text-anchor="middle" fill="#F5C518" font-size="28">♦</text>
  <text x="64" y="104" text-anchor="middle" fill="#7dd3fc" font-size="28">♣</text>
  <circle cx="64" cy="64" r="58" stroke="#F5C518" stroke-width="3" fill="none" opacity="0.55"/>
`),

  "vip-crown": wrap(`
  <circle cx="64" cy="64" r="56" fill="#12101a" stroke="#F5C518" stroke-width="4"/>
  <path d="M28 78 40 44 52 64 64 36 76 64 88 44 100 78Z" fill="#F5C518"/>
  <rect x="30" y="78" width="68" height="12" rx="3" fill="#E29A12"/>
  <text x="64" y="108" text-anchor="middle" fill="#FFE08A" font-family="Georgia,serif" font-size="14" font-weight="700">VIP</text>
`),

  "chip-stack": wrap(`
  <ellipse cx="64" cy="92" rx="36" ry="12" fill="#E29A12"/>
  <ellipse cx="64" cy="78" rx="36" ry="12" fill="#F5C518"/>
  <ellipse cx="64" cy="64" rx="36" ry="12" fill="#FFE08A"/>
  <ellipse cx="64" cy="50" rx="36" ry="12" fill="#F5C518" stroke="#1A1400" stroke-width="2"/>
  <text x="64" y="54" text-anchor="middle" fill="#1A1400" font-family="Arial Black,Arial,sans-serif" font-size="14" font-weight="900">100</text>
`),

  "lucky-7": wrap(`
  <circle cx="64" cy="64" r="56" fill="#140a10" stroke="#ff4d6d" stroke-width="4"/>
  <text x="64" y="82" text-anchor="middle" fill="#F5C518" font-family="Arial Black,Arial,sans-serif" font-size="64" font-weight="900">7</text>
`),

  showdown: wrap(`
  <circle cx="64" cy="64" r="56" fill="#101018" stroke="#F5C518" stroke-width="4"/>
  <path d="M34 70c10-22 20-34 30-34s20 12 30 34" stroke="#F5C518" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="58" r="5" fill="#F5C518"/><circle cx="78" cy="58" r="5" fill="#F5C518"/>
  <text x="64" y="98" text-anchor="middle" fill="#FFE08A" font-family="Arial Black,Arial,sans-serif" font-size="11" font-weight="900">SHOWDOWN</text>
`),

  "river-badge": wrap(`
  <circle cx="64" cy="64" r="56" fill="#0a1218" stroke="#38bdf8" stroke-width="4"/>
  <path d="M24 70c12-10 20-8 28 0s16 10 28 0 16-10 28 0" stroke="#38bdf8" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M24 84c12-10 20-8 28 0s16 10 28 0 16-10 28 0" stroke="#7dd3fc" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.7"/>
  <text x="64" y="48" text-anchor="middle" fill="#F5C518" font-family="Arial Black,Arial,sans-serif" font-size="14" font-weight="900">RIVER</text>
`),
};

for (const [id, svg] of Object.entries(stickers)) {
  fs.writeFileSync(path.join(dir, `${id}.svg`), svg);
  console.log("wrote", id);
}
console.log("total", Object.keys(stickers).length);
