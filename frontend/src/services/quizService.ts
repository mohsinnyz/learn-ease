// frontend/src/services/quizService.ts

import { API_BASE_URL } from "./authService"; // Assuming you have this constant

// Define the types for the Quiz API based on our backend schemas
// These interfaces match the Pydantic models in ai_schemas.py

export interface QuizQuestion {
  question_text: string;
  // Note: correct_answer and explanation are NOT sent to the client initially
}

export interface GeneratedQuiz {
  quiz_id: string;
  questions: QuizQuestion[];
}

export interface UserAnswer {
  question_text: string;
  user_answer: string;
}

export interface EvaluatedQuestionResult {
  question_text: string;
  user_answer: string;
  correct_answer: string;
  similarity_score: number;
  // This will be added in the final step, but let's define it now
  correct_explanation?: string; 
}

export interface QuizEvaluationResponse {
  quiz_id: string;
  total_score: number;
  total_grade: string;
  results: EvaluatedQuestionResult[];
}

// API function to generate a quiz
export const generateQuizService = async (
  contentText: string, 
  numQuestions: number = 10
): Promise<GeneratedQuiz> => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/ai/quiz/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content_text: contentText,
      num_questions: numQuestions,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to generate quiz.");
  }
  return response.json();
};

// API function to evaluate a quiz
export const evaluateQuizService = async (
  quizId: string,
  attemptedAnswers: UserAnswer[],
  bookId: string,
  topicName: string
): Promise<QuizEvaluationResponse> => {
  const token = localStorage.getItem("authToken");
  const response = await fetch(`${API_BASE_URL}/ai/quiz/evaluate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      quiz_id: quizId,
      attempted_answers: attemptedAnswers,
      book_id: bookId,
      topic_name: topicName,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to evaluate quiz.");
  }
  return response.json();
};