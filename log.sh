#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {db|mqtt} {docker logs flags}"
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
        shift 1
        docker logs uxp-db-server-1 $@
    ;;
    mqtt)
        shift 1
        docker logs uxp-mqtt $@
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac
