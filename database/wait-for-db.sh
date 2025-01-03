#!/bin/bash

# Wait for MySQL to be ready

until mysqladmin ping --protocol=TCP -h"${DATABASE_HOST}" -P"${DATABASE_PORT}" -u"${MYSQL_UXP_USER}" -p"${MYSQL_UXP_PASSWORD}" --silent; do
  echo "Waiting for MySQL ${DATABASE_HOST}:${DATABASE_PORT}..."
  sleep 2
done

echo "MySQL is reachable. Checking if it's ready..."

# Wait for the root user to be accessible
while ! mysql --protocol=TCP -h"${DATABASE_HOST}" -P"${DATABASE_PORT}" -u"${MYSQL_UXP_USER}" -p"${MYSQL_UXP_PASSWORD}" -e "SELECT 1;" ${MYSQL_UXP_DATABASE} &>/dev/null; do
  echo "Waiting for MySQL to be ready with the user ${MYSQL_UXP_USER}..."
  sleep 2
done

echo "MySQL is ready and accessible."


