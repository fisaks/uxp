export const UXP_DEVICE_ID = "uxp-device-id";
export const useUxpDeviceId = () => {
    return localStorage.getItem(UXP_DEVICE_ID);
}