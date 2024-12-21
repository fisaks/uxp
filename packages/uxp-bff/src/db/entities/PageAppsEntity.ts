import { PageAppsConfigData, UserRole } from "@uxp/common";
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { AppEntity } from "./AppEntity";
import { PageEntity } from "./PageEntity";

// Page Apps Entity
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

    @Column({ type: "char", length: 36, unique: true })
    uuid!: string;

    @ManyToOne(() => PageEntity, (page) => page.contents)
    @JoinColumn({ name: "pageId" })
    page!: PageEntity; // Associated page

    @ManyToOne(() => AppEntity, { nullable: true })
    @JoinColumn({ name: "appId" })
    app!: AppEntity; // Linked app, if applicable

    @Column({ nullable: true })
    internalComponent!: string; // Internal component string, if applicable

    @Column({ nullable: true })
    urlPostfix!: string; // Postfix URL for the app on the page

    @Column("float")
    order!: number; // Order of the content on the page

    @Column("json", { nullable: true })
    config!: PageAppsConfigData;

    @Column("simple-array", { nullable: true })
    roles: UserRole[] = ["user"];
}
