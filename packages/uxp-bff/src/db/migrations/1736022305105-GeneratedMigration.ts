import { MigrationInterface, QueryRunner } from "typeorm";
import { AppEntity } from "../entities/AppEntity";
import { PageAppsEntity } from "../entities/PageAppsEntity";
import { PageEntity } from "../entities/PageEntity";
import { RouteEntity } from "../entities/RouteEntity";

export class GeneratedMigration1736022305105 implements MigrationInterface {
    name = "GeneratedMigration1736022305105";

    public async up(queryRunner: QueryRunner): Promise<void> {
        const pageRepository = queryRunner.manager.getRepository(PageEntity);
        const pageAppsRepository = queryRunner.manager.getRepository(PageAppsEntity);
        const routeRepository = queryRunner.manager.getRepository(RouteEntity);
        const appRepository = queryRunner.manager.getRepository(AppEntity);

        pageAppsRepository.delete({});
        appRepository.delete({});
        routeRepository.delete({});
        pageRepository.delete({});

        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`groupName\` \`identifier\` varchar(255) NULL`);
        await queryRunner.query(
            `CREATE TABLE \`tags\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, UNIQUE INDEX \`IDX_d90243459a697eadb8ad56e909\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `CREATE TABLE \`route_tags\` (\`id\` int NOT NULL AUTO_INCREMENT, \`routeOrder\` float NULL, \`route_id\` int NOT NULL, \`tag_id\` int NOT NULL, UNIQUE INDEX \`IDX_UNIQUE_ROUTE_TAG\` (\`route_id\`, \`tag_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`identifier\``);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD \`identifier\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD UNIQUE INDEX \`IDX_91c45f4f2ef32102382b250498\` (\`identifier\`)`);
        await queryRunner.query(
            `ALTER TABLE \`route_tags\` ADD CONSTRAINT \`FK_35eb1441e6c6a80c0790709d293\` FOREIGN KEY (\`route_id\`) REFERENCES \`routes\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
        await queryRunner.query(
            `ALTER TABLE \`route_tags\` ADD CONSTRAINT \`FK_49eed6b92bd1047645e5f19ac12\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`route_tags\` DROP FOREIGN KEY \`FK_49eed6b92bd1047645e5f19ac12\``);
        await queryRunner.query(`ALTER TABLE \`route_tags\` DROP FOREIGN KEY \`FK_35eb1441e6c6a80c0790709d293\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP INDEX \`IDX_91c45f4f2ef32102382b250498\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`identifier\``);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD \`identifier\` varchar(255) NULL`);
        await queryRunner.query(`DROP INDEX \`IDX_UNIQUE_ROUTE_TAG\` ON \`route_tags\``);
        await queryRunner.query(`DROP TABLE \`route_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_d90243459a697eadb8ad56e909\` ON \`tags\``);
        await queryRunner.query(`DROP TABLE \`tags\``);
        await queryRunner.query(`ALTER TABLE \`routes\` CHANGE \`identifier\` \`groupName\` varchar(255) NULL`);
    }
}
