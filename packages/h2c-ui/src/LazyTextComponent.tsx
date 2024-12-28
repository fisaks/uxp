import React from "react";
import * as styles from "./LazyTextComponent.module.css";
const LazyTextComponent: React.FC = () => {
    return <div className={styles.text}>This is a lazily loaded component!</div>;
};

export default LazyTextComponent;
