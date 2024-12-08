import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMigration1733074312998 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            `insert into menu_item (name,url,roles,metadata) values ('Test Item','/test-url','user','{"sidebar":true, "external":true}');`
        );
        queryRunner.query(
            `insert into menu_item (name,url,roles,metadata) values ('Guest Item','/guest-url','','{"sidebar":false, "external":false}');`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(`delete from menu_item where name='Test Item';`);
        queryRunner.query(`delete from menu_item where name='Guest Item';`);
    }
}
