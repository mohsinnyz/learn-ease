"use client";

import { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
}

export const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="learn-ease-card p-6 sm:p-8 w-full max-w-lg transform transition-all duration-300 ease-in-out">
        <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-300 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-orange-500 dark:text-slate-500 dark:hover:text-orange-400 text-3xl transition-colors rounded-full p-1 leading-none flex items-center justify-center hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};