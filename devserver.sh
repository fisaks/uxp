#!/bin/bash

# Name of the tmux session
SESSION_NAME="uxp-dev"


start_dev_env() {
    # Check if the session already exists
    if tmux has-session -t $SESSION_NAME 2>/dev/null; then
        echo "Session $SESSION_NAME already exists. Attaching to it..."
        tmux attach-session -t $SESSION_NAME
        exit 0
    fi
    
    
    docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d db-server mqtt
    
    
    echo "⏳ Waiting for Mosquitto to be ready on localhost:2883..."
    for i in {1..10}; do
        if nc -z localhost 2883; then
            echo "✅ Mosquitto is up!"
            break
        fi
        echo "  ...retrying ($i)"
        sleep 1
    done
    
    # Start a new tmux session (detached)
    tmux new-session -d -s $SESSION_NAME
    
    
    # Pane 1: Start Docker (MySQL container)
    tmux send-keys -t $SESSION_NAME "echo '################## PRESS CTRL+b d TO DETACH ##################' && docker logs -f uxp-db-server-1" C-m
    
    tmux split-window -v -t $SESSION_NAME
    tmux resize-pane -t 0 -U 20
    tmux split-window -v -t $SESSION_NAME
    
    tmux select-pane -t 1
    tmux split-window -h -t $SESSION_NAME
    
    #tmux send-keys -t $SESSION_NAME.1 "export \$(grep -v '^#' .env.dev | xargs) >/dev/null 2>&1" C-m
    tmux send-keys -t $SESSION_NAME.1 "set -o allexport" C-m
    tmux send-keys -t $SESSION_NAME.1 "source .env.dev" C-m
    tmux send-keys -t $SESSION_NAME.1 "set +o allexport" C-m
    tmux send-keys -t $SESSION_NAME.1 "./database/wait-for-db.sh && pnpm  --filter @uxp/bff run typeorm:run && pnpm run start:bff" C-m
    
    tmux send-keys -t $SESSION_NAME.2 "pnpm run start:app" C-m
    
    tmux select-pane -t 0
    tmux split-window -h -t $SESSION_NAME
    tmux send-keys -t $SESSION_NAME.1 "pnpm run watch" C-m
    
    # Select the first pane
    tmux select-pane -t 4
    tmux split-window -h -t $SESSION_NAME
    tmux send-keys -t $SESSION_NAME.4 "sleep 10 && ./mysql.sh" C-m
    tmux select-pane -t 5
    tmux resize-pane -R 90
    
    # Rename the first tab to 'uxp'
    tmux rename-window -t $SESSION_NAME:0 'uxp'
    
    # Create a new window (tab) and rename it to 'h2c'
    tmux new-window -t $SESSION_NAME -n 'demo&h2c'
    
    tmux split-window -v -t $SESSION_NAME:1
    tmux select-pane -t 0
    tmux split-window -h -t $SESSION_NAME:1
    tmux select-pane -t 2MASTER
    tmux split-window -h -t $SESSION_NAME:1
    tmux send-keys -t $SESSION_NAME:1.0 "pnpm run start:demo-bff" C-m
    tmux send-keys -t $SESSION_NAME:1.1 "pnpm run start:demo-app" C-m
    
    tmux send-keys -t $SESSION_NAME:1.2 "export \$(grep -v '^#' .env.dev | xargs) >/dev/null 2>&1" C-m
    tmux send-keys -t $SESSION_NAME:1.2 "./database/wait-for-db.sh && pnpm  --filter @h2c/bff run typeorm:run && pnpm run start:h2c-bff" C-m
    
    #tmux send-keys -t $SESSION_NAME:1.2 "pnpm run start:h2c-bff" C-m
    tmux send-keys -t $SESSION_NAME:1.3 "pnpm run start:h2c-app" C-m
    
    tmux new-window -t $SESSION_NAME -n 'uhn'
    tmux split-window -v -t $SESSION_NAME:2
    tmux split-window -v -t $SESSION_NAME:2
    tmux split-window -h -t $SESSION_NAME:2
    tmux select-pane -t 0
    tmux resize-pane -y 10%
    tmux select-pane -t 1
    tmux resize-pane -y 45%
    tmux send-keys -t $SESSION_NAME:2.0 "docker logs -f uxp-mqtt" C-m
    tmux send-keys -t $SESSION_NAME:2.1 "mosquitto_sub -h localhost -p 2883 -t "uhn/#" -v" C-m
    tmux send-keys -t $SESSION_NAME:2.2 "export UHN_PUBLIC_HOST=$(hostname -I | awk '{print $1}')" C-m
    tmux send-keys -t $SESSION_NAME:2.2 "pnpm run start:uhn-master" C-m
    tmux send-keys -t $SESSION_NAME:2.3 "pnpm run start:uhn-app" C-m
    
    
    # Select the first tab
    tmux select-window -t $SESSION_NAME:0
    # Attach to the tmux session
    tmux attach-session -t $SESSION_NAME
    tmux select-pane -t 5
}

is_db_running() {
    docker ps --filter "name=uxp-db-server-1" --format "{{.Names}}" | grep -q "uxp-db-server-1"
}

# Function to stop the development environment
stop_dev_env() {
    echo "Stopping tmux session and Docker Compose..."
    tmux kill-session -t $SESSION_NAME 2>/dev/null || echo "No tmux session found with name $SESSION_NAME"
    docker compose -f docker-compose.yaml -f docker-compose.dev.yaml down
    timeout=30         # Maximum wait time in seconds
    elapsed=0
    while is_db_running; do
        if [ "$elapsed" -ge "$timeout" ]; then
            echo -e "\nTimeout reached after $timeout seconds. Exiting."
            exit 1
        fi
        
        echo -ne "\rWaiting for container 'uxp-db-server-1' to stop: $elapsed seconds elapsed..."
        sleep 1
        ((elapsed++))
    done
    echo -e "\nContainer 'uxp-db-server-1' stopped after $elapsed seconds."
}


print_usage() {
    echo "Usage: $0 {start|stop}"
    echo "Commands:"
    echo "  start   Start the dev server"
    echo "  stop    Stop the dev server"
}

case "$1" in
    start )
        start_dev_env
    ;;
    stop )
        stop_dev_env
    ;;
    * )
        print_usage
    ;;
    
esac

