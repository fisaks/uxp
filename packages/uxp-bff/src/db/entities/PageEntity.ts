import { LocalizedStringValue, PageConfigData, PageMetaData } from "@uxp/common";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { PageAppsEntity } from "./PageAppsEntity";

// Page Entity
@Entity("pages")
export class PageEntity {
    constructor(init?: Partial<PageEntity>) {
        Object.assign(this, init);
        if (!this.uuid) {
            this.uuid = uuidv4();
        }
        if (!this.config) {
            this.config = { pageType: "fullWidth" };
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 36, unique: true })
    uuid!: string;

    @Column({ type: "varchar", length: 48, unique: true, nullable: false })
    identifier!: string;

    @Column()
    name!: string; // Default name for the page (non-localized)

    @Column("json", { nullable: true })
    localizedName!: LocalizedStringValue;

    @Column("json", { nullable: true })
    metadata!: PageMetaData;

    @Column("json", { nullable: true })
    localizedMetadata!: PageMetaData<LocalizedStringValue>;

    @Column("json", { nullable: true })
    config!: PageConfigData; // JSON column for rewrite rules, settings, etc.

    @OneToMany(() => PageAppsEntity, (pageApp) => pageApp.page)
    contents!: PageAppsEntity[]; // Ordered contents of the page
}
