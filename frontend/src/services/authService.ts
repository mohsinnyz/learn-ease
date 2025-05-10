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

interface UserPublic {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  age?: number;
  university_name?: string;
}

// Helper function to process API error responses
async function handleApiError(response: Response, defaultErrorMessage: string): Promise<never> {
  let processedErrorMessage = defaultErrorMessage;
  try {
    const errorData = await response.json();
    console.log("AUTH_SERVICE_RECEIVED_ERROR_DATA:", errorData); // Log raw error data

    if (errorData && errorData.detail) {
      const detail = errorData.detail;
      if (Array.isArray(detail) && detail.length > 0) {
        // If detail is an array, try to get the 'msg' from the first error object
        const firstError = detail[0];
        if (typeof firstError === 'object' && firstError !== null && 'msg' in firstError && typeof (firstError as { msg: unknown }).msg === 'string') {
          processedErrorMessage = (firstError as { msg: string }).msg;
        } else {
          // Fallback if detail is an array of non-strings or unexpected objects
          processedErrorMessage = `Multiple validation errors occurred. Please check your input. (Details: ${JSON.stringify(detail)})`;
        }
      } else if (typeof detail === 'string') {
        // If detail is already a string
        processedErrorMessage = detail;
      } else if (typeof detail === 'object' && detail !== null) {
        // If detail is a single object, try to get a 'msg' or stringify
        if ('msg' in detail && typeof (detail as {msg: unknown}).msg === 'string') {
             processedErrorMessage = (detail as {msg: string}).msg;
        } else {
            processedErrorMessage = JSON.stringify(detail);
        }
      }
    }
  } catch (e) {
    // If response.json() fails or errorData.detail is not helpful, stick to default
    console.error("AUTH_SERVICE_ERROR_PARSING_JSON or UNEXPECTED_ERROR_STRUCTURE:", e);
  }
  console.log("AUTH_SERVICE_THROWING_ERROR_MESSAGE:", processedErrorMessage);
  throw new Error(processedErrorMessage); // Throw a new Error with the processed string message
}


export async function signupUser(userData: SignupData): Promise<UserPublic> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    // Use the helper to process the error and throw
    await handleApiError(response, 'Signup failed. Please check your details.');
  }
  return response.json();
}

export async function loginUser(credentials: LoginData): Promise<TokenResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    // Use the helper to process the error and throw
    await handleApiError(response, 'Login failed. Please check your credentials.');
  }
  return response.json();
}