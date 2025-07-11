// frontend/src/services/bookService.ts

// Define the Book interface here
export interface Book {
  id: string;
  title: string;
  filename: string; 
  upload_date: string;
  category_id?: string | null; // <<< ADD THIS LINE (optional string or null)
}


export interface BookTextContent {
  id: string;
  title: string;
  content: string;
}

export interface SummarizeResponse { 
  summary: string;
}

// --- New Interfaces for Flashcard Generation ---
export interface Flashcard { // Ensure this is exported
  front: string;
  back: string;
}

export interface StudyNotesApiResponse {
  study_notes: string;
}

export interface FlashcardsApiResponse { // Ensure this is exported
  flashcards: Flashcard[];
}
// --- End New Interfaces ---

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
    console.error("Error parsing API error response in bookService:", e);
  }
  throw new Error(processedErrorMessage);
}

export async function updateBookCategory(bookId: string, categoryId: string | null): Promise<Book> { 
  // The backend for updating book category returns the updated BookPublic, which matches our Book interface
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const payload = {
    category_id: categoryId, // This matches the BookCategoryUpdate Pydantic model on backend
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
  return response.json() as Promise<Book>; // Assuming the response is the updated Book object
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

// --- New Function for Flashcard Generation Service ---
export async function generateFlashcardsService(text: string): Promise<FlashcardsApiResponse> { // Ensure this function is exported
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
// --- End New Function ---

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
    // Key here is "text_to_generate_notes_from" which matches Pydantic model
    body: JSON.stringify({ text_to_generate_notes_from: text }), 
  });

  if (!response.ok) {
    // This error handling was simplified; let's use handleApiError
    // throw new Error('Failed to generate study notes.'); 
    await handleApiError(response, 'Failed to generate study notes from the server.'); // Use the consistent error handler
  }

  return await response.json(); // No need for "as Promise<StudyNotesApiResponse>" if handleApiError throws
}

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

  if (!response.ok) {
    // Status 204 means success but no content, so don't treat as error
    if (response.status === 204) {
      return; // Successfully deleted
    }
    // For other errors, use handleApiError
    await handleApiError(response, `Failed to delete book (ID: ${bookId}).`);
  }
  // If response.ok and not 204 (though DELETE usually is 204 on success),
  // it implies success without content.
  // If there was content (e.g. a success message), you could parse it:
  // return response.json(); 
  // But for a 204, there's no body.
}
