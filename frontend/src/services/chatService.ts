// frontend/src/services/chatService.ts

// --- Placeholder Interface ---
// This defines what a 1-to-1 conversation will look like
export interface ConversationPublic {
  id: string;
  participant_name: string; // The name of the *other* person
  last_message: string;
  last_activity_date: string; // ISO string
  // We can add other fields later, like 'participant_image'
}

/**
 * (PLACEHOLDER) Fetches all 1-to-1 private messages.
 * We will implement this for real in Stage 3.
 *
 * For now, it returns an empty array so the UI doesn't break.
 */
export async function fetchMyConversations(): Promise<ConversationPublic[]> {
  console.log("Using placeholder chatService: fetchMyConversations. Returning empty array.");
  
  // Return an empty array
  return Promise.resolve([]);
}

/**
 * (PLACEHOLDER) Fetches all messages for a 1-to-1 conversation.
 * We will implement this for real in Stage 3.
 */
export async function fetchConversationMessages(conversationId: string): Promise<any[]> {
  console.log("Using placeholder chatService: fetchConversationMessages. Returning empty array.");
  
  // Return an empty array
  return Promise.resolve([]);
}

/**
 * (PLACEHOLDER) Sends a 1-to-1 chat message.
 * We will implement this for real in Stage 3.
 */
export async function sendDirectMessage(conversationId: string, content: string): Promise<any> {
  console.log("Using placeholder chatService: sendDirectMessage. Doing nothing.");
  
  // Do nothing, just resolve
  return Promise.resolve();
}