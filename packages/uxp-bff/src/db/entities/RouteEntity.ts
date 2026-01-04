import { RouteConfigData, UserRole } from "@uxp/common";
import slugify from "slugify";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PageEntity } from "./PageEntity";
import { RouteTagsEntity } from "./RouteTagsEntity";

/**
 * Defines a navigable route within UXP.
 *
 * Routes:
 * - map URL patterns to pages
 * - control access visibility
 * - participate in navigation via tags
 *
 * Routes do not define content directly; they
 * reference pages, which define what is rendered.
 */

export type AccessType = "unauthenticated" | "authenticated" | "role-based";
@Entity("routes")
export class RouteEntity {
    constructor(init?: Partial<RouteEntity>) {
        Object.assign(this, init);
        if (!this.roles) {
            this.roles = [];
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    /**
      * Unique, system-wide identifier for this route.
      *
      * Used as the stable reference for the route across the system,
      * independent of URL structure or page configuration.
      *
      * Route identifiers are used by route tags to group routes
      * into navigation sets (e.g. header menus, sidebars, profile menus).
      *
      * The identifier is automatically normalized on insert and update:
      * - converted to lowercase
      * - non-URL-safe characters are removed
      *
      * This ensures identifiers are safe to use as keys, URLs, and references.
      */
    @Column({ unique: true, nullable: false })
    identifier!: string;

    /**
     * React Router route pattern for this route.
     *
     * This value is passed directly to React Router as the `path` and may
     * include a trailing wildcard (`*`) to match nested routes.
     *
     * When the pattern ends with `*`, the non-wildcard prefix is treated as
     * the base route path and is propagated to remote apps via the
     * `data-base-route-path` attribute. Remote apps must use this value as
     * their routing base (e.g. React Router `basename`).
     *
     * Example:
     * - `/app/*` → base route path `/app/`
     * - `/login` → no base route path
     */
    @Column()
    routePattern!: string;

    /**
     * Canonical navigation link for this route.
     *
     * Used when generating navigation URLs (e.g. menus and links),
     * especially for routes whose `routePattern` ends with `/*`.
     *
     * For wildcard routes, this value **must end with a trailing `/`**
     * due to React Router matching requirements.
     *
     * Example:
     * - routePattern: `/app/*`
     * - link: `/app/`
     */
    @Column({ nullable: true })
    link!: string;

    /**
     * Page rendered when this route is matched.
     *
     * The referenced PageEntity defines the content layout
     * (local components and/or remote apps) displayed for this route.
     *
     * If undefined, the route may be used for redirects or
     * non-page navigation purposes.
     */
    @ManyToOne(() => PageEntity, { nullable: true })
    @JoinColumn({ name: "pageId" })
    page!: PageEntity;

    /**
     * Optional route-level configuration.
     *
     * Currently supports client-side redirects.
     * When `redirect` is defined, the route will not render a page;
     * instead, the router navigates to the given path.
     *
     * Example:
     * `{ "redirect": "/login" }`
     */
    @Column("json", { nullable: true })
    config!: RouteConfigData;

    /**
    * Defines how access to this route is evaluated.
    *
    * This value is used when resolving both:
    * - which routes are exposed to the client
    * - which route identifiers appear inside navigation tags
    *
    * Access rules:
    * - `"unauthenticated"`: route is visible only to unauthenticated (guest) users
    * - `"authenticated"`: route is visible to any authenticated user, regardless of role
    * - `"role-based"`: route is visible only if the user has at least one of the roles
    *   listed in `roles`
    *
    * This access check is applied consistently to routes, pages, and tagged navigation
    * entries.
    */
    @Column({
        type: "enum",
        enum: ["unauthenticated", "authenticated", "role-based"], // Use string literals directly
        default: "role-based",
    })
    accessType!: AccessType;

    /**
     * Roles required to access this route when `accessType` is `"role-based"`.
     *
     * A route is included if the current user has **at least one**
     * of the roles listed here.
     *
     * This check is applied consistently to:
     * - route availability
     * - page contents rendered for the route
     * - route identifiers exposed via navigation tags
     *
     * Ignored when `accessType` is `"authenticated"` or `"unauthenticated"`.
     */
    @Column("simple-array", { nullable: true })
    roles: UserRole[] = ["user"];

    /**
    * Tag associations for this route.
    *
    * Route tags are used to group routes into named navigation sets
    * (e.g. header menus, sidebars, profile menus).
    *
    * Tags do not affect routing or access control directly; instead,
    * they control where and how routes appear in the UI.
    *
    * Visibility of tagged routes is still filtered by `accessType`
    * and `roles` before being exposed to the client.
    */
    @OneToMany(() => RouteTagsEntity, (routeTag) => routeTag.route)
    routeTags!: RouteTagsEntity[];

    @BeforeInsert()
    @BeforeUpdate()
    generateIdentifier() {
        this.identifier = slugify(this.identifier, { lower: true, strict: true });
    }
}
