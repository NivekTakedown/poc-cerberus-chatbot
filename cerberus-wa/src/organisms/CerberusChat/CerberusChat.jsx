import React, { useState, useEffect } from "react";
import {
  sendChatMessage,
  getConversations,
  getConversation,
  provideFeedback,
} from "../../services/chatService";
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

  // Cargar conversaciones existentes
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const data = await getConversations();
        setConversations(data.conversations);
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
      }
    };

    fetchConversations();
  }, []);

  // Función para enviar mensaje
  const handleSendMessage = async (message) => {
    if (!message.trim() || isLoading) return;

    // Agregar mensaje del usuario a la interfaz
    const userMessage = { role: "user", content: message };
    setMessages([...messages, userMessage]);
    setIsLoading(true);

    try {
      // Enviar mensaje a la API
      const data = await sendChatMessage(message, conversationId);

      // Agregar respuesta del asistente
      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: data.fallback_response || data.error,
          },
        ]);
      } else {
        setConversationId(data.conversation_id);
        setMessages((prev) => [
          ...prev,
          {
            id: data.id,
            role: "assistant",
            content: data.response,
          },
        ]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "system",
          content: "Lo siento, ha ocurrido un error al procesar tu consulta.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cargar una conversación existente
  const handleLoadConversation = async (id) => {
    setIsLoading(true);
    try {
      const data = await getConversation(id);
      setMessages(data.messages);
      setConversationId(id);
      setShowConversations(false);
    } catch (error) {
      console.error("Error cargando conversación:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para nueva conversación
  const handleStartNewConversation = () => {
    setMessages([
      {
        role: "system",
        content:
          "Hola, soy Cerberus, tu asistente digital. ¿En qué puedo ayudarte hoy?",
      },
    ]);
    setConversationId(null);
    setShowConversations(false);
  };

  // Función para enviar feedback
  const handleFeedback = async (messageId, rating) => {
    try {
      await provideFeedback(messageId, rating);

      // Actualizar mensaje con feedback
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, feedback: rating } : msg,
        ),
      );
    } catch (error) {
      console.error("Error enviando feedback:", error);
    }
  };

  return (
    <ChatbotTemplate
      isOpen={isOpen}
      setIsOpen={setIsOpen}
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
    />
  );
};

export default CerberusChat;
