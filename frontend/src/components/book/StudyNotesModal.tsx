"use client";

import { useRef } from "react";
import ReactMarkdown from "react-markdown";
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

  const handleExportNotesAsPDF = () => {
    if (!studyNotes || !markdownRef.current) {
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

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin, yPosition);
    yPosition += 30;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const elements = Array.from(markdownRef.current.children);
    let currentText = "";

    elements.forEach((el) => {
      let text = el.textContent || "";
      let fontSize = 12;
      let fontStyle = "normal";

      if (el.tagName === "H1") {
        fontSize = 16;
        fontStyle = "bold";
        yPosition += 5;
      } else if (el.tagName === "H2") {
        fontSize = 14;
        fontStyle = "bold";
        yPosition += 4;
      } else if (el.tagName === "H3") {
        fontSize = 13;
        fontStyle = "bold";
        yPosition += 3;
      } else if (el.tagName === "P") {
        yPosition += 2;
      } else if (el.tagName === "UL" || el.tagName === "OL") {
        yPosition += 5;
      }

      if (el.tagName.match(/^H[1-6]$/)) {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        currentText = text;
      } else if (el.tagName === "LI") {
        currentText = `- ${text}`;
      } else {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        currentText = text;
      }

      const splitText = doc.splitTextToSize(currentText, pageWidth);

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
    <Modal isOpen={isOpen} onClose={onClose} title={titleText}>
      {isGenerating && (
        <div className="text-center py-4">
          <SpinnerIcon className="w-8 h-8 text-orange-500 mx-auto mb-2" />
          <p className="text-slate-600 dark:text-slate-300">
            Please wait, AI is creating study notes...
          </p>
        </div>
      )}
      
      {error && (
        <p className="text-red-500 dark:text-red-400 p-2 text-sm">{error}</p>
      )}
      
      {!isGenerating && studyNotes && (
        <>
          <div
            ref={markdownRef}
            className="max-h-[60vh] overflow-y-auto p-1 text-sm prose dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-strong:text-slate-800 dark:prose-strong:text-slate-200"
          >
            <ReactMarkdown>{studyNotes}</ReactMarkdown>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
            <button
              onClick={handleExportNotesAsPDF}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-colors"
            >
              Export Notes as PDF
            </button>
          </div>
        </>
      )}
      
      {!isGenerating && !error && !studyNotes && (
        <p className="text-slate-500 dark:text-slate-400 p-2">
          No study notes to display.
        </p>
      )}
    </Modal>
  );
};