import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, publicEnv } from "@/lib/env";

/** Renova a sessão do Supabase e protege /painel (exceto a tela de login e o manifesto do app). */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = publicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // Públicos: a tela de login e o manifesto do app do painel (o navegador o busca sem cookies).
  const isPublic = path === "/painel/login" || /^\/painel\/[a-z0-9-]+\/manifest\.webmanifest$/.test(path);
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel/login";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/painel", "/painel/:path*"],
};
