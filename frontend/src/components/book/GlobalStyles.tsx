"use client";

export const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E\")";
export const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23cbd5e1' fill-opacity='0.2'/%3E%3C/svg%3E\")";

export const GlobalStyles = () => (
  <style jsx global>{`
    :root {
      --dot-pattern-url: ${lightModeDotPatternUrl};
    }
    html.dark {
      --dot-pattern-url: ${darkModeDotPatternUrl};
    }

    /* --- 1. Modern Glass Card --- */
    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(12px);
      border-radius: 0.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      border: 1px solid #cbd5e1;
      transition: all 0.3s ease-out;
    }

    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: #475569;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    /* --- 2. Animations --- */
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.98); }
      to { opacity: 1; transform: scale(1); }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out forwards;
    }

    @keyframes bookViewModalShowAnimation {
      to {
        transform: scale(1);
        opacity: 1;
      }
    }
    .animate-bookViewModalShow {
      transform: scale(0.95);
      opacity: 0;
      animation: bookViewModalShowAnimation 0.3s forwards;
    }

    /* --- 3. PDF Cleanup --- */
    .react-pdf__Page__canvas {
      border-radius: 0.375rem;
    }
    .react-pdf__Page__textContent {
      border-radius: 0.375rem;
    }
    
    /* --- 4. Flashcard 3D Utilities --- */
    .perspective-1000 {
      perspective: 1000px;
    }
    
    .transform-style-3d {
      transform-style: preserve-3d;
    }
    
    .backface-hidden {
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    .rotate-y-180 {
      transform: rotateY(180deg);
    }

    /* --- 5. Hidden Scrollbar (Functionality Preserved) --- */
    .custom-scrollbar {
      -ms-overflow-style: none;  /* IE and Edge */
      scrollbar-width: none;  /* Firefox */
    }
    
    .custom-scrollbar::-webkit-scrollbar {
      display: none; /* Chrome, Safari and Opera */
    }

  `}</style>
);