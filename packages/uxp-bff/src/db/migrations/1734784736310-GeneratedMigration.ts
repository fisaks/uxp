import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1734784736310 implements MigrationInterface {
    name = "GeneratedMigration1734784736310";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`routes\` DROP FOREIGN KEY \`FK_a0205659602014b6d42afa5b90c\``);
        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`link\` \`link\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`pageId\` \`pageId\` int NULL`);
        await queryRunner.query(
            `ALTER TABLE \`routes\` ADD CONSTRAINT \`FK_a0205659602014b6d42afa5b90c\` FOREIGN KEY (\`pageId\`) REFERENCES \`pages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`routes\` DROP FOREIGN KEY \`FK_a0205659602014b6d42afa5b90c\``);
        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`pageId\` \`pageId\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`link\` \`link\` varchar(255) NOT NULL`);
        await queryRunner.query(
            `ALTER TABLE \`routes\` ADD CONSTRAINT \`FK_a0205659602014b6d42afa5b90c\` FOREIGN KEY (\`pageId\`) REFERENCES \`pages\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }
}
