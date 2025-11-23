"use client";

import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  maxWidth?: string; // New prop to control width
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  children, 
  title,
  maxWidth = "max-w-2xl" // Default to existing size, but allow override
}: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div 
        className={`learn-ease-card bg-white dark:bg-slate-800 p-6 sm:p-8 w-full ${maxWidth} transform transition-all duration-300 ease-in-out rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-300 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400 text-3xl transition-colors rounded-full p-1 leading-none flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        
        {/* Content Container - Flex grow ensures it fills available space */}
        <div className="flex-grow overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};