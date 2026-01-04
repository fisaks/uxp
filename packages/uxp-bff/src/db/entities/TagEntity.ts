import slugify from "slugify";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RouteTagsEntity } from "./RouteTagsEntity";

/**
 * Navigation tag used to group routes into named collections.
 *
 * Tags are resolved server-side into ordered lists of route identifiers,
 * which the UI uses to construct menus and navigation structures.
 */
@Entity("tags")
export class TagEntity {
    constructor(init?: Partial<TagEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

    /**
     * Unique tag name.
     *
     * Used as the key when exposing tagged routes to the client.
     * Automatically normalized to a URL-safe, lowercase format.
     */
    @Column({ unique: true, nullable: false })
    name!: string;

    @OneToMany(() => RouteTagsEntity, (routeTag) => routeTag.tag)
    routeTags!: RouteTagsEntity[];

    @BeforeInsert()
    @BeforeUpdate()
    generateIdentifier() {
        this.name = slugify(this.name, { lower: true, strict: true });
    }
}
