import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request and keeps /app behind
// a sign-in. Next 16 calls this file `proxy` (it was `middleware`); the shape is
// the one Supabase documents for the App Router.
export async function proxy(request: NextRequest) {
  // A sign-in link whose redirect wasn't on Supabase's allow list falls back
  // to the Site URL with the code still attached. Catching it anywhere means
  // the link works before the dashboard is fully configured.
  const path = request.nextUrl.pathname;
  if (path !== "/auth/callback" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser rather than getSession: getSession trusts the cookie, getUser
  // asks the auth server, and only the second is safe to gate a page on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && path.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
