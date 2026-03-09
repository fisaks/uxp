// normalizeBlueprintFactories.ts
import path from "path";
import { CallExpression, Node, Project, SourceFile, SyntaxKind } from "ts-morph";
import {
  collectLocationFactories,
  collectRuleFactories,
  collectSceneFactories,
  collectViewFactories,
  collectNamedImportsFromPaths,
  getRootCallExpression,
} from "./blueprintAstUtils";

type Issue = { file: string; line: number; message: string };

/**
 * Blueprint factory usage validator.
 *
 * This file statically analyzes a blueprint's TypeScript source using ts-morph
 * and enforces strict placement rules for factory calls:
 *
 * - Rule factories (e.g. rule(...)) are only allowed in src/rules
 * - Resource factories are only allowed in src/resources
 * - View factories (e.g. view(...)) are only allowed in src/views
 * - src/factory may only export reusable factory helpers.
 *
 * The validator works by:
 *  - Loading the project via tsconfig
 *  - Scanning all source files under the blueprint src root
 *  - Collecting imported rule, resource, and view factory identifiers (including aliases)
 *  - Walking all call expressions and resolving their root factory call
 *  - Reporting precise file/line errors for invalid usage
 *
 * This prevents accidental cross-layer coupling, keeps blueprint structure
 * predictable, and ensures that rules, resources, views, and factories remain
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
        const inViews = rel === "views" || rel.startsWith("views/");
        const inLocations = rel === "locations" || rel.startsWith("locations/");
        const inScenes = rel === "scenes" || rel.startsWith("scenes/");
        const inOther = !inRules && !inResources && !inFactory && !inViews && !inLocations && !inScenes;

        const ruleFactories = collectRuleFactories(sf); // identifiers (including alias) for rule()
        const resourceFactories = collectNamedImportsFromPaths(sf, [factoryPath]);
        const viewFactories = collectViewFactories(sf);
        const locationFactories = collectLocationFactories(sf);
        const sceneFactories = collectSceneFactories(sf);

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
            const isView = viewFactories.has(rootName);
            const isLocation = locationFactories.has(rootName);
            const isScene = sceneFactories.has(rootName);

            if (!isRule && !isResource && !isView && !isLocation && !isScene) continue;

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

            if (inFactory && (isView || isLocation || isScene)) {
                const entity = isView ? "Views" : isLocation ? "Locations" : "Scenes";
                const dir = isView ? "views" : isLocation ? "locations" : "scenes";
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/factory. ` +
                        `${entity} must be defined in src/${dir}.`,
                });
            }

            if (inViews && (isRule || isResource || isLocation || isScene)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/views. ` +
                        `Only view factories are allowed here.`,
                });
            }

            if (inLocations && (isRule || isResource || isView || isScene)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/locations. ` +
                        `Only location factories are allowed here.`,
                });
            }

            if (inScenes && (isRule || isResource || isView || isLocation)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/scenes. ` +
                        `Only scene factories are allowed here.`,
                });
            }

            if (inRules && (isView || isLocation || isScene)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/rules. ` +
                        `Define it in the appropriate folder.`,
                });
            }

            if (inResources && (isView || isLocation || isScene)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed in src/resources. ` +
                        `Define it in the appropriate folder.`,
                });
            }

            if (inOther && (isRule || isResource || isView || isLocation || isScene)) {
                issues.push({
                    file: sf.getFilePath(),
                    line: call.getStartLineNumber(),
                    message:
                        `Factory "${rootName}" is not allowed outside src/rules, src/resources, src/views, src/locations, or src/scenes. ` +
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
