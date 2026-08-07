import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-mi-shell text-river-white">
      <TopBar />
      <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-5xl flex-col px-4 pb-28 pt-5 sm:px-6">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
