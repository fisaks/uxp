/** MQTT payload published by ScheduleService when a schedule fires. */
export type ScheduleFiredPayload = {
    scheduleId: string;
    firedAt: string; // ISO date
};
