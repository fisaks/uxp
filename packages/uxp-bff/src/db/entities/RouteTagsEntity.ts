import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RouteEntity } from "./RouteEntity";
import { TagEntity } from "./TagEntity";

@Entity("route_tags")
@Index("IDX_UNIQUE_ROUTE_TAG", ["route", "tag"], { unique: true }) // Unique index definition
export class RouteTagsEntity {
    constructor(init?: Partial<RouteTagsEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => RouteEntity, (route) => route.routeTags, { onDelete: "CASCADE", nullable: false })
    @JoinColumn({ name: "route_id" })
    route!: RouteEntity;

    @ManyToOne(() => TagEntity, (tag) => tag.routeTags, { onDelete: "CASCADE", nullable: false })
    @JoinColumn({ name: "tag_id" })
    tag!: TagEntity;

    @Column({ type: "float", nullable: true })
    routeOrder!: number | null; // Allows flexible ordering
}
