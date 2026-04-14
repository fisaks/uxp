import { DateTime } from "luxon";
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";

const dateTransformer = {
    to: (value: DateTime) => (value ? value.toJSDate() : value),
    from: (value: Date) => (value ? DateTime.fromJSDate(value) : value),
};

/**
 * Unified mute state for both blueprint and user schedules.
 * One row per muted schedule. Row is deleted when unmuted.
 */
@Entity({ name: "schedule_mute" })
@Index("IDX_SCHEDULE_MUTE_UNIQUE", ["blueprintIdentifier", "scheduleId"], { unique: true })
export class ScheduleMuteEntity {

    constructor(init?: Partial<ScheduleMuteEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 128, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: "varchar", length: 128, nullable: false })
    scheduleId!: string;

    /** Null = muted indefinitely. Non-null = muted until this timestamp. */
    @Column({ type: "timestamp", nullable: true, transformer: dateTransformer })
    mutedUntil!: DateTime | null;

    @Column({ type: "varchar", length: 64, nullable: false })
    mutedBy!: string;

    @CreateDateColumn({ type: "timestamp", transformer: dateTransformer })
    createdAt!: DateTime;

    @UpdateDateColumn({ type: "timestamp", transformer: dateTransformer })
    updatedAt!: DateTime;
}
