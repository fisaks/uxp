import { GlobalConfigData } from "@uxp/common";
import { DateTime } from "luxon";
import { BeforeInsert, Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("global_config")
export class GlobalConfigEntity {
    constructor(init?: Partial<Pick<GlobalConfigEntity, "config" | "updatedBy">>) {
        Object.assign(this, init);
    }

    @PrimaryColumn({ type: "int", default: 1 })
    id!: number;

    @Column({ type: "json" })
    config!: GlobalConfigData;

    @Column({ type: "varchar", length: 255 })
    updatedBy!: string;

    @UpdateDateColumn({
        type: "timestamp",
        transformer: {
            from: (value: string | null): DateTime | null => (value ? DateTime.fromSQL(value) : null),
            to: (value: DateTime | null): string | null => (value ? value.toSQL() : null),
        },
    })
    updatedAt!: DateTime;

    @BeforeInsert()
    setDefaults() {
        this.id = 1;
        if (!this.updatedBy) {
            this.updatedBy = "System";
        }
    }
}
