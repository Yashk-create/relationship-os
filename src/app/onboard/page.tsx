import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import OnboardingForm from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardPage() {
  const { dbUser } = await getAuthUser();

  // If user is already onboarded and has a role, redirect to dashboard
  if (dbUser && dbUser.role) {
    // We let them onboard, but if they already did, they can go to dashboard
    // Wait, let's redirect them so they don't get stuck.
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] text-[#f4f4f5] px-4 py-12">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f2e_1px,transparent_1px),linear-gradient(to_bottom,#1f1f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />
      
      <div className="w-full max-w-4xl relative z-10 space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-[#a1a1aa] to-[#71717a] bg-clip-text text-transparent">
            Welcome to RelationshipOS
          </h1>
          <p className="text-zinc-400 text-lg max-w-lg mx-auto">
            Choose your primary workflow. We&apos;ll customize your dashboard, terminology, and pipeline tools to match.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
