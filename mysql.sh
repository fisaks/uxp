#!/bin/bash

# Load environment variables from the .env file
set -o allexport
if [ -f "./packages/uxp-bff/.env.dev" ]; then
    source ./packages/uxp-bff/.env.dev
else
    echo "Error: ./packages/uxp-bff/.env.dev file not found"
    exit 1
fi
set +o allexport

# Check for required environment variables
if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PORT" ]  || [ -z "$MYSQL_ROOT_PASSWORD" ] || [ -z "$MYSQL_USER" ] || [ -z "$MYSQL_PASSWORD" ] || [ -z "$MYSQL_DATABASE" ]; then
    echo "Error: One or more required environment variables are missing (DATABASE_HOST, DATABASE_PORT, MYSQL_ROOT_PASSWORD,MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)"
    exit 1
fi

if [ "$#" -eq 1 ]; then

    if [ "$1" == "--root" ]; then
        # Connect as root user
        echo "Connecting to MySQL as root user..."
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "root" -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
     elif [ -f "$1" ]; then
        echo "Running SQL script: $1"
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < "$1"
    else
        echo "Error: Invalid parameter or SQL file '$1' not found"
        exit 1
    fi
    
    # Run the SQL file
else
    # Start the MySQL query prompt
    echo "Starting MySQL prompt..."
    mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"
    
fi
