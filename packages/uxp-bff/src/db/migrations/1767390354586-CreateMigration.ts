import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMigration1767390354586 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE apps
            SET config = JSON_SET(
                COALESCE(config, JSON_OBJECT()),
                '$.healthEntry', 'health.html',
                '$.systemEntry', 'system.html'
            )
            WHERE identifier = 'uhn'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
           await queryRunner.query(`
            UPDATE apps
            SET config = JSON_REMOVE(
                config,
                '$.healthEntry',
                '$.systemEntry'
            )
            WHERE identifier = 'uhn'
        `);
    }

}
