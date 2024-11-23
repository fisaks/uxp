import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class Page {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 512, unique: true })
  baseurl!: string;

  @Column({ type: "json" })
  metadata!: object; // Or you can use a more specific type if needed
}
