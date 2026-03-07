import { RuntimeInteractionView } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

export type ViewEventMap = {
    viewsReloaded: [views: RuntimeInteractionView[]];
    viewsCleared: [];
};

class BlueprintViewService extends EventEmitter<ViewEventMap> {
    private views: RuntimeInteractionView[] = [];
    private viewById: Map<string, RuntimeInteractionView> = new Map();

    constructor() {
        super();
        ruleRuntimeProcessService.on("onViewsLoaded", (msg) => {
            AppLogger.info({
                message: `[BlueprintViewService] Views loaded from runtime: ${msg.views.length} view(s).`,
            });
            this.views = msg.views ?? [];
            this.viewById.clear();
            for (const v of this.views) {
                this.viewById.set(v.id, v);
            }
            this.emit("viewsReloaded", this.views);
            this.writeViewsToFile();
        });
        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.clearViews();
        });
    }

    private clearViews() {
        this.views = [];
        this.viewById.clear();
        this.emit("viewsCleared");
    }

    private async writeViewsToFile() {
        try {
            await BlueprintFileUtil.writePrettyJson("views.json", this.views);
        } catch (err) {
            AppLogger.error({ message: `[BlueprintViewService] Failed to write views to file`, error: err });
        }
    }

    getAllViews(): RuntimeInteractionView[] { return this.views; }
    getViewById(id: string): RuntimeInteractionView | undefined { return this.viewById.get(id); }
}

export const blueprintViewService = new BlueprintViewService();
