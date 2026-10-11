// validateClockTimes.ts — Build-time validation of "HH:mm" clock time literals.
//
// Statically checks string literals used as:
//  - `between: ["22:00", "07:00"]` in electricity price windows
//  - the argument of `cron....at("06:00")` (cron imported from "@uhn/blueprint")
//
// Only literals can be checked statically; values built in code are validated
// at runtime when the query / schedule is evaluated.

import path from "path";
import { Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import { parseClockTime } from "../clock-time";

type Issue = { file: string; line: number; message: string };

function stringLiteralValue(node: Node): string | undefined {
    if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        return node.getLiteralValue();
    }
    return undefined;
}

function collectCronNames(sf: SourceFile): Set<string> {
    const names = new Set<string>();
    for (const imp of sf.getImportDeclarations()) {
        if (imp.getModuleSpecifierValue() !== "@uhn/blueprint") continue;
        for (const n of imp.getNamedImports()) {
            if (n.getName() === "cron") names.add(n.getAliasNode()?.getText() ?? n.getName());
        }
    }
    return names;
}

/** Walks `cron.weekdays().at(...)` down to the leftmost identifier (`cron`). */
function rootIdentifierName(node: Node): string | undefined {
    let current: Node = node;
    for (;;) {
        if (Node.isCallExpression(current)) current = current.getExpression();
        else if (Node.isPropertyAccessExpression(current)) current = current.getExpression();
        else break;
    }
    return Node.isIdentifier(current) ? current.getText() : undefined;
}

export function validateClockTimes(opts: { srcRoot: string; tsconfigPath: string }): void {
    const { srcRoot, tsconfigPath } = opts;

    const project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
    });
    project.addSourceFilesAtPaths(path.join(srcRoot, "**/*.ts"));

    const issues: Issue[] = [];

    for (const sf of project.getSourceFiles()) {
        const rel = path.relative(srcRoot, sf.getFilePath()).replace(/\\/g, "/");

        const check = (node: Node, value: string) => {
            try {
                parseClockTime(value);
            } catch (err) {
                issues.push({ file: rel, line: node.getStartLineNumber(), message: (err as Error).message });
            }
        };

        // between: ["22:00", "07:00"]
        for (const prop of sf.getDescendantsOfKind(SyntaxKind.PropertyAssignment)) {
            if (prop.getName() !== "between") continue;
            const init = prop.getInitializer();
            if (!init || !Node.isArrayLiteralExpression(init)) continue;
            for (const el of init.getElements()) {
                const value = stringLiteralValue(el);
                if (value !== undefined) check(el, value);
            }
        }

        // cron.daily().at("06:00")
        const cronNames = collectCronNames(sf);
        if (cronNames.size === 0) continue;
        for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
            const expr = call.getExpression();
            if (!Node.isPropertyAccessExpression(expr) || expr.getName() !== "at") continue;
            const root = rootIdentifierName(expr.getExpression());
            if (!root || !cronNames.has(root)) continue;
            const arg = call.getArguments()[0];
            const value = arg ? stringLiteralValue(arg) : undefined;
            if (arg && value !== undefined) check(arg, value);
        }
    }

    if (issues.length > 0) {
        const lines = issues.map((i) => `  - ${i.file}:${i.line} — ${i.message}`);
        throw new Error(`Invalid clock time(s) in blueprint:\n${lines.join("\n")}`);
    }
}
