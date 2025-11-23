"use client";

import jsPDF from "jspdf";
import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";
import { QuestionAnswerPair } from "@/services/bookService"; 

interface QnAModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  qnaPairs: QuestionAnswerPair[] | null;
  error: string | null;
  bookTitle?: string; // Added to generate better PDF filenames
}

export const QnAModal = ({
  isOpen,
  onClose,
  isGenerating,
  qnaPairs,
  error,
  bookTitle,
}: QnAModalProps) => {
  
  const handleExportPDF = () => {
    if (!qnaPairs || qnaPairs.length === 0) {
      alert("No Questions & Answers to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const filename = bookTitle ? `QnA - ${bookTitle}` : "Generated_QnA";
    const margin = 40;
    const pageHeight = doc.internal.pageSize.height - 2 * margin;
    const pageWidth = doc.internal.pageSize.width - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(234, 88, 12); // Orange-600 to match UI
    doc.text("Generated Questions & Answers", margin, yPosition);
    yPosition += 25;
    
    if (bookTitle) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100); // Grey
        doc.text(bookTitle, margin, yPosition);
        yPosition += 30;
    } else {
        yPosition += 10;
    }

    doc.setTextColor(0); // Reset to black

    qnaPairs.forEach((pair, index) => {
      // Check for page break before starting a new pair
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin;
      }

      // Question
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const questionPrefix = `Q${index + 1}: `;
      const questionText = pair.question;
      
      const splitQuestion = doc.splitTextToSize(questionPrefix + questionText, pageWidth);
      
      splitQuestion.forEach((line: string) => {
        if (yPosition > pageHeight) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 16;
      });

      yPosition += 4; // Small gap

      // Answer
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const answerPrefix = "A: ";
      const answerText = pair.answer;
      const splitAnswer = doc.splitTextToSize(answerPrefix + answerText, pageWidth);

      splitAnswer.forEach((line: string) => {
        if (yPosition > pageHeight) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 14;
      });

      yPosition += 25; // Gap between pairs
    });

    doc.save(`${filename}.pdf`);
  };

  const titleText = error
    ? "Q&A Generation Error"
    : isGenerating
    ? "Generating Q&A..."
    : qnaPairs && qnaPairs.length > 0
    ? "Generated Questions & Answers"
    : "Questions & Answers";

  return (
    // 1. Match Width: Uses max-w-4xl to match Study Notes
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      /* Passing the styled node as title ensures consistent Orange Gradient Heading */
      title={
        <span className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          {titleText}
        </span> as any
      }
      maxWidth="max-w-4xl"
    >
       {/* CSS to hide scrollbar but allow scrolling */}
       <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>

      {isGenerating && (
        <div className="text-center py-12">
          <SpinnerIcon className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-300 animate-pulse text-lg font-medium">
            AI is generating questions and answers...
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
           <p className="text-red-500 dark:text-red-400 text-sm font-medium">{error}</p>
        </div>
      )}
      
      {!isGenerating && qnaPairs && qnaPairs.length > 0 && (
        <>
        {/* 2. Content Area: Styled with consistent spacing and no visible scrollbar */}
        <div className="max-h-[70vh] overflow-y-auto p-2 space-y-6 scrollbar-hide">
          {qnaPairs.map((pair, index) => (
            <div
              key={index}
              className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-3 mb-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm">
                      Q{index + 1}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug mt-0.5">
                    {pair.question}
                  </h3>
              </div>

              <div className="pl-11">
                  <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-base whitespace-pre-wrap border-l-2 border-slate-200 dark:border-slate-600 pl-4 py-1">
                    {pair.answer}
                  </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Footer: Export Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-300 dark:border-slate-700">
            <button
              onClick={handleExportPDF}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export as PDF
            </button>
          </div>
        </>
      )}
      
      {!isGenerating && !error && (!qnaPairs || qnaPairs.length === 0) && (
        <div className="py-12 text-center">
             <p className="text-slate-500 dark:text-slate-400 italic text-lg">
                No questions and answers to display.
             </p>
        </div>
      )}
    </Modal>
  );
};