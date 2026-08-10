/** Premium HD chat stickers + shop packs (transparent SVG, poker-only). */

export type StickerDef = {
  id: string;
  label: string;
  src: string;
  packId: string;
};

export type StickerPackDef = {
  id: string;
  name: string;
  blurb: string;
  priceChips: number;
  previewSrc: string;
  stickerIds: string[];
};

/** Pack id stays `neon` so existing buyers keep unlock. */
const SUITS_IDS = [
  "ace-spades",
  "ace-hearts",
  "ace-diamonds",
  "ace-clubs",
  "spade",
  "heart",
  "diamond",
  "club",
] as const;

/** Pack id stays `vip` so existing buyers keep unlock. */
const VIP_IDS = [
  "all-in",
  "royal-flush",
  "four-aces",
  "vip-crown",
  "chip-stack",
  "lucky-7",
  "showdown",
  "river-badge",
] as const;

const LABELS: Record<string, string> = {
  "ace-spades": "Ace Spades",
  "ace-hearts": "Ace Hearts",
  "ace-diamonds": "Ace Diamonds",
  "ace-clubs": "Ace Clubs",
  spade: "Spade",
  heart: "Heart",
  diamond: "Diamond",
  club: "Club",
  "all-in": "All-In",
  "royal-flush": "Royal Flush",
  "four-aces": "Four Aces",
  "vip-crown": "VIP Crown",
  "chip-stack": "Chip Stack",
  "lucky-7": "Lucky 7",
  showdown: "Showdown",
  "river-badge": "River",
};

function makeStickers(ids: readonly string[], packId: string): StickerDef[] {
  return ids.map((id) => ({
    id,
    label: LABELS[id] || id,
    src: `/stickers/${id}.svg`,
    packId,
  }));
}

export const HD_STICKERS: StickerDef[] = [
  ...makeStickers(SUITS_IDS, "neon"),
  ...makeStickers(VIP_IDS, "vip"),
];

export const STICKER_PACKS: StickerPackDef[] = [
  {
    id: "neon",
    name: "River Suits",
    blurb: "8 crisp poker suits & aces — transparent HD stickers for live chat.",
    priceChips: 12_000,
    previewSrc: "/stickers/ace-spades.svg",
    stickerIds: [...SUITS_IDS],
  },
  {
    id: "vip",
    name: "Table VIP",
    blurb: "8 table calls — All-In, Royal Flush, Showdown, VIP crown.",
    priceChips: 28_000,
    previewSrc: "/stickers/vip-crown.svg",
    stickerIds: [...VIP_IDS],
  },
];

/** Free emoji stickers always available in chat. */
export const FREE_CHAT_STICKERS = [
  { id: "gg", glyph: "🤝", label: "GG" },
  { id: "allin", glyph: "🃏🔥", label: "All-in" },
  { id: "chip", glyph: "🪙", label: "Chips" },
  { id: "trophy", glyph: "🏆", label: "Win" },
  { id: "fold", glyph: "🏳️", label: "Fold" },
  { id: "river", glyph: "🌊", label: "River" },
  { id: "blast", glyph: "💥", label: "Boom" },
  { id: "cool", glyph: "😎♠️", label: "Cool" },
  { id: "cry", glyph: "😭🃏", label: "Bad beat" },
  { id: "luck", glyph: "🍀", label: "Luck" },
  { id: "rocket", glyph: "🚀", label: "Run good" },
  { id: "crown", glyph: "👑", label: "King" },
] as const;

export function stickerById(id: string): StickerDef | undefined {
  return HD_STICKERS.find((s) => s.id === id);
}

export function packById(id: string): StickerPackDef | undefined {
  return STICKER_PACKS.find((p) => p.id === id);
}

/** Base Sepolia chip packs (testnet ETH → fun chips). */
export type ChipPackDef = {
  id: string;
  name: string;
  blurb: string;
  ethLabel: string;
  ethWei: bigint;
  chips: number;
  badge?: string;
};

export const CHIP_PACKS: ChipPackDef[] = [
  {
    id: "starter",
    name: "Starter Stack",
    blurb: "Quick top-up for a few shop buys.",
    ethLabel: "0.00005",
    ethWei: 50_000_000_000_000n,
    chips: 8_000,
  },
  {
    id: "boost",
    name: "Boost Bundle",
    blurb: "Best everyday value on Base Sepolia.",
    ethLabel: "0.00015",
    ethWei: 150_000_000_000_000n,
    chips: 25_000,
    badge: "Popular",
  },
  {
    id: "stack",
    name: "High Roller",
    blurb: "Fill the shop — frames and sticker packs.",
    ethLabel: "0.0004",
    ethWei: 400_000_000_000_000n,
    chips: 80_000,
  },
  {
    id: "whale",
    name: "Whale Vault",
    blurb: "Deep stack for the whole club season.",
    ethLabel: "0.001",
    ethWei: 1_000_000_000_000_000n,
    chips: 250_000,
    badge: "VIP",
  },
];

export function chipPackById(id: string): ChipPackDef | undefined {
  return CHIP_PACKS.find((p) => p.id === id);
}

/** Best pack the paid wei can buy (highest ethWei <= value). */
export function chipPackForWei(valueWei: bigint): ChipPackDef | undefined {
  const sorted = [...CHIP_PACKS].sort((a, b) => (a.ethWei < b.ethWei ? 1 : -1));
  return sorted.find((p) => valueWei >= p.ethWei);
}
