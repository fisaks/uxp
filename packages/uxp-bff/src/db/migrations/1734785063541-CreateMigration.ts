import { MigrationInterface, QueryRunner } from "typeorm";
import { AppEntity } from "../entities/AppEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { PageEntity } from "../entities/PageEntity";
import { RouteEntity } from "../entities/RouteEntity";

export class CreateMigration1734785063541 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);

        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);

        pageAppsRepository.delete({});
        appRepository.delete({});
        routeRepository.delete({});
        pageRepository.delete({});

        const app = await appRepository.save(
            new AppEntity({
                name: "H2C",
                baseUrl: "http://localhost:3010",
                isActive: true,
                config: { contextPath: "/", indexPage: "index.html" },
            })
        );

        const home2CarePage = await pageRepository.save(
            new PageEntity({ name: "Home 2 Care", identifier: "home-2-care" })
        );

        const loginPage = await pageRepository.save(new PageEntity({ name: "Login", identifier: "login" }));
        const registerPage = await pageRepository.save(new PageEntity({ name: "Register", identifier: "register" }));
        const myProfilePage = await pageRepository.save(
            new PageEntity({ name: "My Profile", identifier: "my-profile" })
        );
        const mySettingsPage = await pageRepository.save(
            new PageEntity({ name: "My Settings", identifier: "my-settings" })
        );
        const startPage = await pageRepository.save(new PageEntity({ name: "Start Page", identifier: "start-page" }));

        await pageAppsRepository.save([
            new PageAppsEntity({ page: home2CarePage, app: app, order: 1, roles: ["user"] }),
            new PageAppsEntity({ page: loginPage, order: 1, roles: undefined, internalComponent: "LoginPage" }),
            new PageAppsEntity({ page: registerPage, order: 1, roles: undefined, internalComponent: "RegisterPage" }),
            new PageAppsEntity({ page: myProfilePage, order: 1, roles: ["user"], internalComponent: "MyProfilePage" }),
            new PageAppsEntity({
                page: mySettingsPage,
                order: 1,
                roles: ["user"],
                internalComponent: "MySettingsPage",
            }),
            new PageAppsEntity({ page: startPage, order: 1, roles: ["user"], internalComponent: "StartPage" }),
        ]);

        await routeRepository.save([
            new RouteEntity({
                routePattern: "/home-2-care/*",
                link: "/home-2-care/",
                page: home2CarePage,
                roles: ["user"],
                groupName: "header-menu",
            }),
            new RouteEntity({
                routePattern: "/",
                link: "/",
                page: startPage,
                roles: ["user"],
                groupName: "header-menu",
            }),
            new RouteEntity({
                routePattern: "/login",
                link: "/login",
                page: loginPage,
                roles: undefined,
                groupName: "unauthenticated",
                unauthenticatedOnly: true,
            }),
            new RouteEntity({
                routePattern: "/register",
                link: "/register",
                page: registerPage,
                roles: undefined,
                groupName: "unauthenticated",
                unauthenticatedOnly: true,
            }),
            new RouteEntity({
                routePattern: "/my-profile",
                link: "/my-profile",
                page: myProfilePage,
                roles: ["user"],
                groupName: "profile-icon",
            }),
            new RouteEntity({
                routePattern: "/my-settings",
                link: "/my-settings",
                page: mySettingsPage,
                roles: ["user"],
                groupName: "profile-icon",
            }),
            new RouteEntity({
                routePattern: "*",
                roles: undefined,
                unauthenticatedOnly: true,
                groupName: "unauthenticated",
                config: { redirect: "/login" },
            }),
            new RouteEntity({ routePattern: "*", roles: [], config: { redirect: "/" } }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
