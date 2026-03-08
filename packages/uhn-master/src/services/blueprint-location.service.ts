import { RuntimeLocation } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { BlueprintFileUtil } from "../util/blueprint-file.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";

export type LocationEventMap = {
    locationsReloaded: [locations: RuntimeLocation[]];
    locationsCleared: [];
};

class BlueprintLocationService extends EventEmitter<LocationEventMap> {
    private locations: RuntimeLocation[] = [];
    private locationById: Map<string, RuntimeLocation> = new Map();

    constructor() {
        super();
        ruleRuntimeProcessService.on("onLocationsLoaded", (msg) => {
            AppLogger.info({
                message: `[BlueprintLocationService] Locations loaded from runtime: ${msg.locations.length} location(s).`,
            });
            this.locations = msg.locations ?? [];
            this.locationById.clear();
            for (const loc of this.locations) {
                this.locationById.set(loc.id, loc);
            }
            this.emit("locationsReloaded", this.locations);
            this.writeLocationsToFile();
        });
        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.clearLocations();
        });
    }

    private clearLocations() {
        this.locations = [];
        this.locationById.clear();
        this.emit("locationsCleared");
    }

    private async writeLocationsToFile() {
        try {
            await BlueprintFileUtil.writePrettyJson("locations.json", this.locations);
        } catch (err) {
            AppLogger.error({ message: `[BlueprintLocationService] Failed to write locations to file`, error: err });
        }
    }

    getAllLocations(): RuntimeLocation[] { return this.locations; }
    getLocationById(id: string): RuntimeLocation | undefined { return this.locationById.get(id); }
}

export const blueprintLocationService = new BlueprintLocationService();
