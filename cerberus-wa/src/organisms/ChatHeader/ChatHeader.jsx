import React from "react";
import "./ChatHeader.css";
import Button from "../../atoms/Button";
import Icon from "../../atoms/Icon";

const ChatHeader = ({
  title,
  onClose,
  onToggleConversations,
  showHistoryButton,
  showingConversations,
}) => {
  return (
    <div className="chat-header">
      <div className="chat-title">
        <h3>{title}</h3>
        {showHistoryButton && (
          <Button
            onClick={onToggleConversations}
            className="history-button"
            variant="secondary"
          >
            {showingConversations ? "Volver al chat" : "Ver historial"}
          </Button>
        )}
      </div>
      <Button
        onClick={onClose}
        ariaLabel="Cerrar chat"
        variant="icon"
        className="close-button"
      >
        <Icon name="close" />
      </Button>
    </div>
  );
};

export default ChatHeader;
