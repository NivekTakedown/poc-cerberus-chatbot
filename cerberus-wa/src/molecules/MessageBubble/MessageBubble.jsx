import React from "react";
import "./MessageBubble.css";
import Button from "../../atoms/Button";

const MessageBubble = ({ message, onFeedback }) => {
  const { id, role, content, feedback } = message;

  return (
    <div className="message-container">
      <div className={`message message-${role}`}>{content}</div>

      {role === "assistant" && id && (
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
