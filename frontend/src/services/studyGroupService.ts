// frontend/src/services/studyGroupService.ts

// --- Helper Functions (Copied from your existing services) ---
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
    console.error("Error parsing API error response in studyGroupService:", e);
  }
  throw new Error(processedErrorMessage);
}

// --- Interfaces for Study Group Module ---
export interface StudyGroupPublic {
  id: string;
  name: string;
  description?: string | null;
  admin_id: string;
  member_count: number;
  created_at: string; // ISO string
  forum_thread_id: string; // The ID of the main chat thread
}

export interface StudyGroupCreate {
  name: string;
  description?: string | null;
}

// --- Service Functions ---

/**
 * Fetches all study groups the current user is a member of.
 * Calls GET /groups/me
 * (FR 20.3)
 */
export async function fetchMyGroups(): Promise<StudyGroupPublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/me`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch your study groups.');
  }
  return response.json() as Promise<StudyGroupPublic[]>;
}

// We can add createGroup, joinGroup, etc. later as needed