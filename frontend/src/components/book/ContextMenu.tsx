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
      icon: DocumentTextIcon,
      action: onSummarize,
      shortTextLength: 30,
    },
    {
      label: "Generate Flashcards",
      icon: LayersIcon,
      action: onGenerateFlashcards,
      shortTextLength: 25,
    },
    {
      label: "Generate Study Notes",
      icon: LightBulbIcon,
      action: onGenerateStudyNotes,
      shortTextLength: 22,
    },
    {
      label: "Generate Q&A",
      icon: QuestionMarkCircleIcon,
      action: onGenerateQnA,
      shortTextLength: 28,
    },
  ];

  return (
    <div
      style={{ top: y, left: x, position: "fixed" }}
      className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-md border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl py-1.5 z-[100] w-72"
      onClick={(e) => e.stopPropagation()}
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={() => {
            item.action();
            onClose();
          }}
          className="w-full text-left px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-orange-100 dark:hover:bg-orange-700/30 hover:text-orange-700 dark:hover:text-orange-300 flex items-center space-x-3 transition-colors rounded-md"
        >
          <item.icon className="w-5 h-5 flex-shrink-0 text-orange-500 dark:text-orange-400 opacity-90" />
          <span className="flex-1 min-w-0">
            {item.label}: "{selectedText.substring(0, item.shortTextLength)}
            {selectedText.length > item.shortTextLength ? "..." : ""}"
          </span>
        </button>
      ))}
    </div>
  );
};