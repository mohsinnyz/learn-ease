// frontend/src/services/categoryService.ts

const API_BASE_URL = 'http://localhost:8000'; // Ensure this is consistent or from a config

// Helper to get the auth token from localStorage
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
}

// Consistent API Error Handling (Consider moving to a shared utility if not already)
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
    console.error("Error parsing API error response in categoryService:", e);
  }
  throw new Error(processedErrorMessage);
}

export interface Category {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  // updated_at?: string; // If you add this field
}

interface CategoryCreatePayload {
  name: string;
}

interface CategoryUpdatePayload {
  name: string;
}

export async function fetchUserCategories(): Promise<Category[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch categories.');
  }
  return response.json() as Promise<Category[]>;
}

export async function createCategory(categoryData: CategoryCreatePayload): Promise<Category> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/categories`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to create category.');
  }
  return response.json() as Promise<Category>;
}

export async function updateCategoryName(categoryId: string, categoryUpdateData: CategoryUpdatePayload): Promise<Category> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryUpdateData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to update category name.');
  }
  return response.json() as Promise<Category>;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Status 204 means success but no content, so don't treat as error
    if (response.status === 204) {
      return;
    }
    await handleApiError(response, 'Failed to delete category.');
  }
  // For 204 No Content, there's no JSON body to parse.
}