import { MigrationInterface, QueryRunner } from "typeorm";
import { AppEntity } from "../entities/AppEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { PageEntity } from "../entities/PageEntity";
import { RouteEntity } from "../entities/RouteEntity";

export class CreateMigration1735424119328 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);

        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);

        pageAppsRepository.delete({});
        appRepository.delete({});
        routeRepository.delete({});
        pageRepository.delete({});
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {}
}
