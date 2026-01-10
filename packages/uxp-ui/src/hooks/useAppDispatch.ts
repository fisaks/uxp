import { useDispatch } from "react-redux";
import type { AppDispatch } from "../app/uxp.store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
