import { Route, Token, UseQueryRunner } from "@uxp/bff-common";
import { NavigationResponse, NavigationRoute, UserRole } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { AccessType, RouteEntity } from "../../db/entities/RouteEntity";
import { UserService } from "../../services/user.service";

export class NavigationController {
    /**
     * GET /pages/metadata
     * Fetch metadata JSON for a page by basepath.
     */
    @Route("get", "/navigation", { authenticate: false })
    @UseQueryRunner()
    async getNavigation(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const routes: RouteEntity[] = (await queryRunner.manager
            .getRepository("RouteEntity")
            .createQueryBuilder("route")
            .leftJoinAndSelect("route.page", "page") // Include the referenced PageEntity
            .leftJoinAndSelect("page.contents", "contents") // Include related PageAppsEntity
            .orderBy("route.routePattern", "ASC") // Order by route link
            .addOrderBy("contents.order", "ASC") // Then order by contents order
            .getMany()) as unknown as RouteEntity[];

        const user: Token | undefined = UserService.getLoggedInUser(req);
        const isGuest = !user;
        const shouldInclude = (rolesOnElement: UserRole[], accessType?: AccessType) => {
            if (accessType === "unauthenticated") {
                return isGuest;
            }
            if (!isGuest && accessType === "authenticated") {
                return true;
            }
            return rolesOnElement.some((role) => user?.roles.includes(role));
        };
        console.log("user", user);
        return {
            routes: routes
                .filter((f) => shouldInclude(f.roles, f.accessType))
                .map((route) => {
                    return {
                        routePattern: route.routePattern,
                        localizedRoutePattern: route.localizedRoutePattern ?? undefined,
                        link: route.link,
                        localizedLink: route.localizedLink ?? undefined,
                        page: route.page
                            ? {
                                  uuid: route.page.uuid,
                                  identifier: route.page.identifier,
                                  name: route.page.name,
                                  localizedName: route.page.localizedName ?? undefined,
                                  metadata: route.page.metadata ?? undefined,
                                  localizedMetadata: route.page.localizedMetadata ?? undefined,
                                  contents: route.page.contents
                                      .filter((f) => shouldInclude(f.roles, route.accessType))
                                      .map((content) => {
                                          return {
                                              uuid: content.uuid,
                                              internalComponent: content.internalComponent ?? undefined,
                                              //roles: content.roles
                                          };
                                      }),
                              }
                            : undefined,
                        groupName: route.groupName ?? undefined,
                        config: route.config,
                        //unauthenticatedOnly: route.unauthenticatedOnly,
                        //roles: route.roles
                    };
                }) as NavigationRoute[],
        } as NavigationResponse;
    }
}
