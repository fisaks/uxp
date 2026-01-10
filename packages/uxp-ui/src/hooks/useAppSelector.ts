import { useSelector, TypedUseSelectorHook } from "react-redux";
import type { RootState } from "../app/uxp.store";

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
