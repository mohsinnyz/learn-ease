'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    if (isClient) {
      localStorage.removeItem('authToken');
    }
    router.push('/login');
  };

  if (!isClient) {
    return null; 
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to Your Dashboard!</h1>
      <p className="mb-6">You are successfully logged in.</p>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}