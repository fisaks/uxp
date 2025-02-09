import { BuildingData, House, HouseData, HouseSummary } from "@h2c/common";
import { DateTime } from "luxon";
import { QueryRunner } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { HouseEntity } from "../db/entities/HouseEntity";

export const DefaultHouseData: HouseData = Object.freeze({
    name: "New House",
    address: "Unknown Address",
    details: {},
    buildings: [],
});

export const DefaultBuildingData: Omit<BuildingData, "uuid"> = Object.freeze({
    name: "New Building",
    details: {},
});

export class HouseService {
    private queryRunner: QueryRunner;
    constructor(queryRunner: QueryRunner) {
        this.queryRunner = queryRunner;
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

    // Ensure house data is initialized
    ensureHouseData(house: HouseEntity): void {
        if (!house.data) {
            house.data = { ...DefaultHouseData };
        }
        if (!Array.isArray(house.data.buildings)) {
            house.data.buildings = [];
        }
    }

    // Save updated house
    async saveHouse(house: HouseEntity): Promise<HouseEntity> {
        house.updatedAt = DateTime.now();
        const houseRepo = this.queryRunner.manager.getRepository(HouseEntity);
        return houseRepo.save(house);
    }

    // Map house entity to the API response structure
    mapToHouseResponse(house: HouseEntity): House {
        return { uuid: house.uuid, version: house.version, ...house.data };
    }

    mapToHouseSummary(house: HouseEntity): HouseSummary {
        return { uuid: house.uuid, name: house.data.name };
    }

    // Add a new building
    addBuilding(house: HouseEntity): void {
        this.ensureHouseData(house);
        house.data.buildings.push({ ...DefaultBuildingData, uuid: uuidv4() });
    }

    // Remove a building by UUID
    removeBuilding(house: HouseEntity, buildingUuid: string): boolean {
        this.ensureHouseData(house);
        const initialLength = house.data.buildings.length;
        house.data.buildings = house.data.buildings.filter((b) => b.uuid !== buildingUuid);
        return house.data.buildings.length < initialLength; // Return true if a building was removed
    }
}
