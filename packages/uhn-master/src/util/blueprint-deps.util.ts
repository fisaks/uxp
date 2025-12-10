// packages/uhn-master/src/util/blueprint-deps.util.ts

import path from "path";
import {
    ArrowFunction,
    CallExpression,
    ExportAssignment,
    FunctionExpression,
    Node,
    ParameterDeclaration,
    Project,
    SourceFile,
    SyntaxKind
} from "ts-morph";


export type BlueprintDeps = {
    rules: RuleDeps[];
};

export type TriggerKind =
    | "press"
    | "change"
    | "threshold"
    | "scheduler";

export type TriggerDeps =
    | {
        kind: "press" | "change";
        resourceVar: string; // TS variable name, e.g. kitchen_button_heating
    }
    | {
        kind: "threshold";
        resourceVar: string;
        direction: "rising" | "falling";
        threshold: number;
    }
    | {
        kind: "scheduler";
        cron: string;
    };

export type RuleDeps = {
    id: string;
    file: string;
    triggers: TriggerDeps[];
    resourcesRead: string[];    // variable names seen in state(...)
    resourcesWritten: string[]; // variable names seen in set(...)
    envUsed: string[];          // keys like isDark
    flagsUsed: string[];        // keys like nightMode, vacationMode
};


/**
 * Analyze all rules in the project and return dependency graph for deps.json
 *
 * Assumptions (v1):
 * - Each rule file has a default export created from the DSL:
 *     export default rule("id").onPress(...).run(({ state, set, env, flag }) => { ... });
 * - Triggers are defined via:
 *     .onPress(resource)
 *     .onChange(resource)
 *     .orOnThreshold(resource, "rising" | "falling", 30)
 *     .orOnScheduler("07:00")
 */
export function analyzeBlueprintDependencies(project: Project, sourceDir: string): BlueprintDeps {
    const rules: RuleDeps[] = [];

    for (const sf of project.getSourceFiles()) {
        // Only consider files under rules folder
        if (!sf.getFilePath().includes(`${path.sep}rules${path.sep}`)) {
            continue;
        }

        const ruleDeps = analyzeRuleFile(sf, sourceDir);
        if (ruleDeps) {
            rules.push(ruleDeps);
        }
    }

    return { rules };
}

function analyzeRuleFile(sf: SourceFile, sourceDir: string): RuleDeps | null {
    const exportAssignment = sf.getDefaultExportSymbol()?.getDeclarations()
        .find(d => Node.isExportAssignment(d)) as ExportAssignment | undefined;

    if (!exportAssignment) {
        return null;
    }

    const expr = exportAssignment.getExpression();
    if (!Node.isCallExpression(expr)) {
        return null;
    }

    const { ruleId, triggers, handler } = walkRuleChain(expr);

    if (!ruleId) {
        // Not a DSL rule
        return null;
    }

    const { resourcesRead, resourcesWritten, envUsed, flagsUsed } =
        handler ? analyzeRuleHandler(handler) : {
            resourcesRead: [],
            resourcesWritten: [],
            envUsed: [],
            flagsUsed: [],
        };

    const relFile = path.relative(sourceDir, sf.getFilePath());

    return {
        id: ruleId,
        file: relFile.replace(/\\/g, "/"),
        triggers,
        resourcesRead: Array.from(new Set(resourcesRead)),
        resourcesWritten: Array.from(new Set(resourcesWritten)),
        envUsed: Array.from(new Set(envUsed)),
        flagsUsed: Array.from(new Set(flagsUsed)),
    };
}

/**
 * Walk a chain like:
 *   rule("kitchen_auto_light")
 *     .onPress(kitchen_button_heating)
 *     .orOnThreshold(kitchen_temp, "rising", 30)
 *     .run(({ state, set, env, flag }) => { ... })
 */
