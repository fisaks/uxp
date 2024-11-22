#!/bin/bash

# Load environment variables from the .env file
set -o allexport
if [ -f ".env" ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi
set +o allexport

# Check for required environment variables
if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PORT" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASSWORD" ] || [ -z "$MYSQL_DATABASE" ]; then
    echo "Error: One or more required environment variables are missing (DATABASE_HOST, DATABASE_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)"
    exit 1
fi

if [ "$#" -eq 1 ]; then
    SQL_FILE=$1
    
    # Verify the SQL file exists
    if [ ! -f "$SQL_FILE" ]; then
        echo "Error: SQL file '$SQL_FILE' not found"
        exit 1
    fi
    
    # Run the SQL file
    echo "Running SQL script: $SQL_FILE"
    mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$SQL_FILE"
else
    # Start the MySQL query prompt
    echo "Starting MySQL prompt..."
    mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
    
fi
