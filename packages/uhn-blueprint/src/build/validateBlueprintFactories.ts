// normalizeBlueprintFactories.ts
import path from "path";
import { CallExpression, Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import {
  collectRuleFactories,
  collectNamedImportsFromPaths,
  getRootCallExpression,
} from "./blueprintAstUtils";

type Issue = { file: string; line: number; message: string };

/**
 * Blueprint factory usage validator.
 *
 * This file statically analyzes a blueprint’s TypeScript source using ts-morph
 * and enforces strict placement rules for factory calls:
 *
 * - Rule factories (e.g. rule(...)) are only allowed in src/rules
 * - Resource factories are only allowed in src/resources
 * - src/factory may only export reusable factory helpers.
 *
 * The validator works by:
 *  - Loading the project via tsconfig
 *  - Scanning all source files under the blueprint src root
 *  - Collecting imported rule and resource factory identifiers (including aliases)
 *  - Walking all call expressions and resolving their root factory call
 *  - Reporting precise file/line errors for invalid usage
 *
 * This prevents accidental cross-layer coupling, keeps blueprint structure
 * predictable, and ensures that rules, resources, and factories remain
 * clearly separated at build time rather than failing at runtime.
 *
 * On any violation, validation fails with a consolidated, human-readable error
 * message listing all offending locations.
 */
export async function validateBlueprintFactories(opts: {
    srcRoot: string;          
    tsconfigPath: string;     
    factoryPath: string;   
}): Promise<void> {
    const { srcRoot, tsconfigPath, factoryPath } = opts;

    const project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(path.join(srcRoot, "**/*.ts"));

    const issues: Issue[] = [];

    for (const sf of project.getSourceFiles()) {
        const rel = path.relative(srcRoot, sf.getFilePath()).replace(/\\/g, "/");

        const inRules = rel === "rules" || rel.startsWith("rules/");
        const inResources = rel === "resources" || rel.startsWith("resources/");
        const inFactory = rel === "factory" || rel.startsWith("factory/");
        const inOther = !inRules && !inResources && !inFactory;

        const ruleFactories = collectRuleFactories(sf); // identifiers (including alias) for rule()
        const resourceFactories = collectNamedImportsFromPaths(sf, [factoryPath]);

        // Walk all call expressions
        const calls = sf.getDescendantsOfKind(SyntaxKind.CallExpression);

        for (const call of calls) {
            const root = getRootCallExpression(call);
            if (!root) continue;

            const rootName = getRootCallIdentifierName(root);
            if (!rootName) continue;

            // classify call
            const isRule = ruleFactories.has(rootName);
            const isResource = resourceFactories.has(rootName);

            if (!isRule && !isResource) continue;

            if (inRules && isResource) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Resource factory "${rootName}" is not allowed in src/rules. ` +
                        `Define the resource in src/resources and import it.`,
                });
            }

            if (inResources && isRule) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Rule factory "${rootName}" is not allowed in src/resources. ` +
                        `Define rules in src/rules.`,
                });
            }
            if (inFactory && isRule) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Rule factory "${rootName}" is not allowed in src/factory. ` +
                        `Rules must be defined in src/rules.`,
                });
            }

            if (inOther && (isRule || isResource)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed outside src/rules or src/resources. ` +
                        `Move it to the appropriate folder.`,
                });
            }
        }
    }

    if (issues.length) {
        const msg =
            "❌ Blueprint validation failed:\n\n" +
            issues
                .map(i => `- ${i.file}:${i.line}\n  ${i.message}\n`)
                .join("\n");
        throw new Error(msg);
    }
}

/* ---------- helpers ---------- */


function getRootCallIdentifierName(call: CallExpression): string | undefined {
    const expr = call.getExpression();
    return Node.isIdentifier(expr) ? expr.getText() : undefined;
}
