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
    resourceParts?: string[];
    params?: Record<string, string>;
};
export declare const buildUrlWithParams: ({ hostname, contextPath, resourceParts, params, }: URLParams) => string;
export declare const buildPath: (...parts: string[]) => string;
export declare const removeContextPath: (url: string, contextPath: string) => string;
export declare const generateFullLink: (basePath: string | undefined, link: string) => string;
export {};
//# sourceMappingURL=urlUtil.d.ts.map