"use client";

import { useState } from "react";
import { 
  createFollowUp, 
  toggleFollowUp, 
  deleteFollowUp 
} from "@/lib/actions/followups";
import { FollowUp, Contact, Opportunity } from "@prisma/client";
import { 
  Plus, Calendar, CheckSquare, Square, 
  Trash2, X, Loader2, Link as LinkIcon, 
  AlertCircle, ChevronRight, CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";

type FollowupsManagerProps = {
  initialFollowUps: (FollowUp & { contact: Contact | null; opportunity: Opportunity | null })[];
  contacts: Contact[];
  opportunities: Opportunity[];
};

export default function FollowupsManager({ 
  initialFollowUps, 
  contacts, 
  opportunities 
}: FollowupsManagerProps) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    dueDate: new Date().toISOString().split("T")[0],
    contactId: "",
    opportunityId: ""
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate) return;

    setIsSubmitting(true);
    try {
      const created = await createFollowUp({
        title: formData.title,
        dueDate: new Date(formData.dueDate),
        contactId: formData.contactId || undefined,
        opportunityId: formData.opportunityId || undefined
      });

      const contactDetail = contacts.find((c) => c.id === created.contactId) || null;
      const opportunityDetail = opportunities.find((o) => o.id === created.opportunityId) || null;

      const fullFollowUp = {
        ...created,
        contact: contactDetail,
        opportunity: opportunityDetail
      };

      setFollowUps((prev) => [fullFollowUp, ...prev].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()));
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    
    // Optimistic Update
    setFollowUps((prev) =>
      prev.map((f) => (f.id === id ? { ...f, completed: nextCompleted } : f))
    );

    try {
      await toggleFollowUp(id, nextCompleted);
    } catch (err) {
      console.error(err);
      // Revert on error
      setFollowUps((prev) =>
        prev.map((f) => (f.id === id ? { ...f, completed: currentCompleted } : f))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this follow-up?")) return;

    try {
      await deleteFollowUp(id);
      setFollowUps((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      dueDate: new Date().toISOString().split("T")[0],
      contactId: "",
      opportunityId: ""
    });
  };

  // Date check helpers
  const getCategorizedTasks = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue: typeof followUps = [];
    const dueToday: typeof followUps = [];
    const upcoming: typeof followUps = [];
    const completed: typeof followUps = [];

    followUps.forEach((task) => {
      if (task.completed) {
        completed.push(task);
        return;
      }

      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);

      if (taskDate.getTime() < today.getTime()) {
        overdue.push(task);
      } else if (taskDate.getTime() === today.getTime()) {
        dueToday.push(task);
      } else {
        upcoming.push(task);
      }
    });

    return { overdue, dueToday, upcoming, completed };
  };

  const { overdue, dueToday, upcoming, completed } = getCategorizedTasks();

  return (
    <div className="space-y-6">
      
      {/* Action Header */}
      <div className="flex justify-end bg-zinc-950/20 p-4 border border-zinc-900 rounded-2xl">
        <button
          onClick={() => {
            resetForm();
            setIsAddOpen(true);
          }}
          className="h-9 px-4 rounded-xl bg-white text-black font-semibold text-xs inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all select-none"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Create Task
        </button>
      </div>

      {/* Task Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Overdue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-bold text-rose-500 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Overdue
            </h3>
            <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-semibold">
              {overdue.length}
            </span>
          </div>

          <div className="space-y-3">
            {overdue.length === 0 ? (
              <p className="text-xs text-zinc-650 italic py-4">No overdue tasks.</p>
            ) : (
              overdue.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={handleToggle} 
                  onDelete={handleDelete} 
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Due Today */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              Due Today
            </h3>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
              {dueToday.length}
            </span>
          </div>

          <div className="space-y-3">
            {dueToday.length === 0 ? (
              <p className="text-xs text-zinc-650 italic py-4">No tasks due today.</p>
            ) : (
              dueToday.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={handleToggle} 
                  onDelete={handleDelete} 
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Upcoming */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 shrink-0" />
              Upcoming
            </h3>
            <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-850 px-2 py-0.5 rounded-full font-semibold">
              {upcoming.length}
            </span>
          </div>

          <div className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-xs text-zinc-650 italic py-4">No upcoming tasks.</p>
            ) : (
              upcoming.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggle={handleToggle} 
                  onDelete={handleDelete} 
                />
              ))
            )}
          </div>
        </div>

      </div>

      {/* Completed Section (Optional collapsible or mini list) */}
      {completed.length > 0 && (
        <div className="border-t border-zinc-900 pt-6 mt-8">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-zinc-600" />
            Completed ({completed.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completed.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onToggle={handleToggle} 
                onDelete={handleDelete} 
              />
            ))}
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-900 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">New Follow-Up Task</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                  placeholder="e.g. Call recruiter to ask about interviews"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-3 text-white focus:border-zinc-700 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Linked Opportunity</label>
                  <select
                    value={formData.opportunityId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, opportunityId: e.target.value }))}
                    className="w-full h-9 rounded-xl bg-zinc-900 border border-zinc-800 text-xs px-2 text-zinc-350 focus:border-zinc-700 outline-none"
                  >
                    <option value="">-- No Association --</option>
                    {opportunities.map((o) => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Inner helper component for displaying a task card
function TaskCard({ 
  task, 
  onToggle, 
  onDelete 
}: { 
  task: FollowUp & { contact: Contact | null; opportunity: Opportunity | null }; 
  onToggle: (id: string, currentCompleted: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div 
      className={cn(
        "p-4 rounded-xl border flex gap-3 text-left transition-all duration-200 group relative",
        task.completed 
          ? "bg-zinc-950/20 border-zinc-900 text-zinc-500 opacity-60" 
          : "bg-zinc-950/50 border-zinc-900 hover:border-zinc-850 hover:bg-zinc-950/80"
      )}
    >
      {/* Checkbox */}
      <button 
        onClick={() => onToggle(task.id, task.completed)}
        className="mt-0.5 shrink-0 text-zinc-500 hover:text-zinc-350 transition-colors"
      >
        {task.completed ? (
          <CheckSquare className="w-4 h-4 text-white" />
        ) : (
          <Square className="w-4 h-4 text-zinc-700" />
        )}
      </button>

      {/* Details content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn(
          "text-xs font-medium leading-snug break-words pr-5",
          task.completed ? "line-through text-zinc-500" : "text-zinc-200"
        )}>
          {task.title}
        </p>

        {/* Date Display */}
        <span className={cn(
          "text-[9px] font-semibold flex items-center gap-1.5 mt-2 max-w-fit px-2 py-0.5 rounded",
          task.completed 
            ? "bg-zinc-900 text-zinc-600 border border-zinc-900" 
            : new Date(task.dueDate).getTime() < new Date().setHours(0,0,0,0)
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
              : new Date(task.dueDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-zinc-900 text-zinc-400 border border-zinc-850"
        )}>
          <Calendar className="w-2.5 h-2.5" />
          {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </span>

        {/* Link badges */}
        {(task.contact || task.opportunity) && (
          <div className="flex flex-wrap gap-1.5 mt-2 border-t border-zinc-900/60 pt-2">
            {task.contact && (
              <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                <LinkIcon className="w-2.5 h-2.5" />
                {task.contact.name}
              </span>
            )}
            {task.opportunity && (
              <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded truncate max-w-[120px]">
                <LinkIcon className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{task.opportunity.title}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Delete button (displays on hover) */}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 absolute top-3 right-3 w-6 h-6 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 flex items-center justify-center transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
