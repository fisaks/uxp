import { GlobalConfigData } from "@uxp/common";
import { DateTime } from "luxon";
import { BeforeInsert, BeforeUpdate, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("global_config")
export class GlobalConfigEntity {
    constructor(init?: Partial<GlobalConfigEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "json" })
    config!: GlobalConfigData;

    @Column({ type: "varchar", length: 255 })
    updatedBy!: string; // Username of the person who updated it

    @Column({
        type: "timestamp",
        default: () => "CURRENT_TIMESTAMP",
        onUpdate: "CURRENT_TIMESTAMP",
        transformer: {
            // Convert database date (string) to Luxon DateTime
            from: (value: string | null): DateTime | null => (value ? DateTime.fromSQL(value) : null),
            // Convert Luxon DateTime to SQL-compatible string
            to: (value: DateTime | null): string | null => (value ? value.toSQL() : null),
        },
    })
    updatedAt!: DateTime;

    @BeforeUpdate()
    preventUpdate() {
        throw new Error("Updates to GlobalConfig are not allowed.");
    }
    @BeforeInsert()
    setUpdatedByAlways() {
        if (!this.updatedBy) {
            this.updatedBy = "System";
        }
        if (!this.updatedAt) {
            this.updatedAt = DateTime.now();
        }
    }
}
