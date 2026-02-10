const { DataSource } = require("typeorm");
require("../env");
const isCompiled = __filename.includes("dist");
const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "3306", 10),
    username: process.env.MYSQL_H2C_USER,
    password: process.env.MYSQL_H2C_PASSWORD,
    database: process.env.MYSQL_H2C_DATABASE,
    synchronize: false, // Use migrations for schema changes
    logging: true,
    entities: [isCompiled ? "dist/db/entities/**/*.js" : "src/db/entities/**/*.ts"],
    migrations: [isCompiled ? "dist/db/migrations/**/*.js" : "src/db/migrations/**/*.ts"],
    cli: {
        migrationsDir: "dist/migration",
    },
    extra: {
        connectionLimit: 10, // Connection pooling
    },
});

module.exports = { AppDataSource };
