require('../config/env');
const { DataSource } = require('typeorm');
const env = require('../config/envValidator');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.DATABASE_HOST ,
  port: parseInt(env.DATABASE_PORT || '3306', 10),
  username: env.MYSQL_USER,
  password: env.MYSQL_PASSWORD ,
  database: env.MYSQL_DATABASE ,
  synchronize: false, // Use migrations for schema changes
  logging: true,
  entities: ['dist/db/entities/**/*.js'],
  migrations: ['dist/db/migrations/**/*.js'],
  extra: {
    connectionLimit: 10, // Connection pooling
  },
});

module.exports = { AppDataSource };
