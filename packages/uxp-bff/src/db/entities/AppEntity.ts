import { AppConfigData } from "@uxp/common";
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import slugify from "slugify";

/**
 * Represents a remote application integrated into UXP.
 *
 * An AppEntity defines:
 * - where the remote app is hosted (`baseUrl`)
 * - whether it is active
 * - runtime configuration used by the reverse proxy
 *
 * Apps are not rendered directly.
 * They are embedded into pages via PageAppsEntity entries.
 */
@Entity("apps")
export class AppEntity {
    constructor(init?: Partial<AppEntity>) {
        Object.assign(this, init);
    }
    @PrimaryGeneratedColumn()
    id!: number;

    /** Display name of the app (e.g. "H2C") */
    @Column({ unique: true })
    name!: string;

    /**
     * Stable app identifier derived from the name.
     * Used internally for routing and references.
     */
    @Column({ unique: true })
    identifier!: string;

    /**
     * Remote app host (protocol + hostname + port).
     *
     * Example:
     *   http://localhost:3020
     *
     * The final target URL is built as:
     *   baseUrl + contextPath + resource path (e.g. index.html)
     */
    @Column()
    baseUrl!: string; // Base URL for reverse proxy

    /**
     * Remote app runtime configuration.
     * See `AppConfigData` for details.
     */
    @Column("json", { nullable: true })
    config!: AppConfigData; // JSON column for rewrite rules, settings, etc.

    /** Whether the app is enabled */
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
