import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RouteEntity } from "./RouteEntity";
import { TagEntity } from "./TagEntity";

/**
 * Join entity linking routes to tags.
 *
 * Defines which routes belong to which navigation tag,
 * and optionally controls ordering within that tag.
 *
 * A unique constraint ensures that a route can only appear
 * once per tag.
 */
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

    /**
    * Optional ordering value within the tag.
    *
    * Lower values appear earlier. Uses a float to allow
    * easy reordering without renumbering existing entries.
    */
    @Column({ type: "float", nullable: true })
    routeOrder!: number | null; // Allows flexible ordering
}
