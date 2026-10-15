import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals, Vercel internals,
  // and anything with a dot in it (favicon.ico, og.png, robots.txt).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
