// blueprintAstUtils.ts
import path from "path";
import { CallExpression, Node, SourceFile } from "ts-morph";

/* ---------------------------------
 * General AST helpers
 * --------------------------------- */

export function unwrapExpression(node: Node): Node {
    if (Node.isAsExpression(node) || Node.isParenthesizedExpression(node)) {
        return unwrapExpression(node.getExpression());
    }
    return node;
}

export function getRootCallExpression(node: Node): CallExpression | undefined {
    let current: Node = node;

    while (Node.isCallExpression(current)) {
        const expr = current.getExpression();

        if (Node.isIdentifier(expr)) {
            return current;
        }

        if (Node.isPropertyAccessExpression(expr)) {
            current = expr.getExpression();
            continue;
        }

        break;
    }

    return undefined;
}

export function isLocalImport(specifier: string): boolean {
    return specifier.startsWith(".");
}

export function isPathWithinParent(childPath: string, parentPath: string): boolean {
    const rel = path.relative(parentPath, childPath);
    return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/* ---------------------------------
 * ID helpers
 * --------------------------------- */

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidIdentifier(id: string): boolean {
    return IDENTIFIER_REGEX.test(id);
}

/**
 * Extract a string literal value for a named property from an object literal
 * or from the first argument of a call expression.
 */
export function extractPropertyStringValue(node: Node, propertyName: string): string | undefined {
    if (Node.isObjectLiteralExpression(node)) {
        const prop = node.getProperty(propertyName);
        if (prop && Node.isPropertyAssignment(prop)) {
            const init = prop.getInitializer();
            if (init && Node.isStringLiteral(init)) {
                return init.getLiteralValue();
            }
        }
    }

    if (Node.isCallExpression(node)) {
        const arg = node.getArguments()[0];
        if (arg && Node.isObjectLiteralExpression(arg)) {
            return extractPropertyStringValue(arg, propertyName);
        }
    }

    return undefined;
}

export function extractIdValue(node: Node): string | undefined {
    if (Node.isObjectLiteralExpression(node)) {
        const idProp = node.getProperty("id");
        if (idProp && Node.isPropertyAssignment(idProp)) {
            const init = idProp.getInitializer();
            if (init && Node.isStringLiteral(init)) {
                return init.getLiteralValue();
            }
        }
    }

    if (Node.isCallExpression(node)) {
        const arg = node.getArguments()[0];
        if (arg && Node.isObjectLiteralExpression(arg)) {
            return extractIdValue(arg);
        }
    }

    return undefined;
}

/* ---------------------------------
 * Import-based factory detection
 * --------------------------------- */

/**
 * Detect rule() factory identifiers imported from "@uhn/blueprint".
 * Supports aliasing: import { rule as myRule } from "@uhn/blueprint"
 */
export function collectRuleFactories(sf: SourceFile): Set<string> {
    const rules = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        if (imp.getModuleSpecifierValue() !== "@uhn/blueprint") continue;

        for (const n of imp.getNamedImports()) {
            if (n.getName() === "rule") {
                rules.add(n.getAliasNode()?.getText() ?? "rule");
            }
        }
    }

    return rules;
}

/**
 * Collect named imports that should be treated as resource factories.
 */
const blueprintAllowedNames = new Set(
    Object.keys(require("../factory")).filter(n => n !== "rule")
);
export function collectNamedImportsFromPaths(
    sf: SourceFile,
    allowedRoots: string[]
): Set<string> {
    const names = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        const spec = imp.getModuleSpecifierValue();

        if (spec === "@uhn/blueprint") {
            for (const n of imp.getNamedImports()) {
                if (blueprintAllowedNames.has(n.getName())) {
                    names.add(n.getAliasNode()?.getText() ?? n.getName());
                }
            }
            continue;
        }

        if (isLocalImport(spec)) {
            const resolved = path.resolve(path.dirname(sf.getFilePath()), spec);
            if (allowedRoots.some(root =>
                resolved === root || isPathWithinParent(resolved, root)
            )) {
                for (const n of imp.getNamedImports()) {
                    names.add(n.getAliasNode()?.getText() ?? n.getName());
                }
            }
        }
    }

    return names;
}
