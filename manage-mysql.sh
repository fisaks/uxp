#!/bin/bash

# Usage instruction
show_usage() {
    echo "Usage: $0 [prod|dev] [start|stop]"
    echo "  prod      - Operate on the production MySQL instance."
    echo "  dev       - Operate on the development MySQL instance."
    echo "  start     - Starts the MySQL service."
    echo "  stop      - Stops the MySQL service."
    exit 1
}

# Validate input arguments
if [ $# -lt 2 ]; then
    echo "Error: Missing arguments."
    show_usage
fi

ENV="$1"
ACTION="$2"

# Validate environment
if [ "$ENV" != "prod" ] && [ "$ENV" != "dev" ]; then
    echo "Error: Invalid environment '$ENV'."
    show_usage
fi

# Validate action
if [ "$ACTION" != "start" ] && [ "$ACTION" != "stop" ]; then
    echo "Error: Invalid action '$ACTION'."
    show_usage
fi

# Define commands based on environment and action
if [ "$ENV" == "dev" ]; then
    CMD="docker compose -f docker-compose.yaml -f docker-compose.dev.yaml"
else
    CMD="docker compose -f docker-compose.yaml"
fi

if [ "$ACTION" == "start" ]; then
    CMD="$CMD up -d db-server"
elif [ "$ACTION" == "stop" ]; then
    CMD="$CMD down"
fi

# Execute the command
echo "Executing: $CMD"
eval "$CMD"

if [ $? -ne 0 ]; then
    echo "Error: Failed to execute $ACTION command."
    exit 1
fi


echo "MySQL $ENV service $ACTION completed successfully."
