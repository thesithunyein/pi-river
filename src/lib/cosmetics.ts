/** Shared shop cosmetics — used by Shop + table UI. */

export const CARD_BACKS = [
  {
    id: "classic",
    name: "Midnight Classic",
    price: 0,
    accent: "from-[#1e293b] to-[#020617]",
    mark: "#94a3b8",
  },
  {
    id: "neon",
    name: "Pulse Orbit",
    price: 10000,
    accent: "from-[#0891b2] to-[#1d4ed8]",
    mark: "#67e8f9",
  },
  {
    id: "royal",
    name: "Royal Current",
    price: 25000,
    accent: "from-[#7c3aed] to-[#4c1d95]",
    mark: "#c4b5fd",
  },
  {
    id: "gold",
    name: "Gold Rush",
    price: 50000,
    accent: "from-[#f59e0b] to-[#b45309]",
    mark: "#fde68a",
  },
  {
    id: "flow",
    name: "River Bloom",
    price: 100000,
    accent: "from-[#14b8a6] to-[#0f766e]",
    mark: "#99f6e4",
  },
  {
    id: "inco",
    name: "Lightning Lockup",
    price: 200000,
    accent: "from-[#6366f1] to-[#db2777]",
    mark: "#fbcfe8",
  },
] as const;

export const TABLE_FELTS = [
  {
    id: "green",
    name: "Forest Felt",
    price: 0,
    tone: "from-[#14532d] to-[#052e16]",
    chip: "#86efac",
    felt: "radial-gradient(ellipse at center,#1a7a4f 0%,#0c3d2c 48%,#061910 100%)",
    border: "border-[#1f6b4a]/55",
  },
  {
    id: "blue",
    name: "Deep Current",
    price: 15000,
    tone: "from-[#1e3a8a] to-[#0f172a]",
    chip: "#93c5fd",
    felt: "radial-gradient(ellipse at center,#2563eb 0%,#1e3a8a 48%,#0b1224 100%)",
    border: "border-[#3b82f6]/45",
  },
  {
    id: "purple",
    name: "Night Velvet",
    price: 30000,
    tone: "from-[#581c87] to-[#1e1b4b]",
    chip: "#d8b4fe",
    felt: "radial-gradient(ellipse at center,#7c3aed 0%,#4c1d95 48%,#1a1030 100%)",
    border: "border-[#a78bfa]/45",
  },
  {
    id: "red",
    name: "Redline Room",
    price: 50000,
    tone: "from-[#7f1d1d] to-[#450a0a]",
    chip: "#fda4af",
    felt: "radial-gradient(ellipse at center,#dc2626 0%,#7f1d1d 48%,#2a0a0a 100%)",
    border: "border-[#f87171]/45",
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
