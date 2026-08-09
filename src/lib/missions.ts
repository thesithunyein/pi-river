export type MissionId =
  | "first-hand"
  | "win-one"
  | "play-three"
  | "shop-style"
  | "claim-ticket"
  | "streak-two";

export type MissionDef = {
  id: MissionId;
  title: string;
  blurb: string;
  target: number;
  rewardChips: number;
  rewardXp: number;
};

/** Poker-table missions — small chip rewards so play still drives the economy. */
export const MISSIONS: MissionDef[] = [
  {
    id: "first-hand",
    title: "Ante up",
    blurb: "Finish 1 live hand (fold, showdown, or scoop).",
    target: 1,
    rewardChips: 400,
    rewardXp: 25,
  },
  {
    id: "win-one",
    title: "Take the pot",
    blurb: "Win 1 hand vs River Bot or a friend.",
    target: 1,
    rewardChips: 700,
    rewardXp: 40,
  },
  {
    id: "play-three",
    title: "Session grind",
    blurb: "Play 5 hands this week. Volume builds skill.",
    target: 5,
    rewardChips: 900,
    rewardXp: 50,
  },
  {
    id: "shop-style",
    title: "Dress the rail",
    blurb: "Buy any card back or felt from the Shop.",
    target: 1,
    rewardChips: 250,
    rewardXp: 20,
  },
  {
    id: "claim-ticket",
    title: "Jackpot entry",
    blurb: "Claim 1 Megapot ticket from Rewards.",
    target: 1,
    rewardChips: 400,
    rewardXp: 30,
  },
  {
    id: "streak-two",
    title: "Back-to-back",
    blurb: "Win 2 hands in a row without a loss between.",
    target: 2,
    rewardChips: 1_100,
    rewardXp: 65,
  },
];

export {
  getPlayerLevel,
  xpIntoLevel,
  levelTitle,
  XP_PER_LEVEL,
} from "@/lib/progression";
