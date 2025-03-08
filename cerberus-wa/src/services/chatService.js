import { API_URL } from "../config/env";

export const sendChatMessage = async (message, conversationId = null) => {
  const response = await fetch(`${API_URL}/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      query: message,
      conversation_id: conversationId,
    }),
  });

  return await response.json();
};

export const getConversations = async () => {
  const response = await fetch(`${API_URL}/conversations/`);
  return await response.json();
};

export const getConversation = async (id) => {
  const response = await fetch(`${API_URL}/conversations/${id}/`);
  return await response.json();
};

export const provideFeedback = async (messageId, rating) => {
  const response = await fetch(`${API_URL}/feedback/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message_id: messageId,
      rating,
    }),
  });

  return await response.json();
};
