"use client";

import { UserPublic } from './authService'; // We'll get UserPublic from your auth service

// --- Helper Functions (Copied from your existing services) ---
const API_BASE_URL = 'http://localhost:8000'; 
// (NEW) WebSocket URL
const WS_BASE_URL = 'ws://localhost:8000';

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
    console.error("Error parsing API error response in chatService:", e);
  }
  throw new Error(processedErrorMessage);
}

// --- Interfaces for Chat Module ---
// (Matches backend chat_schemas.py)

export interface MessagePublic {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string; // ISO string
}

export interface ConversationPublic {
  id: string;
  participant: UserPublic;
  last_message: string | null;
  last_activity: string; // ISO string
}

// --- HTTP Service Functions (for loading history) ---

/**
 * Fetches all of the user's 1-to-1 conversations.
 * (FR 23.2)
 */
export async function fetchMyConversations(): Promise<ConversationPublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch conversations.');
  }
  return response.json() as Promise<ConversationPublic[]>;
}

/**
 * Fetches the full message history for a conversation.
 */
export async function fetchConversationMessages(conversationId: string): Promise<MessagePublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/messages`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to fetch messages.');
  }
  return response.json() as Promise<MessagePublic[]>;
}

/**
 * Searches for users to start a new chat with.
 */
export async function searchUsers(query: string): Promise<UserPublic[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");
  
  const response = await fetch(`${API_BASE_URL}/users/search?q=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to search users.');
  }
  return response.json() as Promise<UserPublic[]>;
}

/**
 * Creates or gets an existing conversation with another user.
 */
export async function createOrGetConversation(participantId: string): Promise<ConversationPublic> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token not found.");

  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participant_id: participantId }),
  });

  if (!response.ok) {
    await handleApiError(response, 'Failed to create conversation.');
  }
  return response.json() as Promise<ConversationPublic>;
}


// --- WebSocket Service (for Real-Time Messages) ---

type WebSocketEvent = 'new_message' | 'error' | 'open' | 'close';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {
    new_message: [],
    error: [],
    open: [],
    close: [],
  };

  private emit(event: WebSocketEvent, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  public connect() {
    const token = getAuthToken();
    if (!token) {
      console.error("WebSocket: No auth token found.");
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket: Already connected.");
      return;
    }

    // Connect to the /ws endpoint, passing the token as a query parameter
    this.ws = new WebSocket(`${WS_BASE_URL}/chat/ws?token=${token}`);

    this.ws.onopen = () => {
      console.log("WebSocket: Connection established.");
      this.emit('open', null);
    };

    this.ws.onmessage = (event) => {
      // This is the "envelope" from the backend
      const message = JSON.parse(event.data);
      if (message.type && this.listeners[message.type]) {
        // We found a matching event (e.g., "new_message")
        this.emit(message.type, message.payload);
      } else {
        console.warn("WebSocket: Received unknown message type:", message.type);
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket: Error:", error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket: Connection closed.");
      this.ws = null;
      this.emit('close', null);
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public sendMessage(conversationId: string, content: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket: Not connected. Cannot send message.");
      // Attempt to reconnect
      this.connect();
      return;
    }

    // This must match the backend's MessageCreate schema
    const messagePayload = {
      conversation_id: conversationId,
      content: content,
    };
    
    this.ws.send(JSON.stringify(messagePayload));
  }

  // --- Event Listener Methods ---

  public on(event: WebSocketEvent, callback: (data: any) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: WebSocketEvent, callback: (data: any) => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

// Export a single, global instance of the manager
export const chatSocket = new WebSocketManager();