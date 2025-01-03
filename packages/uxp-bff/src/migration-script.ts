import { DataSource } from "typeorm";
import "./config/env";
const { AppDataSource } = require("./db/typeorm.config");

async function runMigrations() {
    try {
        console.log("Running migrations...");
        const dataSource: DataSource = await AppDataSource.initialize();
        await dataSource.runMigrations();
        console.log("Migrations completed successfully.");
        await dataSource.destroy();
    } catch (error) {
        console.error("Error running migrations:", error);
        process.exit(1); // Exit with failure code
    }
}

runMigrations();
