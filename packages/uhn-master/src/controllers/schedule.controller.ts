import { CreateScheduleSchema, MuteScheduleSchema, UnmuteScheduleSchema, UpdateScheduleSchema, UhnScheduleCreatePayload, UhnScheduleMutePayload, UhnScheduleUnmutePayload, UhnScheduleUpdatePayload } from "@uhn/common";
import { AppLogger, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { FastifyReply, FastifyRequest } from "fastify";
import { blueprintScheduleService } from "../services/blueprint-schedule.service";
import { scheduleMuteService } from "../services/schedule-mute.service";
import { scheduleOrchestratorService } from "../services/schedule-orchestrator.service";
import { userScheduleService } from "../services/user-schedule.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

/** Read current schedule state and broadcast to all WS clients. */
async function broadcastScheduleState() {
    const schedules = blueprintScheduleService.getAllSchedules();
    const userSchedules = await userScheduleService.listForActiveBlueprint();
    const mutes = await scheduleMuteService.listMutesForActiveBlueprint();
    UHNAppServerWebSocketManager.getInstance().broadcastSchedulesMessage({ schedules, userSchedules, mutes });
}

export class ScheduleController {

    @Route("post", "/schedules", { authenticate: true, schema: CreateScheduleSchema })
    @UseQueryRunner({ transactional: true })
    async create(req: FastifyRequest<{ Body: UhnScheduleCreatePayload }>, _reply: FastifyReply) {
        const user = req.user as Token;
        AppLogger.info({ message: `Creating user schedule: ${req.body.name}` });
        const info = await userScheduleService.create(req.body, user.username);
        scheduleOrchestratorService.upsertUserSchedule(info);
        await broadcastScheduleState();
        return info;
    }

    @Route("put", "/schedules/:id", { authenticate: true, schema: UpdateScheduleSchema })
    @UseQueryRunner({ transactional: true })
    async update(req: FastifyRequest<{ Params: { id: string }; Body: UhnScheduleUpdatePayload }>, _reply: FastifyReply) {
        const entityId = parseInt(req.params.id, 10);
        
        AppLogger.info({ message: `Updating user schedule id=${entityId}` });
        const info = await userScheduleService.update(entityId, req.body);
        scheduleOrchestratorService.upsertUserSchedule(info);
        await broadcastScheduleState();
        return info;
    }

    @Route("delete", "/schedules/:id", { authenticate: true })
    @UseQueryRunner({ transactional: true })
    async remove(req: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) {
        const entityId = parseInt(req.params.id, 10);
        AppLogger.info({ message: `Deleting user schedule id=${entityId}` });
        const scheduleId = await userScheduleService.remove(entityId);
        scheduleOrchestratorService.removeUserSchedule(scheduleId);
        await broadcastScheduleState();
        return { id: entityId, scheduleId };
    }

    @Route("post", "/schedules/mute", { authenticate: true, schema: MuteScheduleSchema })
    @UseQueryRunner({ transactional: true })
    async mute(req: FastifyRequest<{ Body: UhnScheduleMutePayload }>, _reply: FastifyReply) {
        const user = req.user as Token;
        const { scheduleId, durationMs } = req.body;
        AppLogger.info({ message: `Muting schedule "${scheduleId}"` });
        const mute = await scheduleMuteService.mute(scheduleId, durationMs, user.username);
        await broadcastScheduleState();
        return mute;
    }

    @Route("post", "/schedules/unmute", { authenticate: true, schema: UnmuteScheduleSchema })
    @UseQueryRunner({ transactional: true })
    async unmute(req: FastifyRequest<{ Body: UhnScheduleUnmutePayload }>, _reply: FastifyReply) {
        const { scheduleId } = req.body;
        AppLogger.info({ message: `Unmuting schedule "${scheduleId}"` });
        await scheduleMuteService.unmute(scheduleId);
        await broadcastScheduleState();
        return { scheduleId };
    }
}
