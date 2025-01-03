import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1734119687318 implements MigrationInterface {
    name = "GeneratedMigration1734119687318";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`apps\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`baseUrl\` varchar(255) NOT NULL, \`config\` json NULL, \`isActive\` tinyint NOT NULL, UNIQUE INDEX \`IDX_c1a24df1d51c2748d97561b77d\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`pages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`uuid\` char(36) NOT NULL, \`identifier\` varchar(48) NOT NULL, \`name\` varchar(255) NOT NULL, \`localizedName\` json NULL, \`metadata\` json NULL, \`localizedMetadata\` json NULL, UNIQUE INDEX \`IDX_845e77701228c752e9787e6220\` (\`uuid\`), UNIQUE INDEX \`IDX_52abc4179d4010319519c7d465\` (\`identifier\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`page_apps\` (\`id\` int NOT NULL AUTO_INCREMENT, \`uuid\` char(36) NOT NULL, \`internalComponent\` varchar(255) NULL, \`urlPostfix\` varchar(255) NULL, \`order\` float NOT NULL, \`config\` json NULL, \`roles\` text NULL, \`pageId\` int NULL, \`appId\` int NULL, INDEX \`IDX_PAGE_APPS_APP_ID\` (\`appId\`), INDEX \`IDX_PAGE_APPS_PAGE_ID\` (\`pageId\`), UNIQUE INDEX \`IDX_502690df8574d74a4a8be0ab08\` (\`uuid\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`routes\` (\`id\` int NOT NULL AUTO_INCREMENT, \`routePattern\` varchar(255) NOT NULL, \`localizedRoutePattern\` json NULL, \`link\` varchar(255) NOT NULL, \`localizedLink\` json NULL, \`groupName\` varchar(255) NULL, \`config\` json NULL, \`unauthenticatedOnly\` tinyint NOT NULL DEFAULT 0, \`roles\` text NULL, \`pageId\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `ALTER TABLE \`page_apps\` ADD CONSTRAINT \`FK_d16fc29157ec25b0ce46bdae380\` FOREIGN KEY (\`pageId\`) REFERENCES \`pages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`page_apps\` ADD CONSTRAINT \`FK_2a7af23f0d133e53aed8148955c\` FOREIGN KEY (\`appId\`) REFERENCES \`apps\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`routes\` ADD CONSTRAINT \`FK_a0205659602014b6d42afa5b90c\` FOREIGN KEY (\`pageId\`) REFERENCES \`pages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`routes\` DROP FOREIGN KEY \`FK_a0205659602014b6d42afa5b90c\``);
        await queryRunner.query(`ALTER TABLE \`page_apps\` DROP FOREIGN KEY \`FK_2a7af23f0d133e53aed8148955c\``);
        await queryRunner.query(`ALTER TABLE \`page_apps\` DROP FOREIGN KEY \`FK_d16fc29157ec25b0ce46bdae380\``);
        await queryRunner.query(`DROP TABLE \`routes\``);
        await queryRunner.query(`DROP INDEX \`IDX_502690df8574d74a4a8be0ab08\` ON \`page_apps\``);
        await queryRunner.query(`DROP INDEX \`IDX_PAGE_APPS_PAGE_ID\` ON \`page_apps\``);
        await queryRunner.query(`DROP INDEX \`IDX_PAGE_APPS_APP_ID\` ON \`page_apps\``);
        await queryRunner.query(`DROP TABLE \`page_apps\``);
        await queryRunner.query(`DROP INDEX \`IDX_52abc4179d4010319519c7d465\` ON \`pages\``);
        await queryRunner.query(`DROP INDEX \`IDX_845e77701228c752e9787e6220\` ON \`pages\``);
        await queryRunner.query(`DROP TABLE \`pages\``);
        await queryRunner.query(`DROP INDEX \`IDX_c1a24df1d51c2748d97561b77d\` ON \`apps\``);
        await queryRunner.query(`DROP TABLE \`apps\``);
    }
}
