"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { onboardUser } from "@/lib/actions/user";
import { UserRole } from "@prisma/client";
import { Briefcase, DollarSign, Rocket, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RoleOption = {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
};

const OPTIONS: RoleOption[] = [
  {
    id: "JOB_SEEKER",
    title: "Job Seeker",
    description: "Tracking your career search, application responses, and interviews.",
    icon: Briefcase,
    features: [
      "Track job applications & statuses",
      "Store recruiter & referral contacts",
      "Log interview schedules & offers",
      "Organize follow-up reminders"
    ]
  },
  {
    id: "FREELANCER",
    title: "Freelancer",
    description: "Managing project proposals, contracts, active clients, and incoming revenue.",
    icon: DollarSign,
    features: [
      "Track clients & contracts",
      "Manage proposals & values (₹)",
      "Log client meeting outcomes",
      "Monitor monthly revenue pipelines"
    ]
  },
  {
    id: "FOUNDER",
    title: "Founder",
    description: "Managing investor relations, customer leads, partnerships, and fundraising rounds.",
    icon: Rocket,
    features: [
      "Track investors & pitch statuses",
      "Manage customer pipelines",
      "Organize advisory board notes",
      "Monitor fundraising progress"
    ]
  }
];

export default function OnboardingForm() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!selectedRole) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await onboardUser(selectedRole);
      if (res.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError("Something went wrong. Please try again.");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRole === option.id;

          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "group relative cursor-pointer rounded-2xl border bg-zinc-950 p-6 text-left transition-all duration-300 hover:translate-y-[-2px] select-none flex flex-col justify-between min-h-[300px]",
                isSelected
                  ? "border-white shadow-[0_0_25px_rgba(255,255,255,0.06)]"
                  : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              <div>
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300",
                    isSelected
                      ? "bg-white text-black"
                      : "bg-zinc-900 text-zinc-400 group-hover:text-zinc-200"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                
                <h3 className="text-xl font-bold tracking-tight text-white mb-2">
                  {option.title}
                </h3>
                
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  {option.description}
                </p>
              </div>

              <ul className="space-y-2 border-t border-zinc-900 pt-4 mt-auto">
                {option.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center text-xs text-zinc-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 mr-2 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Glowing gradient background border effect when selected */}
              {isSelected && (
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-t from-white/10 to-transparent pointer-events-none -z-10" />
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="text-rose-500 text-sm font-medium bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl max-w-sm mx-auto">
          {error}
        </div>
      )}

      <div>
        <button
          onClick={handleSubmit}
          disabled={!selectedRole || isSubmitting}
          className={cn(
            "w-full max-w-xs h-12 rounded-xl font-semibold inline-flex items-center justify-center gap-2 transition-all duration-200 select-none shadow-sm",
            selectedRole && !isSubmitting
              ? "bg-white text-black hover:opacity-90 active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up Workspace...
            </>
          ) : (
            <>
              Get Started
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
