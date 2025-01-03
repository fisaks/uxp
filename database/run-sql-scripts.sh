#!/bin/bash


# Directory containing SQL scripts
SQL_DIR="/uxp-init-scripts"

# Wait for MySQL to be ready
until mysqladmin ping -h"${DATABASE_HOST}" -P"${DATABASE_PORT}" --silent; do
  echo "Waiting for MySQL ${DATABASE_HOST}:${DATABASE_PORT}..."
  sleep 2   
done


echo "MySQL is reachable. Checking if it's ready..."

# Wait for the root user to be accessible
while ! mysql -h"${DATABASE_HOST}" -P"${DATABASE_PORT}" -uroot -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT 1;" &>/dev/null; do
  echo "Waiting for MySQL to be ready with the configured root password..."
  sleep 2
done

echo "MySQL is ready and accessible."

# Execute all SQL files in the directory
for file in "$SQL_DIR"/*.sql; do
  if [ -f "$file" ]; then
    echo "Running $file..."
    mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" < "$file"
    #rm "$file"
  fi
done

echo "All SQL scripts executed."
