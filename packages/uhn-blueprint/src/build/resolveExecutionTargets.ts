// resolveExecutionTargets.ts
import path from "path";
import { CallExpression, Node, Project, SourceFile,ObjectLiteralExpression } from "ts-morph";

import {
    collectRuleFactories,
    extractPropertyStringValue,
    getRootCallExpression,
    isLocalImport,
    isPathWithinParent,
    unwrapExpression,
} from "./blueprintAstUtils";

/**
 * Resolve and inject `executionTarget` into every rule in the build output.
 *
 * For each rule file:
 * 1. Collect imports resolving to resources — look up each resource's execution target
 *    (physical resources use `edge`, logical resources use `host`)
 * 2. For local non-resource imports (scenes, utilities, etc.) — DFS check if
 *    the import chain touches resources. If yes, default to master with info
 *    message. This is critical for scenes: a rule importing a scene that
 *    references resources from multiple edges must run on master, since edge
 *    runtimes cannot route commands cross-edge.
 * 3. Library imports — skip
 * 4. Single target → that target, multiple targets → "master"
 *
 * Scene files (when `scenesTmpDir` is provided) are added to the analysis
 * project so the DFS can trace rule → scene → resource import chains.
 * Without this, scene imports appear as dead-ends and the rule may be
 * incorrectly assigned to an edge that cannot execute the scene's commands.
 *
 * Manual overrides (author-set executionTarget) are always respected.
 */
