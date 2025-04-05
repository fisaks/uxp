import { DateTime, DateTimeFormatOptions, Zone } from 'luxon';

/**
 * Formats a UTC ISO timestamp to a localized string using the target timezone and locale.
 *
 * @param isoUtc - The UTC ISO string (e.g. "2025-04-05T12:00:00Z")
 * @param options - Optional settings:
 *   - zone: IANA timezone (e.g. 'Europe/Helsinki', 'America/New_York') or 'local' (default)
 *   - locale: BCP 47 locale string (e.g. 'fi-FI', 'en-US')
 *   - format: Luxon formatting preset (default: DateTime.DATETIME_MED)
 */
export function formatUtcIsoToLocal(
    isoUtc: string | undefined | null,
    {
        zone = 'local',
        locale,
        format = DateTime.DATETIME_MED,
    }: {
        zone?: string | Zone;
        locale?: string;
        format?: Intl.DateTimeFormatOptions | DateTimeFormatOptions;
    } = {}
): string {
    if (!isoUtc) {
        return '';
    }
    try {
        const dt = DateTime.fromISO(isoUtc, { zone: 'utc' })
            .setZone(zone);
        if (locale) {
            dt.setLocale(locale);
        }
        return dt.toLocaleString(format);
    } catch {
        return isoUtc;
    }
}
