"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
// Import BookTopic and fetchBookTopics
import { fetchBookTopics, BookTopic } from "@/services/bookService";
import {
  generateQuizService,
  evaluateQuizService,
  GeneratedQuiz,
  UserAnswer,
  QuizEvaluationResponse,
} from "@/services/quizService";

// --- Icons ---
const SpinnerIcon = () => (
  <svg className="animate-spin h-10 w-10 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

// --- Global Styles (Unified Design) ---
const GlobalStyles = () => (
  <style jsx global>{`
    /* Unified Card Style */
    .learn-ease-card {
      background-color: #ffffff; 
      border-radius: 1rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(226, 232, 240, 1);
    }
    html.dark .learn-ease-card {
      background-color: rgba(30, 41, 59, 0.95);
      border-color: rgba(51, 65, 85, 0.8);
    }

    /* Polka Dot Pattern */
    :root {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1.5' cy='1.5' r='1.5' fill='%2394a3b8' fill-opacity='0.4'/%3E%3C/svg%3E");
    }
    html.dark {
      --dot-pattern-url: url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23cbd5e1' fill-opacity='0.1'/%3E%3C/svg%3E");
    }
  `}</style>
);

export default function QuizPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [quizPhase, setQuizPhase] = useState<"loading_topics" | "topic_selection" | "generating" | "in_progress" | "evaluating" | "results">("loading_topics");
  const [error, setError] = useState<string | null>(null);
  
  const [topics, setTopics] = useState<BookTopic[]>([]);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string | null>(null);
  
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationResponse | null>(null);

  // --- Timer States ---
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    const loadTopics = async () => {
      try {
        const fetchedTopics = await fetchBookTopics(bookId);

        // This regex checks if the trimmed title starts with a digit.
        const mainTopicRegex = /^\d/; 

        const mainTopics = fetchedTopics.filter(topic => {
          const trimmedTitle = topic.topic_title.trim();
          // Only keep topics that start with a number.
          return mainTopicRegex.test(trimmedTitle);
        });

        setTopics(mainTopics); // Set the filtered list
        setQuizPhase("topic_selection");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book topics.");
        setQuizPhase("topic_selection");
      }
    };
    loadTopics();
  }, [bookId]);

  // --- Timer Logic ---
  useEffect(() => {
    if (quizPhase === "in_progress" && timeLeft > 0 && !showTimeUpModal) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && quizPhase === "in_progress" && !showTimeUpModal) {
      setShowTimeUpModal(true);
    }
  }, [quizPhase, timeLeft, showTimeUpModal]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleTimeUpConfirm = () => {
    setShowTimeUpModal(false);
    handleSubmitQuiz();
  };

  const handleTopicSelect = async (topicId: string, topicTitle: string) => {
    setSelectedTopicTitle(topicTitle);
    setQuizPhase("generating");
    setError(null);
    
    // --- Reset Timer ---
    setTimeLeft(600); 
    setShowTimeUpModal(false);

    try {
      const quiz = await generateQuizService(topicId); // Pass topicId directly
      
      setGeneratedQuiz(quiz);
      setUserAnswers(new Array(quiz.questions.length).fill(""));
      setCurrentQuestionIndex(0);
      setQuizPhase("in_progress");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz.");
      setQuizPhase("topic_selection");
    }
  };

  const handleSubmitQuiz = async () => {
    if (!generatedQuiz || !selectedTopicTitle) return;
    setQuizPhase("evaluating");
    setError(null);
    const attemptedAnswers: UserAnswer[] = generatedQuiz.questions.map((q, i) => ({
      question_text: q.question_text,
      user_answer: userAnswers[i] || ""
    }));

    try {
      const result = await evaluateQuizService(
        generatedQuiz.quiz_id,
        attemptedAnswers,
        bookId,
        selectedTopicTitle
      );
      setEvaluationResult(result);
      setQuizPhase("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to evaluate quiz.");
      setQuizPhase("in_progress");
    }
  };

  const handleRestart = () => {
    setQuizPhase("topic_selection");
    setSelectedTopicTitle(null);
    setGeneratedQuiz(null);
    setEvaluationResult(null);
    setError(null);
  };
  
  if (!bookId) {
    notFound();
  }

  const renderContent = () => {
    switch (quizPhase) {
      case "loading_topics":
        return (
          <div className="text-center py-12">
            <div className="flex justify-center mb-4"><SpinnerIcon /></div>
            <p className="text-lg text-slate-600 dark:text-slate-300">Loading quiz topics...</p>
          </div>
        );
      
      case "topic_selection":
        return (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
                Select a Topic
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Choose a chapter or section to generate a quiz from.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            
            {topics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => handleTopicSelect(topic.id, topic.topic_title)}
                    className="p-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:bg-orange-50 dark:hover:bg-slate-800 text-left transition-all transform hover:-translate-y-1 group"
                  >
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                      {topic.topic_title}
                    </h3>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No quiz topics were found for this book.</p>
              </div>
            )}
          </div>
        );

      case "generating":
        return (
          <div className="text-center py-12">
            <div className="flex justify-center mb-6"><SpinnerIcon /></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Generating Quiz</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Our AI is crafting questions based on <span className="font-semibold text-orange-500">{selectedTopicTitle}</span>...
            </p>
          </div>
        );

      case "in_progress":
        if (!generatedQuiz) return <p>Something went wrong.</p>;
        const currentQuestion = generatedQuiz.questions[currentQuestionIndex];
        
        // Timer Color Logic
        const isLowTime = timeLeft < 60; // Red if under 1 minute

        return (
          <div className="w-full max-w-3xl mx-auto relative">
            {/* Timer Display */}
            <div className="flex justify-between items-end mb-4">
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
                <span>Question {currentQuestionIndex + 1}</span>
                <span className="mx-2">/</span>
                <span>{generatedQuiz.questions.length}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg font-mono font-bold text-lg border ${isLowTime ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                ⏱ {formatTime(timeLeft)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                <div 
                  className="bg-orange-500 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${((currentQuestionIndex + 1) / generatedQuiz.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentQuestion.question_text}
              </h3>
            </div>

            <textarea
              value={userAnswers[currentQuestionIndex]}
              onChange={(e) => {
                const newAnswers = [...userAnswers];
                newAnswers[currentQuestionIndex] = e.target.value;
                setUserAnswers(newAnswers);
              }}
              placeholder="Type your short answer here..."
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition text-slate-900 dark:text-white placeholder-slate-400"
              rows={5}
            />

            <div className="mt-8 flex justify-between items-center">
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              
              {currentQuestionIndex < generatedQuiz.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
                >
                  Next Question
                </button>
              ) : (
                <button 
                  onClick={handleSubmitQuiz} 
                  className="px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-700 transition-all transform hover:-translate-y-0.5"
                >
                  Submit Quiz
                </button>
              )}
            </div>
            {error && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        );

      case "evaluating":
        return (
          <div className="text-center py-12">
            <div className="flex justify-center mb-6"><SpinnerIcon /></div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Grading Quiz</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Analyzing your answers against the source material...
            </p>
          </div>
        );

      case "results":
        if (!evaluationResult) return <p>Could not load results.</p>;
        const scorePercentage = Math.round(evaluationResult.total_score * 100);
        
        // Determine color based on grade/score
        let scoreColorClass = "text-orange-500";
        if (scorePercentage >= 80) scoreColorClass = "text-green-500";
        else if (scorePercentage < 60) scoreColorClass = "text-red-500";

        return (
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Quiz Results</h2>
              <p className="text-slate-600 dark:text-slate-400">Topic: <span className="font-semibold">{selectedTopicTitle}</span></p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 mb-8 text-center shadow-inner">
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Your Score</p>
              <p className={`text-7xl font-extrabold ${scoreColorClass} mb-4`}>{scorePercentage}%</p>
              <div className="inline-block px-4 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Grade: {evaluationResult.total_grade}</p>
              </div>
            </div>

            <div className="space-y-6">
              {evaluationResult.results.map((res, index) => {
                const isGoodAnswer = res.similarity_score > 0.6;
                return (
                  <div key={index} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Question {index + 1}</span>
                      <span className={`text-sm font-mono font-bold px-2 py-1 rounded ${isGoodAnswer ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                        Match: {(res.similarity_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{res.question_text}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-lg border ${isGoodAnswer ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-900' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900'}`}>
                          <p className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Your Answer</p>
                          <p className="text-slate-800 dark:text-slate-200 text-sm">
                            {res.user_answer || <span className="italic text-slate-400">No answer provided</span>}
                          </p>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900">
                          <p className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-500 dark:text-slate-400">Correct Answer</p>
                          <p className="text-slate-800 dark:text-slate-200 text-sm">{res.correct_answer}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 text-center">
              <button 
                onClick={handleRestart} 
                className="px-8 py-3 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-lg font-bold shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Take Another Quiz
              </button>
            </div>
          </div>
        );

      default:
        return <p>Loading...</p>;
    }
  };

  return (
    <main 
      className="min-h-screen flex flex-col items-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-950 transition-colors duration-500"
      style={{ backgroundImage: 'var(--dot-pattern-url)' }}
    >
      <GlobalStyles />
      
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <Link 
            href={`/books/${bookId}`} 
            className="inline-flex items-center text-orange-600 dark:text-orange-400 hover:text-red-600 dark:hover:text-red-500 transition-colors font-medium"
          >
            <ChevronLeftIcon className="w-5 h-5 mr-1.5" />
            Back to Book
          </Link>
        </div>

        {/* Applied 'learn-ease-card' wrapper */}
        <div className="learn-ease-card p-6 sm:p-10 min-h-[600px]">
          {renderContent()}
        </div>
      </div>

      {/* --- NEW: Time's Up Modal --- */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200 dark:border-slate-700 text-center animate-in fade-in zoom-in duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-red-600 dark:text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Time's Up!
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Your 10 minutes are over. Click below to submit your answers and see your results.
            </p>
            <button
              onClick={handleTimeUpConfirm}
              className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
            >
              Submit Quiz
            </button>
          </div>
        </div>
      )}
    </main>
  );
}