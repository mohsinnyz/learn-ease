// frontend/src/services/forumService.ts

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
    console.error("Error parsing API error response in forumService:", e);
  }
  throw new Error(processedErrorMessage);
}

// --- Interfaces for Forum Module ---

export interface AuthorPublic {
  id: string;
  firstname: string;
  lastname: string;
  image?: string | null;
}

export interface ForumThreadPublic {
  id: string;
  author: AuthorPublic;
  title: string;
  content: string;
  book_id?: string | null;
  tags?: string[];
  created_at: string; 
  upvote_count: number;
  downvote_count: number;
  reply_count: number;
}

// (MODIFIED) Added parent_id support
export interface ForumPostPublic {
  id: string;
  thread_id: string;
  parent_id?: string | null; // New field for nesting
  author: AuthorPublic;
  content: string;
  created_at: string; 
  upvote_count: number;
  downvote_count: number;
}

export interface ForumThreadCreate {
  title: string;
  content: string;
  book_id?: string | null;
  tags?: string[];
}

// (MODIFIED) Added parent_id support
export interface ForumPostCreate {
  thread_id: string;
  content: string;
  parent_id?: string; // New optional field for replying to a reply
}

export type VoteType = "upvote" | "downvote" | "none";

// --- Service Functions ---

/**
 * Fetches threads. Optionally filters by a search query.
 * (FR 21.1 + Discoverability)
 */
export async function fetchForumThreads(searchQuery?: string): Promise<ForumThreadPublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  // (MODIFIED) Build URL with query params
  const url = new URL(`${API_BASE_URL}/forum/threads`);
  if (searchQuery) {
    url.searchParams.append('search', searchQuery);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch forum threads.');
  }
  return response.json() as Promise<ForumThreadPublic[]>;
}

/**
 * Fetches a single thread and all its replies.
 */
export async function fetchThreadDetails(threadId: string): Promise<{
  thread: ForumThreadPublic;
  posts: ForumPostPublic[];
}> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const [threadRes, postsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/forum/threads/${threadId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    }),
    fetch(`${API_BASE_URL}/forum/threads/${threadId}/posts`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  ]);

  if (!threadRes.ok) {
    await handleApiError(threadRes, 'Failed to fetch forum thread.');
  }
  if (!postsRes.ok) {
    await handleApiError(postsRes, 'Failed to fetch thread posts.');
  }

  const thread = await threadRes.json() as ForumThreadPublic;
  const posts = await postsRes.json() as ForumPostPublic[];
  
  return { thread, posts };
}

/**
 * Creates a new forum thread.
 */
export async function createForumThread(threadData: ForumThreadCreate): Promise<ForumThreadPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/forum/threads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(threadData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to create new thread.');
  }
  return response.json() as Promise<ForumThreadPublic>;
}

/**
 * Creates a new post (reply).
 */
export async function createForumPost(postData: ForumPostCreate): Promise<ForumPostPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/forum/threads/${postData.thread_id}/posts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to post reply.');
  }
  return response.json() as Promise<ForumPostPublic>;
}

/**
 * Votes on a thread or post.
 */
export async function voteOn(
  type: 'thread' | 'post',
  id: string,
  voteType: VoteType
): Promise<{ upvote_count: number; downvote_count: number }> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const url = type === 'thread' 
    ? `${API_BASE_URL}/forum/threads/${id}/vote`
    : `${API_BASE_URL}/forum/posts/${id}/vote`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vote_type: voteType }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to submit vote.');
  }
  return response.json() as Promise<{ upvote_count: number; downvote_count: number }>;
}

/**
 * Edits an existing post.
 */
export async function editForumPost(postId: string, newContent: string): Promise<ForumPostPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: newContent }), 
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to edit post.');
  }
  return response.json() as Promise<ForumPostPublic>;
}

/**
 * Deletes an existing post.
 */
export async function deleteForumPost(postId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/forum/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    return;
  }

  if (!response.ok) {
    await handleApiError(response, 'Failed to delete post.');
  }
  return;
}

/**
 * Deletes an existing thread.
 */
export async function deleteForumThread(threadId: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/forum/threads/${threadId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 204) {
    return;
  }

  if (!response.ok) {
    await handleApiError(response, 'Failed to delete thread.');
  }
  return;
}