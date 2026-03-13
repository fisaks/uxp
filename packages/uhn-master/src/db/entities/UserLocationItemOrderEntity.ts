import { LocationItemRef } from '@uhn/common';
import { DateTime } from 'luxon';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_location_item_order' })
@Index("IDX_USER_LOC_ITEM_ORDER_UNIQUE", ["blueprintIdentifier", "username", "locationId"], { unique: true })
@Index("IDX_USER_LOC_ITEM_ORDER_USER", ["blueprintIdentifier", "username"])
export class UserLocationItemOrderEntity {

    constructor(init?: Partial<UserLocationItemOrderEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 128, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    username!: string;

    @Column({ type: 'varchar', length: 128, nullable: false })
    locationId!: string;

    @Column({ type: 'json', nullable: false })
    locationItems!: LocationItemRef[];

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

    @UpdateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    updatedAt!: DateTime;
}
