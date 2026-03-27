#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {db|mqtt}"
}

# Check if no argument is provided
if [ -z "$1" ]; then
    echo "Error: Missing argument."
    print_usage
    exit 1
fi

# Validate the first argument
case "$1" in
    db)
        docker exec -it uxp-db-server-1 sh
    ;;
    mqtt)
        docker exec -it uxp-mqtt sh
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac
