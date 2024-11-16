import React from "react";
import { Button } from "@uxp/ui-presenter";

const UxpApp: React.FC = () => {
  return (
    <div>
      <p>hello world!</p>;
      <Button
        label="my button"
        onClick={() => {
          console.log("On click");
        }}
      ></Button>
    </div>
  );
};

export default UxpApp;
