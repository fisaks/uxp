import { PageConfigData } from "@uxp/common";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PageAppsEntity } from "./PageAppsEntity";

/**
 * Represents an addressable page within UXP.
 *
 * Pages define layout and composition, not routing.
 * A page can contain:
 * - local UXP components
 * - one or more remote apps
 *
 * Pages are rendered when referenced by a RouteEntity.
 */
@Entity("pages")
export class PageEntity {
    constructor(init?: Partial<PageEntity>) {
        Object.assign(this, init);

        if (!this.config) {
            this.config = { pageType: "fullWidth" };
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * Stable page identifier used for routing and references.
     * Represents an addressable page in UXP.
     */
    @Column({ type: "varchar", length: 48, unique: true, nullable: false })
    identifier!: string;

    /** Display name of the page */
    @Column()
    name!: string;

    /**
     * Page configuration (layout, navigation behavior).
     * See `PageConfigData` for details.
     */
    @Column("json", { nullable: true })
    config!: PageConfigData;

    /**
    * Ordered content of the page.
    *
    * Each entry defines either:
    * - local UXP content, or
    * - a remote app rendered on this page.
    *
    * See `PageAppsEntity`.
    */
    @OneToMany(() => PageAppsEntity, (pageApp) => pageApp.page)
    contents!: PageAppsEntity[];
}
