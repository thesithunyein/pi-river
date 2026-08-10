import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") || searchParams.get("error");
  const next = safeNextPath(searchParams.get("next"));

  if (oauthError) {
    const msg = encodeURIComponent(oauthError.slice(0, 180));
    return NextResponse.redirect(`${origin}/?auth_error=${msg}`);
  }

  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(
        `${origin}/?auth_error=${encodeURIComponent("Google sign-in is not configured on the server.")}`
      );
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    // PKCE / cookie race: hand the code to a client page for a second try.
    const confirm = new URL(`${origin}/auth/confirm`);
    confirm.searchParams.set("code", code);
    confirm.searchParams.set("next", next);
    confirm.searchParams.set("reason", error.message || "exchange_failed");
    return NextResponse.redirect(confirm.toString());
  }

  return NextResponse.redirect(
    `${origin}/?auth_error=${encodeURIComponent("Google sign-in did not return a code. Try again.")}`
  );
}
