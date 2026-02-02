// normalizeBlueprint.ts
import fs from "fs-extra";
import path from "path";
import { Node, Project } from "ts-morph";
import { collectNamedImportsFromPaths, collectRuleFactories, extractIdValue, getRootCallExpression, isValidIdentifier, unwrapExpression } from "./blueprintAstUtils";

type NormalizeError = {
    file: string;
    line: number;
    exportName: string;
    message: string;
};

type NormalizeMode = "resource" | "rule";

/**
 * Blueprint normalization pass.
 *
 * This file statically rewrites a blueprint’s TypeScript source to enforce
 * consistent, machine-friendly rule and resource definitions.
 *
 * The normalizer operates in either "resource" or "rule" mode and:
 *
 * - Copies the source blueprint into a target directory for safe mutation
 * - Detects top-level rule/resource factory calls
 * - Auto-exports top-level entities if they are not already exported
 * - Ensures every rule/resource has a stable string `id`
 *   - Injects a default id based on the export name when possible
 *   - Validates id format and reports precise errors
 * - Detects duplicate ids across the blueprint
 *
 * In resource mode, direct object-literal resources are also supported.
 * In rule mode, normalization always targets the root rule(...) call.
 *
 * The result is a normalized blueprint where all rules and resources are
 * explicitly exported, uniquely identified, and safe to load deterministically
 * at runtime.
 *
 * Any unrecoverable issue (invalid shape, missing id, duplicates) causes
 * normalization to fail with a detailed, user-facing error report.
 */
