// frontend/src/app/books/[bookId]/quiz/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { fetchBookTopics, fetchTopicContent } from "@/services/bookService";
import {
  generateQuizService,
  evaluateQuizService,
  GeneratedQuiz,
  UserAnswer,
  QuizEvaluationResponse,
} from "@/services/quizService";

// --- Icons ---
// MODIFIED: Spinner now uses the orange brand color.
const SpinnerIcon = () => (
  <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);


export default function QuizPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [quizPhase, setQuizPhase] = useState<"loading_topics" | "topic_selection" | "generating" | "in_progress" | "evaluating" | "results">("loading_topics");
  const [error, setError] = useState<string | null>(null);
  
  const [topicTitles, setTopicTitles] = useState<string[]>([]);
  const [selectedTopicTitle, setSelectedTopicTitle] = useState<string | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationResponse | null>(null);

  useEffect(() => {
    if (!bookId) return;
    const loadTopics = async () => {
      try {
        const titles = await fetchBookTopics(bookId);
        setTopicTitles(titles);
        setQuizPhase("topic_selection");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book content.");
        setQuizPhase("topic_selection");
      }
    };
    loadTopics();
  }, [bookId]);

  const handleTopicSelect = async (title: string) => {
    setSelectedTopicTitle(title);
    setQuizPhase("generating");
    setError(null);
    try {
      const { content } = await fetchTopicContent(bookId, topicTitles, title);
      const quiz = await generateQuizService(content);
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
        return <div className="text-center"><SpinnerIcon /> <p className="mt-4">Analyzing book structure...</p></div>;
      
      case "topic_selection":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Select a Topic to Start Quiz</h2>
            {/* MODIFIED: Themed error colors */}
            {error && <p className="text-red-500 bg-red-500/10 p-3 rounded-md mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicTitles.map((title, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicSelect(title)}
                  // MODIFIED: Themed background, but kept brand-specific orange text
                  className="p-6 bg-muted hover:bg-accent rounded-lg shadow-lg text-left transition-all hover:scale-105"
                >
                  <h3 className="font-semibold text-lg text-orange-400">{title}</h3>
                </button>
              ))}
            </div>
          </div>
        );

      case "generating":
        return <div className="text-center"><SpinnerIcon /> <p className="mt-4">Fetching topic and generating your quiz...</p></div>;

      case "in_progress":
        if (!generatedQuiz) return <p>Something went wrong.</p>;
        const currentQuestion = generatedQuiz.questions[currentQuestionIndex];
        return (
          <div className="w-full max-w-2xl mx-auto">
            {/* MODIFIED: Themed muted text color */}
            <p className="text-sm text-muted-foreground">Question {currentQuestionIndex + 1} of {generatedQuiz.questions.length}</p>
            <h3 className="text-2xl font-semibold my-4">{currentQuestion.question_text}</h3>
            <textarea
              value={userAnswers[currentQuestionIndex]}
              onChange={(e) => {
                const newAnswers = [...userAnswers];
                newAnswers[currentQuestionIndex] = e.target.value;
                setUserAnswers(newAnswers);
              }}
              placeholder="Type your short answer here..."
              // MODIFIED: Themed input, but kept orange focus ring for branding
              className="w-full p-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
              rows={4}
            />
            <div className="mt-6 flex justify-between items-center">
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                // MODIFIED: Themed secondary button
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              {currentQuestionIndex < generatedQuiz.questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  // NOTE: Kept orange brand color for primary button
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold"
                >
                  Next
                </button>
              ) : (
                // SUGGESTION: Changed green to orange for consistency. Change back to bg-green-600 if you prefer.
                <button onClick={handleSubmitQuiz} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold">
                  Submit Quiz
                </button>
              )}
            </div>
            {error && <p className="text-red-500 bg-red-500/10 p-3 rounded-md mt-4">{error}</p>}
          </div>
        );

      case "evaluating":
        return <div className="text-center"><SpinnerIcon /> <p className="mt-4">Evaluating your answers...</p></div>;

      case "results":
        if (!evaluationResult) return <p>Could not load results.</p>;
        const scorePercentage = Math.round(evaluationResult.total_score * 100);
        return (
          <div className="w-full max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-2">Quiz Results</h2>
            <p className="text-center text-muted-foreground mb-6">Topic: {selectedTopicTitle}</p>
            <div className="text-center bg-muted p-6 rounded-lg mb-8">
              <p className="text-lg text-muted-foreground">Your Score</p>
              {/* NOTE: Kept orange brand color for the score */}
              <p className="text-6xl font-bold text-orange-400 my-2">{scorePercentage}%</p>
              <p className="text-xl font-semibold">{evaluationResult.total_grade}</p>
            </div>

            <div className="space-y-6">
              {evaluationResult.results.map((res, index) => (
                <div key={index} className="bg-muted p-4 rounded-md">
                  <p className="font-semibold text-lg">{index + 1}. {res.question_text}</p>
                  {/* MODIFIED: Themed backgrounds for correct/incorrect answers */}
                  <p className={`mt-2 p-2 rounded-md text-sm ${res.similarity_score > 0.6 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                    <span className="font-bold">Your Answer: </span>{res.user_answer || <span className="italic">No answer provided</span>}
                  </p>
                  <p className="mt-2 p-2 rounded-md text-sm bg-sky-500/20 text-sky-700">
                    <span className="font-bold">Correct Answer: </span>{res.correct_answer}
                  </p>
                  {/* NOTE: Kept orange brand color for similarity score */}
                  <p className="text-right mt-2 text-sm font-mono text-orange-400">Similarity Score: {(res.similarity_score * 100).toFixed(2)}%</p>
                </div>
              ))}
            </div>
            <div className="mt-8 text-center">
              {/* NOTE: Kept orange brand color for primary button */}
              <button onClick={handleRestart} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-semibold">
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
    // --- THE MAIN FIX ---
    // MODIFIED: Swapped hardcoded slate/white for theme-aware background/foreground colors.
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* NOTE: Kept orange brand color for the link */}
        <Link href={`/books/${bookId}`} className="inline-flex items-center text-orange-400 hover:text-orange-300 mb-6">
          <ChevronLeftIcon className="w-5 h-5 mr-2" />
          Back to Book
        </Link>
        {/* MODIFIED: Used card colors for the main content container */}
        <div className="bg-card text-card-foreground rounded-lg shadow-2xl p-8">
          {renderContent()}
        </div>
      </div>
    </main>
  );
}