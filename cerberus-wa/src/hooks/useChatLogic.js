import { useState, useEffect, useRef } from "react";
import { getConversations, getConversation } from "../services/chatService";
import webSocketService from "../services/webSocketService";

export default function useChatLogic(initialConversationId = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [connected, setConnected] = useState(false);
  const [pendingStreamingMessages, setPendingStreamingMessages] = useState(
    new Map(),
  );

  // Refs to maintain state in callbacks
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const streamingRef = useRef(pendingStreamingMessages);
  streamingRef.current = pendingStreamingMessages;

  // Initialize WebSocket connection
  useEffect(() => {
    if (!isOpen) return;

    // Setup WebSocket handlers
    const connectHandler = (data) => {
      setConnected(data.connected);
      console.log("WebSocket connection status:", data.connected);
    };

    const systemMessageHandler = (data) => {
      if (data.temp_id) {
        setIsLoading(true);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: data.message },
        ]);
      }
    };

    const streamingStartHandler = (data) => {
      const { message_id, initialToken } = data;

      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.set(message_id, initialToken);
        return newMap;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: message_id,
          role: "assistant",
          content: initialToken,
          isStreaming: true,
        },
      ]);
    };

    const streamingProgressHandler = (data) => {
      const { message_id, lastToken } = data;

      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        const currentContent = newMap.get(message_id) || "";
        newMap.set(message_id, currentContent + lastToken);
        return newMap;
      });
    };

    const messageCompleteHandler = (data) => {
      const { message_id, conversation_id, content } = data;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message_id
            ? {
                ...msg,
                content:
                  content ||
                  streamingRef.current.get(message_id) ||
                  msg.content,
                isStreaming: false,
              }
            : msg,
        ),
      );

      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(message_id);
        return newMap;
      });

      if (conversation_id) {
        setConversationId(conversation_id);
      }

      setIsLoading(false);
    };

    const feedbackReceivedHandler = (data) => {
      const { message_id, rating } = data;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === message_id ? { ...msg, feedback: rating } : msg,
        ),
      );
    };

    const errorHandler = (data) => {
      console.error("WebSocket error:", data.error || data.message);
      setIsLoading(false);

      if (streamingRef.current.size > 0) {
        setMessages((prev) => {
          const newMessages = [...prev];
          for (let i = 0; i < newMessages.length; i++) {
            if (newMessages[i].isStreaming) {
              newMessages[i] = {
                ...newMessages[i],
                isStreaming: false,
                content:
                  "Error: La conexión se perdió durante la generación de respuesta.",
              };
            }
          }
          return newMessages;
        });

        setPendingStreamingMessages(new Map());
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content:
            data.message ||
            "Error de conexión con el servidor. Intenta de nuevo.",
        },
      ]);
    };

    // Register all handlers
    const unsubscribeConnect = webSocketService.addMessageHandler(
      "connect",
      connectHandler,
    );
    const unsubscribeSystem = webSocketService.addMessageHandler(
      "system_message",
      systemMessageHandler,
    );
    const unsubscribeStreamingStart = webSocketService.addMessageHandler(
      "streaming_start",
      streamingStartHandler,
    );
    const unsubscribeStreamingProgress = webSocketService.addMessageHandler(
      "streaming_progress",
      streamingProgressHandler,
    );
    const unsubscribeComplete = webSocketService.addMessageHandler(
      "message_complete",
      messageCompleteHandler,
    );
    const unsubscribeFeedback = webSocketService.addMessageHandler(
      "feedback_received",
      feedbackReceivedHandler,
    );
    const unsubscribeError = webSocketService.addMessageHandler(
      "error",
      errorHandler,
    );
    const unsubscribeDisconnect = webSocketService.addMessageHandler(
      "disconnect",
      () => {
        setConnected(false);
        console.log("WebSocket disconnected");
      },
    );

    // Connect to WebSocket
    webSocketService.connect(conversationId);

    // Interval to update streaming messages
    const streamingUpdateInterval = setInterval(() => {
      setMessages((prev) => {
        if (streamingRef.current.size === 0) return prev;

        return prev.map((msg) => {
          if (msg.isStreaming && streamingRef.current.has(msg.id)) {
            return {
              ...msg,
              content: streamingRef.current.get(msg.id),
            };
          }
          return msg;
        });
      });
    }, 100);

    // Cleanup on unmount
    return () => {
      unsubscribeConnect();
      unsubscribeSystem();
      unsubscribeStreamingStart();
      unsubscribeStreamingProgress();
      unsubscribeComplete();
      unsubscribeFeedback();
      unsubscribeError();
      unsubscribeDisconnect();

      clearInterval(streamingUpdateInterval);

      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }
    };
  }, [isOpen, conversationId]);

  // Load conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data.conversations);
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  // Send message via WebSocket
  const sendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    if (!webSocketService.isConnected()) {
      webSocketService.connect(conversationId);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const sent = webSocketService.sendMessage(message);

    if (!sent) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Error al enviar mensaje: no hay conexión con el servidor.",
        },
      ]);
      setIsLoading(false);
    }
  };

  // Load existing conversation
  const loadConversation = async (id) => {
    setIsLoading(true);
    try {
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }

      setPendingStreamingMessages(new Map());

      const data = await getConversation(id);
      setMessages(data.messages);
      setConversationId(id);

      webSocketService.connect(id);
      setShowConversations(false);
    } catch (error) {
      console.error("Error loading conversation:", error);
      setMessages([
        {
          role: "system",
          content:
            "Error al cargar la conversación. Por favor, intenta nuevamente.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    if (webSocketService.isConnected()) {
      webSocketService.disconnect();
    }

    setPendingStreamingMessages(new Map());
    setConversationId(null);
    setMessages([]);
    webSocketService.connect();
    setShowConversations(false);
  };

  // Send feedback via WebSocket
  const sendFeedback = (messageId, rating) => {
    if (!webSocketService.isConnected()) {
      webSocketService.connect(conversationId);
      setTimeout(() => {
        webSocketService.sendFeedback(messageId, rating);
      }, 500);
    } else {
      webSocketService.sendFeedback(messageId, rating);
    }

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: rating } : msg,
      ),
    );
  };

  // Close chat window
  const closeChat = () => {
    if (webSocketService.isConnected()) {
      webSocketService.disconnect();
    }
    setIsOpen(false);
    setPendingStreamingMessages(new Map());
  };

  return {
    isOpen,
    setIsOpen: (open) => {
      if (open && !isOpen) {
        setIsOpen(true);
      } else if (!open && isOpen) {
        closeChat();
      }
    },
    messages,
    isLoading,
    conversationId,
    showConversations,
    setShowConversations,
    conversations,
    sendMessage,
    sendFeedback,
    loadConversation,
    startNewConversation,
    connected,
    isStreaming: pendingStreamingMessages.size > 0,
  };
}
