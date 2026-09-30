import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accountsOpen, needsAccount } from "@/lib/accounts";

// Refreshes the Supabase session cookie on every request and keeps /app behind
// a sign-in. Next 16 calls this file `proxy` (it was `middleware`); the shape is
// the one Supabase documents for the App Router.
export async function proxy(request: NextRequest) {
  // A sign-in link whose redirect wasn't on Supabase's allow list falls back
  // to the Site URL with the code still attached. Catching it anywhere means
  // the link works before the dashboard is fully configured.
  const path = request.nextUrl.pathname;

  // The signed-in half, when it is closed — see `accountsOpen`. First, before
  // the sign-in link is rescued and before Supabase is touched at all: a closed
  // door should not be exchanging auth codes behind itself, and the public side
  // of the site has no business paying for a session lookup it will not use.
  // The sign-in page itself still answers, to say accounts aren't open yet
  // (every "Sign in" on the site leads there); nothing past it opens.
  if (!accountsOpen && needsAccount(path) && path !== "/login") {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  if (path !== "/auth/callback" && request.nextUrl.searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  // Without the two Supabase variables `createServerClient` throws, and this
  // runs on every request — so a missing variable took down robots.txt and
  // the landing page along with the parts that actually need an account.
  // Letting the request through instead keeps the public side of the site
  // readable and confines the damage to /app, which is the only place that
  // can't work without a session.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Supabase env missing: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are both required.");
    return response;
  }

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
    url.pathname = "/shows";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
