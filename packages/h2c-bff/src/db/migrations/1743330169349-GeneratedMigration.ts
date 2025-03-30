import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1743330169349 implements MigrationInterface {
    name = 'GeneratedMigration1743330169349'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`field_keys\` (\`id\` int NOT NULL AUTO_INCREMENT, \`type\` varchar(255) NOT NULL, \`key\` varchar(255) NOT NULL, \`normalizedKey\` varchar(255) NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_d6b551298f67b8cd3e1e7cf8cf\` (\`type\`, \`normalizedKey\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_d6b551298f67b8cd3e1e7cf8cf\` ON \`field_keys\``);
        await queryRunner.query(`DROP TABLE \`field_keys\``);
    }

}
