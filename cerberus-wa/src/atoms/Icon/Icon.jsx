import React from "react";
import "./Icon.css";

// SVG Icons
export const icons = {
  chat: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M20,2H4C2.9,2 2,2.9 2,4V22L6,18H20C21.1,18 22,17.1 22,16V4C22,2.9 21.1,2 20,2M20,16H5.17L4,17.17V4H20V16Z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
    </svg>
  ),
};

const Icon = ({ name, size = "24px", className = "" }) => {
  return (
    <span className={`icon ${className}`} style={{ width: size, height: size }}>
      {icons[name] || null}
    </span>
  );
};

export default Icon;
