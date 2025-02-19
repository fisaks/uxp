import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1739901714756 implements MigrationInterface {
    name = 'GeneratedMigration1739901714756'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`documents\` (\`id\` int NOT NULL AUTO_INCREMENT, \`documentId\` char(21) NOT NULL, \`documentType\` varchar(50) NOT NULL, \`content\` json NOT NULL, \`deleted\` tinyint NOT NULL DEFAULT 0, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`removedAt\` timestamp(6) NULL, INDEX \`IDX_DOCUMENTS_DOCUMENT_ID\` (\`documentId\`), UNIQUE INDEX \`IDX_0592c7aa6895bb9fe3dcec8b6f\` (\`documentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`d_snapshots\` (\`id\` int NOT NULL AUTO_INCREMENT, \`documentId\` char(21) NOT NULL, \`update\` longblob NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_D_SNAPSHOTS_DOCUMENT_ID\` (\`documentId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_D_SNAPSHOTS_DOCUMENT_ID\` ON \`d_snapshots\``);
        await queryRunner.query(`DROP TABLE \`d_snapshots\``);
        await queryRunner.query(`DROP INDEX \`IDX_0592c7aa6895bb9fe3dcec8b6f\` ON \`documents\``);
        await queryRunner.query(`DROP INDEX \`IDX_DOCUMENTS_DOCUMENT_ID\` ON \`documents\``);
        await queryRunner.query(`DROP TABLE \`documents\``);
    }

}
