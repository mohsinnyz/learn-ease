// frontend/src/app/books/[bookId]/quiz/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, notFound } from "next/navigation";
import Link from "next/link";
import { fetchBookText } from "@/services/bookService";
import {
  generateQuizService,
  evaluateQuizService,
  GeneratedQuiz,
  UserAnswer,
  QuizEvaluationResponse,
} from "@/services/quizService";

// --- Helper function to parse topics from text ---
const parseTopics = (text: string): { title: string; content: string }[] => {
    // This regex looks for patterns like "Chapter 1", "Introduction", "Section A.", etc.
    const topicRegex = /^(Chapter\s+\d+|Part\s+[A-Z\d]+|Section\s+[A-Z\d]+|Introduction|Conclusion|Appendix\s*\w*)\s*[:.\n]/gim;
    const parts = text.split(topicRegex);
    
    if (parts.length <= 1) {
        // If no topics found, treat the whole book as one topic
        return [{ title: "Full Document", content: text }];
    }

    const topics: { title: string; content: string }[] = [];
    for (let i = 1; i < parts.length; i += 2) {
        const title = parts[i].trim();
        const content = (parts[i + 1] || "").trim();
        // Only add topics with substantial content
        if (content.length > 500) { // at least 500 characters
            topics.push({ title, content });
        }
    }
    return topics.length > 0 ? topics : [{ title: "Full Document", content: text }];
};


// --- Icons ---
const SpinnerIcon = () => ( <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const ChevronLeftIcon = (props: React.SVGProps<SVGSVGElement>) => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>);


export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  // State management for the different phases of the quiz
  const [quizPhase, setQuizPhase] = useState<"loading_topics" | "topic_selection" | "generating" | "in_progress" | "evaluating" | "results">("loading_topics");
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [topics, setTopics] = useState<{ title: string; content: string }[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<{ title: string; content: string } | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<QuizEvaluationResponse | null>(null);

  // Effect to fetch book text and parse topics on component mount
  useEffect(() => {
    if (!bookId) return;
    
    const loadTopics = async () => {
      try {
        const { text } = await fetchBookText(bookId);
        const parsed = parseTopics(text);
        setTopics(parsed);
        setQuizPhase("topic_selection");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load book content.");
        setQuizPhase("topic_selection"); // Still show the page, but with an error
      }
    };
    loadTopics();
  }, [bookId]);

  // Handler for when a user selects a topic to start the quiz
  const handleTopicSelect = async (topic: { title: string; content: string }) => {
    setSelectedTopic(topic);
    setQuizPhase("generating");
    setError(null);
    try {
      const quiz = await generateQuizService(topic.content);
      setGeneratedQuiz(quiz);
      setUserAnswers(new Array(quiz.questions.length).fill(""));
      setCurrentQuestionIndex(0);
      setQuizPhase("in_progress");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz.");
      setQuizPhase("topic_selection");
    }
  };

  // Handler for submitting the completed quiz for evaluation
  const handleSubmitQuiz = async () => {
    if (!generatedQuiz || !selectedTopic) return;
    
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
            selectedTopic.title
        );
        setEvaluationResult(result);
        setQuizPhase("results");
    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to evaluate quiz.");
        setQuizPhase("in_progress"); // Go back to the quiz to let them try again
    }
  };

  const handleRestart = () => {
    setQuizPhase("topic_selection");
    setSelectedTopic(null);
    setGeneratedQuiz(null);
    setEvaluationResult(null);
    setError(null);
  };
  
  if (!bookId) {
    notFound();
  }

  // --- Render different UI based on the current quiz phase ---

  const renderContent = () => {
    switch (quizPhase) {
      case "loading_topics":
        return <div className="text-center"><SpinnerIcon /> <p className="mt-4">Loading topics...</p></div>;
      
      case "topic_selection":
        return (
          <div>
            <h2 className="text-2xl font-bold mb-4">Select a Topic to Start Quiz</h2>
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mb-4">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map((topic, index) => (
                <button
                  key={index}
                  onClick={() => handleTopicSelect(topic)}
                  className="p-6 bg-slate-700/50 hover:bg-slate-600/70 rounded-lg shadow-lg text-left transition-all hover:scale-105"
                >
                  <h3 className="font-semibold text-lg text-orange-400">{topic.title}</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    {topic.content.substring(0, 100)}...
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case "generating":
        return <div className="text-center"><SpinnerIcon /> <p className="mt-4">Generating your quiz, please wait...</p></div>;

      case "in_progress":
        if (!generatedQuiz) return <p>Something went wrong.</p>;
        const currentQuestion = generatedQuiz.questions[currentQuestionIndex];
        return (
            <div className="w-full max-w-2xl mx-auto">
                <p className="text-sm text-slate-400">Question {currentQuestionIndex + 1} of {generatedQuiz.questions.length}</p>
                <h3 className="text-2xl font-semibold my-4">{currentQuestion.question_text}</h3>
                <textarea
                    value={userAnswers[currentQuestionIndex]}
                    onChange={(e) => {
                        const newAnswers = [...userAnswers];
                        newAnswers[currentQuestionIndex] = e.target.value;
                        setUserAnswers(newAnswers);
                    }}
                    placeholder="Type your short answer here..."
                    className="w-full p-3 bg-slate-800 border border-slate-600 rounded-md focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
                    rows={4}
                />
                <div className="mt-6 flex justify-between items-center">
                    <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-4 py-2 bg-slate-600 rounded-md disabled:opacity-50"
                    >
                        Previous
                    </button>
                    {currentQuestionIndex < generatedQuiz.questions.length - 1 ? (
                         <button
                            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-md font-semibold"
                        >
                            Next
                        </button>
                    ) : (
                        <button onClick={handleSubmitQuiz} className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold">
                            Submit Quiz
                        </button>
                    )}
                </div>
                 {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md mt-4">{error}</p>}
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
                <p className="text-center text-slate-400 mb-6">Topic: {selectedTopic?.title}</p>
                <div className="text-center bg-slate-800/70 p-6 rounded-lg mb-8">
                    <p className="text-lg text-slate-300">Your Score</p>
                    <p className="text-6xl font-bold text-orange-400 my-2">{scorePercentage}%</p>
                    <p className="text-xl font-semibold">{evaluationResult.total_grade}</p>
                </div>

                <div className="space-y-6">
                    {evaluationResult.results.map((res, index) => (
                        <div key={index} className="bg-slate-800 p-4 rounded-md">
                            <p className="font-semibold text-lg">{index + 1}. {res.question_text}</p>
                            <p className={`mt-2 p-2 rounded-md text-sm ${res.similarity_score > 0.6 ? 'bg-green-900/70' : 'bg-red-900/70'}`}>
                                <span className="font-bold">Your Answer: </span>{res.user_answer || <span className="italic">No answer provided</span>}
                            </p>
                             <p className="mt-2 p-2 rounded-md text-sm bg-sky-900/70">
                                <span className="font-bold">Correct Answer: </span>{res.correct_answer}
                            </p>
                            <p className="text-right mt-2 text-sm font-mono text-orange-400">Similarity Score: {(res.similarity_score * 100).toFixed(2)}%</p>
                        </div>
                    ))}
                </div>
                <div className="mt-8 text-center">
                    <button onClick={handleRestart} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 rounded-md font-semibold">
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
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <Link href={`/books/${bookId}`} className="inline-flex items-center text-orange-400 hover:text-orange-300 mb-6">
          <ChevronLeftIcon className="w-5 h-5 mr-2" />
          Back to Book
        </Link>
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8">
          {renderContent()}
        </div>
      </div>
    </main>
  );
}