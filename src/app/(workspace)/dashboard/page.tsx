import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getGlobalTimeline } from "@/lib/actions/timeline";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Workspace Dashboard | RelationshipOS",
  description: "A second brain for professional relationships, applications, and pipelines.",
};

export default async function DashboardPage() {
  const { dbUser, name } = await getAuthUser();
  if (!dbUser.role) {
    redirect("/onboard");
  }

  // Fetch metrics data
  const totalContacts = await db.contact.count({
    where: { userId: dbUser.id }
  });

  const opportunities = await db.opportunity.findMany({
    where: { userId: dbUser.id },
    include: { contact: true }
  });

  const activeOpportunitiesCount = opportunities.filter(
    (o) => o.status !== "Rejected" && o.status !== "Lost" && o.status !== "Invested" && o.status !== "Passed"
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const followUpsDueCount = await db.followUp.count({
    where: {
      userId: dbUser.id,
      completed: false,
      dueDate: {
        lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // before tomorrow 00:00 (due today or overdue)
      }
    }
  });

  const meetingsScheduledCount = await db.meeting.count({
    where: {
      userId: dbUser.id,
      meetingDate: {
        gte: today
      }
    }
  });

  // The next 3 meetings for the "Upcoming Meetings" panel. (Previously the 3
  // *oldest* meetings were shown, including ones that had already happened.)
  const recentMeetings = await db.meeting.findMany({
    where: { userId: dbUser.id, meetingDate: { gte: new Date() } },
    include: { participants: true },
    orderBy: { meetingDate: "asc" },
    take: 3
  });

  const timeline = await getGlobalTimeline();

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome back, {name.split(" ")[0]}
          </h1>
          <p className="text-sm text-zinc-400">
            Here is what is happening across your professional relationships today.
          </p>
        </div>
      </div>

      <DashboardClient
        userRole={dbUser.role}
        userName={name}
        metrics={{
          totalContacts,
          activeOpportunities: activeOpportunitiesCount,
          followUpsDue: followUpsDueCount,
          meetingsScheduled: meetingsScheduledCount
        }}
        opportunities={opportunities}
        timeline={timeline}
        recentMeetings={recentMeetings}
      />
    </div>
  );
}
