// Parsed IHC project types

/** A location group from the IHC project XML. */
export type IHCGroup = {
    id: string;
    name: string;
    products: IHCProduct[];
};

/** A product (physical device module) within a group. */
export type IHCProduct = {
    id: string;
    productIdentifier: number; // hex product ID (e.g. 0x2202)
    name: string;
    position: string;
    note: string;
    documentationTag: string;
    type: "dataline" | "airlink";
    ios: IHCIOElement[];
};

/** An I/O element within a product. */
export type IHCIOElement = {
    id: number; // hex resource ID (e.g. 0x9C5B)
    elementType: IHCIOElementType;
    name: string;
    note: string;
    /** For dataline_output — "led" outputs should be skipped. */
    outputType?: string;
    /** For resource_temperature — "read" means read-only. */
    accessibility?: string;
};

export type IHCIOElementType =
    | "dataline_input"
    | "dataline_output"
    | "airlink_input"
    | "airlink_relay"
    | "airlink_dimming"
    | "airlink_dimmer_increase"
    | "airlink_dimmer_decrease"
    | "resource_temperature";

/** UHN resource type mapped from IHC I/O element. */
export type UHNResourceType = "digitalInput" | "digitalOutput" | "analogInput" | "analogOutput";

/** A resolved IHC resource ready for code generation. */
export type IHCResource = {
    varName: string;
    pin: number; // hex resource ID
    uhnType: UHNResourceType;
    description: string;
    ioElementType: IHCIOElementType;
    productIdentifier: number;
    /** For dataline_output — "led" for indicator LEDs on button panels. */
    outputType?: string;
};

/** Parsed IHC project — groups with products and I/O elements. */
export type IHCProject = {
    groups: IHCGroup[];
};

export type IHCImportOptions = {
    file?: string;
    host?: string;
    port: number;
    username?: string;
    password?: string;
    controller: string;
    edge: string;
    outputDir: string;
    force?: boolean;
    autoExport?: boolean;
    mappingOnly?: boolean;
};
