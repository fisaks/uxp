import type { UhnScheduleCreatePayload, UhnScheduleUpdatePayload, UserScheduleInfo } from "@uhn/common";
import { AppErrorV2, AppLogger, runBackgroundTask } from "@uxp/bff-common";
import { DateTime } from "luxon";
import { UserScheduleEntity } from "../db/entities/UserScheduleEntity";
import { UserScheduleRepository } from "../repositories/user-schedule.repository";
import { blueprintService } from "./blueprint.service";
const { AppDataSource } = require("../db/typeorm.config");

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
            missedGraceMs: payload.missedGraceMs ?? 0,
            createdBy: username,
        });

        const saved = await UserScheduleRepository.save(entity);
        AppLogger.info({ message: `${LOG_TAG} Created user schedule "${saved.scheduleId}" (${saved.name})` });
        return toUserScheduleInfo(saved);
    }

    async update(id: number, payload: UhnScheduleUpdatePayload): Promise<UserScheduleInfo> {
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

    /** Mark a slot as fired (for one-time date slots). Returns updated info for broadcasting. */
    async markSlotFired(scheduleId: string, slotIndex: number): Promise<UserScheduleInfo | undefined> {
        const blueprintId = await this.getActiveBlueprintId();
        const entity = await UserScheduleRepository.findByScheduleId(blueprintId, scheduleId);
        if (!entity || slotIndex >= entity.slots.length) return undefined;

        // Create new array reference so TypeORM detects the JSON column change
        const updatedSlots = entity.slots.map((slot, i) =>
            i === slotIndex ? { ...slot, firedAt: new Date().toISOString() } : slot
        );
        entity.slots = updatedSlots;
        const saved = await UserScheduleRepository.save(entity);
        AppLogger.info({ message: `${LOG_TAG} Marked slot ${slotIndex} as fired for schedule "${scheduleId}"` });
        return toUserScheduleInfo(saved);
    }

    /** Delete one-time schedules where all slots fired more than 7 days ago. */
    async cleanupCompletedSchedules(): Promise<number> {
        const cutoff = DateTime.now().minus({ days: 7 });
        const entities = await UserScheduleRepository.findAll();
        let removed = 0;

        for (const entity of entities) {
            const allDate = entity.slots.every(s => s.when.kind === "date" && !!s.when.year);
            if (!allDate) continue;
            const allFired = entity.slots.every(s => !!s.firedAt);
            if (!allFired) continue;
            const latestFired = entity.slots.reduce((latest, s) => {
                const dt = DateTime.fromISO(s.firedAt!);
                return dt > latest ? dt : latest;
            }, DateTime.fromMillis(0));
            if (latestFired < cutoff) {
                await UserScheduleRepository.remove(entity);
                AppLogger.info({ message: `${LOG_TAG} Auto-deleted completed schedule "${entity.scheduleId}" (all slots fired > 7 days ago)` });
                removed++;
            }
        }
        return removed;
    }

    /** Schedule daily cleanup of completed one-time schedules.
     *  Runs once on startup, then nightly at a random time between 00:30–01:30. */
    startCleanupSchedule() {
        // Run on startup in case server was down during nightly window
        runBackgroundTask(AppDataSource, async () => {
            const removed = await this.cleanupCompletedSchedules();
            if (removed > 0) {
                AppLogger.info({ message: `${LOG_TAG} Startup cleanup removed ${removed} completed schedule(s)` });
            }
        }).catch(err => {
            AppLogger.error({ message: `${LOG_TAG} Startup cleanup failed: ${err}` });
        });

        const scheduleNext = () => {
            const now = DateTime.now();
            const randomMinute = 30 + Math.floor(Math.random() * 60); // 30–89 min past midnight
            let next = now.startOf("day").plus({ minutes: randomMinute });
            if (next <= now) next = next.plus({ days: 1 });
            const delayMs = next.diff(now).as("milliseconds");

            setTimeout(() => {
                runBackgroundTask(AppDataSource, async () => {
                    const removed = await this.cleanupCompletedSchedules();
                    if (removed > 0) {
                        AppLogger.info({ message: `${LOG_TAG} Cleanup removed ${removed} completed schedule(s)` });
                    }
                }).catch(err => {
                    AppLogger.error({ message: `${LOG_TAG} Cleanup failed: ${err}` });
                }).finally(() => {
                    scheduleNext();
                });
            }, delayMs);

            AppLogger.info({ message: `${LOG_TAG} Next schedule cleanup at ${next.toFormat("HH:mm")}` });
        };
        scheduleNext();
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
