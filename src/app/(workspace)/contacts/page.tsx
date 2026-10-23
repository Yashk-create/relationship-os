import { getContacts } from "@/lib/actions/contacts";
import ContactsManager from "./contacts-manager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contacts | RelationshipOS",
  description: "Manage your professional contacts, tags, and interaction histories.",
};

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Contacts</h1>
          <p className="text-sm text-zinc-400">
            Keep track of developers, recruiters, advisors, and clients in your network.
          </p>
        </div>
      </div>

      <ContactsManager initialContacts={contacts} />
    </div>
  );
}
