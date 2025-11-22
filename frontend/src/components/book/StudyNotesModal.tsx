"use client";

import { useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; 
import jsPDF from "jspdf";
import { Modal } from "./Modal";
import { SpinnerIcon } from "./Icons";

interface StudyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGenerating: boolean;
  studyNotes: string | null;
  error: string | null;
  bookTitle?: string;
}

export const StudyNotesModal = ({
  isOpen,
  onClose,
  isGenerating,
  studyNotes,
  error,
  bookTitle,
}: StudyNotesModalProps) => {
  const markdownRef = useRef<HTMLDivElement>(null);

  // Helper: Cleans API response artifacts
  const cleanMarkdown = (text: string | null) => {
    if (!text) return "";
    let cleaned = text;

    // 1. Remove the "```markdown" or "```" wrappers often sent by Gemini
    cleaned = cleaned.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/```\s*$/, '');

    // 2. Remove indentation to prevent accidental code blocks
    return cleaned
      .split('\n')
      .map(line => line.trimStart())
      .join('\n');
  };

  const processedNotes = cleanMarkdown(studyNotes);

  const handleExportNotesAsPDF = () => {
    if (!processedNotes || !markdownRef.current) {
      alert("No study notes content available to export or content not rendered.");
      return;
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
    });

    const title = bookTitle ? `Study Notes - ${bookTitle}` : "Study Notes";
    const margin = 40;
    const pageHeight = doc.internal.pageSize.height - 2 * margin;
    const pageWidth = doc.internal.pageSize.width - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    yPosition += 30;

    // Content
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Iterate over the rendered HTML elements
    const elements = Array.from(markdownRef.current.children);
    
    elements.forEach((el) => {
      let text = el.textContent || "";
      let fontSize = 12;
      let fontStyle = "normal";

      if (el.tagName === "H1") {
        fontSize = 16;
        fontStyle = "bold";
        yPosition += 10;
      } else if (el.tagName === "H2") {
        fontSize = 14;
        fontStyle = "bold";
        yPosition += 8;
      } else if (el.tagName === "H3") {
        fontSize = 13;
        fontStyle = "bold";
        yPosition += 6;
      } else if (el.tagName === "P") {
        yPosition += 4;
      } else if (el.tagName === "UL" || el.tagName === "OL") {
        yPosition += 5;
      }

      if (el.tagName.match(/^H[1-6]$/)) {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
      } else if (el.tagName === "LI") {
        text = `• ${text}`;
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
      } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
      }

      const splitText = doc.splitTextToSize(text, pageWidth);

      splitText.forEach((line: string) => {
        if (yPosition > pageHeight) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += fontSize * 1.2;
      });

      if (el.tagName.match(/^H[1-6]$/)) yPosition += 5;
    });

    doc.save(`${bookTitle || "StudyNotes"}.pdf`);
  };

  const titleText = error
    ? "Study Notes Error"
    : isGenerating
    ? "Generating Study Notes..."
    : studyNotes
    ? "Generated Study Notes"
    : "Study Notes";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titleText} maxWidth="max-w-7xl">
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
            AI is reading the chapter and creating notes...
          </p>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-500 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}
      
      {!isGenerating && studyNotes && (
        <>
          <div
            ref={markdownRef}
            className="max-h-[70vh] overflow-y-auto p-4 scrollbar-hide break-words"
          >
            {/* We explicitly define components here to FORCE styling, 
                overriding any default browser or tailwind-prose behaviors 
            */}
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    // Title (H1)
                    h1: ({node, ...props}) => <h1 className="text-3xl font-extrabold mb-6 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" {...props} />,
                    // Main Sections (H2)
                    h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-8 mb-3 text-orange-600 dark:text-orange-400 flex items-center gap-2" {...props} />,
                    // Sub Sections (H3)
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200" {...props} />,
                    // Bold Text
                    strong: ({node, ...props}) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                    // Lists
                    ul: ({node, ...props}) => <ul className="text-lg list-disc pl-6 space-y-1 mb-4 marker:text-orange-500" {...props} />,
                    ol: ({node, ...props}) => <ol className="text-lg list-decimal pl-6 space-y-1 mb-4 marker:text-orange-500" {...props} />,
                    li: ({node, ...props}) => <li className="text-lg text-slate-700 dark:text-slate-300 pl-1 leading-relaxed" {...props} />,
                    // Paragraphs
                    p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300" {...props} />,
                    // Blockquotes
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-orange-300 dark:border-orange-700 pl-4 italic text-slate-600 dark:text-slate-400 my-4" {...props} />,
                }}
            >
                {processedNotes}
            </ReactMarkdown>
          </div>
          <div className="flex justify-end mt-6 pt-4 border-t border-slate-300 dark:border-slate-700">
            <button
              onClick={handleExportNotesAsPDF}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <svg xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export as PDF
            </button>
          </div>
        </>
      )}
      
      {!isGenerating && !error && !studyNotes && (
        <div className="py-12 text-center">
            <p className="text-slate-500 dark:text-slate-400 italic text-lg">
            No study notes to display.
            </p>
        </div>
      )}
    </Modal>
  );
};