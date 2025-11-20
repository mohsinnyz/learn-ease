"use client";

export const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
export const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.15'/%3E%3C/svg%3E\")";

export const GlobalStyles = () => (
  <style jsx global>{`
    :root {
      --dot-pattern-url: ${lightModeDotPatternUrl};
    }
    html.dark {
      --dot-pattern-url: ${darkModeDotPatternUrl};
    }

    .learn-ease-card {
      background-color: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(6px);
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.07),
        0 4px 6px -2px rgba(0, 0, 0, 0.05);
      transition: box-shadow 0.3s ease-out, transform 0.3s ease-out;
      border-width: 1px;
      border-color: rgba(203, 213, 225, 0.5);
    }

    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.85);
      border-color: rgba(51, 65, 85, 0.8);
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

    .react-pdf__Page__canvas {
      border-radius: 0.375rem;
    }
    .react-pdf__Page__textContent {
      border-radius: 0.375rem;
    }
    
    /* Flip Animation Styles */
    .flip-container {
      perspective: 1000px;
    }
    .flip-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transition: transform 0.6s;
      transform-style: preserve-3d;
      will-change: transform;
    }
    .flip-inner.flipped {
      transform: rotateY(180deg);
    }
    .flip-front,
    .flip-back {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden; /* Safari */
      transform: translateZ(0);
      border-radius: 0.75rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between; 
      align-items: flex-start;
      z-index: 1;
    }
    .flip-front {
      z-index: 2; /* Ensure front is on top initially */
    }
    .flip-back {
      transform: rotateY(180deg);
    }
  `}</style>
);