import { RuntimeScene } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

export type SceneEventMap = {
    scenesReloaded: [scenes: RuntimeScene[]];
    scenesCleared: [];
};

class BlueprintSceneService extends EventEmitter<SceneEventMap> {
    private scenes: RuntimeScene[] = [];
    private sceneById: Map<string, RuntimeScene> = new Map();

    constructor() {
        super();
        ruleRuntimeProcessService.on("onScenesLoaded", (msg) => {
            AppLogger.info({
                message: `[BlueprintSceneService] Scenes loaded from runtime: ${msg.scenes.length} scene(s).`,
            });
            this.scenes = msg.scenes ?? [];
            this.sceneById.clear();
            for (const s of this.scenes) {
                this.sceneById.set(s.id, s);
            }
            this.emit("scenesReloaded", this.scenes);
            this.writeScenesToFile();
        });
        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.clearScenes();
        });
    }

    private clearScenes() {
        this.scenes = [];
        this.sceneById.clear();
        this.emit("scenesCleared");
    }

    private async writeScenesToFile() {
        try {
            await BlueprintFileUtil.writePrettyJson("scenes.json", this.scenes);
        } catch (err) {
            AppLogger.error({ message: `[BlueprintSceneService] Failed to write scenes to file`, error: err });
        }
    }

    getAllScenes(): RuntimeScene[] { return this.scenes; }
    getSceneById(id: string): RuntimeScene | undefined { return this.sceneById.get(id); }
}

export const blueprintSceneService = new BlueprintSceneService();
