'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/services/authService';

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
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router]);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
        const data = await loginUser({ email, password });
        localStorage.setItem('authToken', data.access_token);
        router.push('/dashboard'); 
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message); // err.message
        } else {
          setError('An unexpected error occurred during login.');
        }
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Placeholder */}
      <div className="flex-1 hidden lg:flex items-center justify-center bg-gradient-to-br from-indigo-600 to-blue-500 text-white p-12">
        <div>
          <h1 className="text-5xl font-bold mb-6">Learn-Ease</h1>
          <p className="text-xl">Unlock your potential with AI-powered learning.</p>
          {/* Placeholder */}
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Log in to your account
            </h2>
          </div>
          {successMessage && (
            <div className="p-3 text-sm text-green-700 bg-green-100 rounded-md">
              {successMessage}
            </div>
          )}
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" defaultValue="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input id="email-address" name="email" type="email" autoComplete="email" required
                       className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                       placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required
                       className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                       placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                {/* Placeholder for "Forgot password?" */}
                <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                  Forgot your password?
                </a>
              </div>
            </div>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <div>
              <button type="submit" disabled={isLoading}
                      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                {isLoading ? 'Logging in...' : 'Log in'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">Or</span>
              </div>
            </div>
            <div className="mt-6">
              {/* Placeholder for "Sign in with Google" */}
              <button type="button"
                      className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                <span className="sr-only">Sign in with Google</span>
                {/* Google Icon */}
                Sign in with Google
              </button>
            </div>
          </div>
           <p className="mt-6 text-sm text-center text-gray-600">
            New to Learn-Ease?{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}