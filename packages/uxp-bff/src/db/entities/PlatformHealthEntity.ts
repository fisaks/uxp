import { HealthSeverity, UxpHealthId } from "@uxp/common";
import { DateTime } from "luxon";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("platform_health")
@Unique(["key"])
export class PlatformHealthEntity {
    constructor(init?: Partial<Pick<PlatformHealthEntity, "key" | "severity" | "message" | "details" | "source" | "notifiedSeverity">>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 100 })
    key!: UxpHealthId;

    @Column({ type: "enum", enum: ["ok", "warn", "error"] })
    severity!: HealthSeverity;

    @Column({ type: "varchar", length: 500 })
    message!: string;

    @Column({ type: "json", nullable: true })
    details!: Record<string, unknown> | null;

    @Column({ type: "varchar", length: 100 })
    source!: string;

    @Column({ type: "enum", enum: ["ok", "warn", "error"], nullable: true, name: "notified_severity" })
    notifiedSeverity!: HealthSeverity | null;

    @UpdateDateColumn({
        type: "timestamp",
        transformer: {
            from: (value: string | null): DateTime | null => (value ? DateTime.fromSQL(value) : null),
            to: (value: DateTime | string | null): string | null => {
                if (!value) return DateTime.now().toSQL();
                if (value instanceof DateTime) return value.toSQL();
                return value;
            },
        },
    })
    updatedAt!: DateTime;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            from: (value: string | null): DateTime | null => (value ? DateTime.fromSQL(value) : null),
            to: (value: DateTime | string | null): string | null => {
                if (!value) return DateTime.now().toSQL();
                if (value instanceof DateTime) return value.toSQL();
                return value;
            },
        },
    })
    createdAt!: DateTime;
}
