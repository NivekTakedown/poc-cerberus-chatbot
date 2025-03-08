import React from "react";
import "./ConversationsList.css";
import Button from "../../atoms/Button";
import Icon from "../../atoms/Icon";

const ConversationsList = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
}) => {
  return (
    <div className="conversations-container">
      <Button onClick={onNewConversation} className="new-conversation-button">
        <Icon name="add" />
        Nueva conversación
      </Button>

      {conversations.length > 0 ? (
        <ul className="conversations-list">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <Button
                onClick={() => onSelectConversation(conv.id)}
                className={`conversation-button ${activeConversationId === conv.id ? "active" : ""}`}
                variant="secondary"
              >
                Conversación del {new Date(conv.created_at).toLocaleString()}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-conversations">No hay conversaciones previas</p>
      )}
    </div>
  );
};

export default ConversationsList;
