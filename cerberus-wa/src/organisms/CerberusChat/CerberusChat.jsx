import React from "react";
import useChatLogic from "../../hooks/useChatLogic";
import ChatbotTemplate from "../../templates/ChatbotTemplate";

const CerberusChat = ({ apiUrl, position = "bottom-right" }) => {
  const chatLogic = useChatLogic();

  return (
    <ChatbotTemplate
      isOpen={chatLogic.isOpen}
      setIsOpen={chatLogic.setIsOpen}
      messages={chatLogic.messages}
      isLoading={chatLogic.isLoading}
      conversationId={chatLogic.conversationId}
      showConversations={chatLogic.showConversations}
      setShowConversations={chatLogic.setShowConversations}
      conversations={chatLogic.conversations}
      handleSendMessage={chatLogic.sendMessage}
      handleFeedback={chatLogic.sendFeedback}
      handleLoadConversation={chatLogic.loadConversation}
      handleStartNewConversation={chatLogic.startNewConversation}
      position={position}
      connected={chatLogic.connected}
      streaming={chatLogic.isStreaming}
    />
  );
};

export default CerberusChat;
