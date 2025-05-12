// frontend/src/services/bookService.ts

// Define the Book interface here
export interface Book {
  id: string;
  title: string;
  filename: string;
  upload_date: string;
}

export interface BookTextContent {
  id: string;
  title: string;
  content: string;
}

const API_BASE_URL = 'http://localhost:8000';

// Helper to get the auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

// Helper function to process API error responses
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
    console.error("Error parsing API error response:", e);
  }
  throw new Error(processedErrorMessage);
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

export async function uploadBook(file: File): Promise<Book> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const formData = new FormData();
  formData.append('file', file);

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
    // For blob responses, .json() will fail. Handle error based on status.
    if (response.status === 404) {
        throw new Error('PDF not found.');
    } else if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized to access PDF.');
    }
    throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
  }
  return response.blob(); // Get the response body as a Blob
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