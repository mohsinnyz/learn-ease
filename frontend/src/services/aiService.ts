import { ChatResponse as ChatApiResponse } from "./bookService"; // Re-using type from bookService for now

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
}

export const chatWithBook = async (bookId: string, query: string): Promise<ChatApiResponse> => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Authentication token not found.");
  }

  const response = await fetch(`/api/ai/chat/${bookId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "An unknown error occurred." }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};