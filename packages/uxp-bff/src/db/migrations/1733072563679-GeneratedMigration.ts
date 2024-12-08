import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1733072563679 implements MigrationInterface {
    name = "GeneratedMigration1733072563679";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`uuid\` char(36) NOT NULL, \`username\` varchar(255) NOT NULL, \`passwordHash\` varchar(255) NOT NULL, \`firstName\` varchar(255) NOT NULL, \`lastName\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`roles\` text NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`lastLogin\` timestamp NULL, \`failed_login_attempts\` int NOT NULL DEFAULT '0', \`is_disabled\` tinyint NOT NULL DEFAULT 0, \`tokenVersion\` int NOT NULL DEFAULT '0', UNIQUE INDEX \`IDX_951b8f1dfc94ac1d0301a14b7e\` (\`uuid\`), UNIQUE INDEX \`IDX_fe0bb3f6520ee0469504521e71\` (\`username\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`page\` (\`id\` int NOT NULL AUTO_INCREMENT, \`baseurl\` varchar(512) NOT NULL, \`metadata\` json NOT NULL, UNIQUE INDEX \`IDX_d6c4e24f3469a0ddb7e9ca8402\` (\`baseurl\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`menu_item\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(512) NOT NULL, \`url\` varchar(512) NOT NULL, \`roles\` text NOT NULL, \`metadata\` json NOT NULL, UNIQUE INDEX \`IDX_e8f2eae2829d2a1f45d506a1f9\` (\`name\`), UNIQUE INDEX \`IDX_758aef5e6553315ac7f21bc156\` (\`url\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_758aef5e6553315ac7f21bc156\` ON \`menu_item\``);
        await queryRunner.query(`DROP INDEX \`IDX_e8f2eae2829d2a1f45d506a1f9\` ON \`menu_item\``);
        await queryRunner.query(`DROP TABLE \`menu_item\``);
        await queryRunner.query(`DROP INDEX \`IDX_d6c4e24f3469a0ddb7e9ca8402\` ON \`page\``);
        await queryRunner.query(`DROP TABLE \`page\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_fe0bb3f6520ee0469504521e71\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_951b8f1dfc94ac1d0301a14b7e\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }
}
