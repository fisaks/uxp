import { HouseData } from "@h2c/common";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, VersionColumn } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { DateTime } from "luxon";

@Entity("houses")
export class HouseEntity {
    constructor(init?: Partial<HouseEntity>) {
        Object.assign(this, init);
        if (!this.uuid) {
            this.uuid = uuidv4();
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 36, unique: true })
    uuid!: string;

    @Column({ type: "json", nullable: false })
    data!: HouseData;

    @Column({ type: "boolean", default: false })
    removed!: boolean;

    @CreateDateColumn({
        type: "timestamp",
        transformer: { to: (value: DateTime) => value, from: (value: Date) => DateTime.fromJSDate(value) },
    })
    createdAt!: DateTime;

    @CreateDateColumn({
        type: "timestamp",
        transformer: { to: (value: DateTime) => value, from: (value: Date) => DateTime.fromJSDate(value) },
    })
    updatedAt!: DateTime;

    @CreateDateColumn({
        type: "timestamp",
        transformer: { to: (value: DateTime) => value, from: (value: Date) => DateTime.fromJSDate(value) },
    })
    removedAt?: DateTime;

    @VersionColumn()
    version!: number;
}
