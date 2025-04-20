import { House, HouseGetVersionResponse, HouseSummary } from "@h2c/common";
import { HouseEntity } from "../db/entities/HouseEntity";
import { HouseVersionEntity } from "../db/entities/HouseVersionEntity";

export class HouseMapper {

  static mapToHouseResponse(house: HouseEntity): House {
    return { uuid: house.uuid, ...house.data };
  }

  static mapToHouseSummary(house: HouseEntity): HouseSummary {
    return { uuid: house.uuid, name: house.data.name };
  }
  static toHouseVersionResponse(version: HouseVersionEntity): HouseGetVersionResponse {
    return {
      uuid: version.uuid,
      version: version.id,
      label: version.label,
      data: version.data,
      createdAt: version.createdAt.toUTC().toISO()!,
    };
  }

}
