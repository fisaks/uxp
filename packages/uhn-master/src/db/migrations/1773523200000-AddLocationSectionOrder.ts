import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationSectionOrder1773523200000 implements MigrationInterface {
    name = 'AddLocationSectionOrder1773523200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_location_section_order\` (\`id\` int NOT NULL AUTO_INCREMENT, \`blueprintIdentifier\` varchar(128) NOT NULL, \`username\` varchar(64) NOT NULL, \`locationIds\` json NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_USER_LOC_SECTION_ORDER_UNIQUE\` (\`blueprintIdentifier\`, \`username\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_USER_LOC_SECTION_ORDER_UNIQUE\` ON \`user_location_section_order\``);
        await queryRunner.query(`DROP TABLE \`user_location_section_order\``);
    }

}
