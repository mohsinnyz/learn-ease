// In frontend/src/app/(auth)/signup/page.tsx
"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signupUser } from '@/services/authService'; // Assuming SignupData is defined in authService

export default function SignupPage() {
  const router = useRouter();
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Define the SVG pattern URLs (same as landing page)
  const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
  const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.1'/%3E%3C/svg%3E\")";


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    if (!firstname || !lastname || !email || !password || !age || !universityName) {
        setError("All fields are required.");
        return;
    }
    // Basic age validation (example)
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
        setError("Please enter a valid age.");
        return;
    }

    setIsLoading(true);
    try {
        await signupUser({
          email,
          password,
          firstname,
          lastname,
          age: ageNum,
          university_name: universityName,
        });
        router.push('/login?signupSuccess=true'); 
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message); 
        } else {
          setError('An unexpected error occurred during signup.');
        }
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 transition-colors duration-500"
      style={{ 
        backgroundImage: 'var(--dot-pattern-url)',
      }}
    >
      {/* Define CSS variables for the dot patterns based on theme */}
      <style jsx global>{`
        :root { --dot-pattern-url: ${lightModeDotPatternUrl}; }
        html.dark { --dot-pattern-url: ${darkModeDotPatternUrl}; } 
      `}</style>

      <div className="w-full max-w-lg bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm p-8 sm:p-10 space-y-6 rounded-xl shadow-2xl">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-red-600">
              Learn-Ease
            </span>
          </h1>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            Create Your Account
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Join us and elevate your studies!
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md border border-red-300 dark:border-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
              <input id="firstname" name="firstname" type="text" required
                className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Ada"
                value={firstname} onChange={(e) => setFirstname(e.target.value)} />
            </div>
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
              <input id="lastname" name="lastname" type="text" required
                className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Lovelace"
                value={lastname} onChange={(e) => setLastname(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
              <input id="age" name="age" type="number" required
                className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div>
              <label htmlFor="universityName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">University Name</label>
              <input id="universityName" name="universityName" type="text" required
                className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="Tech University"
                value={universityName} onChange={(e) => setUniversityName(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
              className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              placeholder="••••••••"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          
          <div>
            <button 
              type="submit" disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 disabled:opacity-60"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
        <p className="mt-8 text-sm text-center text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-orange-600 hover:text-red-500 dark:text-orange-500 dark:hover:text-red-400">
            Log In
          </Link>
        </p>
      </div>
    </main>
  );
}