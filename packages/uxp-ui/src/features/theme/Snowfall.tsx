import React from "react";
import * as styles from "./Snowfall.module.css";

const Snowfall: React.FC = () => {
  return (
    <>
      {[...Array(20)].map((_, i) => {
        const duration = 6 + Math.random() * 6;
        const left = Math.random() * 100;
        const delay = Math.random() * -20;
        return (
          <div
            key={i}
            className={styles.snowflake}
            style={{
              left: `${left}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          >
            ❄️
          </div>
        );
      })}
    </>
  );
};

export default Snowfall;
