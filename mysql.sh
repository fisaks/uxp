#!/bin/bash

prod_flag=false
root_log_flag=false
file=""
# Loop through all arguments
for arg in "$@"; do
    case "$arg" in
        --prod)
            prod_flag=true
        ;;
        --root)
            root_log_flag=true
        ;;
        *)
            file="$arg"
        ;;
    esac
done


# Load environment variables from the .env file
set -o allexport
if [ "$prod_flag" == "true" ] && [ -f "./.env.prod" ]; then
    source ./.env.prod
    DATABASE_HOST=localhost
elif [ -f "./.env.dev" ]; then
    source ./.env.dev
else
    echo "Error: ./.env.dev file not found"
    exit 1
fi
set +o allexport

# Check for required environment variables
if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PORT" ]  || [ -z "$MYSQL_UXP_DATABASE" ] || [ -z "$MYSQL_UXP_USER" ] || [ -z "$MYSQL_UXP_PASSWORD" ] || [ -z "$MYSQL_ROOT_PASSWORD" ]; then
    echo "Error: One or more required environment variables are missing (DATABASE_HOST, DATABASE_PORT, MYSQL_ROOT_PASSWORD,MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE)"
    exit 1
fi

if [ "$root_log_flag" == "true" ]; then
    
    if [ "$file" == "" ]; then
        # Connect as root user
        echo "Connecting to MySQL as root user..."
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "root" -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_UXP_DATABASE"
        elif [ -f "$file" ]; then
        echo "Running SQL script: $file"
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "root" -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_UXP_DATABASE" < "$file"
    else
        echo "Error: Invalid parameter or SQL file '$file' not found"
        exit 1
    fi
    
    # Run the SQL file
else
    # Start the MySQL query prompt
    if [ "$file" == "" ]; then
        echo "Starting MySQL prompt..."
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_UXP_USER" -p"$MYSQL_UXP_PASSWORD" "$MYSQL_UXP_DATABASE"
        elif [ -f "$file" ]; then
        echo "Running SQL script: $file"
        mysql --protocol=TCP -h "$DATABASE_HOST" -P "$DATABASE_PORT" -u "$MYSQL_UXP_USER" -p"$MYSQL_UXP_PASSWORD" "$MYSQL_UXP_DATABASE" < "$file"
    else
        echo "Error: Invalid parameter or SQL file '$file' not found"
        exit 1
    fi
    
fi
