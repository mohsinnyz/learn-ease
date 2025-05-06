// In frontend/src/app/page.tsx
"use client"; // Required for useState, useEffect, onClick

import { useState, useEffect } from "react";

export default function Home() {
  const [backendMessage, setBackendMessage] = useState<string>(
    "Click button to fetch..."
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBackendData = async () => {
    setIsLoading(true);
    setError(null);
    setBackendMessage(""); // Clear previous message

    try {
      // Make sure the URL matches where your backend is running
      const response = await fetch("http://localhost:8000/api/test");

      if (!response.ok) {
        // Handle HTTP errors like 404 or 500
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBackendMessage(data.message || "No message received");
    } catch (e: any) {
      console.error("Fetch error:", e);
      setError(`Failed to fetch: ${e.message}`);
      setBackendMessage("Error fetching data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* ... other default Next.js content might be here ... */}

      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p>Learn Ease Frontend</p>
      </div>

      {/* Add Test Fetch Area */}
      <div className="mt-10 p-5 border rounded bg-gray-100 dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-3">Backend Test</h2>
        <button
          onClick={fetchBackendData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Fetch from Backend"}
        </button>
        <p className="mt-3">
          Backend says: <span className="font-medium">{backendMessage}</span>
        </p>
        {error && <p className="mt-2 text-red-500">Error: {error}</p>}
      </div>

      {/* ... other default Next.js content might be here ... */}
    </main>
  );
}
