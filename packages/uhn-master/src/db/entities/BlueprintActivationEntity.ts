import { DateTime } from 'luxon';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BlueprintEntity } from "./BlueprintEntity";


@Entity({ name: 'blueprint_activation' })
@Index("IDX_BLUEPRINT_ACTIVATION_BLUEPRINT_ID", ["blueprint"])
export class BlueprintActivationEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    constructor(init?: Partial<BlueprintActivationEntity>) {
        Object.assign(this, init);
    }

    @ManyToOne(() => BlueprintEntity, { nullable: false, onDelete: "CASCADE" })
    @JoinColumn({ name: 'blueprint_id' })
    blueprint!: BlueprintEntity;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
        nullable: false
    })
    activatedAt!: DateTime;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
        nullable: true
    })
    deactivatedAt?: DateTime | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    activatedBy?: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    deactivatedBy?: string;

}
