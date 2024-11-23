#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {web|bff|sb}"
    echo "Valid options:"
    echo "  web    Shell to NGINX"
    echo "  bff  Shell to bff"
    echo "  db    Shell to MySQL"
}

# Check if no argument is provided
if [ -z "$1" ]; then
    echo "Error: Missing argument."
    print_usage
    exit 1
fi

# Validate the first argument
case "$1" in
    web)
        echo "You selected 'nginx'. Opening shell to nginx..."
        # Add nginx-related commands here
        docker exec -it nginx sh
    ;;
    bff)
        echo "You selected 'bff'. Opening shell to bff..."
        # Add express-related commands here
        docker exec -it bff-server sh
    ;;
    db)
        echo "You selected 'mysql'. Opening shell to mysql..."
        # Add MySQL-related commands here
        docker exec -it mysql sh
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac

