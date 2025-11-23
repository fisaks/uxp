export const base64ToBinaryString = (base64: string): string => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const bits = Array.from(bytes)
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join('')
        .split('') // split to array
        .reverse() // reverse for LSB right
        .join('');

    return bits.replace(/(.{8})/g, '$1 ').trim(); // Group in bits of 8
}
