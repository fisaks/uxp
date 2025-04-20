import { AddBuildingSchema, BuildingPatchSchema, HouseCreateVersionPayload, HouseCreateVersionSchema, HouseDeleteSchema, HouseGetSchema, HouseGetVersionSchema, HouseGetVersionsSchema, HousePatchPayload, HousePatchSchema, HouseRestoreVersionSchema, RemoveBuildingSchema } from "@h2c/common";
import { Route, UseQueryRunner } from "@uxp/bff-common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { HouseMapper } from "../mappers/house.mapper";
import { HouseService } from "../services/house.service";

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
    @UseQueryRunner({ transactional: true })
    async addHouse(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const houseService = new HouseService(req, queryRunner);
        const house = await houseService.addHouse();
        return reply.code(201).send(HouseMapper.mapToHouseResponse(house));
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

        const houseService = new HouseService(req, queryRunner);
        const updatedHouse = await houseService.patchHouse(uuid, key, value);

        return reply.code(200).send(HouseMapper.mapToHouseResponse(updatedHouse));
    }

    @Route("post", "/houses/:uuid/buildings", { authenticate: true, roles: ["user"], schema: AddBuildingSchema })
    @UseQueryRunner({ transactional: true })
    async addBuilding(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(req, queryRunner);
        const updatedHouse = await houseService.addBuilding(uuid);
        return reply.code(201).send(HouseMapper.mapToHouseResponse(updatedHouse));
    }

    @Route("delete", "/houses/:uuidHouse/buildings/:uuidBuilding", {
        authenticate: true,
        roles: ["user"],
        schema: RemoveBuildingSchema,
    })
    @UseQueryRunner({ transactional: true })
    async removeBuilding(
        req: FastifyRequest<{ Params: { uuidHouse: string; uuidBuilding: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuidHouse, uuidBuilding } = req.params;

        const houseService = new HouseService(req, queryRunner);
        const house = await houseService.removeBuilding(uuidHouse, uuidBuilding);
        return reply.code(200).send(HouseMapper.mapToHouseResponse(house));
    }

    @Route("patch", "/houses/:uuidHouse/buildings/:uuidBuilding", { authenticate: true, roles: ["user"], schema: BuildingPatchSchema })
    @UseQueryRunner()
    async patchBuilding(
        req: FastifyRequest<{ Params: { uuidHouse: string, uuidBuilding: string }; Body: HousePatchPayload }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuidHouse, uuidBuilding } = req.params;
        const { key, value } = req.body;

        const houseService = new HouseService(req, queryRunner);
        const updatedHouse = await houseService.patchBuilding(uuidHouse, uuidBuilding, key, value);

        return reply.code(200).send(HouseMapper.mapToHouseResponse(updatedHouse));
    }


    /**
     * GET /houses/:uuid
     * Fetches the JSON data for a specific house
     */
    @Route("get", "/houses/:uuid", { authenticate: true, roles: ["user"], schema: HouseGetSchema })
    @UseQueryRunner()
    async getHouse(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(req, queryRunner);
        const house = await houseService.findOneHouse(uuid);
        return reply.code(200).send(HouseMapper.mapToHouseResponse(house));
    }

    @Route("get", "/houses", { authenticate: true, roles: ["user"] })
    @UseQueryRunner()
    async getHouses(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const houseService = new HouseService(req, queryRunner);
        const houses = await houseService.findAllHouses();
        return reply.code(200).send(houses.map(HouseMapper.mapToHouseResponse));
    }

    /**
     * DELETE /houses/:uuid
     * Marks a house as removed
     */
    @Route("delete", "/houses/:uuid", { authenticate: true, roles: ["user"], schema: HouseDeleteSchema })
    @UseQueryRunner({ transactional: true })
    async deleteHouse(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(req, queryRunner);
        await houseService.deleteHouse(uuid);
        return reply.code(204).send();
    }

    @Route("post", "/houses/:uuid/versions", { authenticate: true, roles: ["user"], schema: HouseCreateVersionSchema })
    @UseQueryRunner()
    async createHouseVersion(req: FastifyRequest<{ Params: { uuid: string }, Body: HouseCreateVersionPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;
        const { label } = req.body;

        const houseService = new HouseService(req, queryRunner);
        const version = await houseService.createHouseVersion(uuid, label);

        return reply.code(200).send(version);
    }

    @Route("get", "/houses/:uuid/versions", { authenticate: true, roles: ["user"], schema: HouseGetVersionsSchema })
    @UseQueryRunner()
    async getAllVersions(req: FastifyRequest<{ Params: { uuid: string } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.params;

        const houseService = new HouseService(req, queryRunner);
        const versions = await houseService.getAllHouseVersions(uuid);

        return reply.code(200).send(versions.map(HouseMapper.toHouseVersionResponse));
    }

    @Route("get", "/houses/:uuid/versions/:version", { authenticate: true, roles: ["user"], schema: HouseGetVersionSchema })
    @UseQueryRunner()
    async getOneVersion(req: FastifyRequest<{ Params: { uuid: string, version: number } }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid, version } = req.params;

        const houseService = new HouseService(req, queryRunner);
        const houseVersion = await houseService.getOneHouseVersion(uuid, version);

        return reply.code(200).send(HouseMapper.toHouseVersionResponse(houseVersion));

    }
    @Route("post", "/houses/:uuid/versions/:version/restore", { authenticate: true, roles: ["user"], schema: HouseRestoreVersionSchema })
    @UseQueryRunner({ transactional: true })
    async restoreHouseVersion(req: FastifyRequest<{ Params: { uuid: string, version: number }, Body: HouseCreateVersionPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid, version } = req.params;

        const houseService = new HouseService(req, queryRunner);
        await houseService.restoreHouseVersion(uuid, version);

        return reply.code(204).send();
    }


}
