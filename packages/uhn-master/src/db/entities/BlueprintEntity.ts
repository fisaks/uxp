import { BlueprintMetadata, BlueprintStatus } from '@uhn/common';
import { DateTime } from 'luxon';
import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';


@Entity({ name: 'blueprint' })
@Index("UIDX_BLUEPRINT_IDENTIFIER", ["identifier", "version"], { unique: true })
export class BlueprintEntity {

    constructor(init?: Partial<BlueprintEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;


    @Column({ type: 'varchar', length: 64, nullable: false })
    identifier!: string;


    @Column({ type: 'int', unsigned: true, nullable: false })
    version!: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name!: string;

    @Column({ type: 'varchar', length: 512, nullable: false })
    zipPath!: string;

    @Column({ type: 'varchar', length: 64, nullable: true })
    checksum?: string | null;

    @Column({
        type: 'enum',
        enum: ['uploaded', 'validated', 'compiled', 'installed', 'failed', 'archived'],
        default: 'uploaded',
    })
    status!: BlueprintStatus;

    @Column({ type: 'json', nullable: false })
    metadata!: BlueprintMetadata;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

    @Column({ type: 'varchar', length: 64, nullable: true })
    uploadedBy?: string;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
        nullable: true,
    })
    lastActivatedAt?: DateTime | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    lastActivatedBy?: string | null;

    @Column({
        type: 'datetime',
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
        nullable: true,
    })
    lastDeactivatedAt?: DateTime | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    lastDeactivatedBy?: string | null;

    @Column({ type: 'text', nullable: true })
    validationLog?: string | null;

    @Column({ type: 'text', nullable: true })
    installLog?: string | null;

    @Column({ type: 'text', nullable: true })
    compileLog?: string | null;

    @Column({ type: 'varchar', length: 1024, nullable: true })
    errorSummary?: string | null;
    
    @Column({ type: 'boolean', default: false })
    active!: boolean;
}
