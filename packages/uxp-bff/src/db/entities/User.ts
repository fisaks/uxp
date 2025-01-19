import { UserRole } from "@uxp/common";
import { DateTime } from "luxon";
import { Column, CreateDateColumn, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { UserSettings } from "./UserSettings";

@Entity("users")
export class User {
    constructor(init?: Partial<User>) {
        Object.assign(this, init);
        if (!this.uuid) {
            this.uuid = uuidv4();
        }
    }

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "char", length: 36, unique: true })
    uuid!: string;

    @Column({ type: "varchar", length: 255, unique: true })
    username!: string;

    @Column({ type: "varchar", length: 255 })
    passwordHash!: string;

    @Column({ type: "varchar", length: 255 })
    firstName!: string;

    @Column({ type: "varchar", length: 255 })
    lastName!: string;

    @Column({ type: "varchar", length: 255 })
    email!: string;

    @Column({
        type: "simple-array",
    })
    roles!: UserRole[];

    @CreateDateColumn({
        type: "timestamp",
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value), // Convert Luxon DateTime to JS Date
            from: (value: Date) => DateTime.fromJSDate(value), // Convert JS Date to Luxon DateTime
        },
    })
    createdAt!: DateTime;

    @Column({
        type: "timestamp",
        nullable: true, // Allow null initially if the user has never logged in
        transformer: {
            to: (value: DateTime | null) => (value ? value.toUTC().toJSDate() : null),
            from: (value: Date | null) => (value ? DateTime.fromJSDate(value) : null),
        },
    })
    lastLogin!: DateTime | null;

    @Column({ name: "failed_login_attempts", type: "int", default: 0 })
    failedLoginAttempts!: number;

    @Column({ name: "is_disabled", type: "boolean", default: false })
    isDisabled!: boolean;

    @Column({ type: "int", default: 0 })
    tokenVersion!: number;

    @OneToOne(() => UserSettings, (settings) => settings.user)
    settings?: UserSettings;
}
