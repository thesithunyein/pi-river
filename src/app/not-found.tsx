import Link from "next/link";
import { CardsIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 px-6 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-[#161322] text-[#B9A8FF] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <CardsIcon className="h-10 w-10" />
      </div>
      <h1 className="font-display text-3xl font-black text-white">Page not found</h1>
      <p className="max-w-sm text-sm text-[#9AA0B4]">
        That screen is missing. Head back to the lobby and pick a seat.
      </p>
      <Link
        href="/"
        className="brand-gradient rounded-2xl px-6 py-3 text-sm font-black text-slate-950 shadow-[0_10px_28px_rgba(245,197,24,0.28)] transition hover:brightness-105 active:translate-y-px"
      >
        Back to Play
      </Link>
    </div>
  );
}