export async function resolveExecutionTargets(opts: {
    resourcesTmpDir: string;
    rulesTmpDir: string;
    tsconfigPath: string;
    factoryTmpPath: string;
    scenesTmpDir?: string;
}): Promise<void> {
    const { resourcesTmpDir, rulesTmpDir, tsconfigPath, factoryTmpPath, scenesTmpDir } = opts;

    const project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(path.join(resourcesTmpDir, "**/*.ts"));
    project.addSourceFilesAtPaths(path.join(rulesTmpDir, "**/*.ts"));
    project.addSourceFilesAtPaths(path.join(factoryTmpPath, "**/*.ts"));
    if (scenesTmpDir) {
        project.addSourceFilesAtPaths(path.join(scenesTmpDir, "**/*.ts"));
    }

    // Step 1: Build resource edge map
    const resourceTargetMap = buildResourceTargetMap(project, resourcesTmpDir);

    // Step 2 & 3: Per rule file — analyze imports and inject executionTarget
    const ruleFiles = project.getSourceFiles().filter(sf =>
        isPathWithinParent(sf.getFilePath(), rulesTmpDir)
    );

    const errors: string[] = [];

    for (const sf of ruleFiles) {
        const relPath = path.relative(path.dirname(rulesTmpDir), sf.getFilePath());

        // Analyze imports to determine execution targets for this file
        const fileTargets = new Set<string>();
        let forceToMaster = false;

        for (const imp of sf.getImportDeclarations()) {
            const spec = imp.getModuleSpecifierValue();

            // Skip library imports
            if (!isLocalImport(spec)) continue;

            const resolved = resolveImportPath(sf, spec);
            const resolvedFile = findSourceFile(project, resolved);

            if (!resolvedFile) continue;

            if (isPathWithinParent(resolvedFile.getFilePath(), resourcesTmpDir)) {
                // Direct resource import — collect targets for each named import
                for (const named of imp.getNamedImports()) {
                    const importName = named.getName();
                    const target = resourceTargetMap.get(importName);
                    if (target) {
                        fileTargets.add(target);
                    }
                }
            } else if (touchesResources(resolvedFile, resourcesTmpDir, project, new Set())) {
                // Local non-resource import that indirectly touches resources
                console.log(`ℹ ${relPath} imports from non-resource module that touches resources → defaulting to master`);
                forceToMaster = true;
            }
            // else: local utility that doesn't touch resources — skip
        }

        // Step 3: Collect executionTarget insertions (read-only pass on fresh AST)
        const ruleFactories = collectRuleFactories(sf);
        const exports = sf.getVariableDeclarations().filter(v =>
            v.getVariableStatement()?.isExported()
        );

        const insertions: { pos: number; text: string }[] = [];

        for (const v of exports) {
            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);
            if (!Node.isCallExpression(init)) continue;

            const root = getRootCallExpression(init);
            if (!root) continue;

            const rootExpr = root.getExpression();
            if (!Node.isIdentifier(rootExpr) || !ruleFactories.has(rootExpr.getText())) continue;

            // Check if author already called .executionTarget() in the builder chain
            const existingCall = findChainedCall(init, "executionTarget");

            if (existingCall) {
                const arg = existingCall.getArguments()[0];
                const existingTarget = arg && Node.isStringLiteral(arg)
                    ? arg.getLiteralValue()
                    : undefined;

                // Manual override — respect it, but warn if targeting a specific location while using multiple targets
                if (existingTarget && existingTarget !== "master" && (fileTargets.size > 1 || forceToMaster)) {
                    const targetList = [...fileTargets].join(", ");
                    console.warn(
                        `⚠️  ${relPath}: ${v.getName()} targets "${existingTarget}" but potentially uses resources from multiple targets (${targetList})`
                    );
                }
                continue;
            }

            // Determine target
            let target: string;
            if (forceToMaster || fileTargets.size > 1) {
                target = "master";
                if (fileTargets.size > 1) {
                    const targetList = [...fileTargets].join(", ");
                    console.log(
                        `ℹ ${relPath} uses resources from multiple targets (${targetList}) → rules resolved as master`
                    );
                }
            } else if (fileTargets.size === 1) {
                target = [...fileTargets][0]; // single target inject actual target 
            } else {
                // No resources with targets — rule has no trigger resources
                // This shouldn't happen with valid rules, but default to master
                target = "master";
            }

            // Record insertion position right after the root rule() call
            insertions.push({
                pos: root.getEnd(),
                text: `.executionTarget("${target}")`,
            });
        }

        // Apply insertions in reverse position order to keep positions stable
        for (const ins of insertions.sort((a, b) => b.pos - a.pos)) {
            sf.insertText(ins.pos, ins.text);
        }

        // Validate: every exported rule must have .executionTarget() in the chain
        // Re-query since AST was modified by insertions
        const exportsAfter = sf.getVariableDeclarations().filter(v =>
            v.getVariableStatement()?.isExported()
        );
        for (const v of exportsAfter) {
            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);
            if (!Node.isCallExpression(init)) continue;

            const root = getRootCallExpression(init);
            if (!root) continue;

            const rootExpr = root.getExpression();
            if (!Node.isIdentifier(rootExpr) || !ruleFactories.has(rootExpr.getText())) continue;

            if (!findChainedCall(init, "executionTarget")) {
                errors.push(
                    `${relPath}: ${v.getName()} is missing executionTarget after injection`
                );
            }
        }
    }

    await project.save();

    if (errors.length) {
        console.error("❌ Execution target resolution failed:\n");
        for (const e of errors) {
            console.error(`- ${e}\n`);
        }
        throw new Error("Some rules are missing executionTarget");
    }
}

/**
 * Build a map from resource export name → edge/host value.
 * Scans all exported resources in the temp resource files.
 *
 * For each resource, inspects the props object literal:
 * - `edge` or `host` is a direct string literal → use it
 * - Has spreads, or the property exists but isn't a string literal → build error
 *   (const refs, spreads, and computed values can't be backtraced at build time)
 * - Neither `edge` nor `host` found → build error
 *
 * Physical resources use `edge`, logical resources (timer, complex) use `host`.
 */
