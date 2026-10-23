import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts`. This is only the first,
// optimistic gate: every Server Action still checks auth and ownership itself,
// because actions are reachable by direct POST requests.

const isPublicRoute = createRouteMatcher(["/", "/api/webhooks/clerk"]);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  ) {
    // Demo mode (one shared mock user) is for local development only.
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_MODE !== "true") {
      return new NextResponse("Authentication is not configured", { status: 503 });
    }
    return NextResponse.next();
  }

  return clerkMiddleware(async (auth, req) => {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  })(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html|css|js|json|png|jpg|jpeg|gif|svg|txt|ico|xml|rdf|pdf|svg|woff2|woff|ttf|eot|csv|docx|xlsx|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
