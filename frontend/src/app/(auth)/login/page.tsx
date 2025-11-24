// frontend/src/app/(auth)/login/page.tsx
"use client";

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/services/authService';

// --- Global Styles (Merged: Polka Dots + Card Style + Autofill Fixes) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
      /* Note: We don't force height:100% here like we do in the dashboard, so it fits the form content */
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95); /* Slate-800 equivalent */
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Polka Dot Pattern */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.3'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }

    /* --- Autofill Variables & Styles --- */
    :root {
      --input-bg-light: #ffffff;
      --input-text-light: #0f172a; 
      --input-placeholder-light: #94a3b8; 
      --input-caret-light: #0f172a;
      --input-bg-dark: rgba(51, 65, 85, 1); 
      --input-text-dark: #ffffff; 
      --input-placeholder-dark: #64748b; 
      --input-caret-dark: #ffffff;
    }
    
    input {
        background-clip: padding-box !important;
        transition: background-color 600000s 0s, color 600000s 0s !important;
    }
    
    /* Light mode autofill */
    input:-webkit-autofill,
    input:-webkit-autofill:hover,
    input:-webkit-autofill:focus,
    input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 100px var(--input-bg-light) inset !important;
      -webkit-text-fill-color: var(--input-text-light) !important;
      caret-color: var(--input-caret-light) !important;
    }
    
    /* Dark mode autofill */
    html.dark input:-webkit-autofill,
    html.dark input:-webkit-autofill:hover,
    html.dark input:-webkit-autofill:focus,
    html.dark input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 100px var(--input-bg-dark) inset !important;
      -webkit-text-fill-color: var(--input-text-dark) !important;
      caret-color: var(--input-caret-dark) !important;
    }

    /* Fallback for OS-preference dark mode */
    @media (prefers-color-scheme: dark) {
      body:not(.dark-theme-class-active) input:-webkit-autofill,
      body:not(.dark-theme-class-active) input:-webkit-autofill:hover,
      body:not(.dark-theme-class-active) input:-webkit-autofill:focus,
      body:not(.dark-theme-class-active) input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 100px var(--input-bg-dark) inset !important;
        -webkit-text-fill-color: var(--input-text-dark) !important;
        caret-color: var(--input-caret-dark) !important;
      }
    }
  `}</style>
);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('signupSuccess') === 'true') {
      setSuccessMessage('Signup successful! Please log in.');
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
        const data = await loginUser({ email, password });
        localStorage.setItem('authToken', data.access_token);
        router.push('/dashboard'); 
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message); 
        } else {
          setError('An unexpected error occurred during login.');
        }
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div 
      className="flex min-h-screen w-full bg-slate-200/50 dark:bg-slate-950 transition-colors duration-500"
      style={{ backgroundImage: "var(--dot-pattern-url)" }}
    >
      <GlobalStyles />

      {/* Left Side - Branding with Orange-Red Gradient */}
      <div className="flex-1 hidden lg:flex items-center justify-center bg-gradient-to-br from-orange-500 via-red-500 to-red-600 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-20 -right-10 w-80 h-80 bg-white/10 rounded-full"></div>
        <div className="z-10 text-center">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight">Learn-Ease</h1>
          <p className="text-2xl font-light">Unlock your learning potential.</p>
          <p className="mt-4 text-lg opacity-80">AI-powered insights for smarter studying.</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-4 sm:p-8 md:p-12">
        {/* Applied 'learn-ease-card' here for consistent look */}
        <div className="w-full max-w-md learn-ease-card p-8 sm:p-10 space-y-8">
          <div>
            <h2 className="mt-2 text-center text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              Welcome Back!
            </h2>
            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
              Log in to continue your learning journey.
            </p>
          </div>

          {successMessage && (
            <div className="p-3 text-sm text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-200 rounded-md border border-green-300 dark:border-green-700">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md border border-red-300 dark:border-red-700">
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input 
                  id="email-address" name="email" type="email" autoComplete="email" required
                  className="appearance-none relative block w-full px-4 py-3 border border-slate-300 dark:border-slate-600 placeholder-slate-500 dark:placeholder-slate-400 text-slate-900 dark:text-white bg-white dark:bg-slate-700 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input 
                  id="password" name="password" type="password" autoComplete="current-password" required
                  className="appearance-none relative block w-full px-4 py-3 border-t-0 border border-slate-300 dark:border-slate-600 placeholder-slate-500 dark:placeholder-slate-400 text-slate-900 dark:text-white bg-white dark:bg-slate-700 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                  placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} 
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <a href="#" className="font-medium text-orange-600 hover:text-red-500 dark:text-orange-500 dark:hover:text-red-400">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button 
                type="submit" disabled={isLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 disabled:opacity-60"
              >
                {isLoading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-300 dark:border-slate-700" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or</span></div>
            </div>
            <div className="mt-6">
              <button type="button" className="w-full inline-flex justify-center py-3 px-4 border border-slate-300 dark:border-slate-700 rounded-md shadow-sm bg-white dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600">
                Sign in with Google
              </button>
            </div>
          </div>
          <p className="mt-8 text-sm text-center text-slate-600 dark:text-slate-400">
            New to Learn-Ease?{' '}
            <Link href="/signup" className="font-medium text-orange-600 hover:text-red-500 dark:text-orange-500 dark:hover:text-red-400">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}