function buildResourceTargetMap(
    project: Project,
    resourcesDir: string
): Map<string, string> {
    const map = new Map<string, string>();
    const errors: string[] = [];

    for (const sf of project.getSourceFiles()) {
        if (!isPathWithinParent(sf.getFilePath(), resourcesDir)) continue;

        const exports = sf.getVariableDeclarations().filter(v =>
            v.getVariableStatement()?.isExported()
        );

        for (const v of exports) {
            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);

            // Try direct extraction first (covers both factory calls and plain objects)
            // Physical resources have `edge`, logical resources have `host`
            const target = extractPropertyStringValue(init, "edge") ?? extractPropertyStringValue(init, "host");
            if (target) {
                map.set(v.getName(), target);
                continue;
            }

            // Neither edge nor host found as a string literal — inspect the props object
            const propsObj = getPropsObject(init);
            if (!propsObj) {
                errors.push(
                    `${sf.getFilePath()}:${v.getStartLineNumber()} — resource "${v.getName()}" ` +
                    `has no inline props object. Cannot determine \`edge\`/\`host\` at build time.`
                );
                continue;
            }

            const hasSpreads = propsObj.getProperties().some(p => Node.isSpreadAssignment(p));
            const edgeProp = propsObj.getProperty("edge") ?? propsObj.getProperty("host");

            if (hasSpreads) {
                // Spread could hide edge/host — can't backtrace
                errors.push(
                    `${sf.getFilePath()}:${v.getStartLineNumber()} — resource "${v.getName()}" ` +
                    `uses spread in props. \`edge\`/\`host\` must be a direct string literal for build-time backtracing.`
                );
            } else if (edgeProp) {
                // Property exists but isn't a string literal (const ref, computed, etc.)
                errors.push(
                    `${sf.getFilePath()}:${v.getStartLineNumber()} — resource "${v.getName()}" ` +
                    `has \`edge\`/\`host\` but it's not a string literal. Use a direct string value like \`edge: "edge1"\` or \`host: "edge1"\`.`
                );
            } else {
                // No edge or host property, no spreads → build error
                errors.push(
                    `${sf.getFilePath()}:${v.getStartLineNumber()} — resource "${v.getName()}" ` +
                    `has no \`edge\` or \`host\` property. Physical resources must specify \`edge\`, logical resources must specify \`host\`.`
                );
            }
        }
    }

    if (errors.length) {
        console.error("❌ Resource edge/host validation failed:\n");
        for (const e of errors) {
            console.error(`- ${e}\n`);
        }
        throw new Error("Some resources have non-backtrackable edge/host values");
    }

    return map;
}

/** Get the props object literal from an initializer (factory call or direct object). */
function getPropsObject(init: Node): ObjectLiteralExpression | undefined {
    if (Node.isObjectLiteralExpression(init)) return init;
    if (Node.isCallExpression(init)) {
        const arg = init.getArguments()[0];
        if (arg && Node.isObjectLiteralExpression(arg)) return arg;
    }
    return undefined;
}

/**
 * DFS check: does the given source file (or any of its local import chain)
 * resolve to a file under resourcesDir?
 */
function touchesResources(
    sf: SourceFile,
    resourcesDir: string,
    project: Project,
    visited: Set<string>
): boolean {
    const filePath = sf.getFilePath();
    if (visited.has(filePath)) return false;
    visited.add(filePath);

    for (const imp of sf.getImportDeclarations()) {
        const spec = imp.getModuleSpecifierValue();
        if (!isLocalImport(spec)) continue;

        const resolved = resolveImportPath(sf, spec);
        const resolvedFile = findSourceFile(project, resolved);
        if (!resolvedFile) continue;

        if (isPathWithinParent(resolvedFile.getFilePath(), resourcesDir)) {
            return true;
        }

        if (touchesResources(resolvedFile, resourcesDir, project, visited)) {
            return true;
        }
    }

    return false;
}

/**
 * Walk a builder call chain (e.g. rule({}).onTap(x).run(...)) and find a
 * chained method call by name. Returns the CallExpression for that method.
 */
function findChainedCall(node: Node, methodName: string): CallExpression | undefined {
    let current: Node = node;

    while (Node.isCallExpression(current)) {
        const expr = current.getExpression();

        if (Node.isPropertyAccessExpression(expr) && expr.getName() === methodName) {
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

/** Resolve a relative import specifier to an absolute path (without extension). */
function resolveImportPath(sf: SourceFile, spec: string): string {
    return path.resolve(path.dirname(sf.getFilePath()), spec);
}

/** Find a source file in the project by resolved path (tries .ts extension). */
function findSourceFile(project: Project, resolved: string): SourceFile | undefined {
    return (
        project.getSourceFile(resolved + ".ts") ??
        project.getSourceFile(resolved + "/index.ts") ??
        project.getSourceFile(resolved)
    );
}
