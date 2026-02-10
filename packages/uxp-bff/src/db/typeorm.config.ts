const { DataSource } = require("typeorm");
require("../config/env");
const isCompiled = __filename.includes("dist");

const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "3306", 10),
    username: process.env.MYSQL_UXP_USER,
    password: process.env.MYSQL_UXP_PASSWORD,
    database: process.env.MYSQL_UXP_DATABASE,
    synchronize: false, // Use migrations for schema changes
    logging: true,
    entities: [isCompiled ? "dist/db/entities/**/*.js" : "src/db/entities/**/*.ts"],
    //entities: [Page],
    migrations: [
        isCompiled ? "dist/db/migrations/**/*.js" : "src/db/migrations/**/*.ts",
        isCompiled ? "dist/db/private-migrations/**/*.js" : "src/db/private-migrations/**/*.ts",
    ],
    cli: {
        migrationsDir: "dist/migration",
    },
    extra: {
        connectionLimit: 10, // Connection pooling
    },
});

module.exports = { AppDataSource };
