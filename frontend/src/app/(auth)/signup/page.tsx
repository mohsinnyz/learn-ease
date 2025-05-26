// In frontend/src/app/(auth)/signup/page.tsx
"use client";

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signupUser } from '@/services/authService'; 

// --- Password Requirements Definition ---
const passwordRequirements = [
  { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
  { id: 'uppercase', text: 'An uppercase letter (A-Z)', regex: /[A-Z]/ },
  { id: 'lowercase', text: 'A lowercase letter (a-z)', regex: /[a-z]/ },
  { id: 'number', text: 'A number (0-9)', regex: /[0-9]/ },
  { id: 'special', text: 'A special character (e.g., !@#$%)', regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/ },
];

interface PasswordValidationStatus {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}
// --- End Password Requirements Definition ---

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

  // --- State for Password Validation UI ---
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidationStatus>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const allRequirementsMet = Object.values(passwordValidation).every(Boolean);
  // --- End State for Password Validation UI ---

  const lightModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23A0AEC0' fill-opacity='0.3'/%3E%3C/svg%3E\")";
  const darkModeDotPatternUrl = "url(\"data:image/svg+xml,%3Csvg width='15' height='15' viewBox='0 0 15 15' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='15' height='15' fill='none'/%3E%3Ccircle cx='7.5' cy='7.5' r='0.8' fill='%23CBD5E0' fill-opacity='0.1'/%3E%3C/svg%3E\")";

  // --- Effect to Validate Password on Change ---
  useEffect(() => {
    const newValidationStatus: PasswordValidationStatus = {
      length: passwordRequirements.find(r => r.id === 'length')!.regex.test(password),
      uppercase: passwordRequirements.find(r => r.id === 'uppercase')!.regex.test(password),
      lowercase: passwordRequirements.find(r => r.id === 'lowercase')!.regex.test(password),
      number: passwordRequirements.find(r => r.id === 'number')!.regex.test(password),
      special: passwordRequirements.find(r => r.id === 'special')!.regex.test(password),
    };
    setPasswordValidation(newValidationStatus);
  }, [password]);
  // --- End Effect ---

  const handleAgeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAge(event.target.value); 
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!allRequirementsMet) {
      setError("Password does not meet all requirements. Please check the criteria below the password field.");
      setIsPasswordFocused(true); 
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) { 
        setError("Please enter a valid age.");
        return;
    }
    if (ageNum < 14) {
      setError("Age must be 14 or above to sign up.");
      return;
    }

    if (!firstname || !lastname || !email || !password || !universityName) { 
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
      className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 p-4 sm:p-6 transition-colors duration-500"
      style={{ 
        backgroundImage: 'var(--dot-pattern-url)',
      }}
    >
      <style jsx global>{`
        :root { 
          --dot-pattern-url: ${lightModeDotPatternUrl}; 
          --input-bg-light: rgba(255, 255, 255, 0.7); 
          --input-text-light: #0f172a; 
          --input-placeholder-light: #94a3b8; 
          --input-caret-light: #0f172a;

          --input-bg-dark: rgba(51, 65, 85, 0.8); 
          --input-text-dark: #ffffff; 
          --input-placeholder-dark: #64748b; 
          --input-caret-dark: #ffffff;
        }
        html.dark { 
          --dot-pattern-url: ${darkModeDotPatternUrl}; 
        }

        input {
          background-clip: padding-box !important;
          transition: background-color 600000s 0s, color 600000s 0s !important;
        }
        
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--input-bg-light) inset !important;
          -webkit-text-fill-color: var(--input-text-light) !important;
          caret-color: var(--input-caret-light) !important;
        }
        
        html.dark input:-webkit-autofill,
        html.dark input:-webkit-autofill:hover,
        html.dark input:-webkit-autofill:focus,
        html.dark input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px var(--input-bg-dark) inset !important; 
          -webkit-text-fill-color: var(--input-text-dark) !important;
          caret-color: var(--input-caret-dark) !important;
        }
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
        
        {/* Error message moved from here */}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ... (firstname, lastname, email, age, universityName input fields) ... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label htmlFor="firstname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
              <input id="firstname" name="firstname" type="text" required className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="Ada" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
            </div>
            <div>
              <label htmlFor="lastname" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
              <input id="lastname" name="lastname" type="text" required className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="Lovelace" value={lastname} onChange={(e) => setLastname(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
              <input id="age" name="age" type="number" required className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" value={age} onChange={handleAgeChange} placeholder="e.g., 18" />
            </div>
            <div>
              <label htmlFor="universityName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">University Name</label>
              <input id="universityName" name="universityName" type="text" required className="mt-1 block w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="Tech University" value={universityName} onChange={(e) => setUniversityName(e.target.value)} />
            </div>
          </div>
          
          {/* Password Field */}
          <div>
            {/* ... Password input and requirements display ... */}
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <div className="relative mt-1"> 
              <input id="password" name="password" type="password" autoComplete="new-password" required className="block w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setIsPasswordFocused(true)} />
              {password.length > 0 && allRequirementsMet && ( <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-500 dark:text-green-400 pointer-events-none"> <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> </svg> </span> )}
            </div>
          </div>

          {(isPasswordFocused || (password.length > 0 && !allRequirementsMet)) && (
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Password must include:</p>
              <ul className="space-y-1">
                {passwordRequirements.map(req => ( <li key={req.id} className={`flex items-center text-xs ${passwordValidation[req.id as keyof PasswordValidationStatus] ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}> {passwordValidation[req.id as keyof PasswordValidationStatus] ?  <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> : <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg> } <span>{req.text}</span> </li> ))}
              </ul>
            </div>
          )}

          {/* Confirm Password Field */}
          <div>
            {/* ... Confirm password input and match indicator ... */}
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
            <div className="relative mt-1"> 
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="mt-1 block w-full px-4 py-2.5 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white/70 dark:bg-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              {confirmPassword.length > 0 && password.length > 0 && ( <span className={`absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none ${password === confirmPassword ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}> {password === confirmPassword ? ( <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /> </svg> ) : ( <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /> </svg> )} </span> )}
            </div>
          </div>
          
          {/* Error message moved here, above the signup button */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md border border-red-300 dark:border-red-700">
              {error}
            </div>
          )}

          <div>
            <button 
              type="submit" 
              disabled={isLoading || !allRequirementsMet || (password !== confirmPassword && confirmPassword.length > 0)}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign up'}
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