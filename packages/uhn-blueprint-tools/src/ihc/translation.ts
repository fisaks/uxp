import fs from "fs";
import path from "path";

const IHC_DIR = ".ihc";
const OVERRIDES_FILE = "translation-overrides.json";

// Location translations (Swedish → English)
// These are user-defined names in IHC Visual, typically in Swedish.
const locationTranslations: Record<string, string> = {
    // Standard Swedish room names (generic IHC vocabulary)
    "Förråd": "storage",
    "Hjälpkök": "laundry-room",
    "Torkrum": "drying-room",
    "Omklädningsrum": "changing-room",
    "Sovrum": "bedroom",
    "Tambur": "entrance",
    "Pannrum": "boiler-room",
    "Utomhus": "outdoor",
    "Biltak": "carport",
    "Garderob": "wardrobe",
    "Klädrum": "dressing-room",
    "Hall": "hall",
    "Alarm": "alarm",
    "Övrigt": "misc",
    "Kök": "kitchen",
    "Vardagsrum": "living-room",
    "Matplats": "dining-area",
    "Toalett": "toilet",
    "WC": "toilet",
    "Badrum": "bathroom",
    "Tvättstuga": "laundry",
    "Teknikrum": "utility-room",
    "Arbetsrum": "study",
    "Lekrum": "playroom",
    "Entré": "entrance",
    "Balkong": "balcony",
    "Terrass": "terrace",
    "Trappa": "stairs",
    "Korridor": "corridor",
    "Gästrum": "guest-room",
    "Gym": "gym",
    "Vind": "attic",
    "Vinden": "attic",
    "Källare": "basement",
    "Garage": "garage",
    "Altan": "patio",
    "Uterum": "conservatory",
    "Bastu": "sauna",
    "Groventré": "mudroom",
    "Kontor": "office",
    "Hembio": "home-cinema",
};

