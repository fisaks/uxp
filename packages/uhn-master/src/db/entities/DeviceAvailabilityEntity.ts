import { DateTime } from "luxon";
import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * The last known availability of a device and when it last changed, so "offline since" survives a restart of the
 * master. One row per edge and device.
 */
@Entity({ name: "device_availability" })
export class DeviceAvailabilityEntity {

    constructor(init?: Partial<DeviceAvailabilityEntity>) {
        Object.assign(this, init);
    }

    @PrimaryColumn({ type: "varchar", length: 64 })
    edge!: string;

    @PrimaryColumn({ type: "varchar", length: 128 })
    device!: string;

    @Column({ type: "boolean", nullable: false })
    available!: boolean;

    /** When the availability last changed. */
    @Column({
        type: "datetime",
        nullable: false,
        transformer: {
            to: (value: DateTime) => (value ? value.toJSDate() : value),
            from: (value: Date) => DateTime.fromJSDate(value),
        },
    })
    changedAt!: DateTime;
}
