import { DateTime } from 'luxon';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_section_order' })
@Index("IDX_USER_SECTION_ORDER_UNIQUE", ["blueprintIdentifier", "username"], { unique: true })
export class UserLocationSectionOrderEntity {

    constructor(init?: Partial<UserLocationSectionOrderEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 128, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    username!: string;

    @Column({ type: 'json', nullable: false })
    locationIds!: string[];

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