// I/O and product translations (Danish/Swedish → English)
// These come from IHC system strings and product .def files.
const ioTranslations: Record<string, string> = {
    // --- IO element names (Danish/Swedish, from IHC system) ---

    // Output/input labels
    "Stikkontakt": "outlet",
    "Lampeudtag": "light",
    "Udgang": "output",
    "Udgång": "output",
    "Utgång": "output",
    "Indgang": "input",
    "Indgang (NC)": "input-nc",
    "Ingång": "input",
    "Lampe": "light",
    "Forsyning": "supply",

    // Presence/motion
    "Tilstedeværelses indikering": "presence-detection",
    "Närvarodetektering": "presence-detection",
    "Skumring": "twilight",
    "Skymning": "twilight",

    // Buttons (Danish, from .def files)
    "Tryk": "button",
    "Tryk (højre)": "button-right",
    "Tryk (venstre)": "button-left",
    "Tryk (øverst højre)": "button-upper-right",
    "Tryk (øverst venstre)": "button-upper-left",
    "Tryk (nederst højre)": "button-lower-right",
    "Tryk (nederst venstre)": "button-lower-left",
    "Tryk (midt højre)": "button-mid-right",
    "Tryk (midt venstre)": "button-mid-left",

    // Dimmer controls
    "Lys niveau": "light-level",
    "Belysningsnivå": "light-level",
    "Tænd / regulér op": "increase",
    "Till / öka": "increase",
    "Sluk / regulér ned": "decrease",
    "Från / minska": "decrease",
    "Lys indikering": "light-indication",
    "Minne 1": "preset-1",
    "Minne 2": "preset-2",

    // Temperature
    "Rumstemperatur": "room-temperature",
    "Rumtemperatur": "room-temperature",
    "Golvtemperatur": "floor-temperature",
    "Gulvtemperatur": "floor-temperature",
    "Temperatur": "temperature",
    "Setpunkttemperatur": "setpoint-temperature",
    "Setpunktstemperatur": "setpoint-temperature",
    "Temperatursensor datalinje": "temperature-sensor-dataline",

    // Floor heating setpoints
    "Börvärde Hemläge.": "setpoint-home",
    "Börvärde sovläge.": "setpoint-sleep",
    "Börvärde uteläge.": "setpoint-away",
    "Börvärde semesterläge.": "setpoint-vacation",
    "Börvärde aktuellt rum": "setpoint-room-active",
    "Börvärde aktuellt golv": "setpoint-floor-active",
    "Rumstemperatur + hysteres": "room-temp-hysteresis",
    "Golvtemperatur + hysteres": "floor-temp-hysteresis",
    "Golvhysteres": "floor-hysteresis",
    "Rumshysteres": "room-hysteresis",
    "Frostskydd": "frost-protection",
    "Max. golvtemp.": "max-floor-temp",
    "Min. golvtemp.": "min-floor-temp",
    "Temp.fall på golv": "floor-temp-drop",
    "Larm för hög golvtemperatur": "high-floor-temp-alarm",

    // Alarm
    "Alarm detektion": "alarm-detection",

    // Doorbell
    "Ringeklokke": "doorbell",
    "Ringetryk": "doorbell-button",

    // Alarm components (Danish, from .def files)
    "Lydgiver ekstern": "sounder-external",
    "Lydgiver intern": "sounder-internal",
    "Sabotagekreds": "tamper-circuit",
    "Røgsensor": "smoke-sensor",

    // Sensor products (Danish/Swedish)
    "Magnetkontakt": "door-contact",
    "Magnetkontaktsæt": "door-contact",
    "Glassensor": "glass-break-sensor",
    "Vattensensor": "water-sensor",
    "Fjernbetjening": "remote-control",

    // Power status
    "12 V ok": "12v-ok",
    "24 V ok": "24v-ok",

    // Controller link
    "Controller Link IN": "controller-link-in",
    "Controller Link OUT": "controller-link-out",

    // Numbered buttons (IR remote, multi-button panels)
    "PB 1": "button-1",
    "PB 2": "button-2",
    "PB 3": "button-3",
    "PB 4": "button-4",
    "PB 5": "button-5",
    "PB 6": "button-6",
    "PB 7": "button-7",
    "PB 8": "button-8",
    "PB 9": "button-9",
    "PB 10": "button-10",
    "PB 11": "button-11",
    "PB 12": "button-12",
    "PB 13": "button-13",
    "PB 14": "button-14",
    "PB 15": "button-15",
    "PB 16": "button-16",
    "Tryk 1": "button-1",
    "Tryk 2": "button-2",
    "Tryk 3": "button-3",
    "Tryk 4": "button-4",
    "Tryk 5": "button-5",
    "Tryk 6": "button-6",
    "Tryk 7": "button-7",
    "Tryk 8": "button-8",

    // Controller link channels
    "Link 1": "link-1",
    "Link 2": "link-2",
    "Link 3": "link-3",
    "Link 4": "link-4",
    "Link 5": "link-5",
    "Link 6": "link-6",
    "Link 7": "link-7",
    "Link 8": "link-8",
    "Link 11": "link-11",
    "Link 12": "link-12",
    "Link 13": "link-13",
    "Link 14": "link-14",
    "Link 15": "link-15",
    "Link 16": "link-16",
    "Link 17": "link-17",
    "Link 18": "link-18",

    // Alarm outputs (Danish, from .def files)
    "Udgang 80 dB": "80db",
    "Udgang 102 dB": "102db",

    // Scene/mode names (generic IHC)
    "Släck allt": "all-off",
    "Städning": "cleaning",
    "Ringer på dörrklockan": "doorbell-ringing",
    "Ringer på dörr klockan": "doorbell-ringing",

    // --- Product type names (generic IHC product descriptions) ---

    "Uttag/anslutning": "outlet",
    "Belysning": "lighting",
    "PIR": "pir",
    "PIR alarm": "pir-alarm",
    "PIR med skumringsrelæ": "pir-twilight",
    "Nattled": "night-led",
    "Natt led": "night-led",
    "Skymningsrelä": "twilight-relay",
    "Backup modul": "backup-module",
    "Värmerele": "heating-relay",
    "Rele uttag": "relay-outlet",

    // Wired button products (Swedish names, from IHC Visual)
    "Tryckknapp/4-Knapp med 2 LED": "button-4-way",
    "Tryckknapp/4-Knapp med LED": "button-4-way",
    "Tryckknapp/6-Knapp med 3 LED": "button-6-way",
    "Tryckknapp 2-pol med 2 LED": "button-2-way",
    "Temperatursensor (med golvtemperatur)": "temperature-sensor",

    // Wired button products (Danish names, from .def files)
    "LK FUGA Tryk 2 tast": "button-2-way",
    "LK FUGA Tryk 4 tast 2 dioder": "button-4-way",
    "LK FUGA Statustryk 4 tast 4 dioder": "status-button-4-way",
    "LK FUGA Tryk 6 tast 3 dioder": "button-6-way",
    "Tryk 2 tast": "button-2-way",
    "Tryk 4 tast": "button-4-way",
    "Kombi dimmer 4 tast": "combo-dimmer-4ch",
    "Kombi relæ 4 tast": "combo-relay-4ch",
    "Dimmer (2-knapp, 2-minne) DIN": "dimmer-din",

    // Button positions (Swedish, from IHC Visual — all variants found in project files)
    "PB (övre vänster)": "button-upper-left",
    "PB (övre höger)": "button-upper-right",
    "PB (nedre vänster)": "button-lower-left",
    "PB (nedre höger)": "button-lower-right",
    "PB (höger övre)": "button-upper-right",
    "PB (höger nedre)": "button-lower-right",
    "PB (höger / nedre)": "button-lower-right",
    "PB (vänster övre)": "button-upper-left",
    "PB (vänster nedre)": "button-lower-left",
    "PB (vänster / övre)": "button-upper-left",
    "PB (överst höger)": "button-upper-right",
    "PB (överst vänster)": "button-upper-left",
    "PB (nederst höger)": "button-lower-right",
    "PB (nederst vänster)": "button-lower-left",
    "PB (mitten höger)": "button-mid-right",
    "PB (mitten vänster)": "button-mid-left",
    "PB (mittersta höger)": "button-mid-right",
    "PB (mittersta vänster)": "button-mid-left",

    // LED indicators on button panels
    "LED (övre)": "led-upper",
    "LED (nedre)": "led-lower",
    "LED (höger övre)": "led-upper-right",
    "LED (höger nedre)": "led-lower-right",
    "LED (höger / nedre)": "led-lower-right",
    "LED (vänster övre)": "led-upper-left",
    "LED (vänster nedre)": "led-lower-left",
    "LED (vänster / övre)": "led-upper-left",
    "LED (mittersta)": "led-mid",
    "LED (midten)": "led-mid",
    "LED (øverst)": "led-upper",
    "LED (nederst)": "led-lower",
    "Grøn LED (øverst højre)": "green-led-upper-right",
    "Grøn LED (nederst højre)": "green-led-lower-right",
    "Rød LED (øverst venstre)": "red-led-upper-left",
    "Rød LED (nederst venstre)": "red-led-lower-left",

    // Generic position descriptions (Swedish)
    "I taket": "ceiling",
    "Till höger om dörren": "right-of-door",
    "Till vänster om dörren": "left-of-door",
    "Över fönstret": "above-window",
    "Ovanför fönstret": "above-window",
    "Ovanför fönstren": "above-windows",
    "Under fönstret": "below-window",
    "Under fönstren": "below-windows",
    "I tak listen": "ceiling-rail",
    "Taklampa": "ceiling-lamp",
    "Takbelysningen": "ceiling-lighting",
    "Lysrör i taket": "ceiling-fluorescent",
    "Spottarna I taket": "ceiling-spotlights",
    "Spottarna i taket": "ceiling-spotlights",
    "på väggen": "on-wall",

    // Wireless product names
    "WL Tryckknapp/Dimmer (4-kanal, 2-knapp)": "wireless-dimmer-4ch",
    "WL Tryckknapp/Relä (4-kanal)": "wireless-relay-4ch",
    "WL Tryckknapp/Dimmer (2-kanal, 2-knapp)": "wireless-dimmer-2ch",
    "WL Tryckknapp 6 kanal": "wireless-button-6ch",
    "WL Blind/Dimmer (2-knapp)": "wireless-blind-dimmer",
    "WL Blind/Relä": "wireless-blind-relay",
};

