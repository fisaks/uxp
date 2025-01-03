#!/bin/bash

# Function to display usage instructions
print_usage() {
    echo "Usage: $0 {web|bff|sb} {docker logs flags}"
    echo "Valid options:"
    echo "  web           log to web"
    echo "  web-remote    log to web"
    echo "  uxp           log to bff"
    echo "  demo          log to demo"
    echo "  h2c           log to h2c"
    echo "  db            log to MySQL"
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
        shift 1
        docker logs uxp-web-server-1 $@
    ;;
    web-remote)
        echo "You selected 'web-remote'. Opening shell to web-remote..."
        # Add nginx-related commands here
        shift 1
        docker logs uxp-web-remote-server-1 $@
    ;;
    uxp)
        echo "You selected 'uxp'. Opening shell to uxp-bff..."
        # Add express-related commands here
        shift 1
        docker logs uxp-bff-server-1 $@
    ;;
    demo)
        echo "You selected 'demo'. Opening shell to demo-bff..."
        # Add express-related commands here
        shift 1
        docker logs uxp-demo-server-1 $@
    ;;
    h2c)
        echo "You selected 'h2c'. Opening shell to h2c-bff..."
        # Add express-related commands here
        shift 1
        docker logs uxp-h2c-server-1 $@
    ;;

    db)
        echo "You selected 'mysql'. Opening shell to mysql..."
        # Add MySQL-related commands here
        shift 1
        docker logs uxp-db-server-1 $@
    ;;
    *)
        echo "Error: Invalid argument '$1'."
        print_usage
        exit 1
    ;;
esac

