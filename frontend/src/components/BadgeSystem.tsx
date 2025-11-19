"use client";

import React, { useEffect, useState } from 'react';
import { fetchGlobalProgress } from '@/services/progressService';
import { 
  Trophy, 
  Star, 
  Target, 
  Zap, 
  Crown, 
  Lock, 
  Award, 
  TrendingUp 
} from 'lucide-react';

// --- 1. Define the Badge Interface & Logic ---
interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string; // Tailwind gradient classes
  condition: (stats: { total_quizzes: number; average_score: number }) => boolean;
}

// --- 2. The Milestones (FE-4 Logic) ---
const BADGES: BadgeDef[] = [
  {
    id: 'novice',
    title: 'First Step',
    description: 'Complete your first quiz.',
    icon: Star,
    color: 'from-blue-400 to-blue-600',
    condition: (s) => s.total_quizzes >= 1,
  },
  {
    id: 'dedicated',
    title: 'Dedicated',
    description: 'Complete 5 quizzes total.',
    icon: Zap,
    color: 'from-yellow-400 to-orange-500',
    condition: (s) => s.total_quizzes >= 5,
  },
  {
    id: 'scholar',
    title: 'Scholar',
    description: 'Complete 10 quizzes total.',
    icon: Trophy,
    color: 'from-purple-400 to-purple-600',
    condition: (s) => s.total_quizzes >= 10,
  },
  {
    id: 'sharp',
    title: 'Sharp Mind',
    description: 'Achieve an average score of 60% or higher.',
    icon: Target,
    color: 'from-green-400 to-green-600',
    condition: (s) => s.average_score >= 60 && s.total_quizzes > 0,
  },
  {
    id: 'improving',
    title: 'On The Rise',
    description: 'Achieve an average score of 75% or higher.',
    icon: TrendingUp,
    color: 'from-teal-400 to-teal-600',
    condition: (s) => s.average_score >= 75 && s.total_quizzes > 0,
  },
  {
    id: 'master',
    title: 'Mastermind',
    description: 'Achieve an elite average score of 90% or higher.',
    icon: Crown,
    color: 'from-rose-400 to-red-600',
    condition: (s) => s.average_score >= 90 && s.total_quizzes > 0,
  },
];

const BadgeSystem = () => {
  const [stats, setStats] = useState<{ total_quizzes: number; average_score: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- 3. Fetch Data to calculate badges ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchGlobalProgress();
        setStats(data.stats);
      } catch (error) {
        console.error("Failed to load stats for badges", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-slate-400 text-xs animate-pulse">Loading Badges...</div>;
  }

  return (
    <div className="flex flex-col h-full p-4 sm:p-6">
      
      {/* CSS to hide scrollbar but allow scrolling */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* Standardized Header */}
      <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 mb-5 pb-4 border-b border-slate-300 dark:border-slate-700 shrink-0">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
          Achievements
        </span>
      </h2>

      {/* Applied 'scrollbar-hide' here */}
      <div className="flex-grow overflow-y-auto scrollbar-hide pr-2">
        {/* Grid Layout for Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
          
          {BADGES.map((badge) => {
            const isUnlocked = stats ? badge.condition(stats) : false;

            return (
              <div 
                key={badge.id}
                className={`relative group flex items-center p-3 rounded-xl border transition-all duration-300 ${
                  isUnlocked 
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md' 
                    : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-70 grayscale'
                }`}
              >
                {/* Icon Container */}
                <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center shadow-sm mr-4 bg-gradient-to-br ${isUnlocked ? badge.color : 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800'}`}>
                   <badge.icon className="w-6 h-6 text-white" />
                </div>

                {/* Text Info */}
                <div className="flex-grow min-w-0">
                  <h4 className={`font-bold text-sm truncate ${isUnlocked ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                    {badge.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {badge.description}
                  </p>
                </div>

                {/* Lock Overlay Icon for locked items */}
                {!isUnlocked && (
                  <div className="absolute right-3 top-3">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                
                {/* Unlocked Indicator */}
                {isUnlocked && (
                   <div className="absolute right-3 top-3">
                    <Award className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default BadgeSystem;