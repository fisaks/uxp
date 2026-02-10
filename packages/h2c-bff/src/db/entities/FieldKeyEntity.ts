// src/entities/FieldKeyEntity.ts
import { FieldKeyType } from "@h2c/common";
import { DateTime } from "luxon";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("field_keys")
@Unique(["type", "normalizedKey"])
export class FieldKeyEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", nullable: false })
    type!: FieldKeyType;
   
    @Column({ type: "varchar", nullable: false })
    key!: string;

    @Column({ type: "varchar", nullable: false })
    normalizedKey!: string; 

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

}
