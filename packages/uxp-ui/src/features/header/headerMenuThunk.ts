import { MenuItemResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const fetchMenuItems = createLoadingAwareThunk("header/fetchMenuItems", async (_) => {
    const response = await axiosInstance.get<MenuItemResponse>("/menu-items");
    return response.data;
});
