import { PageConfigData } from "@uxp/common";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PageAppsEntity } from "./PageAppsEntity";

// Page Entity
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


    @Column({ type: "varchar", length: 48, unique: true, nullable: false })
    identifier!: string;

    @Column()
    name!: string; // Name of the page

    @Column("json", { nullable: true })
    config!: PageConfigData; // JSON column for rewrite rules, settings, etc.

    @OneToMany(() => PageAppsEntity, (pageApp) => pageApp.page)
    contents!: PageAppsEntity[]; // Ordered contents of the page
}
