// frontend/src/services/bookService.ts

// Define the Book interface here
export interface Book {
  id: string;
  title: string;
  filename: string; 
  upload_date: string;
  status: string; // Keep status for UI updates
  category_id?: string | null;
}


export interface BookTextContent {
  id: string;
  title: string;
  content: string;
}

export interface SummarizeResponse { 
  summary: string;
}

export interface Flashcard { 
  front: string;
  back: string;
}

export interface StudyNotesApiResponse {
  study_notes: string;
}

export interface FlashcardsApiResponse { 
  flashcards: Flashcard[];
}

// --- New Interfaces for Q&A Generation ---
export interface QuestionAnswerPair {
    question: string;
    answer: string;
}

export interface QnAApiResponse {
    qna_pairs: QuestionAnswerPair[];
}
// --- End New Interfaces for Q&A ---

// --- Glossary Type ---
export interface GlossaryEntry {
  term: string;
  definition: string;
  source: 'context' | 'general';
}

// --- (NEW) Topic Types ---
export interface BookTopic {
  id: string;
  book_id: string;
  topic_title: string;
  page_start: number;
}
// --- End Topic Types ---

export interface ChatResponse {
  answer: string;
  sources: string[];
}

const API_BASE_URL = 'http://localhost:8000'; // Make sure this is correct

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
    console.error("Error parsing API error response in bookService:", e);
  }
  throw new Error(processedErrorMessage);
}

export async function updateBookCategory(bookId: string, categoryId: string | null): Promise<Book> { 
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const payload = {
    category_id: categoryId, 
  };

  const response = await fetch(`${API_BASE_URL}/books/${bookId}/category`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to update book category.');
  }
  return response.json() as Promise<Book>; 
}

export async function summarizeTextService(text: string): Promise<SummarizeResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/ai/summarize-text`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text_to_summarize: text }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to get summary from the server.');
  }
  return response.json();
}

export async function generateFlashcardsService(text: string): Promise<FlashcardsApiResponse> { 
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/ai/generate-flashcards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text_to_generate_from: text }), 
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to generate flashcards from the server.');
  }
  return response.json() as Promise<FlashcardsApiResponse>; 
}

export async function generateStudyNotesService(text: string): Promise<StudyNotesApiResponse> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/ai/generate-study-notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text_to_generate_notes_from: text }), 
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to generate study notes from the server.'); 
  }

  return await response.json(); 
}

// --- New Function for Q&A Generation Service ---
export async function generateQnAService(text: string): Promise<QnAApiResponse> {
    const token = getAuthToken();
    if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/ai/generate-qna`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text_to_generate_from: text }), // Matches TextForQuestionAnswer schema in backend
    });

    if (!response.ok) {
        await handleApiError(response, 'Failed to generate Q&A from the server.');
    }
    return response.json() as Promise<QnAApiResponse>;
}
// --- End New Function for Q&A ---


export async function fetchUserBooks(): Promise<Book[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/books`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch your books. The backend service may not be ready.');
  }
  return response.json();
}

export async function uploadBook(file: File, title: string, categoryId: string | null): Promise<Book> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const formData = new FormData();
  formData.append('file', file);
  if (title) {
    formData.append('title', title);
  }
  if (categoryId) {
    formData.append('category_id', categoryId);
  }

  const response = await fetch(`${API_BASE_URL}/books/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to upload the book. The backend service may not be ready.');
  }
  return response.json();
}

export async function fetchBookDetails(bookId: string): Promise<Book> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found.');
  }
  const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch book details.');
  }
  return response.json();
}

export async function fetchBookPdfAsBlob(bookId: string): Promise<Blob> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found.');
  }
  const response = await fetch(`${API_BASE_URL}/books/${bookId}/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    if (response.status === 404) {
        throw new Error('PDF not found.');
    } else if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized to access PDF.');
    }
    throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
  }
  return response.blob();
}

export async function fetchBookExtractedText(bookId: string): Promise<BookTextContent> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found.');
  }
  const response = await fetch(`${API_BASE_URL}/books/${bookId}/extracted-text`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch extracted text.');
  }
  return response.json();
}

export async function deleteBook(bookId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/books/${bookId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  // Note: A 204 No Content response is a *successful* deletion
  if (response.status === 204) {
    return; 
  }
  
  if (!response.ok) {
    await handleApiError(response, `Failed to delete book (ID: ${bookId}).`);
  }
}

export const fetchGlossaryForPage = async (bookId: string, pageNumber: number): Promise<GlossaryEntry[]> => {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  // This calls the new endpoint we built
  const response = await fetch(`${API_BASE_URL}/books/${bookId}/glossary/${pageNumber}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to fetch glossary");
  }

  return response.json();
};

// --- (MODIFIED) Replaced old topic functions with new ones ---

/**
 * Fetches the list of pre-processed topics for a book.
 */
export const fetchBookTopics = async (bookId: string): Promise<BookTopic[]> => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  // This path is relative because it's an internal API route
  const response = await fetch(`/api/books/${bookId}/topics`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to fetch book topics.");
  }
  return await response.json();
};

/**
 * Generates study notes from a specific Topic ID.
 */
export const generateStudyNotesFromTopic = async (topicId: string): Promise<StudyNotesApiResponse> => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  // This path is relative because it's an internal API route
  const response = await fetch(`/api/ai/generate-study-notes/topic`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ topic_id: topicId }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate study notes from topic.");
  }
  return await response.json();
};
