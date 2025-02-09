import { AddBuildingSchema, HousePatchPayload, HousePatchSchema, RemoveBuildingSchema } from "@h2c/common";
import { AppLogger, Route, sendErrorResponse, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import _ from "lodash";
import { DateTime } from "luxon";
import { QueryRunner } from "typeorm";
import { HouseEntity } from "../db/entities/HouseEntity";
import { DefaultHouseData, HouseService } from "../services/house.service";

export class HouseController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    /**
     * POST /hous
     * Creates a dummy house with default values
     */
    @Route("post", "/houses", { authenticate: true, roles: ["user"] })
    @UseQueryRunner()
    async addHouse(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const houseService = new HouseService(queryRunner);

        const newHouse = new HouseEntity({
            data: { ...DefaultHouseData },
            removed: false,
            createdAt: DateTime.now(),
        });

        const savedHouse = await houseService.saveHouse(newHouse);

        AppLogger.info(req, { message: `Created new house ${savedHouse.uuid}` });
        return reply.code(201).send(houseService.mapToHouseResponse(savedHouse));
    }

    /**
     * PATCH /houses/:uuid
     * Patches the JSON data for a specific house
     */
    @Route("patch", "/houses/:uuid", { authenticate: true, roles: ["user"], schema: HousePatchSchema })
    @UseQueryRunner()
    async patchHouse(
        req: FastifyRequest<{ Params: { uuid: string }; Body: HousePatchPayload }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid } = req.params;
        const { key, value } = req.body;

        const houseService = new HouseService(queryRunner);
        const house = await houseService.findHouseByUuid(uuid);

        if (!house) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `House not found by uuid ${uuid}`,
            });
        }

        houseService.ensureHouseData(house);

        if (value === undefined) {
            _.unset(house.data, key);
        } else {
            _.set(house.data, key, value);
        }

        const updatedHouse = await houseService.saveHouse(house);
        AppLogger.info(req, { message: `Updated house ${uuid} with key ${key} and value ${value}` });
        return reply.code(200).send(houseService.mapToHouseResponse(updatedHouse));
    }

    @Route("post", "/houses/:uuid/buildings", { authenticate: true, roles: ["user"], schema: AddBuildingSchema })
    @UseQueryRunner()
    async addBuilding(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(queryRunner);
        const house = await houseService.findHouseByUuid(uuid);

        if (!house) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `House not found by uuid ${uuid}`,
            });
        }

        houseService.addBuilding(house);

        const updatedHouse = await houseService.saveHouse(house);
        AppLogger.info(req, { message: `Added building to house ${uuid}` });
        return reply.code(201).send(houseService.mapToHouseResponse(updatedHouse));
    }

    @Route("delete", "/houses/:uuidHouse/buildings/:uuidBuilding", {
        authenticate: true,
        roles: ["user"],
        schema: RemoveBuildingSchema,
    })
    @UseQueryRunner()
    async removeBuilding(
        req: FastifyRequest<{ Params: { uuidHouse: string; uuidBuilding: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuidHouse, uuidBuilding } = req.params;

        const houseService = new HouseService(queryRunner);
        const house = await houseService.findHouseByUuid(uuidHouse);

        if (!house) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `House not found by uuid ${uuidHouse}`,
            });
        }

        const removed = houseService.removeBuilding(house, uuidBuilding);

        if (removed) {
            const updatedHouse = await houseService.saveHouse(house);
            AppLogger.info(req, { message: `Removed building ${uuidBuilding} from house ${uuidHouse}` });
            return reply.code(200).send(houseService.mapToHouseResponse(updatedHouse));
        } else {
            AppLogger.info(req, {
                message: `Building ${uuidBuilding} was already removed from house ${uuidHouse} earlier`,
            });
            return reply.code(200).send(houseService.mapToHouseResponse(house));
        }
    }

    /**
     * GET /houses/:uuid
     * Fetches the JSON data for a specific house
     */
    @Route("get", "/houses/:uuid", { authenticate: true, roles: ["user"] })
    @UseQueryRunner()
    async getHouse(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(queryRunner);
        const house = await houseService.findHouseByUuid(uuid);

        if (!house) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `House not found by uuid ${uuid}`,
            });
        }

        return reply.code(200).send(houseService.mapToHouseResponse(house));
    }

    @Route("get", "/houses", { authenticate: true, roles: ["user"] })
    @UseQueryRunner()
    async getHouses(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const houseService = new HouseService(queryRunner);
        const houses = await houseService.findAllHouses();

        return reply.code(200).send(houses.map(houseService.mapToHouseResponse));
    }

    /**
     * DELETE /houses/:uuid
     * Marks a house as removed
     */
    @Route("delete", "/houses/:uuid", { authenticate: true, roles: ["user"] })
    @UseQueryRunner()
    async deleteHouse(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(queryRunner);
        const house = await houseService.findHouseByUuid(uuid);

        if (!house) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 404,
                code: "NOT_FOUND",
                message: `House not found by uuid ${uuid}`,
            });
        }

        house.removed = true;
        house.removedAt = DateTime.now();
        await houseService.saveHouse(house);
        AppLogger.info(req, { message: `Deleted house ${uuid}` });
        return reply.code(204).send();
    }

}
