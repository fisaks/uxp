import { AppConfigData } from "@uxp/common";
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import slugify from "slugify";

// App Entity
@Entity("apps")
export class AppEntity {
    constructor(init?: Partial<AppEntity>) {
        Object.assign(this, init);
    }
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    name!: string; // App name (e.g., "H2C")

    @Column({ unique: true })
    identifier!: string;

    @Column()
    baseUrl!: string; // Base URL for reverse proxy

    @Column("json", { nullable: true })
    config!: AppConfigData; // JSON column for rewrite rules, settings, etc.

    @Column()
    isActive!: boolean; // Indicates if the app is active

    @BeforeInsert()
    @BeforeUpdate()
    generateIdentifier() {
        if (!this.identifier || this.name) {
            this.identifier = slugify(this.name, { lower: true, strict: true });
        }
    }
}
