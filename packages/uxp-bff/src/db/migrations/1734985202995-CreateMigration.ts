import { MigrationInterface, QueryRunner } from "typeorm";
import { PageEntity } from "../entities/PageEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { RouteEntity } from "../entities/RouteEntity";
import { AppEntity } from "../entities/AppEntity";

export class CreateMigration1734985202995 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);

        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);

        const app = await appRepository.findOne({ where: { name: "H2C" } });

        const home2CarePage2 = await pageRepository.save(
            new PageEntity({ name: "Home 2 Care v2", identifier: "home-2-care-v2" })
        );

        await pageAppsRepository.save([
            new PageAppsEntity({ page: home2CarePage2, app: app!, order: 1, roles: ["user"] }),
            new PageAppsEntity({ page: home2CarePage2, app: app!, order: 2, roles: ["user"] }),
        ]);

        await routeRepository.save([
            new RouteEntity({
                routePattern: "/home-2-care-2/*",
                link: "/home-2-care-2/",
                page: home2CarePage2,
                roles: ["user"],
                groupName: "header-menu",
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
