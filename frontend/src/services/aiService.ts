//frontend\src\services\aiService.ts

import { ChatResponse as ChatApiResponse } from "./bookService"; // Re-using type from bookService for now

// --- Helper Functions (Copied from progressService.ts) ---

const API_BASE_URL = 'http://localhost:8000'; 

function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

async function handleApiError(response: Response, defaultErrorMessage: string): Promise<never> {
  let processedErrorMessage = defaultErrorMessage;
  try {
    const errorData = await response.json();
    if (errorData && errorData.detail) {
      const detail = errorData.detail;
      if (typeof detail === 'string') {
        processedErrorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && typeof detail[0].msg === 'string') {
        processedErrorMessage = detail[0].msg;
      } else {
        processedErrorMessage = JSON.stringify(detail);
      }
    }
  } catch (e) {
    console.error("Error parsing API error response in aiService:", e);
  }
  throw new Error(processedErrorMessage);
}

// --- Existing Chat Service ---

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

export const chatWithBook = async (bookId: string, query: string): Promise<ChatApiResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }

  // Use API_BASE_URL
  const response = await fetch(`${API_BASE_URL}/ai/chat/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    await handleApiError(response, "An unknown error occurred.");
  }

  return response.json();
};

// =========================================================================
// --- NEW RECOMMENDATION SERVICE ---
// =========================================================================

// --- 1. Define the Types (from our backend schema) ---

export type RecommendedAction =
  | "AI_MENTOR"
  | "TAKE_QUIZ"
  | "VIEW_SUMMARY"
  | "STUDY_FLASHCARDS"
  | "REVIEW_NOTES"
  | "CHECK_GLOSSARY"
  | "VIEW_QA_PAIRS";

export type RecommendationPriority = "High" | "Medium";

export interface AIStudyRecommendation {
  priority: RecommendationPriority;
  topic_name: string;
  score: number;
  action: RecommendedAction;
  recommendation_text: string;
}

export interface AIRecommendationResponse {
  recommendations: AIStudyRecommendation[];
  strength_message: string | null;
}

// --- 2. The New Service Function ---

/**
 * Fetches AI-generated study recommendations for a specific book.
 * @param bookId The ID of the book
 */
export const getAIRecommendations = async (
  bookId: string
): Promise<AIRecommendationResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const response = await fetch(
    `${API_BASE_URL}/ai/recommendations/${bookId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to fetch AI recommendations.");
  }

  return response.json() as Promise<AIRecommendationResponse>;
};

// (Add this to the end of frontend/src/services/aiService.ts)

// ... (your existing types and getAIRecommendations function)

// =========================================================================
// --- NEW GLOBAL RECOMMENDATION SERVICE ---
// =========================================================================

export type GlobalRecommendationAction =
  | "REVIEW_WEAKEST_SUBJECT"
  | "PRACTICE_NEW_SUBJECT"
  | "VIEW_GLOBAL_PROGRESS"
  | "TAKE_ANY_QUIZ";

export interface AIGlobalStudyRecommendation {
  priority: RecommendationPriority; // Re-use this type
  action: GlobalRecommendationAction;
  title: string;
  recommendation_text: string;
}

export interface AIGlobalRecommendationResponse {
  recommendations: AIGlobalStudyRecommendation[];
}

/**
 * Fetches AI-generated global recommendations for the dashboard.
 */
export const getAIGlobalRecommendations = async (): Promise<AIGlobalRecommendationResponse> => {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const response = await fetch(
    `${API_BASE_URL}/ai/global-recommendations`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    await handleApiError(response, "Failed to fetch global AI recommendations.");
  }

  return response.json() as Promise<AIGlobalRecommendationResponse>;
};