import { getMeetings } from "@/lib/actions/meetings";
import { getContacts } from "@/lib/actions/contacts";
import MeetingsManager from "./meetings-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meetings & Notes | RelationshipOS",
  description: "Schedule meetings, invite participants, and take structured action item notes.",
};

export default async function MeetingsPage() {
  const meetings = await getMeetings();
  const contacts = await getContacts();

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Meetings</h1>
          <p className="text-sm text-zinc-400">
            Log your video calls, coffee chats, and advisory syncs. Set follow-up actions and save meeting summaries.
          </p>
        </div>
      </div>

      <MeetingsManager initialMeetings={meetings} contacts={contacts} />
    </div>
  );
}
