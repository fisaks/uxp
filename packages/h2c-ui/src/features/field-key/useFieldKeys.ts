import { FieldKeyType } from "@h2c/common";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../app/store";
import { selectFieldKeyTypes } from "./fieldKeySelectors";
import { fetchFieldsByType } from "./fieldKeyThunk";


export function useFieldKeys(type: FieldKeyType) {
  const dispatch = useDispatch<AppDispatch>();
  const keys = useSelector(selectFieldKeyTypes);

  useEffect(() => {
    if (!keys[type]) {
      dispatch(fetchFieldsByType(type));
    }
  }, [type, keys, dispatch]);

  return keys[type] ?? [];
}
