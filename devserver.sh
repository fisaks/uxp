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
    
    # Start a new tmux session (detached)
    tmux new-session -d -s $SESSION_NAME
      
    
    # Pane 1: Start Docker (MySQL container)
    tmux send-keys -t $SESSION_NAME "trap 'docker compose down' EXIT && docker compose --env-file .env.dev up -d mysql && echo '################## PRESS CTRL+b d TO DETACH ##################' && docker logs -f mysql" C-m
    
    tmux split-window -v -t $SESSION_NAME
    tmux resize-pane -t 0 -U 20
    tmux split-window -v -t $SESSION_NAME
    
    tmux select-pane -t 1
    tmux split-window -h -t $SESSION_NAME
        
    tmux send-keys -t $SESSION_NAME.1 "pnpm run start:bff" C-m
    
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
    tmux select-pane -t 2
    tmux split-window -h -t $SESSION_NAME:1
    tmux send-keys -t $SESSION_NAME:1.0 "pnpm run start:demo-bff" C-m
    tmux send-keys -t $SESSION_NAME:1.1 "pnpm run start:demo-app" C-m
    tmux send-keys -t $SESSION_NAME:1.2 "pnpm run start:h2c-bff" C-m
    tmux send-keys -t $SESSION_NAME:1.3 "pnpm run start:h2c-app" C-m
    


    # Select the first tab
    tmux select-window -t $SESSION_NAME:0
    # Attach to the tmux session
    tmux attach-session -t $SESSION_NAME
    tmux select-pane -t 5
}

# Function to stop the development environment
stop_dev_env() {
    echo "Stopping tmux session and Docker Compose..."
    tmux kill-session -t $SESSION_NAME 2>/dev/null || echo "No tmux session found with name $SESSION_NAME"
    
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

