"use client";

import { useState, useEffect, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { sound } from "@/lib/sound";
import {
  createDeck,
  CardType,
  evaluateBestHand,
  EvaluatedHand,
} from "@/lib/pokerEngine";

interface PlayerState {
  id: string;
  name: string;
  isYou: boolean;
  avatarGradient: string;
  stack: number;
  bet: number;
  cards: CardType[];
  folded: boolean;
  isDealer: boolean;
  pos: "s1" | "s2" | "s3" | "s4" | "s-you";
  lastAction?: string;
  bestHand?: EvaluatedHand;
}

const INITIAL_BOTS = [
  { id: "p1", name: "Maya", avatarGradient: "from-violet-600 to-violet-900", pos: "s1" as const },
  { id: "p2", name: "Jonas", avatarGradient: "from-red-600 to-red-900", pos: "s2" as const },
  { id: "p3", name: "Kenji", avatarGradient: "from-amber-500 to-amber-800", pos: "s3" as const },
  { id: "p4", name: "Pia", avatarGradient: "from-emerald-500 to-emerald-800", pos: "s4" as const },
];

export default function TablePage() {
  const { chips, recordHandResult, equippedCardBack, equippedTableFelt } = useGame();

  const [deck, setDeck] = useState<CardType[]>([]);
  const [communityCards, setCommunityCards] = useState<CardType[]>([]);
  const [pot, setPot] = useState<number>(0);
  const [currentBet, setCurrentBet] = useState<number>(40000);
  const [betAmount, setBetAmount] = useState<number>(40000);
  const [activePreset, setActivePreset] = useState<string>("Min");
  const [gameStage, setGameStage] = useState<"idle" | "preflop" | "flop" | "turn" | "river" | "showdown">("idle");
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [turnIndex, setTurnIndex] = useState<number>(0);
  const [tableLog, setTableLog] = useState<string>("Click DEAL HAND to start playing Texas Hold'em!");
  const [winningInfo, setWinningInfo] = useState<{ winnerName: string; handName: string; amount: number } | null>(null);

  // Table felt color mapping
  const feltColorMap: Record<string, { bg: string; border: string }> = {
    green: { bg: "from-[#14503C] via-[#0A3428] to-[#061E16]", border: "#0C3A2C" },
    blue: { bg: "from-[#103D6B] via-[#0C2D5A] to-[#071B38]", border: "#0F325E" },
    purple: { bg: "from-[#3E2368] via-[#2D1B4E] to-[#1A0E31]", border: "#351E5C" },
    red: { bg: "from-[#612020] via-[#4A1A1A] to-[#2B0E0E]", border: "#521B1B" },
  };

  const currentFelt = feltColorMap[equippedTableFelt] || feltColorMap.green;

  // Initialize hand
  const startNewHand = useCallback(() => {
    sound.playCardSlide();
    const newDeck = createDeck();

    // Deal 2 cards to user and each bot
    const userCards = [newDeck.pop()!, newDeck.pop()!];
    const bot1Cards = [newDeck.pop()!, newDeck.pop()!];
    const bot2Cards = [newDeck.pop()!, newDeck.pop()!];
    const bot3Cards = [newDeck.pop()!, newDeck.pop()!];
    const bot4Cards = [newDeck.pop()!, newDeck.pop()!];

    const smallBlind = 20000;
    const bigBlind = 40000;

    const initialPlayers: PlayerState[] = [
      {
        id: "bot1",
        name: INITIAL_BOTS[0].name,
        isYou: false,
        avatarGradient: INITIAL_BOTS[0].avatarGradient,
        stack: 890000,
        bet: 0,
        cards: bot1Cards,
        folded: false,
        isDealer: false,
        pos: INITIAL_BOTS[0].pos,
      },
      {
        id: "bot2",
        name: INITIAL_BOTS[1].name,
        isYou: false,
        avatarGradient: INITIAL_BOTS[1].avatarGradient,
        stack: 450000,
        bet: smallBlind,
        cards: bot2Cards,
        folded: false,
        isDealer: false,
        pos: INITIAL_BOTS[1].pos,
        lastAction: "Small Blind 20K",
      },
      {
        id: "bot3",
        name: INITIAL_BOTS[2].name,
        isYou: false,
        avatarGradient: INITIAL_BOTS[2].avatarGradient,
        stack: 1400000,
        bet: bigBlind,
        cards: bot3Cards,
        folded: false,
        isDealer: false,
        pos: INITIAL_BOTS[2].pos,
        lastAction: "Big Blind 40K",
      },
      {
        id: "bot4",
        name: INITIAL_BOTS[3].name,
        isYou: false,
        avatarGradient: INITIAL_BOTS[3].avatarGradient,
        stack: 560000,
        bet: 0,
        cards: bot4Cards,
        folded: false,
        isDealer: true,
        pos: INITIAL_BOTS[3].pos,
      },
      {
        id: "you",
        name: "You",
        isYou: true,
        avatarGradient: "from-cyan-500 to-cyan-800",
        stack: chips,
        bet: 0,
        cards: userCards,
        folded: false,
        isDealer: false,
        pos: "s-you",
      },
    ];

    setDeck(newDeck);
    setCommunityCards([]);
    setPot(smallBlind + bigBlind);
    setCurrentBet(bigBlind);
    setBetAmount(bigBlind);
    setPlayers(initialPlayers);
    setGameStage("preflop");
    setTurnIndex(4); // User's turn to act
    setTableLog("Hand dealt! Blinds posted (20K/40K). Your turn to act.");
    setWinningInfo(null);
  }, [chips]);

  useEffect(() => {
    if (gameStage === "idle") {
      startNewHand();
    }
  }, [gameStage, startNewHand]);

  // Evaluate current user hand name
  const userPlayer = players.find((p) => p.isYou);
  const userCurrentEval =
    userPlayer && userPlayer.cards.length === 2
      ? evaluateBestHand([...userPlayer.cards, ...communityCards])
      : null;

  // Showdown & winner determination
  const handleShowdown = useCallback(
    (finalCommunity: CardType[], activePlayers: PlayerState[]) => {
      const contenders = activePlayers.filter((p) => !p.folded);
      if (contenders.length === 0) return;

      let winner = contenders[0];
      let bestEval = evaluateBestHand([...winner.cards, ...finalCommunity]);

      for (let i = 1; i < contenders.length; i++) {
        const pEval = evaluateBestHand([...contenders[i].cards, ...finalCommunity]);
        if (pEval.score > bestEval.score) {
          winner = contenders[i];
          bestEval = pEval;
        }
      }

      sound.playWin();
      setWinningInfo({
        winnerName: winner.name,
        handName: bestEval.handName,
        amount: pot,
      });

      setTableLog(`🎉 Showdown! ${winner.name} wins ${pot.toLocaleString()} chips with ${bestEval.handName}!`);

      // Record hand result in global context
      const isUserWin = winner.isYou;
      const netChips = isUserWin ? pot : -40000;
      recordHandResult(isUserWin, netChips, winner.name, bestEval.handName);
    },
    [pot, recordHandResult]
  );

  // Advance game stage (Preflop -> Flop -> Turn -> River -> Showdown)
  const advanceStage = useCallback(
    (currentStage: typeof gameStage, currentDeck: CardType[], currentCards: CardType[], currentPlayers: PlayerState[]) => {
      sound.playCardSlide();
      const updatedDeck = [...currentDeck];

      if (currentStage === "preflop") {
        const flop = [updatedDeck.pop()!, updatedDeck.pop()!, updatedDeck.pop()!];
        setCommunityCards(flop);
        setDeck(updatedDeck);
        setGameStage("flop");
        setTableLog("Flop dealt! Check or bet.");
      } else if (currentStage === "flop") {
        const turnCard = updatedDeck.pop()!;
        const updatedCommunity = [...currentCards, turnCard];
        setCommunityCards(updatedCommunity);
        setDeck(updatedDeck);
        setGameStage("turn");
        setTableLog("Turn card dealt! Round of betting.");
      } else if (currentStage === "turn") {
        const riverCard = updatedDeck.pop()!;
        const updatedCommunity = [...currentCards, riverCard];
        setCommunityCards(updatedCommunity);
        setDeck(updatedDeck);
        setGameStage("river");
        setTableLog("River card dealt! Final betting round.");
      } else if (currentStage === "river") {
        setGameStage("showdown");
        handleShowdown(currentCards, currentPlayers);
      }
    },
    [handleShowdown]
  );

  // Bot Turn Logic
  const handleBotTurn = useCallback(
    (idx: number, currentPlayers: PlayerState[]) => {
      const p = currentPlayers[idx];
      if (!p || p.folded || p.isYou) return;

      setTimeout(() => {
        const rand = Math.random();
        let action = "Call";
        let updatedPlayers = [...currentPlayers];

        if (rand < 0.2) {
          // Bot Fold
          action = "Fold";
          updatedPlayers[idx] = { ...p, folded: true, lastAction: "Folded" };
          setTableLog(`${p.name} folded.`);
        } else if (rand < 0.7) {
          // Bot Call / Check
          const callDiff = currentBet - p.bet;
          updatedPlayers[idx] = {
            ...p,
            bet: currentBet,
            stack: Math.max(0, p.stack - callDiff),
            lastAction: callDiff > 0 ? `Called ${callDiff.toLocaleString()}` : "Checked",
          };
          setPot((prev) => prev + Math.max(0, callDiff));
          setTableLog(`${p.name} ${callDiff > 0 ? "called" : "checked"}.`);
        } else {
          // Bot Raise
          const raiseAmt = currentBet + 20000;
          const diff = raiseAmt - p.bet;
          updatedPlayers[idx] = {
            ...p,
            bet: raiseAmt,
            stack: Math.max(0, p.stack - diff),
            lastAction: `Raised to ${raiseAmt.toLocaleString()}`,
          };
          setCurrentBet(raiseAmt);
          setPot((prev) => prev + Math.max(0, diff));
          setTableLog(`${p.name} raised to ${raiseAmt.toLocaleString()}!`);
        }

        setPlayers(updatedPlayers);

        // Check active players count
        const activeCount = updatedPlayers.filter((player) => !player.folded).length;
        if (activeCount <= 1) {
          const survivor = updatedPlayers.find((player) => !player.folded)!;
          sound.playWin();
          setWinningInfo({
            winnerName: survivor.name,
            handName: "Uncontested Pot (All Folded)",
            amount: pot,
          });
          setGameStage("showdown");
          recordHandResult(survivor.isYou, survivor.isYou ? pot : -20000, survivor.name, "Uncontested");
          return;
        }

        // Advance turn index
        let nextIdx = (idx + 1) % updatedPlayers.length;
        while (updatedPlayers[nextIdx].folded && nextIdx !== 4) {
          nextIdx = (nextIdx + 1) % updatedPlayers.length;
        }

        if (nextIdx === 4) {
          // Back to user or advance stage
          setTurnIndex(4);
        } else {
          setTurnIndex(nextIdx);
          handleBotTurn(nextIdx, updatedPlayers);
        }
      }, 700);
    },
    [currentBet, pot, recordHandResult]
  );

  // Player Actions
  const handleUserFold = () => {
    sound.playClick();
    setPlayers((prev) =>
      prev.map((p) => (p.isYou ? { ...p, folded: true, lastAction: "Folded" } : p))
    );
    setTableLog("You folded. Waiting for bots to complete hand.");
    // Auto simulate remaining bots
    advanceStage(gameStage, deck, communityCards, players);
  };

  const handleUserCheckCall = () => {
    sound.playChip();
    const user = players.find((p) => p.isYou);
    if (!user) return;

    const diff = currentBet - user.bet;
    const callCost = Math.max(0, diff);

    setPlayers((prev) =>
      prev.map((p) =>
        p.isYou
          ? {
              ...p,
              bet: currentBet,
              stack: Math.max(0, p.stack - callCost),
              lastAction: callCost > 0 ? `Called ${callCost.toLocaleString()}` : "Checked",
            }
          : p
      )
    );

    setPot((prev) => prev + callCost);
    setTableLog(callCost > 0 ? `You called ${callCost.toLocaleString()}` : "You checked.");

    // Trigger next bots or next round
    advanceStage(gameStage, deck, communityCards, players);
  };

  const handleUserRaise = () => {
    sound.playChip();
    const user = players.find((p) => p.isYou);
    if (!user) return;

    const diff = betAmount - user.bet;
    const raiseCost = Math.max(0, diff);

    setPlayers((prev) =>
      prev.map((p) =>
        p.isYou
          ? {
              ...p,
              bet: betAmount,
              stack: Math.max(0, p.stack - raiseCost),
              lastAction: `Raised ${betAmount.toLocaleString()}`,
            }
          : p
      )
    );

    setCurrentBet(betAmount);
    setPot((prev) => prev + raiseCost);
    setTableLog(`You raised to ${betAmount.toLocaleString()} chips!`);

    // Next turn to Bot 0
    setTurnIndex(0);
    handleBotTurn(0, players);
  };

  const presets = [
    { label: "Min", value: Math.max(40000, currentBet) },
    { label: "1/2 Pot", value: Math.max(currentBet, Math.floor(pot / 2)) },
    { label: "Pot", value: Math.max(currentBet, pot) },
    { label: "All-In", value: chips },
  ];

  return (
    <div className="p-3 sm:p-5 animate-fade-in space-y-4 max-w-4xl mx-auto">
      {/* Table Status Bar */}
      <div className="flex items-center justify-between bg-river-bg2/90 border border-river-line/80 rounded-2xl px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-river-green animate-ping" />
          <span className="font-bold text-xs text-white uppercase tracking-wider">
            Texas Hold&apos;em · No Limit
          </span>
          <span className="bg-river-cyan/20 text-river-cyan text-[10px] font-black px-2 py-0.5 rounded-full">
            Stage: {gameStage.toUpperCase()}
          </span>
        </div>
        <button
          onClick={startNewHand}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black text-xs glow-cyan hover:scale-105 active:scale-95 transition-all shadow"
        >
          🔄 NEW HAND
        </button>
      </div>

      {/* Main Poker Table Canvas */}
      <div
        className={`relative bg-gradient-to-b ${currentFelt.bg} rounded-[48%] border-[12px] sm:border-[16px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8),0_0_50px_rgba(34,211,238,0.1),0_20px_50px_rgba(0,0,0,0.7)] aspect-[2/1] flex items-center justify-center transition-all duration-300`}
        style={{ borderColor: currentFelt.border }}
      >
        <div className="absolute inset-[10px] rounded-[48%] border border-white/10 pointer-events-none" />

        {/* Community Cards */}
        <div className="flex gap-1.5 sm:gap-2 relative z-10 scale-90 sm:scale-100">
          {communityCards.length === 0 && (
            <div className="text-xs text-white/40 font-bold tracking-widest uppercase py-4">
              Waiting for Flop...
            </div>
          )}
          {communityCards.map((c, i) => (
            <Card key={i} suit={c.suit} rank={c.rank} red={c.isRed} />
          ))}
          {Array.from({ length: 5 - communityCards.length }).map((_, i) => (
            <CardBack key={i} styleId={equippedCardBack} />
          ))}
        </div>

        {/* Pot Counter */}
        <div className="absolute top-[34%] left-1/2 -translate-x-1/2 text-center z-20">
          <div className="flex justify-center mb-1">
            <div className="w-[18px] h-[18px] rounded-full bg-river-green shadow-md border border-white/30" />
            <div className="w-[18px] h-[18px] rounded-full bg-river-gold shadow-md -ml-1.5 border border-white/30" />
            <div className="w-[18px] h-[18px] rounded-full bg-river-cyan shadow-md -ml-1.5 border border-white/30" />
          </div>
          <div className="font-display font-black text-lg sm:text-2xl text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]">
            {pot.toLocaleString()}
          </div>
          <div className="text-[9px] text-river-gold font-black tracking-[0.22em] uppercase drop-shadow">
            TOTAL POT
          </div>
        </div>

        {/* Winner Announcement Popup */}
        {winningInfo && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm rounded-[48%] flex items-center justify-center animate-fade-in">
            <div className="text-center p-4 bg-gradient-to-br from-river-bg2 to-river-bg border border-river-gold rounded-3xl shadow-2xl space-y-2 max-w-xs">
              <div className="text-3xl animate-bounce">🏆</div>
              <div className="text-xs font-black text-river-gold uppercase tracking-widest">
                WINNER ANNOUNCEMENT
              </div>
              <div className="font-display font-black text-xl text-white">
                {winningInfo.winnerName}
              </div>
              <div className="text-xs text-river-cyan font-bold">
                {winningInfo.handName}
              </div>
              <div className="text-lg font-black text-river-gold">
                +{winningInfo.amount.toLocaleString()} CHIPS
              </div>
              <button
                onClick={startNewHand}
                className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-river-gold to-amber-500 text-amber-950 font-black text-xs glow-gold hover:scale-105 active:scale-95 transition-all"
              >
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}

        {/* Player Seats */}
        {players.map((s) => {
          const isCurrentTurn = turnIndex === players.indexOf(s) && gameStage !== "showdown";
          return (
            <div
              key={s.id}
              className={`absolute flex flex-col items-center gap-0.5 z-30 transition-all duration-200 ${
                s.pos === "s1"
                  ? "top-2 sm:top-4 left-[15%]"
                  : s.pos === "s2"
                  ? "top-2 sm:top-4 right-[15%]"
                  : s.pos === "s3"
                  ? "bottom-2 sm:bottom-4 left-[5%]"
                  : s.pos === "s4"
                  ? "bottom-2 sm:bottom-4 right-[5%]"
                  : "bottom-1 sm:bottom-3 left-[41%]"
              } ${s.folded ? "opacity-40 grayscale" : ""}`}
            >
              <div
                className={`relative w-11 h-11 sm:w-14 sm:h-14 rounded-full border-[3px] flex items-center justify-center font-black text-xs sm:text-base text-white shadow-xl ${
                  s.isYou
                    ? "border-river-cyan shadow-[0_0_20px_rgba(34,211,238,0.6)]"
                    : isCurrentTurn
                    ? "border-river-gold shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse"
                    : "border-white/20"
                } bg-gradient-to-br ${s.avatarGradient}`}
              >
                {isCurrentTurn && (
                  <div className="absolute -inset-[5px] rounded-full border-[3px] border-transparent border-t-river-gold animate-spin" />
                )}
                {s.name[0]}
                {s.isDealer && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-[9px] font-black text-river-bg flex items-center justify-center shadow-lg border border-gray-300">
                    D
                  </div>
                )}
              </div>

              <div className={`text-[10px] sm:text-xs font-black drop-shadow ${s.isYou ? "text-river-cyan" : "text-white"}`}>
                {s.name}
              </div>

              <div className="text-[9px] sm:text-[10px] text-river-gold font-black drop-shadow">
                {s.stack.toLocaleString()}
              </div>

              {s.lastAction && (
                <div className="bg-black/80 border border-river-line text-river-cyan text-[8px] font-extrabold px-2 py-0.5 rounded-full drop-shadow">
                  {s.lastAction}
                </div>
              )}

              {/* Hole Cards */}
              <div className="flex gap-1 mt-0.5">
                {s.isYou || gameStage === "showdown" ? (
                  s.cards.map((c, i) => <MiniCard key={i} suit={c.suit} rank={c.rank} red={c.isRed} />)
                ) : (
                  <>
                    <CardBack mini styleId={equippedCardBack} />
                    <CardBack mini styleId={equippedCardBack} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Hand Evaluator Display */}
      {userCurrentEval && (
        <div className="bg-river-bg2/90 border border-river-cyan/30 rounded-2xl p-2.5 flex items-center justify-between text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-base">♠️</span>
            <span className="text-river-grey font-bold uppercase tracking-wider text-[10px]">Your Best Hand:</span>
            <span className="font-black text-river-cyan text-sm">{userCurrentEval.handName}</span>
          </div>
          <span className="bg-river-cyan/15 text-river-cyan text-[10px] font-black px-2.5 py-0.5 rounded-full border border-river-cyan/30">
            {userCurrentEval.categoryName}
          </span>
        </div>
      )}

      {/* Action Controls Dock */}
      <div className="bg-river-bg1/95 border border-river-line/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-river-line/50 pb-2.5">
          <div className="text-xs text-river-grey font-bold">
            Live Action: <span className="text-white font-black">{tableLog}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleUserFold}
              disabled={gameStage === "showdown" || userPlayer?.folded}
              className="px-4 py-2 rounded-2xl font-black text-xs bg-red-500/15 text-river-red border border-red-500/30 hover:bg-red-500/25 disabled:opacity-40 transition shadow"
            >
              FOLD
            </button>
            <button
              onClick={handleUserCheckCall}
              disabled={gameStage === "showdown" || userPlayer?.folded}
              className="px-5 py-2 rounded-2xl font-black text-xs bg-gradient-to-r from-river-green to-emerald-600 text-emerald-950 glow-green hover:scale-105 active:scale-95 disabled:opacity-40 transition shadow-lg"
            >
              {currentBet === (userPlayer?.bet || 0) ? "CHECK" : `CALL ${currentBet.toLocaleString()}`}
            </button>
            <button
              onClick={handleUserRaise}
              disabled={gameStage === "showdown" || userPlayer?.folded}
              className="px-5 py-2 rounded-2xl font-black text-xs bg-gradient-to-r from-river-cyan to-blue-600 text-cyan-950 glow-cyan hover:scale-105 active:scale-95 disabled:opacity-40 transition shadow-lg"
            >
              RAISE {betAmount.toLocaleString()}
            </button>
          </div>
        </div>

        {/* Bet Amount Slider & Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-river-grey uppercase tracking-wider font-black">Bet Presets:</span>
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => {
                sound.playClick();
                setBetAmount(p.value);
                setActivePreset(p.label);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-black border transition ${
                activePreset === p.label
                  ? "bg-river-cyan/20 border-river-cyan text-river-cyan shadow-[0_0_10px_rgba(34,211,238,0.3)]"
                  : "bg-river-bg2 border-river-line text-river-grey hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="range"
            min={currentBet}
            max={chips}
            step={10000}
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="flex-1 accent-river-cyan h-1.5 min-w-[100px] cursor-pointer"
          />
          <div className="font-display font-black text-sm text-river-gold min-w-[90px] text-right">
            {betAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Encrypted Trust Notice */}
      <div className="text-center text-[11px] text-river-grey/80 flex items-center justify-center gap-1.5 pt-1">
        <svg className="w-4 h-4 text-river-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>
          Cards are <b className="text-river-white">encrypted onchain via Inco FHE</b>. Zero house peek capability.
        </span>
      </div>
    </div>
  );
}

// Card Renderer Component
function Card({ suit, rank, red }: { suit: string; rank: string; red?: boolean }) {
  return (
    <div
      className={`w-[48px] h-[68px] sm:w-[56px] sm:h-[80px] rounded-xl bg-gradient-to-b from-white via-slate-50 to-slate-200 border border-slate-300 shadow-[0_8px_18px_rgba(0,0,0,0.5)] flex flex-col justify-between p-1.5 font-black text-sm sm:text-base ${
        red ? "text-red-600" : "text-slate-900"
      } hover:translate-y-[-4px] transition-transform cursor-pointer select-none`}
    >
      <div className="leading-none">
        {rank}
        <span className="text-xs sm:text-sm ml-0.5">{suit}</span>
      </div>
      <div className="text-lg sm:text-2xl self-end leading-none">{suit}</div>
    </div>
  );
}

function MiniCard({ suit, rank, red }: { suit: string; rank: string; red?: boolean }) {
  return (
    <div
      className={`w-[26px] h-[36px] sm:w-[30px] sm:h-[42px] rounded-md bg-white border border-gray-300 shadow-md flex flex-col justify-between p-0.5 font-black text-[9px] sm:text-[10px] ${
        red ? "text-red-600" : "text-slate-900"
      } select-none`}
    >
      <span className="leading-none">{rank}{suit}</span>
      <span className="self-end leading-none">{suit}</span>
    </div>
  );
}

function CardBack({ mini, styleId }: { mini?: boolean; styleId?: string }) {
  const gradients: Record<string, string> = {
    classic: "from-blue-900 to-indigo-950 border-river-cyan/60",
    neon: "from-cyan-600 to-cyan-950 border-cyan-400",
    royal: "from-purple-800 to-violet-950 border-violet-400",
    gold: "from-amber-600 to-yellow-900 border-yellow-300",
    flow: "from-teal-600 to-cyan-900 border-teal-300",
    inco: "from-emerald-700 to-emerald-950 border-emerald-400",
  };

  const currentGradient = gradients[styleId || "classic"] || gradients.classic;

  if (mini) {
    return (
      <div className={`w-[26px] h-[36px] sm:w-[30px] sm:h-[42px] rounded-md bg-gradient-to-br ${currentGradient} border shadow-md flex items-center justify-center text-[10px] text-white/50 select-none`}>
        ♦
      </div>
    );
  }

  return (
    <div
      className={`w-[48px] h-[68px] sm:w-[56px] sm:h-[80px] rounded-xl bg-gradient-to-br ${currentGradient} border-2 shadow-[0_8px_18px_rgba(0,0,0,0.5)] flex items-center justify-center text-white/40 text-xl font-black select-none animate-pulse-glow`}
    >
      ♦
    </div>
  );
}
