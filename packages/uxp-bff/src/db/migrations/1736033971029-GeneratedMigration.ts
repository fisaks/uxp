import { MigrationInterface, QueryRunner } from "typeorm";
import { GlobalConfigEntity } from "../entities/GlobalConfigEntity";

export class GeneratedMigration1736033971029 implements MigrationInterface {
    name = "GeneratedMigration1736033971029";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`global_config\` (\`id\` int NOT NULL AUTO_INCREMENT, \`config\` json NOT NULL, \`updatedBy\` varchar(255) NOT NULL, \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        const globLConfigRepository = queryRunner.manager.getRepository(GlobalConfigEntity);
        await globLConfigRepository.save(
            new GlobalConfigEntity({
                config: {
                    siteName: "Unified Experience Platform",
                },
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`global_config\``);
    }
}
