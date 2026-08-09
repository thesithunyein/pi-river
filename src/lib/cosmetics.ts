/** Shared shop cosmetics — priced so daily login alone can't clear the catalog. */

export type CardPattern = "weave" | "diamonds" | "rail" | "orbit" | "seal" | "onyx" | "river";

export const CARD_BACKS = [
  {
    id: "classic",
    name: "Midnight Classic",
    price: 0,
    accent: "from-[#1e293b] via-[#0f172a] to-[#020617]",
    mark: "#94a3b8",
    pattern: "weave" as CardPattern,
    glyph: "spade" as const,
  },
  {
    id: "neon",
    name: "Pulse Orbit",
    price: 12_000,
    accent: "from-[#22d3ee] via-[#2563eb] to-[#0b1e4a]",
    mark: "#67e8f9",
    pattern: "orbit" as CardPattern,
    glyph: "club" as const,
  },
  {
    id: "royal",
    name: "Velvet Rail",
    price: 28_000,
    accent: "from-[#7f1d1d] via-[#450a0a] to-[#1a0505]",
    mark: "#fda4af",
    pattern: "rail" as CardPattern,
    glyph: "heart" as const,
  },
  {
    id: "gold",
    name: "Gold Rush",
    price: 55_000,
    accent: "from-[#fde68a] via-[#f59e0b] to-[#78350f]",
    mark: "#fff7ed",
    pattern: "diamonds" as CardPattern,
    glyph: "diamond" as const,
  },
  {
    id: "onyx",
    name: "Onyx Edge",
    price: 72_000,
    accent: "from-[#3f3f46] via-[#18181b] to-[#09090b]",
    mark: "#F5C518",
    pattern: "onyx" as CardPattern,
    glyph: "spade" as const,
  },
  {
    id: "flow",
    name: "River Bloom",
    price: 95_000,
    accent: "from-[#5eead4] via-[#0f766e] to-[#042f2e]",
    mark: "#ccfbf1",
    pattern: "river" as CardPattern,
    glyph: "spade" as const,
  },
  {
    id: "inco",
    name: "Sealed Deck",
    price: 180_000,
    accent: "from-[#1a1520] via-[#0f0d18] to-[#050408]",
    mark: "#F5C518",
    pattern: "seal" as CardPattern,
    glyph: "lock" as const,
  },
] as const;

export const TABLE_FELTS = [
  {
    id: "green",
    name: "Forest Felt",
    price: 0,
    tone: "from-[#14532d] to-[#052e16]",
    chip: "#86efac",
    felt: "radial-gradient(ellipse at 50% 40%,#2f9e68 0%,#1a7a4f 28%,#0c3d2c 62%,#061910 100%)",
    border: "border-[#34d399]/35",
    rail: "#F5C518",
  },
  {
    id: "blue",
    name: "Deep Current",
    price: 18_000,
    tone: "from-[#1e3a8a] to-[#0f172a]",
    chip: "#93c5fd",
    felt: "radial-gradient(ellipse at 50% 40%,#60a5fa 0%,#2563eb 30%,#1e3a8a 62%,#0b1224 100%)",
    border: "border-[#60a5fa]/40",
    rail: "#93c5fd",
  },
  {
    id: "purple",
    name: "Burgundy Room",
    price: 32_000,
    tone: "from-[#4c0519] to-[#1a0508]",
    chip: "#fda4af",
    felt: "radial-gradient(ellipse at 50% 40%,#9f1239 0%,#7f1d1d 28%,#4c0519 60%,#1a0508 100%)",
    border: "border-[#fb7185]/35",
    rail: "#F5C518",
  },
  {
    id: "red",
    name: "Redline Room",
    price: 48_000,
    tone: "from-[#7f1d1d] to-[#450a0a]",
    chip: "#fda4af",
    felt: "radial-gradient(ellipse at 50% 40%,#fb7185 0%,#dc2626 28%,#7f1d1d 60%,#2a0a0a 100%)",
    border: "border-[#fb7185]/40",
    rail: "#fecdd3",
  },
  {
    id: "noir",
    name: "Noir Casino",
    price: 68_000,
    tone: "from-[#27272a] to-[#09090b]",
    chip: "#f5c518",
    felt: "radial-gradient(ellipse at 50% 38%,#3f3f46 0%,#27272a 32%,#18181b 58%,#09090b 100%)",
    border: "border-[#F5C518]/35",
    rail: "#F5C518",
  },
] as const;

export type CardBackId = (typeof CARD_BACKS)[number]["id"];
export type TableFeltId = (typeof TABLE_FELTS)[number]["id"];

export function getCardBack(id: string) {
  return CARD_BACKS.find((item) => item.id === id) ?? CARD_BACKS[0];
}

export function getTableFelt(id: string) {
  return TABLE_FELTS.find((item) => item.id === id) ?? TABLE_FELTS[0];
}

export function cardPatternCss(pattern: CardPattern, mark: string): string {
  switch (pattern) {
    case "diamonds":
      return `repeating-linear-gradient(45deg, ${mark}22 0 2px, transparent 2px 10px), repeating-linear-gradient(-45deg, ${mark}18 0 2px, transparent 2px 10px)`;
    case "orbit":
      return `radial-gradient(circle at 30% 30%, ${mark}33 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, ${mark}28 0 2px, transparent 3px)`;
    case "rail":
      return `repeating-linear-gradient(90deg, ${mark}20 0 1px, transparent 1px 8px)`;
    case "river":
      return `repeating-linear-gradient(120deg, ${mark}25 0 3px, transparent 3px 14px)`;
    case "seal":
      return `radial-gradient(circle at 50% 50%, ${mark}18 0 18%, transparent 19%), repeating-linear-gradient(0deg, ${mark}10 0 1px, transparent 1px 12px)`;
    case "onyx":
      return `linear-gradient(135deg, ${mark}14 0%, transparent 40%), linear-gradient(225deg, #fff1 0%, transparent 35%)`;
    case "weave":
    default:
      return `repeating-linear-gradient(135deg, rgba(255,255,255,0.12) 0 1px, transparent 1px 8px)`;
  }
}
