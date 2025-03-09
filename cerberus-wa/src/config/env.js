const API_HOST = process.env.REACT_APP_API_HOST || "localhost:8000";
const API_PATH = process.env.REACT_APP_API_PATH || "/chatbot/api";
const API_PROTOCOL = process.env.REACT_APP_API_PROTOCOL || "http";

export const API_URL = `${API_PROTOCOL}://${API_HOST}${API_PATH}`;

// Helper function to get WebSocket URL
export const getWebSocketURL = (conversationId = null) => {
  const wsProtocol = API_PROTOCOL === "https" ? "wss" : "ws";
  return conversationId
    ? `${wsProtocol}://${API_HOST}/ws/chat/${conversationId}/`
    : `${wsProtocol}://${API_HOST}/ws/chat/`;
};
