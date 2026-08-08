"use client";

import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/ui/BottomNav";
import { TopBar } from "@/components/ui/TopBar";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-screen text-white">
        <TopBar />
        <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-lg flex-col px-4 pb-32 pt-4 sm:max-w-5xl sm:px-6 sm:pt-5 lg:max-w-6xl">
          {children}
        </main>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
