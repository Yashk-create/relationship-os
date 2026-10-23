import { getOpportunities } from "@/lib/actions/opportunities";
import { getContacts } from "@/lib/actions/contacts";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import OpportunitiesManager from "./opportunities-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities | RelationshipOS",
  description: "Track your active pipeline, applications, projects, or investor fundraising.",
};

export default async function OpportunitiesPage() {
  const { dbUser } = await getAuthUser();
  if (!dbUser.role) {
    redirect("/onboard");
  }

  const opportunities = await getOpportunities();
  const contacts = await getContacts();

  const getModuleTitle = (role: string) => {
    switch (role) {
      case "JOB_SEEKER":
        return "Applications";
      case "FREELANCER":
        return "Projects";
      case "FOUNDER":
        return "Opportunities";
      default:
        return "Pipeline";
    }
  };

  const getModuleDescription = (role: string) => {
    switch (role) {
      case "JOB_SEEKER":
        return "Manage your active job applications, recruiter followups, and interview stages.";
      case "FREELANCER":
        return "Track freelance contract values, client proposals, negotiations, and active gigs.";
      case "FOUNDER":
        return "Manage investor fundraising, advisor check-ins, customer pipelines, and strategic partnerships.";
      default:
        return "Manage your active workspace pipelines.";
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {getModuleTitle(dbUser.role)}
          </h1>
          <p className="text-sm text-zinc-400">
            {getModuleDescription(dbUser.role)}
          </p>
        </div>
      </div>

      <OpportunitiesManager 
        initialOpportunities={opportunities} 
        contacts={contacts} 
        userRole={dbUser.role} 
      />
    </div>
  );
}
