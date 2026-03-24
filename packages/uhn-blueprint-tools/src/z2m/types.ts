// Z2M expose structure from bridge/devices
export type Z2MExpose = {
    type: string;
    name?: string;
    property?: string;
    access?: number;
    category?: string; // "config", "diagnostic", or undefined (normal)
    values?: string[];
    features?: Z2MExpose[];
    unit?: string;
    description?: string;
    label?: string;
    value_min?: number;
    value_max?: number;
    value_step?: number;
    value_on?: string;
    value_off?: string;
    presets?: { name: string; value: number }[];
};

export type Z2MDevice = {
    friendly_name: string;
    ieee_address: string;
    type: string;
    definition?: {
        description?: string;
        exposes?: Z2MExpose[];
    };
};

// Parsed UHN property from Z2M expose
export type UHNResourceType = "digitalOutput" | "digitalInput" | "analogOutput" | "analogInput" | "actionInput";

export type UHNProperty = {
    pin: string;
    uhnType: UHNResourceType;
    unit?: string;
    description?: string;
    label: string;
    min?: number;
    max?: number;
    step?: number;
    access: number; // Z2M access bitmask: 1=readable, 2=writable, 4=publishable
    category?: string; // Z2M category: "config", "diagnostic", or undefined (normal)
    writable: boolean;
    isOnOff: boolean;
    presets?: { name: string; value: number }[];
    /** Action values for actionInput resources (e.g. ["toggle", "brightness_up_click"]) */
    actionValues?: string[];
};

export type ParsedDevice = {
    friendlyName: string;
    description?: string;
    properties: UHNProperty[];
};
