import React from "react";
import "./ChatHeader.css";
import Button from "../../atoms/Button";
import Icon from "../../atoms/Icon";
import Spinner from "../../atoms/Spinner";

const ChatHeader = ({
  title,
  onClose,
  onToggleConversations,
  showHistoryButton,
  showingConversations,
  connected = false,
  streaming = false,
}) => {
  let statusClass = "disconnected";
  if (connected) {
    statusClass = streaming ? "streaming" : "connected";
  }

  return (
    <div className={`chat-header ${statusClass}`}>
      <div className="chat-title">
        <h3>{title}</h3>
        {streaming && <Spinner size="small" className="header-spinner" />}
        <div className={`connection-indicator ${statusClass}`}></div>
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
