import { DateTime } from 'luxon';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'api_token' })
@Index("IDX_API_TOKEN_HASH", ["tokenHash"], { unique: true })
export class ApiTokenEntity {

    constructor(init?: Partial<ApiTokenEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 64, nullable: false })
    tokenHash!: string;

    @Column({ type: 'varchar', length: 4, nullable: false })
    lastFourChars!: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    label!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    blueprintIdentifier!: string;

    @Column({ type: 'varchar', length: 64, nullable: false })
    createdBy!: string;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => (value ? DateTime.fromJSDate(value) : null),
        },
        nullable: true,
    })
    lastUsedAt?: DateTime | null;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => (value ? DateTime.fromJSDate(value) : null),
        },
        nullable: true,
    })
    revokedAt?: DateTime | null;
}
