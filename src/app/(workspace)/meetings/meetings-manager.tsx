"use client";

import { useState } from "react";
import { createMeeting, deleteMeeting } from "@/lib/actions/meetings";
import { Meeting, Contact } from "@prisma/client";
import { 
  Plus, Calendar, Users, FileText, Trash2, X, 
  Loader2, CheckSquare, 
  Info, ChevronDown, ChevronUp 
} from "lucide-react";
import { cn } from "@/lib/utils";

type MeetingsManagerProps = {
  initialMeetings: (Meeting & { participants: Contact[] })[];
  contacts: Contact[];
};

export default function MeetingsManager({ 
  initialMeetings, 
  contacts 
}: MeetingsManagerProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    meetingDate: new Date().toISOString().substring(0, 16), // datetime-local format
    notes: ""
  });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [actionItemInput, setActionItemInput] = useState("");
  const [actionItems, setActionItems] = useState<string[]>([]);

  // Add Action Item to list
  const handleAddActionItem = () => {
    if (!actionItemInput.trim()) return;
    setActionItems((prev) => [...prev, actionItemInput.trim()]);
    setActionItemInput("");
  };

  // Remove Action Item from list
  const handleRemoveActionItem = (idx: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Toggle participant selection
  const handleToggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.meetingDate) return;

    setIsSubmitting(true);
    try {
      const created = await createMeeting({
        title: formData.title,
        meetingDate: new Date(formData.meetingDate),
        notes: formData.notes || undefined,
        actionItems: actionItems,
        participantIds: selectedParticipants
      });

      // Map contacts back to participants array
      const mappedParticipants = contacts.filter((c) => selectedParticipants.includes(c.id));
      const fullMeeting = { ...created, participants: mappedParticipants };

      setMeetings((prev) => [fullMeeting, ...prev].sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime()));
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting log?")) return;

    try {
      await deleteMeeting(id);
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      if (expandedMeetingId === id) setExpandedMeetingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      meetingDate: new Date().toISOString().substring(0, 16),
      notes: ""
    });
    setSelectedParticipants([]);
    setActionItems([]);
    setActionItemInput("");
  };

  return (
    <div className="space-y-6">
      
      {/* Top action header */}
      <div className="flex justify-between items-center bg-zinc-950/20 p-4 border border-zinc-900 rounded-2xl">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Info className="w-4 h-4 text-zinc-500 shrink-0" />
          <span>Click any meeting log to view structured notes and action checklists.</span>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="h-9 px-4 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all select-none"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Log Meeting
        </button>
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div className="border border-zinc-900 bg-zinc-950/20 rounded-2xl p-12 text-center text-zinc-500">
          <Calendar className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
          <p className="text-sm">No meetings logged yet</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-4xl">
          {meetings.map((meeting) => {
            const isExpanded = expandedMeetingId === meeting.id;
            const dateStr = new Date(meeting.meetingDate).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={meeting.id}
                className={cn(
                  "border rounded-2xl overflow-hidden transition-all duration-200",
                  isExpanded 
                    ? "border-zinc-700 bg-zinc-950" 
                    : "border-zinc-900 bg-zinc-950/40 hover:bg-zinc-950/80"
                )}
              >
                {/* Meeting Row Summary */}
                <div
                  onClick={() => setExpandedMeetingId(isExpanded ? null : meeting.id)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                      
                      {meeting.participants.length > 0 && (
                        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-900/50 border border-zinc-850 px-2 py-0.5 rounded flex items-center gap-1.5">
                          <Users className="w-3 h-3" />
                          {meeting.participants.map((p) => p.name).join(", ")}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-white text-sm md:text-base leading-snug">{meeting.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(meeting.id);
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 flex items-center justify-center transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                </div>

                {/* Expanded Notes & Action Items */}
                {isExpanded && (
                  <div className="border-t border-zinc-905 p-6 space-y-6 bg-zinc-950/80 text-left">
                    {/* Meeting Notes */}
                    {meeting.notes && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          Discussion Notes
                        </h4>
                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans bg-zinc-900/30 p-4 rounded-xl border border-zinc-900/60">
                          {meeting.notes}
                        </p>
                      </div>
                    )}

                    {/* Action Items List */}
                    {meeting.actionItems.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                          Action Items & Takeaways
                        </h4>
                        <ul className="space-y-2 pl-1">
                          {meeting.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-350">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                              <span className="leading-normal">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* No notes & action items */}
                    {!meeting.notes && meeting.actionItems.length === 0 && (
                      <p className="text-xs text-zinc-650 italic">No notes or action items logged for this session.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE/LOG MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Log Meeting Discussion</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Meeting Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                    placeholder="e.g. Sync w/ Priya regarding Business Analyst role"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.meetingDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, meetingDate: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                </div>
              </div>

              {/* Participants selection checkboxes */}
              {contacts.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Participants</label>
                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 border border-zinc-900 rounded-xl bg-zinc-950">
                    {contacts.map((c) => {
                      const isSelected = selectedParticipants.includes(c.id);
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => handleToggleParticipant(c.id)}
                          className={cn(
                            "text-[10px] font-medium py-1 px-2.5 rounded-lg border transition-all",
                            isSelected
                              ? "bg-white text-black border-white"
                              : "bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200"
                          )}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Action Items Checklist */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Action Items & Deliverables</label>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={actionItemInput}
                    onChange={(e) => setActionItemInput(e.target.value)}
                    placeholder="e.g. Email portfolio deck by EOD..."
                    className="flex-1 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddActionItem}
                    className="h-8 px-3 rounded-lg bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>

                {actionItems.length > 0 && (
                  <ul className="space-y-1.5 p-2 bg-zinc-900/30 border border-zinc-900 rounded-xl">
                    {actionItems.map((item, idx) => (
                      <li key={idx} className="flex items-center justify-between text-xs text-zinc-300 pl-2">
                        <span className="truncate">{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveActionItem(idx)}
                          className="w-6 h-6 hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 flex items-center justify-center rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Discussion Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-24 rounded-xl bg-zinc-900 border border-zinc-800 text-xs p-3 text-white focus:border-zinc-700 outline-none resize-none"
                  placeholder="Record summary details, links, or decisions..."
                />
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
                  Log Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
