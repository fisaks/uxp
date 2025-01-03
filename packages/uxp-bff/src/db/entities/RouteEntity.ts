import { LocalizedStringValue, RouteConfigData, UserRole } from "@uxp/common";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PageEntity } from "./PageEntity";
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

    @Column({ nullable: true })
    groupName!: string; // Group name for organizing routes

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
}
