const API_BASE_URL = 'http://localhost:8000';

interface SignupData {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  age: number;
  university_name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserPublic { // Ensure this matches your backend UserPublic, including new fields
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  age?: number | null; // Allow null if backend can return it
  university_name?: string | null; // Allow null
  image?: string | null; // Assuming HttpUrl becomes string for frontend
  verified: boolean;
}

// --- New Interface for User Update Payload ---
export interface UserUpdatePayload {
  firstname?: string;
  lastname?: string;
  age?: number | null;
  university_name?: string | null;
  image?: string | null; // URL for profile picture
}
// --- End New Interface ---

export interface UserPasswordChangePayload {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}


// Existing handleApiError function should be here
// async function handleApiError(response: Response, defaultErrorMessage: string): Promise<never> { ... }
async function handleApiError(response: Response, defaultErrorMessage: string): Promise<never> {
  let processedErrorMessage = defaultErrorMessage;
  try {
    const errorData = await response.json();
    console.log("API_SERVICE_RECEIVED_ERROR_DATA:", errorData); 

    if (errorData && errorData.detail) {
      const detail = errorData.detail;
      if (Array.isArray(detail) && detail.length > 0) {
        const firstError = detail[0];
        if (typeof firstError === 'object' && firstError !== null && 'msg' in firstError && typeof (firstError as { msg: unknown }).msg === 'string') {
          processedErrorMessage = (firstError as { msg: string }).msg;
        } else {
          processedErrorMessage = `Multiple validation errors. (Details: ${JSON.stringify(detail)})`;
        }
      } else if (typeof detail === 'string') {
        processedErrorMessage = detail;
      } else if (typeof detail === 'object' && detail !== null) {
        if ('msg' in detail && typeof (detail as {msg: unknown}).msg === 'string') {
            processedErrorMessage = (detail as {msg: string}).msg;
        } else {
            processedErrorMessage = JSON.stringify(detail);
        }
      }
    }
  } catch (e) {
    console.error("API_SERVICE_ERROR_PARSING_JSON or UNEXPECTED_ERROR_STRUCTURE:", e);
  }
  console.log("API_SERVICE_THROWING_ERROR_MESSAGE:", processedErrorMessage);
  throw new Error(processedErrorMessage);
}

// Helper to get the auth token from localStorage (can be shared or duplicated if not already in a util)
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

// Existing signupUser and loginUser functions should be here
// export async function signupUser(userData: SignupData): Promise<UserPublic> { ... }
// export async function loginUser(credentials: LoginData): Promise<TokenResponse> { ... }
export async function signupUser(userData: SignupData): Promise<UserPublic> { // Use 'any' if SignupData not fully shown
    const response = await fetch(`${API_BASE_URL}/auth/signup`, { /* ... */ body: JSON.stringify(userData), headers: {'Content-Type': 'application/json'}, method: 'POST' });
    if (!response.ok) { await handleApiError(response, 'Signup failed.'); }
    return response.json();
}
export async function loginUser(credentials: LoginData): Promise<TokenResponse> { // Use 'any' if LoginData not fully shown
    const response = await fetch(`${API_BASE_URL}/auth/login`, { /* ... */ body: JSON.stringify(credentials), headers: {'Content-Type': 'application/json'}, method: 'POST' });
    if (!response.ok) { await handleApiError(response, 'Login failed.'); }
    return response.json();
}


// --- New Function to Fetch User Profile ---
export async function fetchUserProfile(): Promise<UserPublic> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  // Assuming your user router in main.py has a prefix like "/api/v1"
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch user profile.');
  }
  return response.json() as Promise<UserPublic>;
}
// --- End New Function ---

// --- New Function to Update User Profile ---
export async function updateUserProfile(profileData: UserUpdatePayload): Promise<UserPublic> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to update user profile.');
  }
  return response.json() as Promise<UserPublic>;
}

export async function changePassword(passwordData: UserPasswordChangePayload): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication token not found. Please log in again.');
  }

  // Using /users/me/change-password as per your correction (no /api/v1)
  const response = await fetch(`${API_BASE_URL}/users/me/change-password`, {
    method: 'POST', // POST is appropriate for this action
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(passwordData),
  });

  if (!response.ok) {
    // Status 204 means success but no content
    if (response.status === 204) {
      return; // Successfully changed password
    }
    await handleApiError(response, 'Failed to change password.');
  }
  // If response.ok and not 204 (though unlikely for this endpoint),
  // it implies success without specific content to parse for this void function.
}