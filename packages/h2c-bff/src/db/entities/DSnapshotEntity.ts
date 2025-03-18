import { DateTime } from "luxon";
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("d_snapshots")
@Index("IDX_D_SNAPSHOTS_DOCUMENT_ID", ["documentId"])
export class SnapshotEntity {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 21 }) // Same documentId as in `documents`
    documentId!: string;

    @Column({ type: "blob" }) // Stores Y.js update in binary format
    update!: Buffer;

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    createdAt!: DateTime;

}
