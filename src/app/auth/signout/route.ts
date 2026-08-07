import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  // Clear guest cookie if present
  const response = NextResponse.redirect(`${requestUrl.origin}/auth/signin`, {
    status: 301,
  });
  response.cookies.delete("river_guest_mode");

  return response;
}
