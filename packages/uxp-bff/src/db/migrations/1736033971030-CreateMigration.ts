import { MigrationInterface, QueryRunner } from "typeorm";
import env from "../../config/env";
import { AppEntity } from "../entities/AppEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { PageEntity } from "../entities/PageEntity";
import { RouteEntity } from "../entities/RouteEntity";
import { RouteTagsEntity } from "../entities/RouteTagsEntity";
import { TagEntity } from "../entities/TagEntity";

export class CreateMigration1736033971030 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);
        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);
        const tagRepository = queryRunner.manager.getRepository(TagEntity);
        const routeTagRepository = queryRunner.manager.getRepository(RouteTagsEntity);

        pageAppsRepository.delete({});
        appRepository.delete({});
        routeRepository.delete({});
        pageRepository.delete({});
        tagRepository.delete({});
        routeTagRepository.delete({});

        const h2c = await appRepository.save(
            new AppEntity({
                name: "H2C",
                baseUrl: env.REMOTE_HOST_H2C,
                isActive: true,
                config: { contextPath: "/h2c", indexPage: "index.html" },
            })
        );

        const demo = await appRepository.save(
            new AppEntity({
                name: "uxp-demo",
                baseUrl: env.REMOTE_HOST_DEMO,
                isActive: true,
                config: { contextPath: "/demo", indexPage: "index.html" },
            })
        );

        const home2CarePage = await pageRepository.save(new PageEntity({ name: "Home 2 Care", identifier: "home-2-care" }));
        const uxpDemoPage = await pageRepository.save(
            new PageEntity({
                name: "UXP Nav Demo",
                identifier: "uxp-demo-page",
                config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" },
            })
        );
        const multiAppPage = await pageRepository.save(new PageEntity({
            name: "Multiple Apps Demo",
            identifier: "multi-app-page",
            config: { pageType: "leftNavigation", routeLinkGroup: "demo-links" }
        }));
        const selfNavDemoPage = await pageRepository.save(new PageEntity({ name: "Self Nav Demo", identifier: "self-nav-app-page" }));

        const controlPanelPage = await pageRepository.save(new PageEntity({ name: "Control Panel", identifier: "control-panel" }));

        const loginPage = await pageRepository.save(new PageEntity({ name: "Login", identifier: "login" }));
        const registerPage = await pageRepository.save(new PageEntity({ name: "Register", identifier: "register" }));
        const registerPageThankYou = await pageRepository.save(
            new PageEntity({ name: "RegisterThankYou", identifier: "register-thank-you" })
        );
        const myProfilePage = await pageRepository.save(new PageEntity({ name: "My Profile", identifier: "my-profile" }));
        const mySettingsPage = await pageRepository.save(new PageEntity({ name: "My Settings", identifier: "my-settings" }));
        const startPage = await pageRepository.save(new PageEntity({ name: "Start Page", identifier: "start-page" }));

        await pageAppsRepository.save([
            new PageAppsEntity({ page: home2CarePage, app: h2c, order: 1, roles: ["user"] }),
            new PageAppsEntity({ page: uxpDemoPage, app: demo, order: 1, roles: ["user"], config: { "indexPage": "view.html" } }),
            new PageAppsEntity({ page: selfNavDemoPage, app: demo, order: 1, roles: ["user"] }),

            new PageAppsEntity({ page: multiAppPage, app: demo, order: 1, roles: ["user"], config: { "indexPage": "view.html" } }),
            new PageAppsEntity({ page: multiAppPage, app: demo, order: 2, roles: ["user"], config: { "indexPage": "view.html" } }),

            new PageAppsEntity({ page: loginPage, order: 1, roles: undefined, internalComponent: "LoginPage" }),
            new PageAppsEntity({ page: registerPage, order: 1, roles: undefined, internalComponent: "RegisterPage" }),
            new PageAppsEntity({
                page: registerPageThankYou,
                order: 1,
                roles: undefined,
                internalComponent: "RegistrationThankYouPage",
            }),
            new PageAppsEntity({ page: myProfilePage, order: 1, roles: ["user"], internalComponent: "MyProfilePage" }),
            new PageAppsEntity({
                page: mySettingsPage,
                order: 1,
                roles: ["user"],
                internalComponent: "MySettingsPage",
            }),
            new PageAppsEntity({ page: startPage, order: 1, roles: ["user"], internalComponent: "StartPage" }),
            new PageAppsEntity({
                page: controlPanelPage,
                order: 1,
                roles: ["admin"],
                internalComponent: "ControlPanelPage",
            }),
        ]);

        await tagRepository.save([
            new TagEntity(new TagEntity({ name: "header-menu" })),
            new TagEntity(new TagEntity({ name: "profile-icon" })),
            new TagEntity(new TagEntity({ name: "demo-links" })),
        ]);
        await routeRepository.save([
            new RouteEntity({
                identifier: "home-2-care",
                routePattern: "/home-2-care/*",
                link: "/home-2-care/",
                page: home2CarePage,
                roles: ["user"],
                //groupName: "header-menu",
                accessType: "role-based",
            }),
            new RouteEntity({
                identifier: "demo-app-multi-app",
                routePattern: "/demo-app/multi-app",
                link: "/demo-app/multi-app",
                page: multiAppPage,
                roles: ["user"],
                //groupName: "header-menu",
                accessType: "role-based",
            }),
            new RouteEntity({
                identifier: "demo-app",
                routePattern: "/demo-app/*",
                link: "/demo-app/",
                page: uxpDemoPage,
                roles: ["user"],
                //groupName: "header-menu",
                accessType: "role-based",
            }),
            new RouteEntity({
                identifier: "self-nav-demo-app",
                routePattern: "/self-nav-demo/*",
                link: "/self-nav-demo/",
                page: selfNavDemoPage,
                roles: ["user"],
                //groupName: "header-menu",
                accessType: "role-based",
            }),
            new RouteEntity({
                identifier: "auth-root",
                routePattern: "/",
                link: "/",
                page: startPage,
                roles: [],
                //groupName: "header-menu",
                accessType: "authenticated",
            }),
            new RouteEntity({
                identifier: "login",
                routePattern: "/login",
                link: "/login",
                page: loginPage,
                roles: undefined,
                //groupName: "unauthenticated",
                accessType: "unauthenticated",
            }),
            new RouteEntity({
                identifier: "register",
                routePattern: "/register",
                link: "/register",
                page: registerPage,
                roles: undefined,
                //groupName: "unauthenticated",
                accessType: "unauthenticated",
            }),
            new RouteEntity({
                identifier: "register-thank-you",
                routePattern: "/register-thank-you",
                link: "/register-thank-you",
                page: registerPageThankYou,
                roles: undefined,
                //groupName: "unauthenticated",
                accessType: "unauthenticated",
            }),
            new RouteEntity({
                identifier: "my-profile",
                routePattern: "/my-profile",
                link: "/my-profile",
                page: myProfilePage,
                roles: [],
                accessType: "authenticated",
                //groupName: "profile-icon",
            }),
            new RouteEntity({
                identifier: "my-settings",
                routePattern: "/my-settings",
                link: "/my-settings",
                page: mySettingsPage,
                roles: [],
                accessType: "authenticated",
                //groupName: "profile-icon",
            }),
            new RouteEntity({
                identifier: "unauth-default",
                routePattern: "*",
                roles: undefined,
                accessType: "unauthenticated",
                //groupName: "unauthenticated",
                config: { redirect: "/login" },
            }),
            new RouteEntity({
                identifier: "auth-default",
                routePattern: "*",
                roles: [],
                config: { redirect: "/" },
                accessType: "authenticated",
            }),
            new RouteEntity({
                identifier: "control-panel-root",
                routePattern: "/control-panel/*",
                roles: ["admin"],
                accessType: "role-based",
                link: "/control-panel/",
                page: controlPanelPage,
            }),
        ]);
        await this.createRoute(queryRunner, "auth-root", "header-menu", 1);
        await this.createRoute(queryRunner, "home-2-care", "header-menu", 2);
        await this.createRoute(queryRunner, "demo-app", "header-menu", 3);
        await this.createRoute(queryRunner, "self-nav-demo-app", "header-menu", 4);

        await this.createRoute(queryRunner, "my-settings", "profile-icon", 1);
        await this.createRoute(queryRunner, "my-profile", "profile-icon", 2);
        await this.createRoute(queryRunner, "control-panel-root", "profile-icon", 3);


        await this.createRoute(queryRunner, "demo-app", "demo-links",1);
        await this.createRoute(queryRunner, "demo-app-multi-app", "demo-links",2);
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
        const tagRepository = queryRunner.manager.getRepository(TagEntity);
        const routeTagRepository = queryRunner.manager.getRepository(RouteTagsEntity);

        pageAppsRepository.delete({});
        appRepository.delete({});
        routeRepository.delete({});
        pageRepository.delete({});
        tagRepository.delete({});
        routeTagRepository.delete({});
    }
}
