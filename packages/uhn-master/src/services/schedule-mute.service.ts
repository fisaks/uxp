import type { ScheduleMuteInfo } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { DateTime } from "luxon";
import { ScheduleMuteEntity } from "../db/entities/ScheduleMuteEntity";
import { ScheduleMuteRepository } from "../repositories/schedule-mute.repository";
import { blueprintService } from "./blueprint.service";

const LOG_TAG = "[ScheduleMuteService]";

function toScheduleMuteInfo(entity: ScheduleMuteEntity): ScheduleMuteInfo {
    return {
        scheduleId: entity.scheduleId,
        mutedUntil: entity.mutedUntil?.toISO() ?? null,
        mutedBy: entity.mutedBy,
    };
}

/**
 * Manages mute state for all schedules (blueprint and user).
 * A muted schedule exists as a row in schedule_mute. Unmuting deletes the row.
 */
class ScheduleMuteService {

    async listMutesForActiveBlueprint(): Promise<ScheduleMuteInfo[]> {
        const blueprintId = await this.getActiveBlueprintId();
        const entities = await ScheduleMuteRepository.findByBlueprint(blueprintId);
        const now = DateTime.now();
        const active: ScheduleMuteInfo[] = [];
        for (const entity of entities) {
            if (entity.mutedUntil && entity.mutedUntil < now) {
                // Expired — clean up
                await ScheduleMuteRepository.remove(entity);
                continue;
            }
            active.push(toScheduleMuteInfo(entity));
        }
        return active;
    }

    async isMuted(scheduleId: string): Promise<boolean> {
        const blueprintId = await this.getActiveBlueprintId();
        const entity = await ScheduleMuteRepository.findByScheduleId(blueprintId, scheduleId);
        if (!entity) return false;

        // Check if timed mute has expired
        if (entity.mutedUntil && entity.mutedUntil < DateTime.now()) {
            await ScheduleMuteRepository.remove(entity);
            return false;
        }
        return true;
    }

    async mute(scheduleId: string, durationMs: number | null | undefined, username: string): Promise<ScheduleMuteInfo> {
        const blueprintId = await this.getActiveBlueprintId();
        let entity = await ScheduleMuteRepository.findByScheduleId(blueprintId, scheduleId);

        if (entity) {
            entity.mutedUntil = durationMs != null ? DateTime.now().plus({ milliseconds: durationMs }) : null;
            entity.mutedBy = username;
        } else {
            entity = new ScheduleMuteEntity({
                blueprintIdentifier: blueprintId,
                scheduleId,
                mutedUntil: durationMs != null ? DateTime.now().plus({ milliseconds: durationMs }) : null,
                mutedBy: username,
            });
        }

        const saved = await ScheduleMuteRepository.save(entity);
        AppLogger.info({ message: `${LOG_TAG} Muted schedule "${scheduleId}" ${durationMs != null ? `for ${durationMs}ms` : "indefinitely"}` });
        return toScheduleMuteInfo(saved);
    }

    async unmute(scheduleId: string): Promise<void> {
        const blueprintId = await this.getActiveBlueprintId();
        const entity = await ScheduleMuteRepository.findByScheduleId(blueprintId, scheduleId);
        if (!entity) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `No mute found for schedule "${scheduleId}"` });
        }

        await ScheduleMuteRepository.remove(entity);
        AppLogger.info({ message: `${LOG_TAG} Unmuted schedule "${scheduleId}"` });
    }

    private async getActiveBlueprintId(): Promise<string> {
        const active = await blueprintService.getActiveBlueprint();
        if (!active) {
            throw new AppErrorV2({ statusCode: 400, code: "VALIDATION", message: "No blueprint is currently active" });
        }
        return active.identifier;
    }
}

export const scheduleMuteService = new ScheduleMuteService();