type TranslationOverrides = Record<string, string>;

let overrides: TranslationOverrides | null = null;

function loadOverrides(): TranslationOverrides {
    if (overrides !== null) return overrides;
    const overridesPath = path.join(IHC_DIR, OVERRIDES_FILE);
    if (fs.existsSync(overridesPath)) {
        try {
            overrides = JSON.parse(fs.readFileSync(overridesPath, "utf-8"));
            return overrides!;
        } catch {
            // ignore
        }
    }
    overrides = {};
    return overrides;
}

/**
 * Translates a location name from Swedish to English.
 * Checks overrides first, then hardcoded dictionary.
 * Returns the original name (kebab-cased) if no translation found.
 */
export function translateLocation(name: string): string {
    const ov = loadOverrides();
    if (ov[name]) return ov[name];
    if (locationTranslations[name]) return locationTranslations[name];
    // Fallback: transliterate to ASCII kebab-case
    return toKebab(transliterate(name));
}

/**
 * Translates an IO/product name from Danish/Swedish to English.
 * Checks overrides first, then hardcoded dictionary.
 * Returns the original if no translation found.
 */
export function translateIO(name: string): string {
    const ov = loadOverrides();
    if (ov[name]) return ov[name];
    if (ioTranslations[name]) return ioTranslations[name];
    return name;
}

/** Reset cached overrides (for testing). */
export function resetOverrides(): void {
    overrides = null;
}

/** Transliterates Scandinavian characters to ASCII. */
function transliterate(s: string): string {
    return s
        .replace(/[åÅ]/g, "a")
        .replace(/[äÄ]/g, "a")
        .replace(/[öÖ]/g, "o")
        .replace(/[üÜ]/g, "u")
        .replace(/[éÉ]/g, "e")
        .replace(/[ñÑ]/g, "n")
        .replace(/[æÆ]/g, "ae")
        .replace(/[øØ]/g, "o");
}

/** Converts a string to kebab-case. */
function toKebab(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Converts a location name to a camelCase prefix for variable names. */
export function locationToCamelCase(locationEnglish: string): string {
    return locationEnglish
        .replace(/-(\w)/g, (_, c) => c.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^(\d)/, "_$1");
}
