import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1739908844359 implements MigrationInterface {
    name = 'GeneratedMigration1739908844359'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` CHANGE \`name\` \`name\` varchar(150) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` CHANGE \`name\` \`name\` varchar(150) NOT NULL`);
    }

}
