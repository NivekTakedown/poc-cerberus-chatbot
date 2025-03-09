import React, { useRef, useEffect } from "react";
import "./ChatHistory.css";
import MessageBubble from "../../molecules/MessageBubble";
import Spinner from "../../atoms/Spinner";

const ChatHistory = ({ messages, isLoading, onFeedback }) => {
  const historyEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  return (
    <div className="chat-history">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id || index}
          message={message}
          onFeedback={onFeedback}
        />
      ))}

      {isLoading && (
        <div className="loading-indicator">
          <Spinner size="small" />
          <span>Recuperando informacion...</span>
        </div>
      )}

      <div ref={historyEndRef}></div>
    </div>
  );
};

export default ChatHistory;
