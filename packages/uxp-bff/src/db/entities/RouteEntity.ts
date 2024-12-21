import { LocalizedStringValue, RouteConfigData, UserRole } from "@uxp/common";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PageEntity } from "./PageEntity";
// Route Entity
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

    @Column({ default: false })
    unauthenticatedOnly!: boolean; // If true, this route is only available to unauthenticated users

    @Column("simple-array", { nullable: true })
    roles: UserRole[] = ["user"];
}
