"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";
import { Flashcard } from "@/services/bookService"; // Ensure this import matches your existing service path

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  flashcards: Flashcard[] | null;
  error: string | null;
}

export const FlashcardsModal = ({
  isOpen,
  onClose,
  isGenerating,
  flashcards,
  error,
}: FlashcardsModalProps) => {
  // Local state for flipping cards - moved from the main page!
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const title = error
    ? "Flashcard Error"
    : isGenerating
    ? "Generating Flashcards..."
    : flashcards && flashcards.length > 0
    ? "Generated Flashcards"
    : "Flashcards";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="bg-transparent rounded-xl p-4">
        {isGenerating && (
          <div className="text-center py-4">
            <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <p className="text-slate-600 dark:text-slate-300">
              Please wait, AI is creating flashcards...
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-500 dark:text-red-400 p-2 text-sm">{error}</p>
        )}

        {!isGenerating && flashcards && flashcards.length > 0 && (
          <div className="max-h-[70vh] overflow-y-auto p-2 space-y-4">
            {flashcards.map((card, index) => {
              const isFlipped = flippedCards[index];
              return (
                <div key={index} className="flip-container w-full h-48">
                  <div className={`flip-inner ${isFlipped ? "flipped" : ""}`}>
                    
                    {/* Front Face */}
                    <div className="flip-front rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 flex flex-col justify-between">
                      <div className="flex-1 min-h-0">
                        <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1 text-xs uppercase tracking-wider">
                          Front:
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed overflow-y-auto h-full pr-2">
                          {card.front}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFlip(index)}
                        className="mt-2 self-start text-xs bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3 rounded-md shadow-sm transition-colors"
                      >
                        Flip to Back
                      </button>
                    </div>

                    {/* Back Face */}
                    <div className="flip-back rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-4 flex flex-col justify-between">
                      <div className="flex-1 min-h-0">
                        <p className="font-semibold text-orange-600 dark:text-orange-400 mb-1 text-xs uppercase tracking-wider">
                          Back:
                        </p>
                        <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-relaxed overflow-y-auto h-full pr-2">
                          {card.back}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFlip(index)}
                        className="mt-2 self-start text-xs bg-orange-500 hover:bg-orange-600 text-white py-1.5 px-3 rounded-md shadow-sm transition-colors"
                      >
                        Flip to Front
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isGenerating && !error && (!flashcards || flashcards.length === 0) && (
          <p className="text-slate-500 dark:text-slate-400 p-2">
            No flashcards to display.
          </p>
        )}
      </div>
    </Modal>
  );
};