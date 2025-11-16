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

export interface GroupMemberPublic {
  id: string;
  firstname: string;
  lastname: string;
  image?: string | null;
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

export async function createGroup(groupData: StudyGroupCreate): Promise<StudyGroupPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(groupData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to create group.');
  }
  return response.json() as Promise<StudyGroupPublic>;
}

export async function getGroupMembers(groupId: string): Promise<GroupMemberPublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch group members.');
  }
  return response.json() as Promise<GroupMemberPublic[]>;
}

/**
 * Invites a user to a group by their email (Admin only).
 * Calls POST /groups/{group_id}/invite
 * (FR 19.2)
 */
export async function inviteMember(groupId: string, email: string): Promise<any> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/invite`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to invite member.');
  }
  return response.json();
}

/**
 * Kicks a user from a group (Admin only).
 * Calls DELETE /groups/{group_id}/kick/{user_id}
 * (FR 19.3)
 */
export async function kickMember(groupId: string, userIdToKick: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/kick/${userIdToKick}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (response.status === 204) {
    return; // Success
  }
  if (!response.ok) {
    await handleApiError(response, 'Failed to kick member.');
  }
}

/**
 * Transfers admin ownership to another member (Admin only).
 * Calls POST /groups/{group_id}/transfer
 */
export async function transferOwnership(groupId: string, newAdminId: string): Promise<StudyGroupPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/transfer`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ new_admin_id: newAdminId }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to transfer ownership.');
  }
  return response.json() as Promise<StudyGroupPublic>;
}

export async function leaveGroup(groupId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (response.status === 204) {
    return; // Success
  }
  
  // If it fails (e.g., admin tries to leave), this will throw the error
  await handleApiError(response, 'Failed to leave group.');
}