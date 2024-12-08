import { UserSettingsData } from "packages/uxp-common/src";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class UserSettings {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "int" })
    userId!: number;

    @Column({ type: "json", nullable: true })
    settings?: UserSettingsData; // Type the settings as a specific interface

    @OneToOne(() => User, (user) => user.settings)
    @JoinColumn({ name: "userId" })
    user!: User; // Reference back to the User entity
}
