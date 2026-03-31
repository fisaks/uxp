import { MigrationInterface, QueryRunner } from "typeorm";

export class GlobalConfigSingleRow1769000000000 implements MigrationInterface {
    name = "GlobalConfigSingleRow1769000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Read the latest row (highest id)
        const rows = await queryRunner.query(
            `SELECT * FROM global_config ORDER BY id DESC LIMIT 1`
        );

        if (rows.length > 0) {
            const latest = rows[0];
            const config = typeof latest.config === "string" ? latest.config : JSON.stringify(latest.config);

            // 2. Delete all rows
            await queryRunner.query(`DELETE FROM global_config`);

            // 3. Remove AUTO_INCREMENT from id column, change to plain int PK
            await queryRunner.query(
                `ALTER TABLE global_config MODIFY COLUMN id int NOT NULL`
            );

            // 4. Reset auto increment
            await queryRunner.query(
                `ALTER TABLE global_config AUTO_INCREMENT = 1`
            );

            // 5. Insert the consolidated single row with id=1
            await queryRunner.query(
                `INSERT INTO global_config (id, config, updatedBy, updatedAt) VALUES (1, ?, ?, NOW())`,
                [config, latest.updatedBy ?? "System"]
            );
        } else {
            // No rows exist — just alter the column
            await queryRunner.query(
                `ALTER TABLE global_config MODIFY COLUMN id int NOT NULL`
            );

            // Seed default row
            await queryRunner.query(
                `INSERT INTO global_config (id, config, updatedBy, updatedAt) VALUES (1, '{"siteName":"Unified Experience Platform"}', 'System', NOW())`
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore AUTO_INCREMENT
        await queryRunner.query(
            `ALTER TABLE global_config MODIFY COLUMN id int NOT NULL AUTO_INCREMENT`
        );
    }
}
