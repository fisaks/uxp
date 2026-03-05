// resolveEmitsTap.ts
import path from "path";
import { Node, Project, SourceFile } from "ts-morph";
import {
    collectRuleFactories,
    getRootCallExpression,
    isLocalImport,
    isPathWithinParent,
    unwrapExpression,
} from "./blueprintAstUtils";

/**
 * Auto-inject `emitsTap: true` into complex resources that appear in
 * `.onTap()` rule triggers.
 *
 * Walks every rule file, finds `.onTap(resource)` calls, traces the
 * resource identifier back through imports to the resource file, and
 * injects `emitsTap: true` into the resource's props object literal
 * unless the author already set it manually.
 */
export async function resolveEmitsTap(opts: {
    resourcesTmpDir: string;
    rulesTmpDir: string;
    tsconfigPath: string;
    factoryTmpPath: string;
}): Promise<void> {
    const { resourcesTmpDir, rulesTmpDir, tsconfigPath, factoryTmpPath } = opts;

    const project = new Project({
        tsConfigFilePath: tsconfigPath,
        skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths(path.join(resourcesTmpDir, "**/*.ts"));
    project.addSourceFilesAtPaths(path.join(rulesTmpDir, "**/*.ts"));
    project.addSourceFilesAtPaths(path.join(factoryTmpPath, "**/*.ts"));

    // Step 1: Collect complex resource factory names from factory files
    const complexFactoryNames = collectComplexFactoryNames(project, factoryTmpPath);

    // Step 2: Walk rule files, find .onTap(resource) calls, collect tapped resource names
    const tappedResourceNames = new Set<string>();

    const ruleFiles = project.getSourceFiles().filter(sf =>
        isPathWithinParent(sf.getFilePath(), rulesTmpDir)
    );

    for (const sf of ruleFiles) {
        const ruleFactories = collectRuleFactories(sf);

        for (const v of sf.getVariableDeclarations()) {
            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);
            if (!Node.isCallExpression(init)) continue;

            const root = getRootCallExpression(init);
            if (!root) continue;

            const rootExpr = root.getExpression();
            if (!Node.isIdentifier(rootExpr) || !ruleFactories.has(rootExpr.getText())) continue;

            // Walk the builder chain and find all .onTap() calls
            collectOnTapResources(init, sf, resourcesTmpDir, project, tappedResourceNames);
        }
    }

    // Step 3: Walk resource files — inject, warn about mismatches
    const resourceFiles = project.getSourceFiles().filter(sf =>
        isPathWithinParent(sf.getFilePath(), resourcesTmpDir)
    );

    for (const sf of resourceFiles) {
        for (const v of sf.getVariableDeclarations()) {
            if (!v.getVariableStatement()?.isExported()) continue;

            const rawInit = v.getInitializer();
            if (!rawInit) continue;

            const init = unwrapExpression(rawInit);

            if (!isComplexFactoryCall(init, complexFactoryNames)) continue;

            const propsObj = Node.isCallExpression(init) ? init.getArguments()[0] : undefined;
            if (!propsObj || !Node.isObjectLiteralExpression(propsObj)) continue;

            const name = v.getName();
            const isTapped = tappedResourceNames.has(name);
            const existingProp = propsObj.getProperty("emitsTap");

            if (existingProp) {
                // Read the boolean literal value
                const manualValue = Node.isPropertyAssignment(existingProp)
                    ? existingProp.getInitializer()?.getText()
                    : undefined;

                // Manual setting — validate against actual rule usage
                if (manualValue === "true" && !isTapped) {
                    console.warn(
                        `⚠️  Complex resource "${name}" has emitsTap: true but no rule uses .onTap(${name})`
                    );
                } else if (manualValue === "false" && isTapped) {
                    console.warn(
                        `⚠️  Complex resource "${name}" has emitsTap: false but a rule uses .onTap(${name})`
                    );
                }
                continue;
            }

            if (!isTapped) continue;

            // Inject emitsTap: true
            propsObj.addPropertyAssignment({
                name: "emitsTap",
                initializer: "true",
            });

            console.log(`ℹ Auto-injected emitsTap: true into complex resource "${name}" (used in .onTap() trigger)`);
        }
    }

    await project.save();
}

/**
 * Collect factory function names that produce complex resources.
 * Checks both @uhn/blueprint's `complex` and project factory wrappers
 * that call through to it.
 */
function collectComplexFactoryNames(project: Project, factoryDir: string): Set<string> {
    const names = new Set<string>(["complex"]);

    for (const sf of project.getSourceFiles()) {
        if (!isPathWithinParent(sf.getFilePath(), factoryDir)) continue;

        for (const fn of sf.getFunctions()) {
            if (!fn.isExported()) continue;

            // Check if the function body calls complex()
            const body = fn.getBody();
            if (!body) continue;

            const text = body.getText();
            if (text.includes("complex(") || text.includes("complex<")) {
                names.add(fn.getName() ?? "");
            }
        }
    }

    names.delete("");
    return names;
}

/**
 * Check if a node is a call to a complex resource factory.
 */
function isComplexFactoryCall(node: Node, complexFactoryNames: Set<string>): boolean {
    if (!Node.isCallExpression(node)) return false;
    const expr = node.getExpression();
    return Node.isIdentifier(expr) && complexFactoryNames.has(expr.getText());
}

/**
 * Walk a builder call chain and collect resource identifiers from .onTap() calls.
 * Traces identifiers back through imports to resource export names.
 */
function collectOnTapResources(
    node: Node,
    ruleFile: SourceFile,
    resourcesDir: string,
    project: Project,
    out: Set<string>,
): void {
    let current: Node = node;

    while (Node.isCallExpression(current)) {
        const expr = current.getExpression();

        if (Node.isPropertyAccessExpression(expr) && expr.getName() === "onTap") {
            const arg = current.getArguments()[0];
            if (arg && Node.isIdentifier(arg)) {
                const resourceName = resolveImportedResourceName(
                    arg.getText(), ruleFile, resourcesDir, project
                );
                if (resourceName) {
                    out.add(resourceName);
                }
            }
            current = expr.getExpression();
            continue;
        }

        if (Node.isPropertyAccessExpression(expr)) {
            current = expr.getExpression();
            continue;
        }

        break;
    }
}

/**
 * Given a local identifier used in a rule file, trace it through imports
 * to find the original export name in a resource file.
 */
function resolveImportedResourceName(
    localName: string,
    ruleFile: SourceFile,
    resourcesDir: string,
    project: Project,
): string | undefined {
    for (const imp of ruleFile.getImportDeclarations()) {
        const spec = imp.getModuleSpecifierValue();
        if (!isLocalImport(spec)) continue;

        const resolved = path.resolve(path.dirname(ruleFile.getFilePath()), spec);
        const resolvedFile =
            project.getSourceFile(resolved + ".ts") ??
            project.getSourceFile(resolved + "/index.ts") ??
            project.getSourceFile(resolved);

        if (!resolvedFile || !isPathWithinParent(resolvedFile.getFilePath(), resourcesDir)) continue;

        for (const named of imp.getNamedImports()) {
            const alias = named.getAliasNode()?.getText();
            if ((alias ?? named.getName()) === localName) {
                return named.getName(); // original export name
            }
        }
    }

    return undefined;
}
