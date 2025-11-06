// --- Helper Functions (Copied from bookService.ts) ---

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
      } else if (typeof detail === 'object' && detail !== null && 'msg' in detail && typeof (detail as {msg: unknown}).msg === 'string') {
        processedErrorMessage = (detail as {msg: string}).msg;
      } else {
        processedErrorMessage = JSON.stringify(detail);
      }
    }
  } catch (e) {
    console.error("Error parsing API error response in progressService:", e);
  }
  throw new Error(processedErrorMessage);
}

// --- Interfaces for Progress Module ---
// These match the Pydantic models from backend/models/progress_schemas.py

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
}

export interface GlobalStats {
  total_quizzes: number;
  average_score: number;
  weakest_subject: string | null;
}

export interface GlobalProgressResponse {
  stats: GlobalStats;
  score_over_time: ChartDataPoint[];
  performance_by_subject: ChartDataPoint[];
  grade_distribution: PieChartDataPoint[];
}

export type TopicStatusType = "completed" | "failed" | "not_attempted";

export interface TopicStatus {
  topic_title: string;
  status: TopicStatusType;
  score: number | null;
}

export interface BookProgressResponse {
  completion_status: TopicStatus[];
  performance_by_topic: ChartDataPoint[];
}

// --- New Service Functions ---

/**
 * Fetches all global progress stats for the logged-in user.
 */
export async function fetchGlobalProgress(): Promise<GlobalProgressResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/progress/global`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch global progress.');
  }
  return response.json() as Promise<GlobalProgressResponse>;
}

/**
 * Fetches all progress stats for a single book.
 * @param bookId The ID of the book to fetch progress for.
 */
export async function fetchBookProgress(bookId: string): Promise<BookProgressResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/progress/book/${bookId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch progress for this book.');
  }
  return response.json() as Promise<BookProgressResponse>;
}