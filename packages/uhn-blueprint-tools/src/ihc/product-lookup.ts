/**
 * Hardcoded product catalog built from ihc-products/ .def files.
 * Maps product_identifier → English name and category.
 */

type ProductInfo = {
    name: string;
    category: "input" | "output" | "dimmer" | "combo" | "special" | "unknown";
};

// Product IDs from the .def file names (product_identifier values).
// Names extracted from the .def file <product_dataline/airlink> name attributes.
const PRODUCT_CATALOG: Record<number, ProductInfo> = {
    // Dataline inputs (01#Input)
    0x2101: { name: "Push button 2-way", category: "input" },
    0x2102: { name: "Push button 2-way (alt)", category: "input" },
    0x2103: { name: "Push button 2-way with LED", category: "input" },
    0x2104: { name: "Push button 4-way", category: "input" },
    0x2105: { name: "Push button 4-way with 2 LED", category: "input" },
    0x2106: { name: "Push button 4-way with LED", category: "input" },
    0x2107: { name: "Push button 6-way with 3 LED", category: "input" },
    0x2108: { name: "Status button 4-way with 4 LED", category: "input" },
    0x2109: { name: "Door contact", category: "input" },
    0x210a: { name: "Smoke sensor", category: "input" },
    0x210b: { name: "Push button 6-way", category: "input" },
    0x210c: { name: "Push button 8-way", category: "input" },
    0x210d: { name: "IR remote 16-ch", category: "input" },
    0x210e: { name: "PIR sensor", category: "input" },
    0x210f: { name: "PIR alarm", category: "input" },
    0x2110: { name: "Twilight sensor", category: "input" },
    0x2111: { name: "Window contact", category: "input" },
    0x2112: { name: "Tamper circuit", category: "input" },
    0x2113: { name: "Doorbell button", category: "input" },
    0x2114: { name: "Key card switch", category: "input" },
    0x2115: { name: "Backup module", category: "special" },
    0x211b: { name: "Push button 2-way with 2 LED", category: "input" },
    0x211f: { name: "Binary input generic", category: "input" },
    0x2120: { name: "PIR single input", category: "input" },
    0x2122: { name: "Temperature sensor (floor)", category: "input" },
    0x2124: { name: "Temperature sensor", category: "input" },
    0x2130: { name: "Rain sensor", category: "input" },
    0x2131: { name: "CO2 sensor", category: "input" },
    0x2132: { name: "Humidity sensor", category: "input" },
    0x2135: { name: "Humidity/Temperature sensor", category: "input" },
    0x2136: { name: "Lux sensor", category: "input" },

    // Dataline outputs (02#Output)
    0x2201: { name: "Socket", category: "output" },
    0x2202: { name: "Light", category: "output" },
    0x2203: { name: "Alarm sounder internal", category: "output" },
    0x2204: { name: "Alarm sounder external", category: "output" },
    0x2205: { name: "Output module 8-ch", category: "output" },
    0x2206: { name: "Output 2-ch (alt)", category: "output" },
    0x2207: { name: "Output 4-ch (alt)", category: "output" },
    0x2208: { name: "Relay module", category: "output" },
    0x2209: { name: "Doorbell", category: "output" },
    0x220a: { name: "Shutter controller", category: "output" },
    0x220b: { name: "Output 2-ch relay", category: "output" },
    0x220c: { name: "Output 4-ch relay", category: "output" },
    0x220d: { name: "Output module 16-ch", category: "output" },
    0x220e: { name: "Output generic", category: "output" },
    0x220f: { name: "Floor heating", category: "output" },
    0x2210: { name: "Floor heating (alt)", category: "output" },

    // Dataline dimmers (03#Dimmer)
    0x2301: { name: "UniDimmer touch", category: "dimmer" },
    0x2302: { name: "Dimmer DIN 2-button 2-memory", category: "dimmer" },
    0x2303: { name: "UniDimmer 1000W", category: "dimmer" },
    0x2304: { name: "Dimmer module DIN", category: "dimmer" },
    0x2305: { name: "DALI dimmer", category: "dimmer" },

    // LED outputs (special)
    0x2701: { name: "Water/glass sensor", category: "input" },
    0x2702: { name: "Relay output generic", category: "output" },
    0x2703: { name: "Relay output 2-ch", category: "output" },
    0x2704: { name: "Controller link output", category: "special" },
    0x2705: { name: "Controller link input", category: "special" },

    // Special/system
    0x3101: { name: "System module", category: "special" },
    0x3103: { name: "System module (alt)", category: "special" },

    // Wireless inputs (01#Input)
    0x4101: { name: "Wireless button 2-way", category: "input" },
    0x4102: { name: "Wireless button 4-way", category: "input" },
    0x4103: { name: "Wireless button 6-way", category: "input" },
    0x4104: { name: "Wireless remote", category: "input" },
    0x4105: { name: "Wireless push button (alt)", category: "input" },
    0x4106: { name: "Wireless push button 6-way", category: "input" },

    // Wireless outputs (02#Output)
    0x4201: { name: "Wireless relay 1-ch", category: "output" },
    0x4202: { name: "Wireless relay 2-ch", category: "output" },
    0x4203: { name: "Wireless blind/relay", category: "output" },
    0x4204: { name: "Wireless outlet", category: "output" },
    0x4205: { name: "Wireless relay 4-ch", category: "output" },

    // Wireless dimmers (03#Dimmer)
    0x4303: { name: "Wireless dimmer 1-ch", category: "dimmer" },
    0x4304: { name: "Wireless dimmer 2-ch", category: "dimmer" },
    0x4306: { name: "Wireless blind/dimmer", category: "dimmer" },

    // Wireless combos (04#Kombi)
    0x4404: { name: "Wireless combo relay 4-ch", category: "combo" },
    0x4406: { name: "Wireless combo dimmer 4-ch", category: "combo" },
    0x4407: { name: "Wireless combo (alt)", category: "combo" },
    0x4408: { name: "Wireless combo relay 2-ch", category: "combo" },

    // Wireless shutters (05#Jalousi)
    0x4501: { name: "Wireless shutter controller", category: "special" },
    0x4502: { name: "Wireless shutter controller (alt)", category: "special" },

    // Special wireless
    0x4801: { name: "Wireless 1-10V converter", category: "special" },
};

/** Looks up a product by its hex identifier. Returns product info or undefined. */
export function lookupProduct(productIdentifier: number): ProductInfo | undefined {
    return PRODUCT_CATALOG[productIdentifier];
}

/** Returns a readable product name, or a fallback hex string for unknown products. */
export function productName(productIdentifier: number): string {
    const info = PRODUCT_CATALOG[productIdentifier];
    if (info) return info.name;
    return `unknown-0x${productIdentifier.toString(16)}`;
}

/** Returns the product category, or "unknown" for unrecognized products. */
export function productCategory(productIdentifier: number): ProductInfo["category"] {
    return PRODUCT_CATALOG[productIdentifier]?.category ?? "unknown";
}
