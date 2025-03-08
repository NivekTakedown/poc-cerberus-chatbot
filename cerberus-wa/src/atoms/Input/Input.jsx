import React from "react";
import "./Input.css";

const Input = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  type = "text",
  className = "",
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`input ${className}`}
    />
  );
};

export default Input;
