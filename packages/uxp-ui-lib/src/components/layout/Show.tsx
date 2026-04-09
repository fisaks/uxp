import React from "react";

type ShowProps = {
    /** Condition — children render only when truthy */
    when: unknown;
    children: React.ReactNode;
};

/** Conditional render wrapper. More readable than `{condition && (<long JSX>)}` in templates. */
export const Show: React.FC<ShowProps> = ({ when, children }) => {
    if (!when) return null;
    return <>{children}</>;
};
