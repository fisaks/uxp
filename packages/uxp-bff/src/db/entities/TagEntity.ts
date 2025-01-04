import slugify from "slugify";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RouteTagsEntity } from "./RouteTagsEntity";

@Entity("tags")
export class TagEntity {
    constructor(init?: Partial<TagEntity>) {
        Object.assign(this, init);
    }

    @PrimaryGeneratedColumn()
    id!: number;

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
