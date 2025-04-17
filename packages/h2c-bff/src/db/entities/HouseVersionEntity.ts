import { HouseData } from "@h2c/common";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

import { DateTime } from "luxon";

@Entity("house_versions")
@Index("IDX_HOUSE_VERSION_UUID", ["uuid"])
export class HouseVersionEntity {
    @PrimaryGeneratedColumn()
    id!: number; // used as the version number

    @Column({ type: "char", length: 36 })
    uuid!: string; // matches HouseEntity.uuid

    @Column({ type: "json", nullable: false })
    data!: HouseData;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

    @Column({ type: "varchar", nullable: true })
    label?: string;
}
