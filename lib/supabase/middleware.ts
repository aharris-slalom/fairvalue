import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data: { user: authUser } } = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      )
    ]);
    user = authUser;
  } catch (err) {
    console.error('Auth middleware error:', err instanceof Error ? err.message : 'Unknown error');
  }

  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/dashboard", "/protest", "/checkout"];
  const publicExceptions = ["/protest/preview"];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isException = publicExceptions.some((route) => pathname.startsWith(route));

  if (isProtected && !isException && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
