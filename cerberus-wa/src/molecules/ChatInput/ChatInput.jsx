import React, { useState } from "react";
import "./ChatInput.css";
import Button from "../../atoms/Button";
import Input from "../../atoms/Input";
import Icon from "../../atoms/Icon";

const ChatInput = ({ onSendMessage, isLoading, disabled = false }) => {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <form className="chat-input-container" onSubmit={handleSubmit}>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          disabled
            ? "Conexión perdida. Reconectando..."
            : "Escribe tu mensaje aquí..."
        }
        disabled={isLoading || disabled}
      />
      <Button
        type="submit"
        disabled={!input.trim() || isLoading || disabled}
        ariaLabel="Enviar mensaje"
        variant="icon"
      >
        <Icon name="send" />
      </Button>
    </form>
  );
};

export default ChatInput;
