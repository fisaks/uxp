import { BuildingData, HouseData } from "@h2c/common";
import { AppErrorV2, AppLogger, RequestMetaData } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import _ from "lodash";
import { DateTime } from "luxon";
import { QueryRunner } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { HouseEntity } from "../db/entities/HouseEntity";
import { DocumentService } from "./document.servcie";

export const DefaultHouseData: Omit<HouseData, "documentId"> = Object.freeze({
    name: "",
    address: "",
    details: {},
    buildings: [],
});

export const DefaultBuildingData: Omit<BuildingData, "uuid" | "documentId"> = Object.freeze({
    name: "",
    details: {},
});

export class HouseService {
    private queryRunner: QueryRunner;
    private requestMeta: RequestMetaData;
    constructor(requestMeta: FastifyRequest | RequestMetaData, queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
        this.requestMeta = AppLogger.extractMetadata(requestMeta, true)!;
    }

    async addHouse(): Promise<HouseEntity> {
        const docService = new DocumentService(this.requestMeta, this.queryRunner);
        const houseDetails = await docService.createDocument("house-details");
        const newHouse = new HouseEntity({
            data: { ...DefaultHouseData, documentId: houseDetails.documentId },
            removed: false,
            createdAt: DateTime.now(),
        });

        const savedHouse = await this.saveHouse(newHouse);

        AppLogger.info(this.requestMeta, { message: `Created new house ${savedHouse.uuid}` });
        return savedHouse;

    }

    async patchHouse(uuid: string, key: string, value: string | null | undefined): Promise<HouseEntity> {

        const house = await this.findHouseByUuid(uuid);
        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuid}` });
        }
        await this.ensureHouseData(house);

        if (value === undefined) {
            _.unset(house.data, key);
        } else {
            _.set(house.data, key, value);
        }

        const updatedHouse = await this.saveHouse(house);
        if (key === "name") {
            const docService = new DocumentService(this.requestMeta, this.queryRunner);
            await docService.updateDocumentName(house.data.documentId, value ?? undefined);
        }
        AppLogger.info(this.requestMeta, { message: `Updated house ${uuid} with key ${key} and value ${value}` });
        return updatedHouse;;

    }

    async patchBuilding(uuidHouse: string, uuidBuilding: string, key: string, value: string | null | undefined): Promise<HouseEntity> {

        const house = await this.findHouseByUuid(uuidHouse);
        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuidHouse}` });
        }
        await this.ensureHouseData(house);

        house.data.buildings = house.data.buildings.map((building) => {
            if (building.uuid === uuidBuilding) {
                if (value === undefined) {
                    _.unset(building, key);
                } else {
                    _.set(building, key, value);
                }
            }
            return building;
        });

        const updatedHouse = await this.saveHouse(house);
        if (key === "name") {
            const documentId = house.data.buildings.find(b => b.uuid === uuidBuilding)?.documentId
            if (documentId) {
                const docService = new DocumentService(this.requestMeta, this.queryRunner);
                await docService.updateDocumentName(documentId, value ?? undefined);
            }
        }

        AppLogger.info(this.requestMeta, { message: `Updated building ${uuidBuilding} from house ${uuidHouse} with key ${key} and value ${value}` });
        return updatedHouse;;

    }

    async addBuilding(uuid: string): Promise<HouseEntity> {

        const house = await this.findHouseByUuid(uuid);

        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuid}` });
        }

        await this.ensureHouseData(house);
        const docService = new DocumentService(this.requestMeta, this.queryRunner);
        const buildingDetails = await docService.createDocument("building-details");
        house.data.buildings.push({ ...DefaultBuildingData, uuid: uuidv4(), documentId: buildingDetails.documentId });

        const updatedHouse = await this.saveHouse(house);
        AppLogger.info(this.requestMeta, { message: `Added building to house ${uuid}` });
        return updatedHouse;

    }

    async removeBuilding(uuidHouse: string, buildingUuid: string): Promise<HouseEntity> {
        const house = await this.findHouseByUuid(uuidHouse);

        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuidHouse}` });
        }

        await this.ensureHouseData(house);
        const initialLength = house.data.buildings.length;
        const buildingDocumentId = house.data.buildings.find(b => b.uuid === buildingUuid)?.documentId;
        house.data.buildings = house.data.buildings.filter((b) => b.uuid !== buildingUuid);
        const removed = house.data.buildings.length < initialLength; // Return true if a building was removed

        if (removed) {
            const updatedHouse = await this.saveHouse(house);
            const docService = new DocumentService(this.requestMeta, this.queryRunner);

            if (buildingDocumentId)
                await docService.removeDocument(buildingDocumentId);
            AppLogger.info(this.requestMeta, { message: `Removed building ${buildingUuid} from house ${uuidHouse}` });
            return updatedHouse;
        } else {
            AppLogger.info(this.requestMeta, {
                message: `Building ${buildingUuid} was already removed from house ${uuidHouse} earlier`,
            });
            return house;
        }

    }

    async findOneHouse(uuid: string): Promise<HouseEntity> {
        const house = await this.findHouseByUuid(uuid);
        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuid}` });
        }
        return house;

    }

    async findAllHouses(includeRemoved = false): Promise<HouseEntity[]> {
        const houseRepo = this.queryRunner.manager.getRepository(HouseEntity);
        return houseRepo.find({
            where: { removed: includeRemoved ? undefined : false },
        });
    }

    // Fetch house by UUID
    async findHouseByUuid(uuid: string, includeRemoved = false): Promise<HouseEntity | null> {
        const houseRepo = this.queryRunner.manager.getRepository(HouseEntity);
        return houseRepo.findOne({
            where: { uuid, removed: includeRemoved ? undefined : false },
        });
    }
    async deleteHouse(uuid: string): Promise<void> {
        const docService = new DocumentService(this.requestMeta, this.queryRunner);
        const house = await this.findHouseByUuid(uuid);

        if (!house) {
            throw new AppErrorV2({ statusCode: 404, code: "NOT_FOUND", message: `House not found by uuid ${uuid}` });
        }

        house.removed = true;
        house.removedAt = DateTime.now();
        await this.saveHouse(house);

        const docIds = [
            house.data.documentId,
            ...house.data.buildings.map(b => b.documentId)
        ].filter((id): id is string => !!id); // filter out undefined/null

        await Promise.all(docIds.map(id => docService.removeDocument(id)));

        AppLogger.info(this.requestMeta, { message: `Deleted house ${uuid}` });

    }

    // Ensure house data is initialized
    private async ensureHouseData(house: HouseEntity) {
        if (!house.data) {
            const docService = new DocumentService(this.requestMeta, this.queryRunner);
            const houseDetails = await docService.createDocument("house-details");
            house.data = { ...DefaultHouseData, documentId: houseDetails.documentId };
        }
        if (!Array.isArray(house.data.buildings)) {
            house.data.buildings = [];
        }
        if (!house.data.documentId) {
            const docService = new DocumentService(this.requestMeta, this.queryRunner);
            const houseDetails = await docService.createDocument("house-details");
            house.data = { ...house.data, documentId: houseDetails.documentId };
        }
    }

    // Save updated house
    async saveHouse(house: HouseEntity): Promise<HouseEntity> {
        house.updatedAt = DateTime.now();
        const houseRepo = this.queryRunner.manager.getRepository(HouseEntity);
        return houseRepo.save(house);
    }



}
