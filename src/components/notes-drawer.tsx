"use client";

import { useState, useEffect, useRef } from "react";
import { getGlobalNote, saveGlobalNote } from "@/lib/actions/notes";
import { FileText, X, Check, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NotesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load note content on mount
  useEffect(() => {
    async function loadNote() {
      try {
        const note = await getGlobalNote();
        if (note) {
          setContent(note.content);
        }
      } catch (error) {
        console.error("Failed to load global note:", error);
      }
    }
    loadNote();
  }, []);

  // Debounced auto-save on content change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveGlobalNote(val);
        setStatus("saved");
        // Reset to idle after 2 seconds
        setTimeout(() => setStatus("idle"), 2000);
      } catch (error) {
        console.error("Failed to auto-save global note:", error);
        setStatus("error");
      }
    }, 1000); // 1-second debounce
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 shadow-xl flex items-center gap-2 transition-all active:scale-[0.98] select-none font-medium text-xs backdrop-blur-md bg-zinc-900/90"
        >
          <FileText className="w-4 h-4" />
          Quick Notes
        </button>
      )}

      {/* Floating Notes Panel */}
      {isOpen && (
        <div
          className={cn(
            "rounded-2xl border border-zinc-850 bg-zinc-950/95 backdrop-blur-md shadow-2xl flex flex-col transition-all duration-200 overflow-hidden",
            isExpanded 
              ? "w-[calc(100vw-32px)] md:w-[600px] h-[calc(100vh-64px)]" 
              : "w-[360px] h-[480px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900 bg-zinc-950 select-none">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="font-semibold text-sm text-white">Scratchpad</span>
              
              {/* Save Status Indicators */}
              <div className="ml-2 flex items-center text-[10px] font-medium text-zinc-500">
                {status === "saving" && (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-zinc-400" />
                    Saving
                  </span>
                )}
                {status === "saved" && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <Check className="w-2.5 h-2.5" />
                    Saved
                  </span>
                )}
                {status === "error" && (
                  <span className="text-rose-500">Error saving</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Expand Toggle */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              
              {/* Close Panel */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 p-4 bg-transparent">
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Jot down notes, links, details, phone numbers, or action items... Auto-saves instantly."
              className="w-full h-full bg-transparent resize-none border-0 p-0 text-sm text-zinc-300 placeholder-zinc-600 focus:ring-0 outline-none leading-relaxed font-sans"
            />
          </div>
        </div>
      )}
    </div>
  );
}
