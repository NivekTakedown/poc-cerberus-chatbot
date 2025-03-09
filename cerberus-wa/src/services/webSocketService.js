import ReconnectingWebSocket from "reconnecting-websocket";
import { getWebSocketURL } from "../config/env";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.messageHandlers = new Map();
    this.connected = false;
    this.reconnecting = false;
    this.conversationId = null;
    this.messageBuffer = new Map(); // Buffer to accumulate streaming tokens
    this.pendingMessages = new Set(); // Track messages that are being streamed
  }

  connect(conversationId = null) {
    if (this.socket && this.connected) {
      this.disconnect();
    }

    const wsUrl = getWebSocketURL(conversationId);
    this.conversationId = conversationId;

    console.log(`Connecting to WebSocket: ${wsUrl}`);

    this.socket = new ReconnectingWebSocket(wsUrl, [], {
      // Configure reconnection parameters
      reconnectInterval: 1000,
      maxReconnectInterval: 5000,
      reconnectDecay: 1.5,
      timeoutInterval: 2000,
      maxRetries: Infinity,
    });

    this.socket.onopen = () => {
      console.log("WebSocket connection established");
      this.connected = true;
      this.reconnecting = false;
      this._notifyHandlers("connect", { connected: true });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this._processMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
      this.connected = false;
      if (!this.reconnecting) {
        this._notifyHandlers("disconnect", { connected: false });
      }
      this.reconnecting = true;
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      this._notifyHandlers("error", { error });
    };
  }

  _processMessage(data) {
    // Handle streaming tokens specially to buffer them
    if (data.type === "streaming_token") {
      this._handleStreamingToken(data);
      return;
    }

    // Handle message complete by finalizing the buffered message
    if (data.type === "message_complete") {
      this._handleMessageComplete(data);
      return;
    }

    // For all other message types, pass through normally
    this._notifyHandlers(data.type, data);
  }

  _handleStreamingToken(data) {
    const { token, message_id } = data;

    // Add message_id to pending messages if not already there
    if (!this.pendingMessages.has(message_id)) {
      this.pendingMessages.add(message_id);
      // Initialize buffer for this message
      this.messageBuffer.set(message_id, {
        content: "",
        tokens: [],
        lastUpdate: Date.now(),
      });

      // Notify that a new message has started streaming
      this._notifyHandlers("streaming_start", {
        message_id,
        initialToken: token,
      });
    }

    // Add token to buffer
    const messageData = this.messageBuffer.get(message_id);
    messageData.content += token;
    messageData.tokens.push(token);
    messageData.lastUpdate = Date.now();

    // Update the buffer
    this.messageBuffer.set(message_id, messageData);

    // Send a streaming update (for progress indication purposes)
    this._notifyHandlers("streaming_progress", {
      message_id,
      progress: messageData.tokens.length,
      lastToken: token,
    });
  }

  _handleMessageComplete(data) {
    const { message_id, conversation_id, full_message } = data;

    if (this.pendingMessages.has(message_id)) {
      const bufferedContent = this.messageBuffer.get(message_id)?.content || "";

      // Use the full message from the server if available, otherwise use buffered content
      const finalContent = full_message || bufferedContent;

      // Send the complete message
      this._notifyHandlers("message_complete", {
        message_id,
        conversation_id,
        content: finalContent,
      });

      // Clean up
      this.pendingMessages.delete(message_id);
      this.messageBuffer.delete(message_id);
    } else {
      // Pass through if we weren't tracking this message
      this._notifyHandlers("message_complete", data);
    }
  }

  disconnect() {
    if (this.socket) {
      // Clear any pending message buffers
      this.messageBuffer.clear();
      this.pendingMessages.clear();

      this.socket.close();
      this.socket = null;
      this.connected = false;
    }
  }

  sendMessage(message) {
    if (!this.connected || !this.socket) {
      console.error("Cannot send message: WebSocket not connected");
      return false;
    }

    this.socket.send(
      JSON.stringify({
        type: "chat_message",
        message,
        conversation_id: this.conversationId,
      }),
    );
    return true;
  }

  sendFeedback(messageId, rating) {
    if (!this.connected || !this.socket) {
      console.error("Cannot send feedback: WebSocket not connected");
      return false;
    }

    this.socket.send(
      JSON.stringify({
        type: "feedback",
        message_id: messageId,
        rating,
      }),
    );
    return true;
  }

  addMessageHandler(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
    return () => this.removeMessageHandler(type, handler);
  }

  removeMessageHandler(type, handler) {
    if (this.messageHandlers.has(type)) {
      const handlers = this.messageHandlers.get(type);
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  _notifyHandlers(type, data) {
    if (this.messageHandlers.has(type)) {
      this.messageHandlers.get(type).forEach((handler) => handler(data));
    }

    // Also notify 'all' handlers
    if (this.messageHandlers.has("all")) {
      this.messageHandlers
        .get("all")
        .forEach((handler) => handler({ type, data }));
    }
  }

  isConnected() {
    return this.connected;
  }

  // Get pending streaming messages
  getPendingMessages() {
    return Array.from(this.pendingMessages);
  }

  // Get a buffered message content
  getBufferedMessage(messageId) {
    return this.messageBuffer.get(messageId)?.content || "";
  }
}

// Singleton instance
const webSocketService = new WebSocketService();
export default webSocketService;
