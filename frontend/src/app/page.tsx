// frontend/src/app/page.tsx
"use client"; 

import Link from 'next/link';

// --- Global Styles (Matching Progress Page) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style: Opaque White */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 0.75rem; /* rounded-xl */
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); /* shadow-2xl */
      border: 1px solid rgba(226, 232, 240, 1);
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }
    
    /* Polka Dot Pattern */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }
  `}</style>
);

export default function HomePage() {
  const coreFeatures = [
    "AI-Powered Summarization",
    "Automated Study Notes",
    "Dynamic Quiz Generation",
    "Personalized Learning Paths",
    "AI Mentor Chatbot",
    "Progress Tracking & Analytics"
  ];

  return (
    <main 
      // UPDATED: bg-slate-200/30 is the sweet spot (not too bright like 100, not too dark like 200)
      className="flex min-h-screen flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-900 p-6 sm:p-12 lg:p-24 transition-colors duration-500 text-slate-900 dark:text-slate-100"
      style={{ 
        backgroundImage: 'var(--dot-pattern-url)', 
      }}
    >
      <GlobalStyles />

      <div className="w-full max-w-6xl mx-auto bg-transparent"> 
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Project Intro */}
          <div className="text-center lg:text-left">
            <h1 className="font-sans text-6xl sm:text-7xl lg:text-8xl font-extrabold mb-6 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
                Learn-Ease
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
              Welcome to Learn-Ease, your AI-powered companion designed to revolutionize your study experience.
            </p>
          </div>

          {/* Right Side: Core Features & Get Started */}
          {/* Applied 'learn-ease-card' class for consistent styling */}
          <div className="learn-ease-card p-8 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-500 mb-6 text-center">
              Core Features
            </h2>
            <ul className="space-y-3 mb-8">
              {coreFeatures.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 dark:text-green-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                  </svg>
                  <span className="text-slate-700 dark:text-slate-300 text-base sm:text-lg">{feature}</span>
                </li>
              ))}
            </ul>
            <Link 
              href="/login"
              className="block w-full text-center px-8 py-4 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 transition-colors duration-300 text-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}