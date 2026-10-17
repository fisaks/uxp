import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDeviceAvailability1792310400000 implements MigrationInterface {
    name = 'CreateDeviceAvailability1792310400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`device_availability\` (\`edge\` varchar(64) NOT NULL, \`device\` varchar(128) NOT NULL, \`available\` tinyint NOT NULL, \`changedAt\` datetime NOT NULL, PRIMARY KEY (\`edge\`, \`device\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`device_availability\``);
    }

}
