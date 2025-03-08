import React from "react";
import "./Spinner.css";

const Spinner = ({ size = "medium", className = "" }) => {
  const sizeMap = {
    small: "spinner-small",
    medium: "spinner-medium",
    large: "spinner-large",
  };

  return <div className={`spinner ${sizeMap[size]} ${className}`}></div>;
};

export default Spinner;
