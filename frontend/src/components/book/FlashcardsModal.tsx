"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";
import { Flashcard } from "@/services/bookService";

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  flashcards: Flashcard[] | null;
  error: string | null;
}

// Simple icon for the flip button to add visual flair
const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export const FlashcardsModal = ({
  isOpen,
  onClose,
  isGenerating,
  flashcards,
  error,
}: FlashcardsModalProps) => {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const title = error
    ? "Generation Failed"
    : isGenerating
    ? "Crafting Flashcards..."
    : flashcards && flashcards.length > 0
    ? "Study Flashcards"
    : "Flashcards";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-2">
        {/* --- Loading State --- */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-500 blur-lg opacity-20 rounded-full"></div>
              <SpinnerIcon className="w-10 h-10 text-orange-500 relative z-10 animate-spin" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">
              AI is generating your study material...
            </p>
          </div>
        )}

        {/* --- Error State --- */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 text-center">
             <p className="text-red-600 dark:text-red-400 font-bold text-sm">{error}</p>
          </div>
        )}

        {/* --- Flashcards Grid --- */}
        {!isGenerating && flashcards && flashcards.length > 0 && (
          <div className="max-h-[65vh] overflow-y-auto custom-scrollbar p-1 space-y-6">
            {flashcards.map((card, index) => {
              const isFlipped = flippedCards[index];
              
              // Shared styles for both faces
              const faceClasses = "absolute inset-0 backface-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm shadow-lg p-5 flex flex-col justify-between transition-all duration-500";

              return (
                <div key={index} className="group perspective-1000 w-full h-56">
                  <div 
                    className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                  >
                    
                    {/* --- Front Face --- */}
                    <div className={`${faceClasses}`}>
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                                Question
                            </span>
                            <div className="w-2 h-2 rounded-full bg-orange-500/50"></div>
                        </div>
                        <p className="text-slate-800 dark:text-slate-100 font-medium text-lg leading-snug">
                          {card.front}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => toggleFlip(index)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-orange-50 dark:bg-orange-900/10 text-orange-600 dark:text-orange-400 font-bold text-sm hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-700 transition-colors group-hover:shadow-sm"
                      >
                        <RefreshIcon /> Reveal Answer
                      </button>
                    </div>

                    {/* --- Back Face --- */}
                    <div className={`${faceClasses} rotate-y-180 bg-slate-50 dark:bg-slate-900`}>
                      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                         <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold tracking-widest text-orange-600 dark:text-orange-400 uppercase">
                                Answer
                            </span>
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">
                          {card.back}
                        </p>
                      </div>

                      <button
                        onClick={() => toggleFlip(index)}
                        className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 transition-colors"
                      >
                        <RefreshIcon /> Back to Question
                      </button>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- Empty State --- */}
        {!isGenerating && !error && (!flashcards || flashcards.length === 0) && (
          <div className="text-center py-10">
            <p className="text-slate-400 dark:text-slate-500 font-medium">
              No flashcards generated yet.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};