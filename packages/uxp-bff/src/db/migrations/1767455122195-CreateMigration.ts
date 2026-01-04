import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMigration1767455122195 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE page_apps
            SET config = JSON_SET(
                JSON_REMOVE(
                    COALESCE(config, JSON_OBJECT()),
                    '$.indexPage'
                ),
                '$.mainEntry',
                JSON_EXTRACT(config, '$.indexPage')
            )
            WHERE JSON_EXTRACT(config, '$.indexPage') IS NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE page_apps
            SET config = JSON_SET(
                JSON_REMOVE(
                    COALESCE(config, JSON_OBJECT()),
                    '$.mainEntry'
                ),
                '$.indexPage',
                JSON_EXTRACT(config, '$.mainEntry')
            )
            WHERE JSON_EXTRACT(config, '$.mainEntry') IS NOT NULL
        `);
    }

}
