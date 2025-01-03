#!/bin/bash
# Environment variable with comma-separated database names
IFS=',' read -r -a databases <<< "$UXP_DATABASES"

# Folder containing SQL files
sql_folder="/uxp-initdb/script-templates"

TARGET_DIR="/uxp-init-scripts"

mkdir -p $TARGET_DIR
cp $sql_folder/*.sql $TARGET_DIR

# Loop through each database in the list
for db in "${databases[@]}"; do
  echo "Processing database: $db"

  # Get corresponding environment variables for the current database
  database_name=$(eval echo "\$MYSQL_${db}_DATABASE")
  database_user=$(eval echo "\$MYSQL_${db}_USER")
  database_password=$(eval echo "\$MYSQL_${db}_PASSWORD")

  # Check if all variables are set
  if [[ -z "$database_name" || -z "$database_user" || -z "$database_password" ]]; then
    echo "Error: Missing environment variables for database $db. Skipping..."
    continue
  fi

  # Replace placeholders in each SQL file in the folder
  for file in "$TARGET_DIR"/*.sql; do

    echo "Updating placeholders in file: $file"
    sed -i \
      -e "s/{{MYSQL_${db}_DATABASE}}/$database_name/g" \
      -e "s/{{MYSQL_${db}_USER}}/$database_user/g" \
      -e "s/{{MYSQL_${db}_PASSWORD}}/$database_password/g" \
      "$file" 
  done
done

echo "Generated scripts are now in: $TARGET_DIR"
