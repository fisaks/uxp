import { FileEntityType } from "@h2c/common";
import { DateTime } from "luxon";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("file_uploads")
@Index("IDX_FILE_UPLOADS_ENTITY_TYPE", ["entityType"])
export class FileUploadEntity {
    constructor(init?: Partial<FileUploadEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 21, unique: true, nullable: false })
    publicId!: string;

    @Column({
        type: "enum",
        enum: ["attachment"], // Use string literals directly
        nullable: false,
    })
    entityType!: FileEntityType;

    @Column({ type: "varchar", nullable: false })
    fileName!: string; // File location in storage

    @Column({ type: "varchar", nullable: false })
    filePath!: string; // File location in storage

    @Column({ type: "varchar" })
    fileMimeType!: string;

    @Column({ type: "boolean", default: false })
    removed!: boolean;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value), // Convert Luxon DateTime to JS Date
            from: (value: Date) => DateTime.fromJSDate(value), // Convert JS Date to Luxon DateTime
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

    @DeleteDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    removedAt?: DateTime;
}
