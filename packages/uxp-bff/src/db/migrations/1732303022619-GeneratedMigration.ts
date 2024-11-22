import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1732303022619 implements MigrationInterface {
    name = 'GeneratedMigration1732303022619'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`page\` (\`id\` int NOT NULL AUTO_INCREMENT, \`baseurl\` varchar(255) NOT NULL, \`metadata\` json NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`page\``);
    }

}
