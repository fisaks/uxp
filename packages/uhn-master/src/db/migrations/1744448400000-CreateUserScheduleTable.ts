import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserScheduleTable1744448400000 implements MigrationInterface {
    name = "CreateUserScheduleTable1744448400000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`user_schedule\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`blueprintIdentifier\` varchar(128) NOT NULL,
                \`scheduleId\` varchar(128) NOT NULL,
                \`name\` varchar(128) NOT NULL,
                \`slots\` json NOT NULL,
                \`missedGraceMs\` int NOT NULL DEFAULT 900000,
                \`createdBy\` varchar(64) NOT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_USER_SCHEDULE_UNIQUE\` (\`blueprintIdentifier\`, \`scheduleId\`),
                INDEX \`IDX_USER_SCHEDULE_BLUEPRINT\` (\`blueprintIdentifier\`)
            ) ENGINE=InnoDB
        `);
        await queryRunner.query(`
            CREATE TABLE \`schedule_mute\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`blueprintIdentifier\` varchar(128) NOT NULL,
                \`scheduleId\` varchar(128) NOT NULL,
                \`mutedUntil\` timestamp NULL,
                \`mutedBy\` varchar(64) NOT NULL,
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_SCHEDULE_MUTE_UNIQUE\` (\`blueprintIdentifier\`, \`scheduleId\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`schedule_mute\``);
        await queryRunner.query(`DROP TABLE \`user_schedule\``);
    }
}
