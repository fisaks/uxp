import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1732303982007 implements MigrationInterface {
  name = "GeneratedMigration1732303982007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE page MODIFY baseurl VARCHAR(500) NOT NULL`);
    await queryRunner.query(`ALTER TABLE \`page\` ADD UNIQUE INDEX \`IDX_d6c4e24f3469a0ddb7e9ca8402\` (\`baseurl\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`page\` DROP INDEX \`IDX_d6c4e24f3469a0ddb7e9ca8402\``);
    await queryRunner.query(`ALTER TABLE page MODIFY baseurl VARCHAR(255)`);
  }
}
