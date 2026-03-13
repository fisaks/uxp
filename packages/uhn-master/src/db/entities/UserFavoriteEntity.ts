import { UserLocationItemKind } from '@uhn/common';
import { DateTime } from 'luxon';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'user_favorite' })
@Index("IDX_USER_FAV_UNIQUE", ["blueprintIdentifier", "username", "itemKind", "itemRefId"], { unique: true })
@Index("IDX_USER_FAV_USER", ["blueprintIdentifier", "username"])
export class UserFavoriteEntity {

    constructor(init?: Partial<UserFavoriteEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 128, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    username!: string;

    @Column({ type: 'enum', enum: ['resource', 'view', 'scene'], nullable: false })
    itemKind!: UserLocationItemKind;

    @Column({ type: 'varchar', length: 128, nullable: false })
    itemRefId!: string;

    @Column({ type: 'int', nullable: false, default: 0 })
    sortOrder!: number;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;
}
