import { Route, UseQueryRunner } from "@uxp/bff-common";
import { ErrorCodes, UserSettingsPayload, UserSettingsResponse, UserSettingsSchema } from "@uxp/common";

import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { User } from "../../db/entities/User";
import { UserSettings } from "../../db/entities/UserSettings";
import { UserService } from "../../services/user.service";
import { sendErrorResponse } from "@uxp/bff-common";

export class UserSettingController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("get", "/my-settings", { authenticate: true, roles: [] })
    @UseQueryRunner()
    async fetchMySettings(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = UserService.getLoggedInUser(req)!;

        const settings = await queryRunner.manager
            .createQueryBuilder(UserSettings, "userSettings")
            .innerJoinAndSelect(User, "user", "user.id = userSettings.userId") // Join User table to UserSettings
            .where("user.uuid = :uuid", { uuid: uuid }) // Filter by user UUID
            .getOne(); // Fetch one result (null if no match)

        reply.send((settings?.settings ?? {}) as UserSettingsResponse);
    }
    @Route("put", "/my-settings", { authenticate: true, roles: [], schema: UserSettingsSchema })
    @UseQueryRunner()
    async updateMySettings(req: FastifyRequest<{ Body: UserSettingsPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = UserService.getLoggedInUser(req)!;

        const user = await queryRunner.manager.findOne(User, {
            where: { uuid: uuid },
        });
        if (!user) {
            return sendErrorResponse({
                statusCode: 500,
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User was not found can't update settings",
            });
        }

        let userSettings = await queryRunner.manager.findOne(UserSettings, {
            where: { userId: user.id },
        });

        if (userSettings) {
            userSettings.settings = req.body;
            await queryRunner.manager.save(UserSettings, userSettings);
        } else {
            userSettings = new UserSettings();
            userSettings.userId = user.id;
            userSettings.settings = req.body;
            await queryRunner.manager.save(UserSettings, userSettings);
        }
        reply.send((userSettings.settings ?? {}) as UserSettingsResponse);
    }
}
