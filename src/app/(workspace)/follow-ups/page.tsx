import { getFollowUps } from "@/lib/actions/followups";
import { getContacts } from "@/lib/actions/contacts";
import { getOpportunities } from "@/lib/actions/opportunities";
import FollowupsManager from "./followups-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Follow-Ups & Tasks | RelationshipOS",
  description: "Organize reminders, deadlines, and task lists.",
};

export default async function FollowUpsPage() {
  const followUps = await getFollowUps();
  const contacts = await getContacts();
  const opportunities = await getOpportunities();

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Follow-Ups</h1>
          <p className="text-sm text-zinc-400">
            Never lose track of a lead. Stay on top of your daily reminders, checklists, and calls.
          </p>
        </div>
      </div>

      <FollowupsManager 
        initialFollowUps={followUps} 
        contacts={contacts} 
        opportunities={opportunities} 
      />
    </div>
  );
}
