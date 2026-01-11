import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1768081807878 implements MigrationInterface {
    name = 'GeneratedMigration1768081807878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`system_config\` (\`id\` int NOT NULL, \`runtimeMode\` enum ('normal', 'debug') NOT NULL DEFAULT 'normal', \`logLevel\` enum ('error', 'warn', 'info', 'debug', 'trace') NOT NULL DEFAULT 'info', \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled') NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled', 'f') NOT NULL`);
        await queryRunner.query(`DROP TABLE \`system_config\``);
    }

}
