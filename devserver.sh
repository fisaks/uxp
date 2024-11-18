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
    tmux send-keys -t $SESSION_NAME "trap 'docker compose down' EXIT && docker compose up -d mysql && echo '################## PRESS CTRL+b d TO DETACH ##################' && docker logs -f mysql" C-m
    
    tmux split-window -v -t $SESSION_NAME
    tmux resize-pane -t 0 -U 20
    
    tmux split-window -h -t $SESSION_NAME
    
    tmux send-keys -t $SESSION_NAME.1 "npm run start:bff" C-m
    
    tmux send-keys -t $SESSION_NAME.2 "npm run start:app" C-m
    
    # Select the first pane
    tmux select-pane -t 0
    
    # Attach to the tmux session
    tmux attach-session -t $SESSION_NAME
    
}

# Function to stop the development environment
stop_dev_env() {
    echo "Stopping tmux session and Docker Compose..."
    tmux kill-session -t $SESSION_NAME 2>/dev/null || echo "No tmux session found with name $SESSION_NAME"
    
}
case "$1" in
    start )
        start_dev_env
    ;;
    stop )
        stop_dev_env
    ;;
    * )
        start_dev_env
    ;;
    
esac

