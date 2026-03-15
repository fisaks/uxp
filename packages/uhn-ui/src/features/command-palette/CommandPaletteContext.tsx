import { createContext, useContext } from "react";

const CommandPaletteContext = createContext<() => void>(() => {});

export const CommandPaletteProvider = CommandPaletteContext.Provider;

/** Returns a function to open the command palette dialog. */
export const useOpenCommandPalette = () => useContext(CommandPaletteContext);
