import { AppConfigData } from "@uxp/common";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

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

    @Column()
    baseUrl!: string; // Base URL for reverse proxy

    @Column("json", { nullable: true })
    config!: AppConfigData; // JSON column for rewrite rules, settings, etc.

    @Column()
    isActive!: boolean; // Indicates if the app is active
}
