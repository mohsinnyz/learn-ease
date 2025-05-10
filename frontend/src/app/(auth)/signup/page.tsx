'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signupUser } from '@/services/authService';

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

    setIsLoading(true);
    try {
        await signupUser({
          email,
          password,
          firstname,
          lastname,
          age: parseInt(age, 10),
          university_name: universityName,
        });
        router.push('/login?signupSuccess=true'); // Redirect to login with a success indicator
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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">Create your Learn-Ease Account</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="firstname" className="block text-sm font-medium text-gray-700">First Name</label>
            <input id="firstname" name="firstname" type="text" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={firstname} onChange={(e) => setFirstname(e.target.value)} />
          </div>
          <div>
            <label htmlFor="lastname" className="block text-sm font-medium text-gray-700">Last Name</label>
            <input id="lastname" name="lastname" type="text" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={lastname} onChange={(e) => setLastname(e.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
            <input id="age" name="age" type="number" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <label htmlFor="universityName" className="block text-sm font-medium text-gray-700">University Name</label>
            <input id="universityName" name="universityName" type="text" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={universityName} onChange={(e) => setUniversityName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required
                   className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <button type="submit" disabled={isLoading}
                    className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {isLoading ? 'Signing up...' : 'Sign up'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}