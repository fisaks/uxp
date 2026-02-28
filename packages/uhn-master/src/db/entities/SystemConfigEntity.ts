import { UhnLogLevel, UhnRuntimeMode } from "@uhn/common";
import { DateTime } from "luxon";
import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn,
} from "typeorm";


@Entity({ name: "system_config" })
export class SystemConfigEntity {

    constructor(init?: Partial<Pick<SystemConfigEntity,  "runtimeMode" | "logLevel" | "debugPort">>) {
        Object.assign(this, init);
    }
    /**
     * Always exactly one row with id = 1
     */
    @PrimaryColumn({ type: "int" })
    id!: number;

    @Column({
        type: "enum",
        enum: ['normal', 'debug'],
        default: "normal",
    })
    runtimeMode!: UhnRuntimeMode;
    @Column({
        type: "enum",
        enum: ['error', 'warn', 'info', 'debug', 'trace'],
        default: "info",
    })
    logLevel!: UhnLogLevel;

    @Column({ type: "int", default: 9250 })
    debugPort!: number;

    @UpdateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    updatedAt!: DateTime;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

}
