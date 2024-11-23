#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {web|bff|sb} {docker logs flags}"
    echo "Valid options:"
    echo "  web    log to NGINX"
    echo "  bff  log to bff"
    echo "  db    log to MySQL"
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
        shift 1
        docker logs nginx $@
    ;;
    bff)
        echo "You selected 'bff'. Opening shell to bff..."
        # Add express-related commands here
        shift 1
        docker logs bff-server $@
    ;;
    db)
        echo "You selected 'mysql'. Opening shell to mysql..."
        # Add MySQL-related commands here
        shift 1
        docker logs mysql $@
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac

