export type Suit = "♠" | "♥" | "♦" | "♣";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";

export interface CardType {
  suit: Suit;
  rank: Rank;
  isRed?: boolean;
}

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export const RANK_VALUES: Record<Rank, number> = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
  "J": 11, "Q": 12, "K": 13, "A": 14
};

export const RANK_NAMES: Record<number, string> = {
  2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens",
  8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces"
};

export const SINGLE_RANK_NAMES: Record<number, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven",
  8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace"
};

export interface EvaluatedHand {
  score: number;
  categoryName: string;
  handName: string;
  bestFive: CardType[];
  rankCategory: number; // 0 to 8
}

// Generate a full deck of 52 cards
export function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of SUITS) {
    const isRed = suit === "♥" || suit === "♦";
    for (const rank of RANKS) {
      deck.push({ suit, rank, isRed });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Helper: Get combinations of 5 cards from n cards
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Evaluate exact 5 cards
function evaluate5Cards(cards: CardType[]): EvaluatedHand {
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank]);
  const values = sorted.map(c => RANK_VALUES[c.rank]);
  const isFlush = sorted.every(c => c.suit === sorted[0].suit);

  // Check straight
  let isStraight = false;
  let straightHigh = 0;

  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
    // Ace-low straight A-2-3-4-5
    isStraight = true;
    straightHigh = 5;
  }

  // Count frequencies
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }

  const freqEntries = Object.entries(counts).map(([v, count]) => ({
    val: Number(v),
    count,
  }));

  freqEntries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.val - a.val;
  });

  // Category identification
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        score: 8000000 + straightHigh,
        categoryName: "Royal Flush",
        handName: "Royal Flush",
        bestFive: sorted,
        rankCategory: 8,
      };
    }
    return {
      score: 8000000 + straightHigh,
      categoryName: "Straight Flush",
      handName: `Straight Flush, ${SINGLE_RANK_NAMES[straightHigh]} high`,
      bestFive: sorted,
      rankCategory: 8,
    };
  }

  if (freqEntries[0].count === 4) {
    const quadVal = freqEntries[0].val;
    const kicker = freqEntries[1].val;
    return {
      score: 7000000 + quadVal * 100 + kicker,
      categoryName: "Four of a Kind",
      handName: `Four of a Kind, ${RANK_NAMES[quadVal]}`,
      bestFive: sorted,
      rankCategory: 7,
    };
  }

  if (freqEntries[0].count === 3 && freqEntries[1].count === 2) {
    const tripsVal = freqEntries[0].val;
    const pairVal = freqEntries[1].val;
    return {
      score: 6000000 + tripsVal * 100 + pairVal,
      categoryName: "Full House",
      handName: `Full House, ${RANK_NAMES[tripsVal]} full of ${RANK_NAMES[pairVal]}`,
      bestFive: sorted,
      rankCategory: 6,
    };
  }

  if (isFlush) {
    const score = 5000000 + values[0]*10000 + values[1]*1000 + values[2]*100 + values[3]*10 + values[4];
    return {
      score,
      categoryName: "Flush",
      handName: `Flush, ${SINGLE_RANK_NAMES[values[0]]} high`,
      bestFive: sorted,
      rankCategory: 5,
    };
  }

  if (isStraight) {
    return {
      score: 4000000 + straightHigh,
      categoryName: "Straight",
      handName: `Straight, ${SINGLE_RANK_NAMES[straightHigh]} high`,
      bestFive: sorted,
      rankCategory: 4,
    };
  }

  if (freqEntries[0].count === 3) {
    const tripsVal = freqEntries[0].val;
    const k1 = freqEntries[1].val;
    const k2 = freqEntries[2].val;
    return {
      score: 3000000 + tripsVal * 1000 + k1 * 10 + k2,
      categoryName: "Three of a Kind",
      handName: `Three of a Kind, ${RANK_NAMES[tripsVal]}`,
      bestFive: sorted,
      rankCategory: 3,
    };
  }

  if (freqEntries[0].count === 2 && freqEntries[1].count === 2) {
    const highPair = Math.max(freqEntries[0].val, freqEntries[1].val);
    const lowPair = Math.min(freqEntries[0].val, freqEntries[1].val);
    const kicker = freqEntries[2].val;
    return {
      score: 2000000 + highPair * 1000 + lowPair * 10 + kicker,
      categoryName: "Two Pair",
      handName: `Two Pair, ${RANK_NAMES[highPair]} and ${RANK_NAMES[lowPair]}`,
      bestFive: sorted,
      rankCategory: 2,
    };
  }

  if (freqEntries[0].count === 2) {
    const pairVal = freqEntries[0].val;
    const k1 = freqEntries[1].val;
    const k2 = freqEntries[2].val;
    const k3 = freqEntries[3].val;
    return {
      score: 1000000 + pairVal * 10000 + k1 * 100 + k2 * 10 + k3,
      categoryName: "One Pair",
      handName: `One Pair of ${RANK_NAMES[pairVal]}`,
      bestFive: sorted,
      rankCategory: 1,
    };
  }

  const score = values[0] * 10000 + values[1] * 1000 + values[2] * 100 + values[3] * 10 + values[4];
  return {
    score,
    categoryName: "High Card",
    handName: `High Card, ${SINGLE_RANK_NAMES[values[0]]}`,
    bestFive: sorted,
    rankCategory: 0,
  };
}

// Evaluate 5 to 7 cards by testing all 5-card combinations
export function evaluateBestHand(cards: CardType[]): EvaluatedHand {
  if (cards.length < 5) {
    return {
      score: 0,
      categoryName: "High Card",
      handName: "High Card",
      bestFive: cards,
      rankCategory: 0,
    };
  }

  const combos = getCombinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combos) {
    const evalResult = evaluate5Cards(combo);
    if (!bestHand || evalResult.score > bestHand.score) {
      bestHand = evalResult;
    }
  }

  return bestHand!;
}
