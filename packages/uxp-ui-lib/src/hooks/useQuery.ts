import { useLocation } from "react-router-dom";
export const QUERY_PARAMS_PRINT_VIEW="printView";
export const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};
