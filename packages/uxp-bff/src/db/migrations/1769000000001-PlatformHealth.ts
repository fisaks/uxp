import { MigrationInterface, QueryRunner } from "typeorm";

export class PlatformHealth1769000000001 implements MigrationInterface {
    name = "PlatformHealth1769000000001";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`platform_health\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`key\` varchar(100) NOT NULL,
                \`severity\` enum('ok','warn','error') NOT NULL,
                \`message\` varchar(500) NOT NULL,
                \`details\` json NULL,
                \`source\` varchar(100) NOT NULL,
                \`notified_severity\` enum('ok','warn','error') NULL,
                \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_platform_health_key\` (\`key\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`platform_health\``);
    }
}
