import { MenuItemMetadata, UserRole } from "@uxp/common";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class MenuItem {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 512, unique: true })
    name!: string;

    @Column({ type: "varchar", length: 512, unique: true })
    url!: string;

    @Column({
        type: "simple-array",
    })
    roles!: UserRole[];

    @Column({ type: "json", nullable: false })
    metadata!: MenuItemMetadata; // Or you can use a more specific type if needed
}
