import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1773436800000 implements MigrationInterface {
    name = 'GeneratedMigration1773436800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add blueprintIdentifier to user_favorite
        await queryRunner.query(`ALTER TABLE \`user_favorite\` ADD \`blueprintIdentifier\` varchar(128) NOT NULL DEFAULT '' AFTER \`id\``);
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_UNIQUE\` ON \`user_favorite\``);
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_USER\` ON \`user_favorite\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_USER_FAV_UNIQUE\` ON \`user_favorite\` (\`blueprintIdentifier\`, \`username\`, \`itemKind\`, \`itemRefId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_USER_FAV_USER\` ON \`user_favorite\` (\`blueprintIdentifier\`, \`username\`)`);

        // Create user_location_order table
        await queryRunner.query(`CREATE TABLE \`user_location_order\` (\`id\` int NOT NULL AUTO_INCREMENT, \`blueprintIdentifier\` varchar(128) NOT NULL, \`username\` varchar(64) NOT NULL, \`locationId\` varchar(128) NOT NULL, \`locationItems\` json NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_USER_LOC_ORDER_USER\` (\`blueprintIdentifier\`, \`username\`), UNIQUE INDEX \`IDX_USER_LOC_ORDER_UNIQUE\` (\`blueprintIdentifier\`, \`username\`, \`locationId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop user_location_order
        await queryRunner.query(`DROP INDEX \`IDX_USER_LOC_ORDER_UNIQUE\` ON \`user_location_order\``);
        await queryRunner.query(`DROP INDEX \`IDX_USER_LOC_ORDER_USER\` ON \`user_location_order\``);
        await queryRunner.query(`DROP TABLE \`user_location_order\``);

        // Revert user_favorite changes
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_UNIQUE\` ON \`user_favorite\``);
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_USER\` ON \`user_favorite\``);
        await queryRunner.query(`ALTER TABLE \`user_favorite\` DROP COLUMN \`blueprintIdentifier\``);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_USER_FAV_UNIQUE\` ON \`user_favorite\` (\`username\`, \`itemKind\`, \`itemRefId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_USER_FAV_USER\` ON \`user_favorite\` (\`username\`)`);
    }

}
