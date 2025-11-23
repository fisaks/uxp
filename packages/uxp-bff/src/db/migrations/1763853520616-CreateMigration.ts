import { MigrationInterface, QueryRunner } from "typeorm";
import { AppEntity } from "../entities/AppEntity";
import { PageEntity } from "../entities/PageEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { RouteEntity } from "../entities/RouteEntity";
import { RouteTagsEntity } from "../entities/RouteTagsEntity";
import { TagEntity } from "../entities/TagEntity";
import env from "../../config/env";

export class CreateMigration1763853520616 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);
        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);

        const uhnApp = await appRepository.save(
            new AppEntity({
                name: "UHN",
                baseUrl: env.REMOTE_HOST_UHN || "http://localhost:3002",
                isActive: true,
                config: { contextPath: "/uhn", indexPage: "index.html" },
            })
        );
        const uhnPage = await pageRepository.save(new PageEntity({ name: "Unified Home Network", identifier: "unified-home-network" }));

        await pageAppsRepository.save([
            new PageAppsEntity({ page: uhnPage, app: uhnApp, order: 1, roles: ["user"] }),
        ])
        await routeRepository.save([
            new RouteEntity({
                identifier: "unified-home-network",
                routePattern: "/unified-home-network/*",
                link: "/unified-home-network/",
                page: uhnPage,
                roles: ["user"],
                accessType: "role-based",
            }),
        ]);
        await this.createRoute(queryRunner, "unified-home-network", "header-menu", 5);
    }

    private async createRoute(queryRunner: QueryRunner, routeIdentifier: string, tagName: string, order?: number): Promise<void> {
        const routeTagsRepository = queryRunner.manager.getRepository(RouteTagsEntity);

        const routeTag = new RouteTagsEntity();
        const route = await queryRunner.manager.getRepository(RouteEntity).findOne({
            where: {
                identifier: routeIdentifier,
            },
        });

        const tag = await queryRunner.manager.getRepository(TagEntity).findOne({
            where: {
                name: tagName,
            },
        });

        routeTag.route = route!;
        routeTag.tag = tag!;
        routeTag.routeOrder = order ?? null;

        await routeTagsRepository.save(routeTag);
        return;
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);
        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);


        const uhnPage = await pageRepository.findOne({ where: { identifier: "unified-home-network" } });
        if (uhnPage) {
            await pageAppsRepository.delete({ page: { id: uhnPage.id } });
        }

        await routeRepository.delete({ identifier: "unified-home-network" });
        await pageRepository.delete({ identifier: "unified-home-network" });
        await appRepository.delete({ name: "UHN" });
    }

}
