#!/bin/bash


compose_up() {
    docker compose up -d
}
compose_build_up() {
    docker compose up  --build -d
}

compose_down() {
    docker compose down
}

print_usage() {
    echo "Usage: $0 {up|down}"
    echo "Commands:"
    echo "  up     Start the Docker Compose services"
    echo "  build  Rebuild the images and start the Docker Compose services"
    echo "  down   Stop the Docker Compose services"
}


case "$1" in
    up )
        compose_up
    ;;
    build )
        compose_build_up
    ;;
    down )
        compose_down
    ;;
    * )
        print_usage
    ;;
    
esac

