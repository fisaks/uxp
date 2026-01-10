/**
 * @example
 * ```typescript
 *  const fullUrl = buildUrlWithParams(
 *      'https://example.com',
 *      '/api/v1',
 *      ['users', '123', 'profile'], // Optional resource parts
 *       { filter: 'active', sort: 'desc' } // Optional query params
 *  );
 *  console.log(fullUrl); // Output: https://example.com/api/v1/users/123/profile?filter=active&sort=desc
 * ```
 * @returns
 */

type URLParams = {
    hostname: string;
    contextPath: string;
    resourceParts?: string[]; // Default to an empty array
    params?: Record<string, string>;
};
export const buildUrlWithParams = ({
    hostname,
    contextPath,
    resourceParts = [], // Default to an empty array
    params = {}, // Default to an empty object
}: URLParams): string => {
    const url = new URL(contextPath, hostname);

    // Build normalized path
    const normalizedPath = [url.pathname.replace(/\/$/, ""), ...resourceParts.map((part) => part.replace(/^\//, ""))]
        .join("/")
        .replace(/\/+/g, "/");
    url.pathname = normalizedPath;

    // Append query parameters
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
    });

    return url.toString();
};

export const buildPath = (...parts: string[]): string => {
    if (parts.length === 0) return ""; // Return empty string for no parts

    // Check if the first part has a leading slash
    const startsWithSlash = parts[0].startsWith("/");

    // Normalize the path parts
    const normalizedPath = parts
        .map((part) => part.replace(/(^\/|\/$)/g, "")) // Remove leading and trailing slashes
        .filter((part) => part.length > 0) // Filter out empty parts
        .join("/")
        .replace(/\/+/g, "/"); // Normalize double slashes

    // Add the leading slash only if the first part had one
    return startsWithSlash ? `/${normalizedPath}` : normalizedPath;
};

export const removeContextPath = (url: string, contextPath: string) => {
    const normalizedContextPath = contextPath.replace(/\/+$/, ""); // Remove trailing slashes
    const regex = new RegExp(`^${normalizedContextPath}(\\/|$)`); // Match contextPath at the start of the URL

    // Remove the contextPath if it matches
    return url.replace(regex, "/");
};

export const generateFullLink = (basePath: string | undefined, link: string) => {
    if (!basePath || link.startsWith("/")) return link;
    return basePath.endsWith("/") ? `${basePath}${link}` : `${basePath}/${link}`;
};

/**
 * Normalize a route path for comparison by:
 * - removing trailing '/*'
 * - removing trailing '/'
 */
export function normalizeRoutePath(path: string): string {
    let normalized = path.trim();

    if (normalized.endsWith("/*")) {
        normalized = normalized.slice(0, -2);
    }

    // Remove trailing slashes (but not the root "/")
    while (normalized.length > 1 && normalized.endsWith("/")) {
        normalized = normalized.slice(0, -1);
    }

    return normalized;
}

/**
 * Compare two route paths ignoring trailing '/' and '/*'
 */
export function isSameRoutePath(a: string, b: string): boolean {
    return normalizeRoutePath(a) === normalizeRoutePath(b);
}
/**
 * Returns true if `path` is within `rootPath`
 * Root path may end with '/*'
 */
export function isPathInRootPath(
    path: string,
    rootPath: string
): boolean {
    const root = normalizeRoutePath(rootPath);
    const current = normalizeRoutePath(path);

    // Root "/" matches everything
    if (root === "/") {
        return true;
    }

    return (
        current === root ||
        current.startsWith(root + "/")
    );
}

/**
 * Returns true if the route pattern is a React Router wildcard route
 * (i.e. ends with '/*').
 */
export function isWildcardRoutePattern(pattern: string): boolean {
    if (!pattern) return false;

    const trimmed = pattern.trim();

    return trimmed === "/*" || trimmed.endsWith("/*");
}