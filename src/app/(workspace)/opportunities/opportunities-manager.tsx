"use client";

import { useState } from "react";
import { 
  createOpportunity, 
  updateOpportunityStatus, 
  updateOpportunity,
  deleteOpportunity,
  getOpportunityTimeline
} from "@/lib/actions/opportunities";
import { Opportunity, Contact, Priority, UserRole, Interaction } from "@prisma/client";
import { 
  Plus, Calendar, IndianRupee, Trash2, Edit2, 
  X, Loader2, Link as LinkIcon,
  Info
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";

type OpportunitiesManagerProps = {
  initialOpportunities: (Opportunity & { contact: Contact | null })[];
  contacts: Contact[];
  userRole: UserRole;
};

// Define stages for each workflow
const ROLE_COLUMNS: Record<UserRole, string[]> = {
  JOB_SEEKER: ["Applied", "Interviewing", "Offer Received", "Rejected"],
  FREELANCER: ["Proposal Sent", "In Negotiation", "Contract Signed", "Lost"],
  FOUNDER: ["Lead", "Contacted", "Meeting Scheduled", "Due Diligence", "Invested"]
};

export default function OpportunitiesManager({ 
  initialOpportunities, 
  contacts, 
  userRole 
}: OpportunitiesManagerProps) {
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState<(Opportunity & { contact: Contact | null }) | null>(null);
  const [timeline, setTimeline] = useState<Interaction[]>([]);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);

  // Modal / drawer toggles
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for creating / editing
  const [formData, setFormData] = useState({
    title: "",
    value: "",
    status: ROLE_COLUMNS[userRole][0],
    priority: "MEDIUM" as Priority,
    contactId: "",
    notes: "",
    nextActionDate: ""
  });

  const columns = ROLE_COLUMNS[userRole];

  // Open opportunity detail drawer
  const handleSelectOpportunity = async (opp: Opportunity & { contact: Contact | null }) => {
    setSelectedOpportunity(opp);
    setIsLoadingTimeline(true);
    try {
      const logs = await getOpportunityTimeline(opp.id);
      setTimeline(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTimeline(false);
    }
  };

  // Create Opportunity
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setIsSubmitting(true);
    try {
      const created = await createOpportunity({
        title: formData.title,
        value: formData.value ? parseFloat(formData.value) : undefined,
        status: formData.status,
        priority: formData.priority,
        contactId: formData.contactId || undefined,
        notes: formData.notes || undefined,
        nextActionDate: formData.nextActionDate ? new Date(formData.nextActionDate) : undefined
      });

      // Find the associated contact details to keep the local array typed correctly
      const contactDetail = contacts.find((c) => c.id === created.contactId) || null;
      const opportunityWithContact = { ...created, contact: contactDetail };

      setOpportunities((prev) => [opportunityWithContact, ...prev]);
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change opportunity status from card select
  const handleStatusChange = async (oppId: string, newStatus: string) => {
    try {
      const updated = await updateOpportunityStatus(oppId, newStatus);
      
      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, status: updated.status } : o))
      );

      if (selectedOpportunity?.id === oppId) {
        setSelectedOpportunity((prev) => prev ? { ...prev, status: updated.status } : null);
        // Reload timeline
        const logs = await getOpportunityTimeline(oppId);
        setTimeline(logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Opportunity
  const handleEditOpen = (opp: Opportunity & { contact: Contact | null }) => {
    setFormData({
      title: opp.title,
      value: opp.value !== null ? opp.value.toString() : "",
      status: opp.status,
      priority: opp.priority,
      contactId: opp.contactId || "",
      notes: opp.notes || "",
      nextActionDate: opp.nextActionDate ? new Date(opp.nextActionDate).toISOString().split("T")[0] : ""
    });
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpportunity || !formData.title) return;

    setIsSubmitting(true);
    try {
      const updated = await updateOpportunity(selectedOpportunity.id, {
        title: formData.title,
        value: formData.value ? parseFloat(formData.value) : undefined,
        status: formData.status,
        priority: formData.priority,
        contactId: formData.contactId || undefined,
        notes: formData.notes || undefined,
        nextActionDate: formData.nextActionDate ? new Date(formData.nextActionDate) : undefined
      });

      const contactDetail = contacts.find((c) => c.id === updated.contactId) || null;
      const opportunityWithContact = { ...updated, contact: contactDetail };

      setOpportunities((prev) =>
        prev.map((o) => (o.id === selectedOpportunity.id ? opportunityWithContact : o))
      );
      setSelectedOpportunity(opportunityWithContact);
      setIsEditOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Opportunity
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this opportunity?")) return;

    try {
      await deleteOpportunity(id);
      setOpportunities((prev) => prev.filter((o) => o.id !== id));
      if (selectedOpportunity?.id === id) {
        setSelectedOpportunity(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      value: "",
      status: columns[0],
      priority: "MEDIUM" as Priority,
      contactId: "",
      notes: "",
      nextActionDate: ""
    });
  };

  // Calculate sum value of a column
  const getColumnSum = (col: string) => {
    const sum = opportunities
      .filter((o) => o.status === col)
      .reduce((acc, o) => acc + (o.value || 0), 0);
    return sum;
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top action header: Add Opportunity */}
      <div className="flex justify-between items-center bg-zinc-950/20 p-4 border border-zinc-900 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>Click a card to log activity timeline or view internal tracking details.</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="h-9 px-4 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all select-none"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Add Item
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start select-none min-h-[550px]">
        {columns.map((col) => {
          const colOpps = opportunities.filter((o) => o.status === col);
          const colSum = getColumnSum(col);

          return (
            <div 
              key={col} 
              className="w-72 bg-zinc-950/30 border border-zinc-900 rounded-2xl flex flex-col shrink-0 overflow-hidden"
            >
              {/* Column Header */}
              <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-white truncate">{col}</span>
                  <span className="text-[10px] bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded-full shrink-0 font-semibold">
                    {colOpps.length}
                  </span>
                </div>
                {/* Sum (value tracking) display */}
                {colSum > 0 && (
                  <span className="text-[10px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded-full flex items-center">
                    {formatCurrency(colSum)}
                  </span>
                )}
              </div>

              {/* Column Body - Cards List */}
              <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto min-h-[250px] scrollbar-thin">
                {colOpps.length === 0 ? (
                  <div className="border border-dashed border-zinc-900 rounded-xl p-6 text-center text-zinc-600 text-xs">
                    No items here
                  </div>
                ) : (
                  colOpps.map((opp) => (
                    <div
                      key={opp.id}
                      onClick={() => handleSelectOpportunity(opp)}
                      className={cn(
                        "p-4 rounded-xl border bg-zinc-950/60 hover:bg-zinc-950/90 hover:border-zinc-800 cursor-pointer transition-all duration-200 text-left space-y-3 group/card",
                        selectedOpportunity?.id === opp.id
                          ? "border-zinc-500"
                          : "border-zinc-900"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <h5 className="font-semibold text-xs text-white leading-snug group-hover/card:text-white">
                            {opp.title}
                          </h5>
                          
                          {/* Priority Indicator */}
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0 mt-1",
                            opp.priority === "HIGH" 
                              ? "bg-rose-500" 
                              : opp.priority === "MEDIUM" 
                                ? "bg-amber-500" 
                                : "bg-zinc-500"
                          )} />
                        </div>

                        {opp.contact && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span className="truncate">{opp.contact.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Meta (Value & Date) */}
                      {(opp.value !== null || opp.nextActionDate) && (
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900/60 pt-2.5">
                          {opp.value !== null ? (
                            <span className="flex items-center text-zinc-400 font-medium">
                              {formatCurrency(opp.value)}
                            </span>
                          ) : <div />}
                          
                          {opp.nextActionDate && (
                            <span className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded">
                              <Calendar className="w-2.5 h-2.5" />
                              {new Date(opp.nextActionDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Dropdown status shift directly on card */}
                      <div className="opacity-0 group-hover/card:opacity-100 transition-opacity border-t border-zinc-900/60 pt-2 flex items-center justify-between gap-1 select-none">
                        <span className="text-[9px] text-zinc-600">Quick Move:</span>
                        <select
                          value={opp.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(opp.id, e.target.value)}
                          className="text-[9px] h-5 rounded bg-zinc-900 border border-zinc-850 text-zinc-400 px-1 focus:border-zinc-700 outline-none cursor-pointer"
                        >
                          {columns.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right Detail Drawer */}
      {selectedOpportunity && (
        <div className="fixed top-0 right-0 z-40 w-[380px] bg-zinc-950 border-l border-zinc-900 h-screen shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950 mt-14">
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base truncate">{selectedOpportunity.title}</h3>
              <p className="text-xs text-zinc-500 truncate">Workspace Opportunity Profile</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleEditOpen(selectedOpportunity)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
                title="Edit Opportunity"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(selectedOpportunity.id)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-rose-500 flex items-center justify-center transition-colors"
                title="Delete Opportunity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            {/* Stage & Details */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Parameters</h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Stage</span>
                  <select
                    value={selectedOpportunity.status}
                    onChange={(e) => handleStatusChange(selectedOpportunity.id, e.target.value)}
                    className="w-full text-xs h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 px-2 outline-none focus:border-zinc-700 cursor-pointer"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 block">Priority</span>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/50 mt-1.5",
                    selectedOpportunity.priority === "HIGH" 
                      ? "text-rose-500" 
                      : selectedOpportunity.priority === "MEDIUM" 
                        ? "text-amber-500" 
                        : "text-zinc-500"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      selectedOpportunity.priority === "HIGH" 
                        ? "bg-rose-500" 
                        : selectedOpportunity.priority === "MEDIUM" 
                          ? "bg-amber-500" 
                          : "bg-zinc-500"
                    )} />
                    {selectedOpportunity.priority}
                  </span>
                </div>
              </div>

              {selectedOpportunity.value !== null && (
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-zinc-400">Target Value</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(selectedOpportunity.value)}</span>
                </div>
              )}

              {selectedOpportunity.nextActionDate && (
                <div className="flex items-center justify-between text-xs border-t border-b border-zinc-900 py-3">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-600" />
                    Next Action Date
                  </span>
                  <span className="text-zinc-300 font-medium">{formatDate(selectedOpportunity.nextActionDate)}</span>
                </div>
              )}

              {selectedOpportunity.contact && (
                <div className="bg-zinc-900/30 border border-zinc-900 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Linked Contact</span>
                  <span className="text-xs font-bold text-white block">{selectedOpportunity.contact.name}</span>
                  {(selectedOpportunity.contact.role || selectedOpportunity.contact.company) && (
                    <span className="text-[10px] text-zinc-500 block">
                      {selectedOpportunity.contact.role} {selectedOpportunity.contact.role && selectedOpportunity.contact.company ? "at" : ""} {selectedOpportunity.contact.company}
                    </span>
                  )}
                </div>
              )}

              {selectedOpportunity.notes && (
                <div className="bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-xl space-y-1">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Internal notes</span>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">{selectedOpportunity.notes}</p>
                </div>
              )}
            </div>

            {/* Opportunity history timeline */}
            <div className="space-y-4">
              <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Opportunity Activity</h5>
              
              {isLoadingTimeline ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-zinc-600" />
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-xs text-zinc-600 text-center">No logs recorded.</p>
              ) : (
                <div className="space-y-3.5 pl-2 border-l border-zinc-900 relative">
                  {timeline.map((item) => (
                    <div key={item.id} className="relative text-xs space-y-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 absolute -left-[12px] top-[6px] border border-zinc-950" />
                      
                      <div className="flex justify-between text-[9px] text-zinc-500 select-none">
                        <span>{item.type}</span>
                        <span>{new Date(item.occurredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                      <p className="text-zinc-400">{item.description}</p>
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
              <h3 className="font-bold text-white text-base">Add Opportunity Item</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder={
                      userRole === "JOB_SEEKER" 
                        ? "e.g. Business Analyst at Acme Corp" 
                        : userRole === "FREELANCER" 
                          ? "e.g. Website Development for ABC Agency" 
                          : "e.g. Seed Investment Discussion XYZ Ventures"
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    {userRole === "JOB_SEEKER" ? "Salary / Value (Optional)" : "Project / Investment Value"}
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                      className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs pl-8 pr-3 text-white focus:border-zinc-700 outline-none"
                      placeholder="e.g. 75000"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Initial Stage</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as typeof prev.priority }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Linked Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactId: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    <option value="">-- No Association --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company || "No Company"})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Next Action Date</label>
                  <input
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nextActionDate: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full h-20 rounded-xl bg-zinc-900 border border-zinc-800 text-xs p-3 text-white focus:border-zinc-700 outline-none resize-none"
                    placeholder="Provide description details..."
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
                  Create Item
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
              <h3 className="font-bold text-white text-base">Edit Opportunity</h3>
              <button onClick={() => setIsEditOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Target Value</label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                      className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs pl-8 pr-3 text-white focus:border-zinc-700 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Stage</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value as typeof prev.priority }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Linked Contact</label>
                  <select
                    value={formData.contactId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contactId: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    <option value="">-- No Association --</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.company || "No Company"})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Next Action Date</label>
                  <input
                    type="date"
                    value={formData.nextActionDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nextActionDate: e.target.value }))}
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
