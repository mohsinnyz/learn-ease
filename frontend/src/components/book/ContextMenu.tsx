"use client";

import {
  DocumentTextIcon,
  LayersIcon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
} from "./Icons";

interface ContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
  onSummarize: () => void;
  onGenerateFlashcards: () => void;
  onGenerateStudyNotes: () => void;
  onGenerateQnA: () => void;
}

export const ContextMenu = ({
  visible,
  x,
  y,
  selectedText,
  onClose,
  onSummarize,
  onGenerateFlashcards,
  onGenerateStudyNotes,
  onGenerateQnA,
}: ContextMenuProps) => {
  if (!visible) return null;

  const menuItems = [
    {
      label: "Summarize",
      description: "Create a concise summary",
      icon: DocumentTextIcon,
      action: onSummarize,
    },
    {
      label: "Flashcards",
      description: "Generate active recall cards",
      icon: LayersIcon,
      action: onGenerateFlashcards,
    },
    {
      label: "Study Notes",
      description: "Draft extensively explained notes",
      icon: LightBulbIcon,
      action: onGenerateStudyNotes,
    },
    {
      label: "Question & Answers",
      description: "Get Q&A pairs for prepration ",
      icon: QuestionMarkCircleIcon,
      action: onGenerateQnA,
    },
  ];

  return (
    <>
      {/* Invisible full-screen overlay to handle "Click Outside" */}
      <div 
        className="fixed inset-0 z-[90]" 
        onClick={onClose} 
      />

      <div
        style={{ top: y + 10, left: x }}
        className="fixed z-[100] w-80 animate-in fade-in zoom-in-95 duration-150 ease-out origin-top-left"
      >
        {/* Main Card: Uses glassmorphism and vibrant ring */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-orange-500/10 ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden">
          
          {/* --- Header: Selected Content Preview --- */}
          <div className="px-4 py-3.5 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-500 mb-1.5">
              For this Content:
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 font-medium leading-relaxed">
              "{selectedText}"
            </p>
          </div>
          
          {/* --- Actions List --- */}
          <div className="p-2 flex flex-col gap-1">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  item.action();
                  onClose();
                }}
                className="group flex items-center w-full p-3 rounded-xl text-left transition-all duration-200 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              >
                {/* Icon Container (Vibrant Style) */}
                <div className="flex-shrink-0 mr-3.5">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-50 dark:bg-slate-800 text-orange-500 dark:text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-200 shadow-sm ring-1 ring-orange-100 dark:ring-slate-700 group-hover:ring-orange-500">
                    <item.icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Text Content (Label + Description) */}
                <div className="flex-1 min-w-0">
                  {/* CHANGED: text-sm to text-base for bigger labels */}
                  <span className="block text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors">
                    {item.label}
                  </span>
                  
                  <span className="block text-xs text-slate-400 dark:text-slate-500 font-medium group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors mt-0.5">
                    {item.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};