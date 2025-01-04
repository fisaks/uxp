import { LocalizedStringValue, RouteConfigData, UserRole } from "@uxp/common";
import slugify from "slugify";
import {
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
} from "typeorm";
import { PageEntity } from "./PageEntity";
import { RouteTagsEntity } from "./RouteTagsEntity";
// Route Entity

export type AccessType = "unauthenticated" | "authenticated" | "role-based";

@Entity("routes")
export class RouteEntity {
    constructor(init?: Partial<RouteEntity>) {
        Object.assign(this, init);
        if (!this.roles) {
            this.roles = [];
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true, nullable: false })
    identifier!: string;

    @Column()
    routePattern!: string; // Default route pattern (non-localized)

    @Column("json", { nullable: true })
    localizedRoutePattern!: LocalizedStringValue;

    @Column({ nullable: true })
    link!: string; // Default link (non-localized)

    @Column("json", { nullable: true })
    localizedLink!: LocalizedStringValue; // Optional localized links

    @ManyToOne(() => PageEntity, { nullable: true })
    @JoinColumn({ name: "pageId" })
    page!: PageEntity; // Associated page for this route

    @Column("json", { nullable: true })
    config!: RouteConfigData;

    @Column({
        type: "enum",
        enum: ["unauthenticated", "authenticated", "role-based"], // Use string literals directly
        default: "role-based",
    })
    accessType!: AccessType;

    @Column("simple-array", { nullable: true })
    roles: UserRole[] = ["user"];

    @OneToMany(() => RouteTagsEntity, (routeTag) => routeTag.route)
    routeTags!: RouteTagsEntity[];

    @BeforeInsert()
    @BeforeUpdate()
    generateIdentifier() {
        this.identifier = slugify(this.identifier, { lower: true, strict: true });
    }
}