export async function normalizeBlueprint(opts: {
    sourceDir: string;
    targetDir: string;
    tsconfigPath: string;
    mode: NormalizeMode;
    factoryPath?: string; // used only in resource mode
}): Promise<{ entitiesUpdated: number }> {
    const { sourceDir, targetDir, tsconfigPath, mode, factoryPath } = opts;

    if (mode === "resource" && !factoryPath) {
        throw new Error("factoryPath is required in resource mode");
    }
    await fs.remove(targetDir);
    await fs.copy(sourceDir, targetDir, {
        filter: p => p.endsWith(".ts") || fs.lstatSync(p).isDirectory(),
    });

    const project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(path.join(targetDir, "**/*.ts"));

    const errors: NormalizeError[] = [];
    const warnings: NormalizeError[] = [];
    const seenIds = new Map<string, NormalizeError>();

    let updated = 0;

    for (const sf of project.getSourceFiles()) {
        const resourceFactories =
            mode === "resource" ? collectNamedImportsFromPaths(sf, [factoryPath!]) : new Set<string>();
        const ruleFactories =
            mode === "rule" ? collectRuleFactories(sf) : new Set<string>(); // usually just {"rule"} if imported

        const isEntityCall = (init: Node): boolean => {
            if (!Node.isCallExpression(init)) return false;
            if (mode === "resource") {
                const expr = init.getExpression();
                return Node.isIdentifier(expr) && resourceFactories.has(expr.getText());
            }
            // rule mode
            const root = getRootCallExpression(init);
            if (!root) return false;

            const rootExpr = root.getExpression();
            return Node.isIdentifier(rootExpr) && ruleFactories.has(rootExpr.getText());
        };

        const getEntityPropsObject = (init: Node): Node | undefined => {
            const root = getRootCallExpression(init);
            if (!root) return undefined;

            const arg = root.getArguments()[0];
            return arg && Node.isObjectLiteralExpression(arg) ? arg : undefined;
        };

        /* ---------------------------------
         * Pass 1: auto-export top-level entities
         * --------------------------------- */
        for (const v of sf.getVariableDeclarations()) {
            const stmt = v.getVariableStatement();
            if (!stmt || stmt.getParent() !== sf) continue;
            if (stmt.isExported()) continue;

            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);

            if (isEntityCall(init)) {
                stmt.setIsExported(true);
                updated++;
            }

        }

        /* ---------------------------------
         * Pass 2: normalize exported entities
         * --------------------------------- */
        const exports = sf.getVariableDeclarations().filter(v =>
            v.getVariableStatement()?.isExported()
        );

        for (const v of exports) {
            const exportName = v.getName();
            const line = v.getStartLineNumber();

            const rawInit = v.getInitializer();
            if (!rawInit) {
                // exported const without initializer is always weird; keep as error
                errors.push({
                    file: sf.getFilePath(),
                    line,
                    exportName,
                    message: "Exported const has no initializer",
                });
                continue;
            }

            const init = unwrapExpression(rawInit);

            // Resource mode: allow direct object literal resources too
            const isDirectObjectResource =
                mode === "resource" && Node.isObjectLiteralExpression(init);

            const looksLikeEntity =
                isEntityCall(init) || isDirectObjectResource;

            if (!looksLikeEntity) {
                if (mode === "resource") {
                    errors.push({
                        file: sf.getFilePath(),
                        line,
                        exportName,
                        message:
                            "Non-resource export found in src/resources. Only resources may be exported here.",
                    });
                }
                continue;
            }

            const maybeInjectOnObject = (obj: any) => {
                const idProp = obj.getProperty("id");

                if (idProp) {
                    if (!Node.isPropertyAssignment(idProp)) {
                        errors.push({
                            file: sf.getFilePath(),
                            line,
                            exportName,
                            message: "Invalid id property (must be a property assignment)",
                        });
                        return;
                    }

                    const idInit = idProp.getInitializer();
                    if (!idInit || !Node.isStringLiteral(idInit)) {
                        errors.push({
                            file: sf.getFilePath(),
                            line,
                            exportName,
                            message: `${mode === "rule" ? "Rule" : "Resource"} id must be a string literal`,
                        });
                        return;
                    }

                    const idValue = idInit.getLiteralValue();
                    if (!isValidIdentifier(idValue)) {
                        errors.push({
                            file: sf.getFilePath(),
                            line,
                            exportName,
                            message:
                                `Invalid id "${idValue}". IDs must be valid TypeScript identifiers.`,
                        });
                    }
                    return;
                }

                // Inject default id from const name (always valid identifier)
                obj.insertPropertyAssignment(0, {
                    name: "id",
                    initializer: `"${exportName}"`,
                });
                updated++;
            };

            // Normalize entity depending on shape
            if (isDirectObjectResource) {
                // direct object resource
                maybeInjectOnObject(init);
            } else if (Node.isCallExpression(init)) {
                // factory({ ... }) resource OR rule({ ... }) rule
                const obj = getEntityPropsObject(init);
                if (obj && Node.isObjectLiteralExpression(obj)) {
                    maybeInjectOnObject(obj);
                } else {
                    warnings.push({
                        file: sf.getFilePath(),
                        line,
                        exportName,
                        message:
                            `${mode === "rule" ? "Rule" : "Resource"} call without inline object literal; cannot inject id`,
                    });
                }
            }

            // After injection attempt, verify id exists for entities

            const idValue = extractEntityId(init, mode);
            if (!idValue) {
                errors.push({
                    file: sf.getFilePath(),
                    line,
                    exportName,
                    message:
                        `${mode === "rule" ? "Rule" : "Resource"} has no id after normalization. Use an inline object literal or specify id explicitly.`,
                });
                continue;
            }

            // Collision detection (per mode run)
            const existing = seenIds.get(idValue);
            if (existing) {
                errors.push(
                    {
                        file: sf.getFilePath(),
                        line,
                        exportName,
                        message: `Duplicate ${mode} id "${idValue}"`,
                    },
                    {
                        ...existing,
                        message: `Duplicate ${mode} id "${idValue}"`,
                    }
                );
            } else {
                seenIds.set(idValue, {
                    file: sf.getFilePath(),
                    line,
                    exportName,
                    message: "",
                });
            }
        }
    }

    if (warnings.length) {
        for (const w of warnings) {
            console.warn(
                `⚠️  [uhn-blueprint] ${w.file}:${w.line} (${w.exportName})\n    ${w.message}`
            );
        }
    }

    await project.save();

    if (errors.length) {
        console.error("❌ Blueprint normalization failed:\n");
        for (const e of errors) {
            console.error(
                `- ${e.file}:${e.line} (${e.exportName})\n  ${e.message}\n`
            );
        }
        throw new Error(`Invalid ${mode}s detected`);
    }


    return { entitiesUpdated: updated };
}

/* ---------------- helpers ---------------- */


function extractEntityId(init: Node, mode: NormalizeMode): string | undefined {
    // Resource: single call or direct object
    if (mode === "resource") {
        return extractIdValue(init);
    }

    // Rule: walk to root rule(...) call
    const root = getRootCallExpression(init);
    if (!root) return undefined;

    return extractIdValue(root);

}
