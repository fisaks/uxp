/**
 * Converts a Z2M device friendly name to a camelCase variable prefix.
 * kitchen_temperature_display → kitchenTemperatureDisplay
 * entrance-wardrobe → entranceWardrobe
 * my device 1 → myDevice1
 */
export function deviceToVarPrefix(friendlyName: string): string {
    return friendlyName
        .replace(/[^a-zA-Z0-9]+(\w)/g, (_, c) => c.toUpperCase()) // non-alnum + next char → uppercase
        .replace(/[^a-zA-Z0-9]/g, "") // remove remaining non-alnum
        .replace(/^(\d)/, "_$1"); // prefix with _ if starts with digit
}

/**
 * Converts a Z2M property name to a PascalCase variable suffix.
 * temperature → Temperature
 * overload_protection.enable → OverloadProtectionEnable
 */
export function propertyToVarSuffix(pin: string): string {
    return pin
        .replace(/[^a-zA-Z0-9]+(\w)/g, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^(\w)/, (_, c) => c.toUpperCase());
}

/**
 * Generates a full resource variable name from device prefix + property.
 * (kitchenTemperatureDisplay, temperature) → kitchenTemperatureDisplayTemperature
 */
export function resourceVarName(devicePrefix: string, pin: string): string {
    return devicePrefix + propertyToVarSuffix(pin);
}

/**
 * Converts a device friendly name to a kebab-case file name.
 * kitchen_temperature_display → kitchen-temperature-display-zigbee
 */
export function deviceToFileName(friendlyName: string): string {
    return `${friendlyName.replace(/_/g, "-")}-zigbee`;
}

export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
