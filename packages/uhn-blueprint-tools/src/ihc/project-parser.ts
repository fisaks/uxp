import fs from "fs";
import type { IHCGroup, IHCIOElement, IHCIOElementType, IHCProduct, IHCProject } from "./types";

/**
 * Parses an IHC project XML file and extracts groups, products, and I/O elements.
 *
 * Uses simple regex/string parsing rather than a full XML parser — the IHC project
 * XML is well-structured and the DTD is consistent across all controller versions.
 * This avoids external dependencies and handles the ISO-8859-1 encoding.
 */
export function parseProjectFile(filePath: string): IHCProject {
    const raw = fs.readFileSync(filePath);
    // IHC project files declare ISO-8859-1 but may be UTF-8 in practice.
    // Try UTF-8 first (covers both since ASCII is a subset).
    // If it contains replacement characters, fall back to latin1.
    let xml = raw.toString("utf-8");
    if (xml.includes("\uFFFD")) {
        xml = raw.toString("latin1");
    }

    const groups = parseGroups(xml);
    return { groups };
}

/** Parses the hex ID attribute value "_0x9c5b" → 0x9C5B (integer). */
export function parseHexId(idStr: string): number {
    // Strip leading underscore if present: "_0x9c5b" → "0x9c5b"
    const hex = idStr.replace(/^_/, "");
    return parseInt(hex, 16);
}

/** Extracts an attribute value from an XML tag string, decoding XML entities. */
function attr(tag: string, name: string): string {
    // Match name="value" — handles both single and double quotes
    const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i");
    const m = tag.match(re);
    if (!m) return "";
    return decodeXmlEntities(m[1]);
}

function decodeXmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
}

/**
 * IO element types we extract from products.
 * Maps XML element name → UHN IO element type.
 */
const IO_ELEMENT_TYPES: Record<string, IHCIOElementType> = {
    "dataline_input": "dataline_input",
    "dataline_output": "dataline_output",
    "airlink_input": "airlink_input",
    "airlink_relay": "airlink_relay",
    "airlink_dimming": "airlink_dimming",
    "airlink_dimmer_increase": "airlink_dimmer_increase",
    "airlink_dimmer_decrease": "airlink_dimmer_decrease",
    "resource_temperature": "resource_temperature",
};

/**
 * Parses all <group> elements within the top-level <groups> section.
 * The <groups> section contains the room/location hierarchy.
 */
function parseGroups(xml: string): IHCGroup[] {
    const groups: IHCGroup[] = [];

    // Find the top-level <groups> section
    const groupsStart = xml.indexOf("<groups ");
    if (groupsStart === -1) return groups;

    // Find all <group> elements (direct children of <groups>)
    const groupRegex = /<group\s+([^>]+)>/g;
    let match: RegExpExecArray | null;

    while ((match = groupRegex.exec(xml)) !== null) {
        const tagAttrs = match[1];
        const groupId = attr(`<group ${tagAttrs}>`, "id");
        const groupName = attr(`<group ${tagAttrs}>`, "name");

        if (!groupName) continue;

        // Find the extent of this group (up to its closing tag)
        const groupStart = match.index;
        const groupEnd = findClosingTag(xml, groupStart, "group");
        if (groupEnd === -1) continue;

        const groupContent = xml.substring(groupStart, groupEnd);
        const products = parseProducts(groupContent);

        // Only include groups that have products with I/O elements
        if (products.length > 0) {
            groups.push({
                id: groupId,
                name: groupName,
                products,
            });
        }
    }

    return groups;
}

/**
 * Parses product_dataline and product_airlink elements within a group.
 */
function parseProducts(groupXml: string): IHCProduct[] {
    const products: IHCProduct[] = [];

    // Match both product_dataline and product_airlink
    const productRegex = /<(product_dataline|product_airlink)\s+([^>]+)>/g;
    let match: RegExpExecArray | null;

    while ((match = productRegex.exec(groupXml)) !== null) {
        const productType = match[1] as "product_dataline" | "product_airlink";
        const tagStr = `<${productType} ${match[2]}>`;

        const productId = attr(tagStr, "id");
        const productIdentifierStr = attr(tagStr, "product_identifier");
        const productIdentifier = parseHexId(productIdentifierStr);
        const name = attr(tagStr, "name");
        const position = attr(tagStr, "position");
        const note = attr(tagStr, "note");
        const documentationTag = attr(tagStr, "documentation_tag");

        // Find the extent of this product
        const productStart = match.index;
        const productEnd = findClosingTag(groupXml, productStart, productType);
        if (productEnd === -1) continue;

        const productContent = groupXml.substring(productStart, productEnd);
        const ios = parseIOElements(productContent);

        // Only include products that have I/O elements we care about
        if (ios.length > 0) {
            products.push({
                id: productId,
                productIdentifier,
                name,
                position,
                note,
                documentationTag,
                type: productType === "product_airlink" ? "airlink" : "dataline",
                ios,
            });
        }
    }

    return products;
}

/**
 * Parses I/O elements from within a product's XML content.
 */
function parseIOElements(productXml: string): IHCIOElement[] {
    const ios: IHCIOElement[] = [];

    for (const [xmlTag, elementType] of Object.entries(IO_ELEMENT_TYPES)) {
        // Match self-closing or opening tags
        const regex = new RegExp(`<${xmlTag}\\s+([^>]*?)\\s*/?>`, "g");
        let match: RegExpExecArray | null;

        while ((match = regex.exec(productXml)) !== null) {
            const tagStr = `<${xmlTag} ${match[1]}>`;
            const idStr = attr(tagStr, "id");
            const id = parseHexId(idStr);
            const name = attr(tagStr, "name");
            const note = attr(tagStr, "note");

            // For dataline_output, check if it's an LED type (skip those)
            const outputType = xmlTag === "dataline_output" ? attr(tagStr, "type") : undefined;

            // For resource_temperature, check accessibility
            const accessibility = xmlTag === "resource_temperature" ? attr(tagStr, "accessibility") : undefined;

            // Skip elements inside <settings> (calibration, config, dataline connections)
            {
                const before = productXml.substring(0, match.index);
                const lastSettings = before.lastIndexOf("<settings ");
                if (lastSettings >= 0) {
                    const settingsClose = before.indexOf("</settings>", lastSettings);
                    if (settingsClose === -1) {
                        // We're inside an unclosed <settings> block — skip
                        continue;
                    }
                }
            }

            ios.push({
                id,
                elementType,
                name,
                note,
                outputType: outputType || undefined,
                accessibility: accessibility || undefined,
            });
        }
    }

    return ios;
}

/**
 * Finds the closing tag for an element starting at the given position.
 * Handles nested elements of the same type.
 */
function findClosingTag(xml: string, startPos: number, tagName: string): number {
    const openTag = `<${tagName}`;
    const closeTag = `</${tagName}>`;
    let depth = 0;
    let pos = startPos;

    while (pos < xml.length) {
        const nextOpen = xml.indexOf(openTag, pos + 1);
        const nextClose = xml.indexOf(closeTag, pos + 1);

        if (nextClose === -1) return -1;

        if (nextOpen !== -1 && nextOpen < nextClose) {
            // Check that it's actually an opening tag (not just a substring match)
            const charAfter = xml[nextOpen + openTag.length];
            if (charAfter === " " || charAfter === ">" || charAfter === "/") {
                depth++;
            }
            pos = nextOpen + 1;
        } else {
            if (depth === 0) {
                return nextClose + closeTag.length;
            }
            depth--;
            pos = nextClose + 1;
        }
    }

    return -1;
}
