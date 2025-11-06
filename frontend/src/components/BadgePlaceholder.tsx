"use client";

import React from 'react';

// A simple SVG icon for a badge.
const BadgeIcon = () => (
  <svg 
    className="w-12 h-12 text-gray-300" 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75c-.621 0-1.125.504-1.125 1.125V18.75m9 0h-9" 
    />
  </svg>
);

const BadgePlaceholder = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-3 text-gray-800">My Badges</h3>
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col items-center p-2 text-gray-400">
          <BadgeIcon />
          <span className="text-sm font-medium">Coming Soon</span>
        </div>
        <p className="text-gray-500">
          You'll be able to earn badges for your achievements here!
        </p>
      </div>
    </div>
  );
};

export default BadgePlaceholder;