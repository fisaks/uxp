import React from "react";

export interface ButtonProps {
  label: string;
  onClick: () => void;
}

const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button onClick={onClick} style={{ padding: "10px", backgroundColor: "#007bff", color: "#fff" }}>
      {label}
    </button>
  );
};

export default Button;
