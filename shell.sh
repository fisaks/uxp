#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {web|bff|sb}"
    echo "Valid options:"
    echo "  web             Shell to web"
    echo "  web-remote      Shell to web-remote"
    echo "  uxp             Shell to bff"
    echo "  demo            Shell to demo-bff"
    echo "  h2c             Shell to h2c-bff"
    echo "  db              Shell to MySQL"
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
        echo "You selected 'web'. Opening shell to web..."
        # Add nginx-related commands here
        docker exec -it uxp-web-server-1 sh
    ;;
    web-remote)
        echo "You selected 'web-remote'. Opening shell to web-remote..."
        # Add nginx-related commands here
        docker exec -it uxp-web-remote-server-1 sh
    ;;
    uxp)
        echo "You selected 'uxp'. Opening shell to uxp-bff..."
        # Add express-related commands here
        docker exec -it uxp-bff-server-1 sh
    ;;
    demo)
        echo "You selected 'demo'. Opening shell to demo-bff..."
        # Add express-related commands here
        docker exec -it uxp-demo-server-1 sh
    ;;
    h2c)
        echo "You selected 'h2c'. Opening shell to h2c-bff..."
        # Add express-related commands here
        docker exec -it uxp-h2c-server-1 sh
    ;;
    db)
        echo "You selected 'db'. Opening shell to mysql..."
        # Add MySQL-related commands here
        docker exec -it uxp-db-server-1 sh
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac

