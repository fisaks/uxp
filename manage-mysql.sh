#!/bin/bash

# Usage instruction
show_usage() {
    echo "Usage: $0 [start|stop]"
    exit 1
}

if [ -z "$1" ]; then
    echo "Error: Missing argument."
    show_usage
fi

ACTION="$1"

if [ "$ACTION" != "start" ] && [ "$ACTION" != "stop" ]; then
    echo "Error: Invalid action '$ACTION'."
    show_usage
fi

if [ "$ACTION" == "start" ]; then
    CMD="docker compose up -d db-server"
else
    CMD="docker compose down"
fi

echo "Executing: $CMD"
eval "$CMD"

if [ $? -ne 0 ]; then
    echo "Error: Failed to execute $ACTION command."
    exit 1
fi

echo "MySQL service $ACTION completed successfully."
