import React from 'react';

export const SANITIZE_TABS_PROPS=["fullWidth", "indicator", "selected", "selectionFollowsFocus", "onChange", "textColor", "value", "tabIndex"]
type SanitizedPropsProps = {
  keys: string[];
  children: React.ReactElement;
} & Record<string, unknown>;

export const SanitizedProps: React.FC<SanitizedPropsProps> = ({
  keys,
  children,
  ...rest
}) => {
  const sanitized = { ...rest };

  for (const key of keys) {
    delete sanitized[key];
  }

  return React.cloneElement(children, sanitized);
};
