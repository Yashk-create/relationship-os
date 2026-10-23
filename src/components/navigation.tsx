"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@prisma/client";
import { 
  LayoutDashboard, 
  Users, 
  Target, 
  Clock, 
  Calendar, 
  LogOut,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isClerkConfigured } from "@/lib/auth-client";
import { SignOutButton } from "@clerk/nextjs";

type SidebarProps = {
  userRole: UserRole;
  userName: string;
  userEmail: string;
};

export default function Navigation({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "JOB_SEEKER":
        return "Job Seeker";
      case "FREELANCER":
        return "Freelancer";
      case "FOUNDER":
        return "Founder";
      default:
        return "Workspace";
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard
    },
    {
      label: "Contacts",
      href: "/contacts",
      icon: Users
    },
    {
      label: userRole === "JOB_SEEKER" 
        ? "Applications" 
        : userRole === "FREELANCER" 
          ? "Projects" 
          : "Opportunities",
      href: "/opportunities",
      icon: Target
    },
    {
      label: "Follow-Ups",
      href: "/follow-ups",
      icon: Clock
    },
    {
      label: "Meetings",
      href: "/meetings",
      icon: Calendar
    }
  ];

  const clerkConfigured = isClerkConfigured();

  return (
    <aside className="w-64 border-r border-zinc-900 bg-[#09090b] flex flex-col h-screen sticky top-0 shrink-0 text-[#f4f4f5]">
      {/* Brand Header */}
      <div className="h-14 border-b border-zinc-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center text-black font-extrabold text-xs">
            R
          </div>
          <span className="font-semibold tracking-tight text-white text-sm">RelationshipOS</span>
        </div>
        <span className="text-[9px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 py-0.5 px-2 rounded-full uppercase tracking-wider">
          {getRoleLabel(userRole)}
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group select-none",
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-950"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile Block */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-sm">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{userName}</p>
            <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
          </div>
        </div>

        {clerkConfigured ? (
          <SignOutButton>
            <button className="w-full h-8 px-3 rounded-lg border border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors select-none">
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </SignOutButton>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="w-full h-6 rounded bg-zinc-900/50 border border-zinc-850 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 select-none">
              <UserCheck className="w-3 h-3 text-zinc-400" />
              Local Mock Dev Mode
            </div>
            <Link
              href="/"
              className="w-full h-8 px-3 rounded-lg border border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors select-none"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Mock
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
