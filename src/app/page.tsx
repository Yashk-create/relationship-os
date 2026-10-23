import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch (error) {
    console.error("Auth check failed:", error);
  }

  // If we have an active session, redirect to the appropriate place
  if (user && user.dbUser) {
    if (!user.dbUser.role) {
      redirect("/onboard");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#09090b] text-[#f4f4f5] overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-zinc-900 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-extrabold text-sm">
            R
          </div>
          <span className="font-semibold tracking-tight text-white">RelationshipOS</span>
        </div>
        <div>
          <Link
            href="/dashboard"
            className="h-9 px-4 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-white text-sm font-medium inline-flex items-center justify-center transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Hero */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 text-center space-y-8 z-10 py-16 md:py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>v1.0.0 Now Available</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#d4d4d8] to-[#71717a] bg-clip-text text-transparent leading-[1.15] md:leading-[1.1]">
          A second brain for professional relationships
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
          The workspace designed for Founders, Freelancers, and Job Seekers. Notion + Attio + Linear in one workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="h-12 px-6 rounded-xl bg-white text-black font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Launch Workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/40">
            <h3 className="text-white font-bold mb-2">Role Customization</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Dashboards and terminology customized for Founders, Freelancers, and Job Seekers. No configuration needed.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/40">
            <h3 className="text-white font-bold mb-2">Unified Timeline</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Every status change, email, call, follow-up, and note rendered in a single, beautiful chronological feed.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/40">
            <h3 className="text-white font-bold mb-2">Floating Note Drawer</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              A floating notes panel in the top-right corner. Accessible from any page, auto-saves to your database.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center border-t border-zinc-900 text-xs text-zinc-600 z-10">
        © {new Date().getFullYear()} RelationshipOS. All rights reserved.
      </footer>
    </div>
  );
}
