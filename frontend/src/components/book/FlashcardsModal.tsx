"use client";

import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import { SpinnerIcon, XMarkIcon } from "./Icons"; 
import { Flashcard } from "@/services/bookService";

interface FlashcardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  flashcards: Flashcard[] | null;
  error: string | null;
  bookTitle?: string;
}

const FlipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
  </svg>
);

export const FlashcardsModal = ({
  isOpen,
  onClose,
  isGenerating,
  flashcards,
  error,
  bookTitle,
}: FlashcardsModalProps) => {
  const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFlip = (index: number) => {
    setFlippedCards((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleExportFlashcardsAsPDF = () => {
    if (!flashcards || flashcards.length === 0) {
      alert("No flashcards available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const title = bookTitle ? `Flashcards - ${bookTitle}` : "Flashcards";
    const margin = 40;
    const pageHeight = doc.internal.pageSize.height - 2 * margin;
    const pageWidth = doc.internal.pageSize.width - 2 * margin;
    let yPosition = margin;

    // -- Title --
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    yPosition += 30;

    // -- Cards --
    doc.setFontSize(12);
    
    flashcards.forEach((card, index) => {
      // Check space for the new block (Card # + Q + A)
      // Estimate block height approx 80-100pt, if low on space, add page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      // Card Number Header
      doc.setFont("helvetica", "bold");
      doc.setTextColor(249, 115, 22); // Orange color (RGB)
      doc.text(`Card #${index + 1}`, margin, yPosition);
      yPosition += 15;
      doc.setTextColor(0, 0, 0); // Reset to black

      // Question (Front)
      doc.setFont("helvetica", "bold");
      doc.text("Q:", margin, yPosition);
      
      doc.setFont("helvetica", "normal");
      const questionLines = doc.splitTextToSize(card.front, pageWidth - 30);
      doc.text(questionLines, margin + 20, yPosition);
      yPosition += questionLines.length * 14 + 5;

      // Answer (Back)
      doc.setFont("helvetica", "bold");
      doc.text("A:", margin, yPosition);

      doc.setFont("helvetica", "normal");
      const answerLines = doc.splitTextToSize(card.back, pageWidth - 30);
      doc.text(answerLines, margin + 20, yPosition);
      yPosition += answerLines.length * 14 + 15; // Extra spacing after card

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition - 5, pageWidth + margin, yPosition - 5);
      yPosition += 15;
    });

    doc.save(`${bookTitle || "Flashcards"}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Background Blur */}
      <div 
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative w-full h-full flex flex-col pointer-events-none">
        
        {/* Header */}
        <div className="w-full flex justify-between items-center p-8 pointer-events-auto z-50 absolute top-0">
           <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Flashcards
              </h2>
           </div>
           
           <div className="flex items-center gap-4">
             {/* PDF Export Button */}
             {!isGenerating && flashcards && (
               <button
                 onClick={handleExportFlashcardsAsPDF}
                 className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg backdrop-blur-md transition-all border border-white/10 hover:border-white/20 font-medium text-sm"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                 </svg>
                 Save PDF
               </button>
             )}

             {/* Close Button */}
             <button 
               onClick={onClose}
               className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
             >
               <XMarkIcon className="w-8 h-8" />
             </button>
           </div>
        </div>

        {/* Content Area - Centered */}
        <div className="flex-1 flex items-center justify-center p-4 md:p-10 pointer-events-auto overflow-x-auto custom-scrollbar">
          
          {/* Loading State */}
          {isGenerating && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 blur-xl opacity-30 rounded-full animate-pulse"></div>
                <SpinnerIcon className="w-16 h-16 text-orange-500 relative z-10 animate-spin" />
              </div>
              <p className="text-white/90 text-xl font-light tracking-wide animate-pulse">
                Generating cards...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
             <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-2xl text-center backdrop-blur-md">
                <p className="text-red-200 font-medium text-xl">{error}</p>
             </div>
          )}

          {/* THE CARDS */}
          {!isGenerating && flashcards && (
            <div className="w-[95vw] max-w-[1800px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10 pb-20 pt-20">
              {flashcards.map((card, index) => {
                const isFlipped = flippedCards[index];
                const cardBase = "absolute inset-0 backface-hidden rounded-2xl p-8 shadow-2xl flex flex-col justify-between border transition-colors duration-300";
                
                return (
                  <div key={index} className="group perspective-[1200px] h-[400px] w-full">
                    
                    <div 
                      className={`relative w-full h-full transition-all duration-700 transform-style-3d cursor-pointer ${
                        isFlipped ? "rotate-y-180" : ""
                      }`}
                      onClick={() => toggleFlip(index)}
                    >
                      
                      {/* FRONT FACE */}
                      <div 
                        className={`${cardBase} bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 z-20`}
                        // FIX: Explicit transform required for Firefox to handle backface-visibility correctly
                        style={{ transform: "rotateY(0deg)" }}
                      >
                        <div className="flex items-center justify-between">
                          {/* UPDATED: Simple Numbering */}
                          <span className="text-xl font-black text-orange-500/40">
                            #{index + 1}
                          </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center text-center my-2 overflow-y-auto custom-scrollbar">
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {card.front}
                          </p>
                        </div>

                        {/* UPDATED: Simple Text, No Button */}
                        <div className="w-full pt-4 mt-2 border-t border-slate-100 dark:border-slate-700">
                           <p className="text-center text-xs font-bold tracking-[0.2em] text-slate-300 dark:text-slate-600 uppercase group-hover:text-orange-400 transition-colors">
                             Tap to flip
                           </p>
                        </div>
                      </div>

                      {/* BACK FACE */}
                      <div 
                        className={`${cardBase} bg-slate-900 border-orange-500/40 rotate-y-180 z-10`}
                        // Explicit style to ensure consistency
                        style={{ transform: "rotateY(180deg)" }}
                      >
                          <div className="flex items-center justify-between">
                           <span className="text-xs font-extrabold tracking-widest text-green-400 uppercase border border-green-400/30 px-2 py-1 rounded bg-green-400/10">
                             Answer
                           </span>
                          </div>

                        <div className="flex-1 flex items-center justify-center text-center my-2 overflow-y-auto custom-scrollbar">
                          <p className="text-lg text-slate-200 leading-relaxed font-medium">
                            {card.back}
                          </p>
                        </div>

                          <div className="w-full pt-4 mt-2 border-t border-slate-700/50">
                           <div className="w-full flex items-center justify-center gap-2 text-slate-500 text-sm font-medium hover:text-white transition-colors">
                              <FlipIcon /> Back to Question
                           </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};