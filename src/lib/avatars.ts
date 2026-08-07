export interface CartoonAvatar {
  emoji: string;
  gradient: string;
  border: string;
  name: string;
}

export const CARTOON_AVATARS: Record<string, CartoonAvatar> = {
  "cyber-fox": { emoji: "🦊", gradient: "from-cyan-500 to-blue-700", border: "border-cyan-400", name: "Cyber Fox" },
  "poker-cat": { emoji: "🐱", gradient: "from-amber-400 to-yellow-600", border: "border-yellow-300", name: "Poker Cat" },
  "shark-king": { emoji: "🦈", gradient: "from-blue-600 to-indigo-900", border: "border-indigo-400", name: "Neon Shark" },
  "panda-boss": { emoji: "🐼", gradient: "from-emerald-500 to-teal-800", border: "border-emerald-400", name: "Golden Panda" },
  "shadow-ninja": { emoji: "🥷", gradient: "from-purple-600 to-violet-950", border: "border-purple-400", name: "Shadow Ninja" },
  "crypto-ape": { emoji: "🦍", gradient: "from-rose-500 to-red-800", border: "border-rose-400", name: "Crypto Ape" },
  "king-lion": { emoji: "🦁", gradient: "from-amber-500 to-orange-700", border: "border-amber-300", name: "King Lion" },
  "tiger-roll": { emoji: "🐯", gradient: "from-orange-500 to-amber-700", border: "border-orange-400", name: "Tiger Roll" },
  "royal-owl": { emoji: "🦉", gradient: "from-indigo-600 to-purple-800", border: "border-indigo-300", name: "Royal Owl" },
};

export function getAvatarForPlayer(name: string): CartoonAvatar {
  if (name === "Maya") return { emoji: "🦊", gradient: "from-purple-600 to-violet-900", border: "border-purple-400", name: "Cyber Fox Maya" };
  if (name === "Jonas") return { emoji: "🦈", gradient: "from-rose-600 to-red-900", border: "border-rose-400", name: "Neon Shark Jonas" };
  if (name === "Kenji") return { emoji: "🐼", gradient: "from-amber-500 to-amber-800", border: "border-amber-400", name: "Panda Kenji" };
  if (name === "Pia") return { emoji: "🐱", gradient: "from-emerald-500 to-teal-800", border: "border-emerald-400", name: "Poker Cat Pia" };
  if (name === "Alex") return { emoji: "🥷", gradient: "from-blue-600 to-indigo-900", border: "border-blue-400", name: "Ninja Alex" };
  if (name === "jognwatson") return { emoji: "🦍", gradient: "from-blue-500 to-cyan-600", border: "border-cyan-300", name: "Ape John" };
  if (name === "amador") return { emoji: "👑", gradient: "from-purple-600 to-violet-800", border: "border-purple-300", name: "Admin Amador" };
  if (name === "cookiechip") return { emoji: "🦉", gradient: "from-pink-500 to-rose-600", border: "border-pink-300", name: "Cookie Chip" };
  if (name === "CryptoKing") return { emoji: "🦁", gradient: "from-yellow-500 to-amber-700", border: "border-yellow-300", name: "Crypto King" };
  if (name === "Sithu") return { emoji: "🐯", gradient: "from-teal-500 to-emerald-700", border: "border-teal-300", name: "Tiger Sithu" };

  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const keys = Object.keys(CARTOON_AVATARS);
  return CARTOON_AVATARS[keys[hash % keys.length]];
}
