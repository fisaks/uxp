import { House, HouseSummary } from "@h2c/common";
import { HouseEntity } from "../db/entities/HouseEntity";

export class HouseMapper {

    static mapToHouseResponse(house: HouseEntity): House {
        return { uuid: house.uuid, version: house.version, ...house.data };
    }

    static mapToHouseSummary(house: HouseEntity): HouseSummary {
        return { uuid: house.uuid, name: house.data.name };
    }
}
