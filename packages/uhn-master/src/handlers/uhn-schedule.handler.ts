import type { UHNAppRequestMessage } from "@uhn/common";
import { UhnScheduleCreatePayloadSchema, UhnScheduleDeletePayloadSchema, UhnScheduleMutePayloadSchema, UhnScheduleUnmutePayloadSchema, UhnScheduleUpdatePayloadSchema } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { broadcastAllSchedules } from "../dispatchers/blueprint-schedule.dispatcher";
import { scheduleMuteService } from "../services/schedule-mute.service";
import { scheduleOrchestratorService } from "../services/schedule-orchestrator.service";
import { userScheduleService } from "../services/user-schedule.service";

export class UhnScheduleHandler {

    @WebSocketAction("uhn:schedule:create", { authenticate: true, schema: UhnScheduleCreatePayloadSchema })
    public async createSchedule(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:schedule:create">
    ) {
        const username = wsDetails.user?.username ?? "anonymous";
        AppLogger.info(wsDetails.requestMeta, { message: `Creating user schedule: ${message.payload.name}` });
        const info = await userScheduleService.create(message.payload, username);
        scheduleOrchestratorService.upsertUserSchedule(info);
        await broadcastAllSchedules();
        return message.id ? message : undefined;
    }

    @WebSocketAction("uhn:schedule:update", { authenticate: true, schema: UhnScheduleUpdatePayloadSchema })
    public async updateSchedule(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:schedule:update">
    ) {
        const { id: entityId, ...payload } = message.payload;
        AppLogger.info(wsDetails.requestMeta, { message: `Updating user schedule id=${entityId}` });
        const info = await userScheduleService.update(entityId, payload);
        scheduleOrchestratorService.upsertUserSchedule(info);
        await broadcastAllSchedules();
        return message.id ? message : undefined;
    }

    @WebSocketAction("uhn:schedule:delete", { authenticate: true, schema: UhnScheduleDeletePayloadSchema })
    public async deleteSchedule(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:schedule:delete">
    ) {
        AppLogger.info(wsDetails.requestMeta, { message: `Deleting user schedule id=${message.payload.id}` });
        const scheduleId = await userScheduleService.remove(message.payload.id);
        scheduleOrchestratorService.removeUserSchedule(scheduleId);
        await broadcastAllSchedules();
        return message.id ? message : undefined;
    }

    @WebSocketAction("uhn:schedule:mute", { authenticate: true, schema: UhnScheduleMutePayloadSchema })
    public async muteSchedule(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:schedule:mute">
    ) {
        const { scheduleId, durationMs } = message.payload;
        const username = wsDetails.user?.username ?? "anonymous";
        AppLogger.info(wsDetails.requestMeta, { message: `Muting schedule "${scheduleId}"` });
        await scheduleMuteService.mute(scheduleId, durationMs, username);
        await broadcastAllSchedules();
        return message.id ? message : undefined;
    }

    @WebSocketAction("uhn:schedule:unmute", { authenticate: true, schema: UhnScheduleUnmutePayloadSchema })
    public async unmuteSchedule(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:schedule:unmute">
    ) {
        AppLogger.info(wsDetails.requestMeta, { message: `Unmuting schedule "${message.payload.scheduleId}"` });
        await scheduleMuteService.unmute(message.payload.scheduleId);
        await broadcastAllSchedules();
        return message.id ? message : undefined;
    }
}
