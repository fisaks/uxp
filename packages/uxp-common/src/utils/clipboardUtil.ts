/**
 * Copy text to the clipboard.
 * Uses the Clipboard API when available (secure contexts),
 * falls back to execCommand("copy") for HTTP / older browsers.
 */
export async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    // Fallback for non-secure contexts (HTTP) — execCommand is deprecated but
    // still the only option when the Clipboard API is unavailable.
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand("copy");
    } finally {
        document.body.removeChild(textarea);
    }
}
