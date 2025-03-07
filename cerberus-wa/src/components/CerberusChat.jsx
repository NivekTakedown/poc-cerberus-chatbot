import React, { useState, useEffect } from "react";
import "./CerberusChat.css";

const CerberusChat = ({
  apiUrl = "http://localhost:8000/chatbot/api",
  position = "bottom-left",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Hola, soy Cerberus, tu asistente digital. ¿En qué puedo ayudarte hoy?",
    },
  ]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConversations, setShowConversations] = useState(false);
  const [conversations, setConversations] = useState([]);

  // Cargar conversaciones existentes
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch(`${apiUrl}/conversations/`);
        const data = await response.json();
        setConversations(data.conversations);
      } catch (error) {
        console.error("Error cargando conversaciones:", error);
      }
    };

    fetchConversations();
  }, [apiUrl]);

  // Función para enviar mensaje
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Agregar mensaje del usuario a la interfaz
    const userMessage = { role: "user", content: input };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Enviar mensaje a la API
      const response = await fetch(`${apiUrl}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: input,
          conversation_id: conversationId,
        }),
      });

      const data = await response.json();

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
  const loadConversation = async (id) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/conversations/${id}/`);
      const data = await response.json();
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
  const startNewConversation = () => {
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
  const provideFeedback = async (messageId, rating) => {
    try {
      await fetch(`${apiUrl}/feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: messageId,
          rating,
        }),
      });

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

  // Renderizar posiciones según prop
  const positionClass =
    position === "bottom-right"
      ? "cerberus-bottom-right"
      : "cerberus-bottom-left";

  return (
    <div className={`cerberus-chatbot ${positionClass}`}>
      {!isOpen ? (
        <button
          className="cerberus-chat-button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir chat"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
            <path d="M20,2H4C2.9,2 2,2.9 2,4V22L6,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H5.17L4,17.17V4H20V16Z" />
          </svg>
        </button>
      ) : (
        <div className="cerberus-chat-window">
          <div className="cerberus-header">
            <div className="cerberus-title">
              <h3>Cerberus Chatbot</h3>
              {conversationId && (
                <button
                  className="cerberus-history-button"
                  onClick={() => setShowConversations(!showConversations)}
                >
                  {showConversations ? "Volver al chat" : "Ver historial"}
                </button>
              )}
            </div>
            <button
              className="cerberus-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="currentColor"
              >
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          </div>

          {showConversations ? (
            <div className="cerberus-conversations-container">
              <button
                className="cerberus-new-conversation-button"
                onClick={startNewConversation}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                >
                  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                </svg>
                Nueva conversación
              </button>

              {conversations.length > 0 ? (
                <ul className="cerberus-conversations-list">
                  {conversations.map((conv) => (
                    <li key={conv.id}>
                      <button
                        className={`cerberus-conversation-button ${conversationId === conv.id ? "active" : ""}`}
                        onClick={() => loadConversation(conv.id)}
                      >
                        Conversación del{" "}
                        {new Date(conv.created_at).toLocaleString()}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="cerberus-no-conversations">
                  No hay conversaciones previas
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="cerberus-chat-history">
                {messages.map((msg, index) => (
                  <div key={index} className="cerberus-message-container">
                    <div className={`cerberus-message cerberus-${msg.role}`}>
                      {msg.content}
                    </div>

                    {msg.role === "assistant" && msg.id && (
                      <div className="cerberus-feedback">
                        {msg.feedback ? (
                          <div className="cerberus-rating-display">
                            Valoración:{" "}
                            {Array(msg.feedback).fill("⭐").join("")}
                          </div>
                        ) : (
                          <div className="cerberus-rating-buttons">
                            <span>¿Fue útil?</span>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                onClick={() => provideFeedback(msg.id, rating)}
                                aria-label={`Calificar ${rating} de 5 estrellas`}
                              >
                                ⭐
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="cerberus-loading">
                    <div className="cerberus-spinner"></div>
                    <span>Procesando mensaje...</span>
                  </div>
                )}

                <div
                  ref={(el) => {
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                ></div>
              </div>

              <form
                className="cerberus-input-container"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  aria-label="Enviar mensaje"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="currentColor"
                  >
                    <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CerberusChat;
