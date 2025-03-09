import React, { useState, useEffect, useRef } from "react";
import { getConversations, getConversation } from "../../services/chatService";
import webSocketService from "../../services/webSocketService";
import ChatbotTemplate from "../../templates/ChatbotTemplate";

const CerberusChat = ({ apiUrl, position = "bottom-right" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Hola, soy Cerberus, tu asistente digital. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [conversationId, setConversationId] = useState(null);
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
        // This is a loading message
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

      // Add a placeholder message that will be updated with streaming content
      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.set(message_id, initialToken);
        return newMap;
      });

      // Add a new assistant message that will receive streaming updates
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

      // Update the streaming message buffer
      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        const currentContent = newMap.get(message_id) || "";
        newMap.set(message_id, currentContent + lastToken);
        return newMap;
      });
    };

    const messageCompleteHandler = (data) => {
      const { message_id, conversation_id, content } = data;

      // Update the message with the complete content
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

      // Remove from pending streaming messages
      setPendingStreamingMessages((prev) => {
        const newMap = new Map(prev);
        newMap.delete(message_id);
        return newMap;
      });

      // Update conversation ID if provided
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

      // If we have pending messages, cancel them
      if (streamingRef.current.size > 0) {
        // Convert pending messages to error messages
        setMessages((prev) => {
          const newMessages = [...prev];
          // Find and update streaming messages
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

        // Clear pending messages
        setPendingStreamingMessages(new Map());
      }

      // Add an error message
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
      (data) => {
        setConnected(false);
        console.log("WebSocket disconnected");
      },
    );

    // Connect to WebSocket
    webSocketService.connect(conversationId);

    // Interval to update streaming messages from the buffer
    const streamingUpdateInterval = setInterval(() => {
      // Update any streaming messages from the buffer
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
    }, 100); // Update UI every 100ms with accumulated tokens

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
  const handleSendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    // Add user message to the UI
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    // Ensure WebSocket is connected
    if (!webSocketService.isConnected()) {
      webSocketService.connect(conversationId);
      // Small delay to allow connection to establish
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Send the message
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
  const handleLoadConversation = async (id) => {
    setIsLoading(true);
    try {
      // Disconnect current WebSocket
      if (webSocketService.isConnected()) {
        webSocketService.disconnect();
      }

      // Clear streaming state
      setPendingStreamingMessages(new Map());

      const data = await getConversation(id);
      setMessages(data.messages);
      setConversationId(id);

      // Connect to new WebSocket for this conversation
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
  const handleStartNewConversation = () => {
    // Disconnect current WebSocket
    if (webSocketService.isConnected()) {
      webSocketService.disconnect();
    }

    // Clear streaming state
    setPendingStreamingMessages(new Map());

    setMessages([
      {
        role: "system",
        content:
          "Hola, soy Cerberus, tu asistente digital. ¿En qué puedo ayudarte hoy?",
      },
    ]);
    setConversationId(null);

    // Connect to new WebSocket without conversation ID
    webSocketService.connect();

    setShowConversations(false);
  };

  // Send feedback via WebSocket
  const handleFeedback = (messageId, rating) => {
    if (!webSocketService.isConnected()) {
      webSocketService.connect(conversationId);
      // Small delay to allow connection to establish
      setTimeout(() => {
        webSocketService.sendFeedback(messageId, rating);
      }, 500);
    } else {
      webSocketService.sendFeedback(messageId, rating);
    }

    // Optimistically update UI
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, feedback: rating } : msg,
      ),
    );
  };

  // Close chat window
  const handleCloseChat = () => {
    if (webSocketService.isConnected()) {
      webSocketService.disconnect();
    }
    setIsOpen(false);
    setPendingStreamingMessages(new Map());
  };

  return (
    <ChatbotTemplate
      isOpen={isOpen}
      setIsOpen={(open) => {
        if (open && !isOpen) {
          // If opening the chat
          setIsOpen(true);
        } else if (!open && isOpen) {
          // If closing the chat
          handleCloseChat();
        }
      }}
      messages={messages}
      isLoading={isLoading}
      conversationId={conversationId}
      showConversations={showConversations}
      setShowConversations={setShowConversations}
      conversations={conversations}
      handleSendMessage={handleSendMessage}
      handleFeedback={handleFeedback}
      handleLoadConversation={handleLoadConversation}
      handleStartNewConversation={handleStartNewConversation}
      position={position}
      connected={connected}
      streaming={pendingStreamingMessages.size > 0}
    />
  );
};

export default CerberusChat;
