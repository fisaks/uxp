import type { UhnScheduleCreatePayload, UhnScheduleUpdatePayload, UserScheduleInfo } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { UserScheduleEntity } from "../db/entities/UserScheduleEntity";
import { UserScheduleRepository } from "../repositories/user-schedule.repository";
import { blueprintService } from "./blueprint.service";

const LOG_TAG = "[UserScheduleService]";

function generateScheduleId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toUserScheduleInfo(entity: UserScheduleEntity): UserScheduleInfo {
    return {
        id: entity.id,
        blueprintIdentifier: entity.blueprintIdentifier,
        scheduleId: entity.scheduleId,
        name: entity.name,
        slots: entity.slots,
        missedGraceMs: entity.missedGraceMs,
        createdBy: entity.createdBy,
        createdAt: entity.createdAt?.toISO() ?? "",
        updatedAt: entity.updatedAt?.toISO() ?? "",
    };
}

/**
 * CRUD operations for user-created schedules.
 * Schedules are bound to the active blueprint — loading a different blueprint
 * makes them dormant. Muting is handled separately by ScheduleMuteService.
 */
class UserScheduleService {

    async listForActiveBlueprint(): Promise<UserScheduleInfo[]> {
        const blueprintId = await this.getActiveBlueprintId();
        const entities = await UserScheduleRepository.findByBlueprint(blueprintId);
        return entities.map(toUserScheduleInfo);
    }

    async create(payload: UhnScheduleCreatePayload, username: string): Promise<UserScheduleInfo> {
        const blueprintId = await this.getActiveBlueprintId();

        const entity = new UserScheduleEntity({
            blueprintIdentifier: blueprintId,
            scheduleId: generateScheduleId(),
            name: payload.name,
            slots: payload.slots,
            missedGraceMs: payload.missedGraceMs ?? 900_000, // default 15min
            createdBy: username,
        });

        const saved = await UserScheduleRepository.save(entity);
        AppLogger.info({ message: `${LOG_TAG} Created user schedule "${saved.scheduleId}" (${saved.name})` });
        return toUserScheduleInfo(saved);
    }

    async update(id: number, payload: Partial<UhnScheduleCreatePayload>): Promise<UserScheduleInfo> {
        const entity = await this.findOwnedOrThrow(id);

        if (payload.name !== undefined) entity.name = payload.name;
        if (payload.slots !== undefined) entity.slots = payload.slots;
        if (payload.missedGraceMs !== undefined) entity.missedGraceMs = payload.missedGraceMs;

        const saved = await UserScheduleRepository.save(entity);
        AppLogger.info({ message: `${LOG_TAG} Updated user schedule "${saved.scheduleId}"` });
        return toUserScheduleInfo(saved);
    }

    async remove(id: number): Promise<string> {
        const entity = await this.findOwnedOrThrow(id);
        const { scheduleId } = entity;
        await UserScheduleRepository.remove(entity);
        AppLogger.info({ message: `${LOG_TAG} Deleted user schedule "${scheduleId}"` });
        return scheduleId;
    }

    private async getActiveBlueprintId(): Promise<string> {
        const active = await blueprintService.getActiveBlueprint();
        if (!active) {
            throw new AppErrorV2({ statusCode: 400, code: "VALIDATION", message: "No blueprint is currently active" });
        }
        return active.identifier;
    }

    private async findOwnedOrThrow(id: number): Promise<UserScheduleEntity> {
        const entity = await UserScheduleRepository.findById(id);
        if (!entity) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `User schedule with id ${id} not found` });
        }
        // Verify it belongs to the active blueprint
        const blueprintId = await this.getActiveBlueprintId();
        if (entity.blueprintIdentifier !== blueprintId) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `User schedule with id ${id} not found for active blueprint` });
        }
        return entity;
    }
}

export const userScheduleService = new UserScheduleService();
