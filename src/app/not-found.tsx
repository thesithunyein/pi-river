import Link from "next/link";
import { CardsIcon } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 px-6 text-center text-white">
      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-river-line/20 bg-river-bg2/80 text-river-violet shadow-mi-panel">
        <CardsIcon className="h-10 w-10" />
      </div>
      <h1 className="text-3xl font-black font-display text-river-white">Page not found</h1>
      <p className="max-w-sm text-sm text-river-grey">
        The table or screen you are looking for is not part of the current mi River shell.
      </p>
      <Link
        href="/"
        className="brand-gradient rounded-2xl px-6 py-3 text-sm font-black text-slate-950 shadow-mi-glow transition hover:brightness-105 active:translate-y-px"
      >
        Return to Lobby
      </Link>
    </div>
  );
}
