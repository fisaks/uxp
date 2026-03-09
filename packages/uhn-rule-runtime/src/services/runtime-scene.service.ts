import type { BlueprintScene, SceneAction } from "@uhn/blueprint";
import { humanizeSceneId, RuntimeScene, RuntimeSceneCommand } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

/** Type guard for scene objects produced by the scene() factory */
function isSceneObject(obj: unknown): obj is BlueprintScene {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as any).id === "string" &&
        "commands" in obj &&
        Array.isArray((obj as any).commands)
    );
}

function serializeCommand(cmd: SceneAction): RuntimeSceneCommand {
    switch (cmd.type) {
        case "setDigitalOutput":
            return { type: "setDigitalOutput", resourceId: cmd.resource.id!, value: cmd.value };
        case "setAnalogOutput":
            return { type: "setAnalogOutput", resourceId: cmd.resource.id!, value: cmd.value };
        case "emitSignal":
            return { type: "emitSignal", resourceId: cmd.resource.id!, value: cmd.value };
    }
}

function serializeScene(scene: BlueprintScene): RuntimeScene {
    return {
        id: scene.id!,
        name: scene.name ?? humanizeSceneId(scene.id!),
        description: scene.description,
        icon: scene.icon,
        commands: scene.commands.map(serializeCommand),
    };
}

async function collectScenes(scenesDir: string): Promise<RuntimeScene[]> {
    if (!(await fs.pathExists(scenesDir))) {
        // scenes/ is optional — return empty without error
        return [];
    }
    const scenes: RuntimeScene[] = [];

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) { await walk(fullPath); continue; }
            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);
            for (const [exportName, obj] of Object.entries(mod)) {
                if (isSceneObject(obj)) {
                    scenes.push(serializeScene(obj));
                } else {
                    runtimeOutput.log({
                        level: "warn",
                        component: "RuntimeSceneService",
                        message: `Skipped non-scene export "${exportName}" in "${fullPath}"`,
                    });
                }
            }
        }
    }
    await walk(scenesDir);
    return scenes;
}

export class RuntimeSceneService {
    private readonly scenes: RuntimeScene[];

    private constructor(scenes: RuntimeScene[]) {
        this.scenes = scenes;
    }

    static async create(scenesDir: string): Promise<RuntimeSceneService> {
        const scenes = await collectScenes(scenesDir);
        runtimeOutput.log({
            level: "info",
            component: "RuntimeSceneService",
            message: `Loaded ${scenes.length} scene(s).`,
        });
        return new RuntimeSceneService(scenes);
    }

    list(): RuntimeScene[] {
        return this.scenes;
    }
}
