import React from "react";
import "./Button.css";

const Button = ({
  children,
  onClick,
  disabled = false,
  type = "button",
  variant = "primary",
  className = "",
  ariaLabel,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`button button-${variant} ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export default Button;
