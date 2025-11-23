const { DataSource } = require("typeorm");
require("../env");
const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "3306", 10),
    username: process.env.MYSQL_UHN_USER,
    password: process.env.MYSQL_UHN_PASSWORD,
    database: process.env.MYSQL_UHN_DATABASE,
    synchronize: false, // Use migrations for schema changes
    logging: true,
    entities: [process.env.TS_NODE_DEV ? "src/db/entities/**/*.ts" : "dist/db/entities/**/*.js"],
    migrations: [process.env.TS_NODE_DEV ? "src/db/migrations/**/*.ts" : "dist/db/migrations/**/*.js"],
    cli: {
        migrationsDir: "dist/migration",
    },
    extra: {
        connectionLimit: 10, // Connection pooling
    },
});

module.exports = { AppDataSource };
