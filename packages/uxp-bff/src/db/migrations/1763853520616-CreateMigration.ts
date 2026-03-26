import { MigrationInterface, QueryRunner } from "typeorm";

// Seed data removed — platform config is now managed by @uxp/config + config-apply service.
export class CreateMigration1763853520616 implements MigrationInterface {
    public async up(_queryRunner: QueryRunner): Promise<void> {}
    public async down(_queryRunner: QueryRunner): Promise<void> {}
}