function walkRuleChain(
    call: CallExpression,
): { ruleId: string | null; triggers: TriggerDeps[]; handler?: ArrowFunction | FunctionExpression } {
    const triggers: TriggerDeps[] = [];
    let ruleId: string | null = null;
    let handler: ArrowFunction | FunctionExpression | undefined;

    let current: Node = call;

    while (Node.isCallExpression(current)) {
        const callee = current.getExpression();

        if (Node.isPropertyAccessExpression(callee)) {
            const methodName = callee.getName();
            const args = current.getArguments();

            switch (methodName) {
                case "onPress":
                case "onChange": {
                    const resourceArg = args[0];
                    const resourceVar = resourceArg?.getText() ?? "UNKNOWN";
                    triggers.push({
                        kind: methodName === "onPress" ? "press" : "change",
                        resourceVar,
                    });
                    current = callee.getExpression();
                    continue;
                }
                case "orOnThreshold": {
                    const [resourceArg, dirArg, thrArg] = args;
                    const resourceVar = resourceArg?.getText() ?? "UNKNOWN";
                    const directionLiteral = dirArg?.asKind(SyntaxKind.StringLiteral);
                    const dir = (directionLiteral?.getLiteralText() ?? "rising") as
                        | "rising"
                        | "falling";
                    const thresholdNum = thrArg?.asKind(SyntaxKind.NumericLiteral);
                    const threshold = thresholdNum ? Number(thresholdNum.getLiteralValue()) : 0;
                    triggers.push({
                        kind: "threshold",
                        resourceVar,
                        direction: dir,
                        threshold,
                    });
                    current = callee.getExpression();
                    continue;
                }
                case "orOnScheduler": {
                    const [cronArg] = args;
                    const cronLiteral = cronArg?.asKind(SyntaxKind.StringLiteral);
                    if (cronLiteral) {
                        triggers.push({
                            kind: "scheduler",
                            cron: cronLiteral.getLiteralText(),
                        });
                    }
                    current = callee.getExpression();
                    continue;
                }
                case "run": {
                    const firstArg = args[0];
                    if (Node.isArrowFunction(firstArg) || Node.isFunctionExpression(firstArg)) {
                        handler = firstArg;
                    }
                    current = callee.getExpression();
                    continue;
                }
                default: {
                    current = callee.getExpression();
                    continue;
                }
            }
        } else if (Node.isCallExpression(callee)) {
            // rare: nested call as callee
            current = callee;
        } else if (Node.isIdentifier(callee) && callee.getText() === "rule") {
            // base call: rule("id")
            const [idArg] = current.getArguments();
            const idLiteral = idArg?.asKind(SyntaxKind.StringLiteral);
            if (idLiteral) {
                ruleId = idLiteral.getLiteralText();
            }
            break;
        } else {
            break;
        }
    }

    return { ruleId, triggers: triggers.reverse(), handler };
}

/**
 * Analyze the .run(({ state, set, env, flag }) => { ... }) handler
 * and extract:
 *  - resourcesRead from state(...)
 *  - resourcesWritten from set(...)
 *  - envUsed from env.xxx access
 *  - flagsUsed from flag.xxx access
 */
function analyzeRuleHandler(handler: ArrowFunction | FunctionExpression) {
    const resourcesRead: string[] = [];
    const resourcesWritten: string[] = [];
    const envUsed: string[] = [];
    const flagsUsed: string[] = [];

    const param = handler.getParameters()[0];

    let stateName = "state";
    let setName = "set";
    let envName = "env";
    let flagName = "flag";

    if (param) {
        const names = extractDestructuringNames(param);
        stateName = names.stateName;
        setName = names.setName;
        envName = names.envName;
        flagName = names.flagName;
    }

    handler.forEachDescendant((node) => {
        // state(resource)
        if (Node.isCallExpression(node)) {
            const expr = node.getExpression();

            if (Node.isIdentifier(expr) && expr.getText() === stateName) {
                const [arg] = node.getArguments();
                if (arg) resourcesRead.push(arg.getText());
            }

            if (Node.isIdentifier(expr) && expr.getText() === setName) {
                const [arg] = node.getArguments();
                if (arg) resourcesWritten.push(arg.getText());
            }
        }

        // env.xxx or flag.xxx
        if (Node.isPropertyAccessExpression(node)) {
            const expr = node.getExpression();

            if (Node.isIdentifier(expr) && expr.getText() === envName) {
                envUsed.push(node.getName());
            }

            if (Node.isIdentifier(expr) && expr.getText() === flagName) {
                flagsUsed.push(node.getName());
            }
        }

        // flag.xxx = ...
        if (Node.isBinaryExpression(node)) {
            const left = node.getLeft();

            if (Node.isPropertyAccessExpression(left)) {
                const expr = left.getExpression();
                if (Node.isIdentifier(expr) && expr.getText() === flagName) {
                    flagsUsed.push(left.getName());
                }
            }
        }
    });

    return {
        resourcesRead,
        resourcesWritten,
        envUsed,
        flagsUsed,
    };
}

function extractDestructuringNames(param: ParameterDeclaration): {
    stateName: string;
    setName: string;
    envName: string;
    flagName: string;
} {
    let stateName = "state";
    let setName = "set";
    let envName = "env";
    let flagName = "flag";

    const nameNode = param.getNameNode();

    // Check for destructured param: ({ state, set, env, flag })
    if (Node.isObjectBindingPattern(nameNode)) {
        for (const elem of nameNode.getElements()) {
            const prop = elem.getPropertyNameNode()?.getText() ?? elem.getName();
            const local = elem.getNameNode().getText(); // local identifier name

            switch (prop) {
                case "state": stateName = local; break;
                case "set": setName = local; break;
                case "env": envName = local; break;
                case "flag": flagName = local; break;
            }
        }
    }

    return { stateName, setName, envName, flagName };
}
