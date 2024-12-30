const { DataSource } = require("typeorm");

const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "3306", 10),
    username: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    synchronize: false, // Use migrations for schema changes
    logging: true,
    entities: [process.env.TS_NODE_DEV ? "src/db/entities/**/*.ts" : "dist/db/entities/**/*.js"],
    //entities: [Page],
    migrations: [
        process.env.TS_NODE_DEV ? "src/db/migrations/**/*.ts" : "dist/db/migrations/**/*.js",
        process.env.TS_NODE_DEV ? "src/db/migrations/**/*.sql" : "dist/db/migrations/**/*.sql",
    ],
    cli: {
        migrationsDir: "dist/migration",
    },
    extra: {
        connectionLimit: 10, // Connection pooling
    },
});

module.exports = { AppDataSource };
