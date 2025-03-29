export const UXP_DEVICE_ID = "uxp-device-id";
export const useUxpDeviceId = () => {
    let id = localStorage.getItem(UXP_DEVICE_ID);
    if (!id) {
        id = crypto.randomUUID(); // or nanoid
        localStorage.setItem(UXP_DEVICE_ID, id);
    }

    return id!;
}