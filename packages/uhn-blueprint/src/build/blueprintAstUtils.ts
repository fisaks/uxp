// blueprintAstUtils.ts
import fs from "fs";
import path from "path";
import { CallExpression, ImportSpecifier, Node, ObjectLiteralExpression, SourceFile, VariableDeclaration } from "ts-morph";

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
 * Value resolution helpers
 * --------------------------------- */

/**
 * Follow an identifier's symbol to the underlying VariableDeclaration.
 * Handles both same-file references and cross-file imports.
 */
function resolveToVariableDeclaration(node: Node): VariableDeclaration | undefined {
    if (!Node.isIdentifier(node)) return undefined;
    const sym = node.getSymbol();
    if (!sym) return undefined;
    for (const decl of sym.getDeclarations()) {
        if (Node.isVariableDeclaration(decl)) return decl;
        if (Node.isImportSpecifier(decl)) {
            const resolved = resolveImportSpecifier(decl);
            if (resolved) return resolved;
        }
    }
    return undefined;
}

/**
 * Follow an ImportSpecifier to the original VariableDeclaration in the source file.
 */
function resolveImportSpecifier(spec: ImportSpecifier): VariableDeclaration | undefined {
    const sourceFile = spec.getImportDeclaration().getModuleSpecifierSourceFile();
    if (!sourceFile) return undefined;
    const exportName = spec.getName();
    const varDecl = sourceFile.getVariableDeclaration(exportName);
    if (varDecl) return varDecl;
    return undefined;
}

/**
 * Resolve a node to a string value. Handles:
 * - Direct string literals: `"edge1"`
 * - Const references (same file or imported): `EDGE` where `const EDGE = "edge1"`
 * - `as const` assertions
 *
 * Resolution is one level deep — chained const references are not supported.
 */
export function resolveToStringValue(node: Node): string | undefined {
    const unwrapped = unwrapExpression(node);
    if (Node.isStringLiteral(unwrapped)) return unwrapped.getLiteralValue();
    if (Node.isIdentifier(unwrapped)) {
        const varDecl = resolveToVariableDeclaration(unwrapped);
        if (varDecl) {
            const init = varDecl.getInitializer();
            if (init) {
                const inner = unwrapExpression(init);
                if (Node.isStringLiteral(inner)) return inner.getLiteralValue();
            }
        }
    }
    return undefined;
}

/**
 * Resolve a node to an ObjectLiteralExpression. Handles:
 * - Direct object literals: `{ edge: "edge1", device: "DO1" }`
 * - Const references (same file or imported): `commonProps` where `const commonProps = { ... }`
 * - `as const` assertions
 *
 * Resolution is one level deep — chained const references are not supported.
 */
export function resolveToObjectLiteral(node: Node): ObjectLiteralExpression | undefined {
    const unwrapped = unwrapExpression(node);
    if (Node.isObjectLiteralExpression(unwrapped)) return unwrapped;
    if (Node.isIdentifier(unwrapped)) {
        const varDecl = resolveToVariableDeclaration(unwrapped);
        if (varDecl) {
            const init = varDecl.getInitializer();
            if (init) {
                const inner = unwrapExpression(init);
                if (Node.isObjectLiteralExpression(inner)) return inner;
            }
        }
    }
    return undefined;
}

/* ---------------------------------
 * ID helpers
 * --------------------------------- */

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function isValidIdentifier(id: string): boolean {
    return IDENTIFIER_REGEX.test(id);
}

/**
 * Extract a string value for a named property from an object literal
 * or from the first argument of a call expression.
 *
 * Resolves const references (one level deep): `edge: EDGE` where `const EDGE = "edge1"`.
 */
export function extractPropertyStringValue(node: Node, propertyName: string): string | undefined {
    if (Node.isObjectLiteralExpression(node)) {
        const prop = node.getProperty(propertyName);
        if (prop && Node.isPropertyAssignment(prop)) {
            const init = prop.getInitializer();
            if (init) {
                return resolveToStringValue(init);
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
 * Detect view() factory identifiers imported from "@uhn/blueprint".
 * Supports aliasing: import { view as myView } from "@uhn/blueprint"
 */
const VIEW_FACTORY_NAMES = new Set(["view"]);

export function collectViewFactories(sf: SourceFile): Set<string> {
    const views = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        if (imp.getModuleSpecifierValue() !== "@uhn/blueprint") continue;

        for (const n of imp.getNamedImports()) {
            if (VIEW_FACTORY_NAMES.has(n.getName())) {
                views.add(n.getAliasNode()?.getText() ?? n.getName());
            }
        }
    }

    return views;
}

/**
 * Detect location() factory identifiers imported from "@uhn/blueprint".
 * Supports aliasing: import { location as myLoc } from "@uhn/blueprint"
 */
const LOCATION_FACTORY_NAMES = new Set(["location"]);

export function collectLocationFactories(sf: SourceFile): Set<string> {
    const locations = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        if (imp.getModuleSpecifierValue() !== "@uhn/blueprint") continue;

        for (const n of imp.getNamedImports()) {
            if (LOCATION_FACTORY_NAMES.has(n.getName())) {
                locations.add(n.getAliasNode()?.getText() ?? n.getName());
            }
        }
    }

    return locations;
}

/**
 * Detect scene() factory identifiers imported from "@uhn/blueprint".
 * Supports aliasing: import { scene as myScene } from "@uhn/blueprint"
 */
const SCENE_FACTORY_NAMES = new Set(["scene"]);

export function collectSceneFactories(sf: SourceFile): Set<string> {
    const scenes = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        if (imp.getModuleSpecifierValue() !== "@uhn/blueprint") continue;

        for (const n of imp.getNamedImports()) {
            if (SCENE_FACTORY_NAMES.has(n.getName())) {
                scenes.add(n.getAliasNode()?.getText() ?? n.getName());
            }
        }
    }

    return scenes;
}

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
 * Collect resource factory function names from resource-*-factory files.
 *
 * Discovers all files matching `resource-*-factory` in the @uhn/blueprint
 * package directory and collects only the function-typed exports.
 * Skips constants, objects, and types — only actual factory functions pass.
 */
const blueprintResourceFactoryNames = (() => {
    const names = new Set<string>();
    const pkgDir = path.resolve(__dirname, "..");
    const filePattern = /^resource(-\w+)?-factory\.(ts|js)$/;
    for (const file of fs.readdirSync(pkgDir)) {
        if (filePattern.test(file)) {
            const mod = require(path.join(pkgDir, file));
            for (const [name, value] of Object.entries(mod)) {
                if (typeof value === "function") {
                    names.add(name);
                }
            }
        }
    }
    return names;
})();

export function collectNamedImportsFromPaths(
    sf: SourceFile,
    allowedRoots: string[]
): Set<string> {
    const names = new Set<string>();

    for (const imp of sf.getImportDeclarations()) {
        const spec = imp.getModuleSpecifierValue();

        if (spec === "@uhn/blueprint") {
            for (const n of imp.getNamedImports()) {
                if (blueprintResourceFactoryNames.has(n.getName())) {
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
