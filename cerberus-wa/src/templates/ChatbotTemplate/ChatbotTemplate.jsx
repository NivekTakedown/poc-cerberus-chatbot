import React from "react";
import "./ChatbotTemplate.css";
import Button from "../../atoms/Button";
import Icon from "../../atoms/Icon";
import ChatHeader from "../../organisms/ChatHeader";
import ChatHistory from "../../organisms/ChatHistory";
import ChatInput from "../../molecules/ChatInput";
import ConversationsList from "../../organisms/ConversationsList";

const ChatbotTemplate = ({
  isOpen,
  setIsOpen,
  messages,
  isLoading,
  conversationId,
  showConversations,
  setShowConversations,
  conversations,
  handleSendMessage,
  handleFeedback,
  handleLoadConversation,
  handleStartNewConversation,
  position = "bottom-right",
  connected = false,
  streaming = false,
}) => {
  const positionClass = `chatbot-position-${position}`;

  if (!isOpen) {
    return (
      <div className={`chatbot-container ${positionClass}`}>
        <Button
          onClick={() => setIsOpen(true)}
          ariaLabel="Abrir chat"
          className="chatbot-button"
          variant="rounded"
        >
          <Icon name="chat" />
        </Button>
      </div>
    );
  }

  // Eliminado el texto de "(Conectado)" dejando solo el indicador visual
  return (
    <div className={`chatbot-container ${positionClass}`}>
      <div className="chatbot-window">
        <ChatHeader
          title="Cerberus Chatbot"
          onClose={() => setIsOpen(false)}
          onToggleConversations={() => setShowConversations(!showConversations)}
          showHistoryButton={!!conversationId}
          showingConversations={showConversations}
          connected={connected}
          streaming={streaming}
        />

        {showConversations ? (
          <ConversationsList
            conversations={conversations}
            activeConversationId={conversationId}
            onSelectConversation={handleLoadConversation}
            onNewConversation={handleStartNewConversation}
          />
        ) : (
          <>
            <ChatHistory
              messages={messages}
              isLoading={isLoading}
              onFeedback={handleFeedback}
            />
            <ChatInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              disabled={!connected && !isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatbotTemplate;
