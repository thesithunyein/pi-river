import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-river-bg text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="text-6xl">🃏</div>
      <h1 className="text-3xl font-black font-display text-river-gold">404 - Table Not Found</h1>
      <p className="text-river-grey text-sm max-w-sm">
        The poker table or page you are looking for does not exist or has been folded.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-river-cyan to-blue-600 text-river-bg font-black text-sm shadow-lg hover:scale-105 transition"
      >
        Return to Lobby
      </Link>
    </div>
  );
}
