import type { UserScheduleSlot } from "@uhn/common";
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

@Entity({ name: "user_schedule" })
@Index("IDX_USER_SCHEDULE_BLUEPRINT", ["blueprintIdentifier"])
@Index("IDX_USER_SCHEDULE_UNIQUE", ["blueprintIdentifier", "scheduleId"], { unique: true })
export class UserScheduleEntity {

    constructor(init?: Partial<UserScheduleEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 128, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: "varchar", length: 128, nullable: false })
    scheduleId!: string;

    @Column({ type: "varchar", length: 128, nullable: false })
    name!: string;

    @Column({ type: "json", nullable: false })
    slots!: UserScheduleSlot[];

    @Column({ type: "int", nullable: false, default: 900000 })
    missedGraceMs!: number;

    @Column({ type: "varchar", length: 64, nullable: false })
    createdBy!: string;

    @CreateDateColumn({ type: "timestamp", transformer: dateTransformer })
    createdAt!: DateTime;

    @UpdateDateColumn({ type: "timestamp", transformer: dateTransformer })
    updatedAt!: DateTime;
}
