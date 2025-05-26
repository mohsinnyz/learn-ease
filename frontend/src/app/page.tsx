// In frontend/src/app/page.tsx
"use client"; 

import Link from 'next/link';

export default function HomePage() {
  const coreFeatures = [
    "AI-Powered Summarization",
    "Automated Study Notes",
    "Dynamic Quiz Generation",
    "Personalized Learning Paths",
    "AI Mentor Chatbot",
    "Progress Tracking & Analytics"
  ];

  // Define the SVG pattern URLs
  const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
  const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.1'/%3E%3C/svg%3E\")";

  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-6 sm:p-12 lg:p-24 transition-colors duration-500"
      style={{ 
        backgroundImage: 'var(--dot-pattern-url)', // Use CSS variable for the pattern
        // The base background colors (bg-slate-100 dark:bg-slate-900) will show underneath
      }}
    >
      {/* Define CSS variables for the dot patterns based on theme */}
      <style jsx global>{`
        :root { --dot-pattern-url: ${lightModeDotPatternUrl}; }
        /* Assuming your Tailwind dark mode is class-based */
        html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; } 
        /* If using media-based dark mode in Tailwind, you might need a different approach or to set this in globals.css */
      `}</style>

      <div className="w-full max-w-6xl mx-auto bg-transparent"> {/* Ensure content containers have transparent background if needed */}
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
          {/* Added a slight background to the card for better readability over the pattern */}
          <div className="bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm p-8 sm:p-10 rounded-xl shadow-2xl">
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