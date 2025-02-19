import { DocumentType } from "@h2c/common";
import { DateTime } from "luxon";
import { nanoid } from "nanoid";
import { Column, CreateDateColumn, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("documents")
@Index("IDX_DOCUMENTS_DOCUMENT_ID", ["documentId"])
export class DocumentEntity {

    constructor(init?: Partial<DocumentEntity>) {
        Object.assign(this, init);
        if (!this.documentId) {
            this.documentId = nanoid();
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 21, unique: true, nullable: false })
    documentId!: string;

    @Column({ type: "varchar", length: 50, nullable: false })
    documentType!: DocumentType;

    @Column({ type: "varchar", length: 150, nullable: true })
    name!: string;

    @Column({ type: "json", nullable: false })
    content!: any; // JSON from TipTap

    @Column({ type: "boolean", default: false })
    deleted!: boolean; // Soft delete flag

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

    @DeleteDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    removedAt?: DateTime;

}
