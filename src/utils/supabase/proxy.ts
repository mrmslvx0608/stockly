import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Pass refreshed cookies to this request's Server Components too.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          const previousCookies = response.cookies.getAll();
          const previousHeaders = new Headers(response.headers);
          response = NextResponse.next({ request });
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          for (const name of ["cache-control", "expires", "pragma"]) {
            const value = previousHeaders.get(name);
            if (value) response.headers.set(name, value);
          }
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
        },
      },
    },
  );

  // Validate and refresh before rendering; never trust getSession() for auth.
  await supabase.auth.getClaims();

  // Return this response so the browser receives the refreshed cookies.
  return response;
}
