import { PageAppsConfigData, UserRole } from "@uxp/common";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { AppEntity } from "./AppEntity";
import { PageEntity } from "./PageEntity";

/**
 * Defines a single content entry within a page.
 *
 * A page content entry can represent:
 * - a remote app instance
 * - or a local UXP component
 *
 * Each entry has its own configuration, ordering,
 * and access rules, allowing pages to mix and
 * sequence different content types.
 */
@Entity("page_apps")
@Index("IDX_PAGE_APPS_PAGE_ID", ["page"]) // Composite index can also be defined here
@Index("IDX_PAGE_APPS_APP_ID", ["app"])
export class PageAppsEntity {
    constructor(init?: Partial<PageAppsEntity>) {
        Object.assign(this, init);
        if (!this.uuid) {
            this.uuid = uuidv4();
        }
        if (!this.roles) {
            this.roles = [];
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * Stable identifier for this content placement.
     *
     * Used as `contentUuid` when rendering remote apps and
     * to fetch the rewritten HTML entry via:
     *   GET /content/index/:uuid
     *
     * Identifies a single content instance on a page,
     * not the app itself.
     */
    @Column({ type: "char", length: 36, unique: true })
    uuid!: string;

    /**
     * Page this content placement belongs to.
     */
    @ManyToOne(() => PageEntity, (page) => page.contents)
    @JoinColumn({ name: "pageId" })
    page!: PageEntity; // Associated page

    /**
     * Remote app rendered at this content placement.
     *
     * Used only when `internalComponent` is not set.
     * `internalComponent` always takes precedence.
     */
    @ManyToOne(() => AppEntity, { nullable: true })
    @JoinColumn({ name: "appId" })
    app!: AppEntity; // Linked app, if applicable

    /**
     * Name of a dynamically loaded UXP internal component.
     *
     * If set, this page content renders a local UXP React component
     * instead of a remote app.
     *
     * The value must match a key in the dynamic component map:
     * `packages/uxp-ui/src/features/dynamic-components/componentMap.ts`
     */
    @Column({ type: "varchar", nullable: true })
    internalComponent!: string;

    /**
     * Ordering of the content on the page.
     * 
     * Lower values are rendered first.
     */
    @Column("float")
    order!: number;

    /**
     * Per-content override configuration.
     *
     * Allows overriding parts of `AppConfigData` for this specific
     * content placement on a page.
     *
     * Useful when the same app is rendered multiple times with
     * different entry points (e.g. different `index.html` files):
     * `{ "mainEntry": "view.html" }`
     */
    @Column("json", { nullable: true })
    config!: PageAppsConfigData;

    /**
     * Roles required to include this content placement on the page.
     *
     * Content is included only if the current user satisfies the role
     * and access rules of the active route.
     *
     * Evaluated together with route-level access control.
     */
    @Column("simple-array", { nullable: true })
    roles: UserRole[] = ["user"];
}
