import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1739006756449 implements MigrationInterface {
    name = 'GeneratedMigration1739006756449'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`file_uploads\` (\`id\` int NOT NULL AUTO_INCREMENT, \`publicId\` char(21) NOT NULL, \`entityType\` enum ('attachment') NOT NULL, \`fileName\` varchar(255) NOT NULL, \`filePath\` varchar(255) NOT NULL, \`fileMimeType\` varchar(255) NOT NULL, \`removed\` tinyint NOT NULL DEFAULT 0, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`removedAt\` timestamp(6) NULL, INDEX \`IDX_FILE_UPLOADS_ENTITY_TYPE\` (\`entityType\`), UNIQUE INDEX \`IDX_0fb4b99df4178809589c9a705d\` (\`publicId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_0fb4b99df4178809589c9a705d\` ON \`file_uploads\``);
        await queryRunner.query(`DROP INDEX \`IDX_FILE_UPLOADS_ENTITY_TYPE\` ON \`file_uploads\``);
        await queryRunner.query(`DROP TABLE \`file_uploads\``);
    }

}
