/** Ornate gold/purple avatar frames (shop + ladder + table). */

export type FrameDef = {
  id: string;
  name: string;
  price: number;
  /** SVG ornate variant (preferred) */
  art?: string;
  /** Legacy PNG overlay path */
  src?: string;
  /** Outer box vs face diameter */
  scale: number;
  /** Face diameter as fraction of outer when art is used */
  faceRatio: number;
  ring?: string;
  glow?: string;
};

export const AVATAR_FRAMES: FrameDef[] = [
  {
    id: "none",
    name: "No frame",
    price: 0,
    scale: 1,
    faceRatio: 1,
    ring: "ring-transparent",
    glow: "",
  },
  { id: "shield", name: "Royal Shield", price: 8_000, art: "shield", scale: 1.55, faceRatio: 0.62 },
  { id: "winged", name: "Winged Crest", price: 12_000, art: "winged", scale: 1.55, faceRatio: 0.58 },
  { id: "leafy", name: "Leaf Crown", price: 16_000, art: "leafy", scale: 1.55, faceRatio: 0.58 },
  { id: "flanked", name: "Gem Flank", price: 22_000, art: "flanked", scale: 1.65, faceRatio: 0.55 },
  { id: "horned", name: "Horn Hex", price: 28_000, art: "horned", scale: 1.55, faceRatio: 0.58 },
  { id: "batwing", name: "Bat Wings", price: 36_000, art: "batwing", scale: 1.7, faceRatio: 0.52 },
  { id: "crowned", name: "Crown Claw", price: 42_000, art: "crowned", scale: 1.6, faceRatio: 0.55 },
  { id: "diamond", name: "Feather Diamond", price: 48_000, art: "diamond", scale: 1.55, faceRatio: 0.52 },
  { id: "valkyrie", name: "Valkyrie", price: 55_000, art: "valkyrie", scale: 1.65, faceRatio: 0.54 },
  { id: "hexwing", name: "Hex Wings", price: 62_000, art: "hexwing", scale: 1.55, faceRatio: 0.58 },
];

const LEGACY_FRAME_MAP: Record<string, string> = {
  gold: "winged",
  emerald: "leafy",
  ruby: "crowned",
  onyx: "horned",
  inco: "valkyrie",
};

export function resolveFrameId(id: string | null | undefined) {
  if (!id || id === "none") return "none";
  if (AVATAR_FRAMES.some((f) => f.id === id)) return id;
  return LEGACY_FRAME_MAP[id] || "none";
}

export function getFrame(id: string) {
  const resolved = resolveFrameId(id);
  return AVATAR_FRAMES.find((f) => f.id === resolved) ?? AVATAR_FRAMES[0];
}
