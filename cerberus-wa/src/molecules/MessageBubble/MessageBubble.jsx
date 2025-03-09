import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import "./MessageBubble.css";
import Button from "../../atoms/Button";
import Spinner from "../../atoms/Spinner";

const MessageBubble = ({ message, onFeedback }) => {
  const { id, role, content, feedback, isStreaming } = message;

  return (
    <div className="message-container">
      <div
        className={`message message-${role} ${isStreaming ? "message-streaming" : ""}`}
      >
        {role === "assistant" ? (
          <>
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="streaming-indicator">
                <Spinner size="small" />
              </span>
            )}
          </>
        ) : (
          content
        )}
      </div>

      {role === "assistant" && id && !isStreaming && (
        <div className="message-feedback">
          {feedback ? (
            <div className="rating-display">
              Valoración: {Array(feedback).fill("⭐").join("")}
            </div>
          ) : (
            <div className="rating-buttons">
              <span>¿Fue útil?</span>
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  onClick={() => onFeedback(id, rating)}
                  ariaLabel={`Calificar ${rating} de 5 estrellas`}
                  variant="icon"
                  className="rating-button"
                >
                  ⭐
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
