import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1764618403126 implements MigrationInterface {
    name = 'GeneratedMigration1764618403126'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX \`IDX_BLUEPRINT_ACTIVATION_BLUEPRINT_ID\` ON \`blueprint_activation\` (\`blueprint_id\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_BLUEPRINT_ACTIVATION_BLUEPRINT_ID\` ON \`blueprint_activation\``);
    }

}
