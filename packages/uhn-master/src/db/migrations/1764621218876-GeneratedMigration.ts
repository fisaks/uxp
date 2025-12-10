import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1764621218876 implements MigrationInterface {
    name = 'GeneratedMigration1764621218876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` DROP FOREIGN KEY \`FK_e59ea9870136192cc5d6391ff8c\``);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` ADD CONSTRAINT \`FK_e59ea9870136192cc5d6391ff8c\` FOREIGN KEY (\`blueprint_id\`) REFERENCES \`blueprint\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` DROP FOREIGN KEY \`FK_e59ea9870136192cc5d6391ff8c\``);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` ADD CONSTRAINT \`FK_e59ea9870136192cc5d6391ff8c\` FOREIGN KEY (\`blueprint_id\`) REFERENCES \`blueprint\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
