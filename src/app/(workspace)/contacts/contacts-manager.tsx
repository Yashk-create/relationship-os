"use client";

import { useState } from "react";
import { 
  createContact, 
  updateContact, 
  deleteContact, 
  logCustomInteraction,
  getContactTimeline
} from "@/lib/actions/contacts";
import { Contact, Interaction } from "@prisma/client";
import { 
  Plus, Search, Building2, Mail, Phone, 
  Globe, Trash2, Edit2, 
  X, 
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

function Linkedin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

type ContactsManagerProps = {
  initialContacts: Contact[];
};

export default function ContactsManager({ initialContacts }: ContactsManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactTimeline, setContactTimeline] = useState<Interaction[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Modals / Drawer toggles
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for creating / editing
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    linkedin: "",
    website: "",
    tags: "",
    notes: ""
  });

  // Log interaction form state
  const [logData, setLogData] = useState({
    type: "EMAIL" as "EMAIL" | "CALL" | "LINKEDIN_MESSAGE" | "NOTE",
    description: ""
  });
  const [isLogging, setIsLogging] = useState(false);

  // Filter contacts by search
  const filteredContacts = contacts.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.company && c.company.toLowerCase().includes(term)) ||
      (c.role && c.role.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      c.tags.some((t) => t.toLowerCase().includes(term))
    );
  });

  // Open contact details drawer
  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact);
    setIsLoadingTimeline(true);
    try {
      const timeline = await getContactTimeline(contact.id);
      setContactTimeline(timeline);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Create Contact
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const newContact = await createContact({
        ...formData,
        tags: tagsArray
      });

      setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)));
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Contact
  const handleEditOpen = (contact: Contact) => {
    setFormData({
      name: contact.name,
      company: contact.company || "",
      role: contact.role || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedin: contact.linkedin || "",
      website: contact.website || "",
      tags: contact.tags.join(", "),
      notes: contact.notes || ""
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !formData.name) return;

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const updated = await updateContact(selectedContact.id, {
        ...formData,
        tags: tagsArray
      });

      setContacts((prev) =>
        prev.map((c) => (c.id === selectedContact.id ? updated : c))
      );
      setSelectedContact(updated);
      setIsEditOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Contact
  const handleDelete = async (contactId: string) => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    try {
      await deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Create manual interaction log
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !logData.description) return;

    setIsLogging(true);
    try {
      const newLog = await logCustomInteraction(
        selectedContact.id,
        logData.type,
        logData.description
      );
      setContactTimeline((prev) => [newLog, ...prev]);
      setLogData({ type: "EMAIL", description: "" });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLogging(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      company: "",
      role: "",
      email: "",
      phone: "",
      linkedin: "",
      website: "",
      tags: "",
      notes: ""
    });
  };

  return (
    <div className="flex gap-6 relative min-h-[500px]">
      
      {/* Left side: Contacts Directory */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, company, email, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-zinc-950 border border-zinc-900 focus:border-zinc-800 text-zinc-100 placeholder-zinc-500 outline-none text-sm transition-all"
            />
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsAddOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all select-none whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Contact
          </button>
        </div>

        {/* Contacts Grid/List */}
        {filteredContacts.length === 0 ? (
          <div className="border border-zinc-900 bg-zinc-950/20 rounded-2xl p-12 text-center text-zinc-500">
            <Building2 className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
            <p className="text-sm">No contacts found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => handleSelectContact(contact)}
                className={cn(
                  "p-5 rounded-2xl border bg-zinc-950/40 hover:bg-zinc-950/80 cursor-pointer transition-all duration-200 text-left flex flex-col justify-between h-[180px] group",
                  selectedContact?.id === contact.id
                    ? "border-zinc-500"
                    : "border-zinc-900 hover:border-zinc-850"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white group-hover:text-white text-sm">
                        {contact.name}
                      </h4>
                      {(contact.role || contact.company) && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {contact.role} {contact.role && contact.company ? "at" : ""} {contact.company}
                        </p>
                      )}
                    </div>
                    
                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(contact.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Tags */}
                  {contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] bg-zinc-900 border border-zinc-850 text-zinc-400 py-0.5 px-2 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Info (Email & Phone icons) */}
                <div className="flex items-center gap-4 text-xs text-zinc-500 border-t border-zinc-900/80 pt-3">
                  {contact.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="truncate">{contact.email}</span>
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center gap-1.5 shrink-0">
                      <Phone className="w-3.5 h-3.5 text-zinc-600" />
                      <span>{contact.phone}</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Contact Details Drawer */}
      {selectedContact && (
        <div className="w-[380px] bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col h-[calc(100vh-140px)] sticky top-[90px] shrink-0 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950">
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base truncate">{selectedContact.name}</h3>
              <p className="text-xs text-zinc-500 truncate">
                {selectedContact.role} {selectedContact.role && selectedContact.company ? "@" : ""} {selectedContact.company}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEditOpen(selectedContact)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Edit Contact"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedContact(null)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {/* Meta Details List */}
            <div className="space-y-3.5">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Details</h5>
              
              {selectedContact.email && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                  <a href={`mailto:${selectedContact.email}`} className="hover:underline truncate">{selectedContact.email}</a>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                  <span>{selectedContact.phone}</span>
                </div>
              )}
              {selectedContact.linkedin && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Linkedin className="w-4 h-4 text-zinc-500 shrink-0" />
                  <a href={selectedContact.linkedin} target="_blank" rel="noreferrer" className="hover:underline truncate text-zinc-400">
                    LinkedIn Profile
                  </a>
                </div>
              )}
              {selectedContact.website && (
                <div className="flex items-center gap-3 text-xs text-zinc-300">
                  <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                  <a href={selectedContact.website} target="_blank" rel="noreferrer" className="hover:underline truncate text-zinc-400">
                    {selectedContact.website.replace(/(^\w+:|^)\/\//, "")}
                  </a>
                </div>
              )}
              {selectedContact.notes && (
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Internal Notes</span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{selectedContact.notes}</p>
                </div>
              )}
            </div>

            {/* Log Interaction Form */}
            <form onSubmit={handleLogSubmit} className="space-y-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-900">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Log Interaction</h5>
              
              <div className="flex gap-2">
                <select
                  value={logData.type}
                  onChange={(e) => setLogData((prev) => ({ ...prev, type: e.target.value as typeof prev.type }))}
                  className="h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 px-2 outline-none focus:border-zinc-700"
                >
                  <option value="EMAIL">Email</option>
                  <option value="CALL">Call</option>
                  <option value="LINKEDIN_MESSAGE">LinkedIn</option>
                  <option value="NOTE">Note</option>
                </select>
                <input
                  type="text"
                  placeholder="e.g. Sent introductory deck..."
                  value={logData.description}
                  onChange={(e) => setLogData((prev) => ({ ...prev, description: e.target.value }))}
                  className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 px-3 outline-none focus:border-zinc-700 placeholder-zinc-650"
                  required
                />
                <button
                  type="submit"
                  disabled={isLogging}
                  className="h-8 px-3 rounded-lg bg-white text-black text-xs font-semibold hover:opacity-95 flex items-center justify-center shrink-0"
                >
                  {isLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Log"}
                </button>
              </div>
            </form>

            {/* Interaction Timeline Feed */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Interaction History</h5>
              
              {isLoadingTimeline ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                </div>
              ) : contactTimeline.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center">No logged interactions.</p>
              ) : (
                <div className="space-y-3.5 pl-2 border-l border-zinc-900 relative">
                  {contactTimeline.map((item) => (
                    <div key={item.id} className="relative text-xs space-y-1">
                      {/* Timeline dot */}
                      <span className="w-2 h-2 rounded-full bg-zinc-700 absolute -left-[13px] top-[5px] border border-zinc-950" />
                      
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium select-none">
                        <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">
                          {item.type}
                        </span>
                        <span>{new Date(item.occurredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                      
                      <p className="text-zinc-300 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">New Contact</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Recruiter"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. priya@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Referral, Designer, Advisor"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full h-20 rounded-xl bg-zinc-900 border border-zinc-800 text-xs p-3 text-white focus:border-zinc-700 outline-none resize-none"
                    placeholder="Write details about where you met them or context..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-900 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Edit Contact</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData((prev) => ({ ...prev, company: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">LinkedIn URL</label>
                  <input
                    type="text"
                    value={formData.linkedin}
                    onChange={(e) => setFormData((prev) => ({ ...prev, linkedin: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full h-20 rounded-xl bg-zinc-900 border border-zinc-800 text-xs p-3 text-white focus:border-zinc-700 outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-900 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="h-9 px-4 rounded-xl border border-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-4 rounded-xl bg-white text-black text-xs font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
