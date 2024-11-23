## Development environment

### Start

`devserver.sh`

### Stop

`devserver.sh stop`

### Manually

```
docker compose up -d mysql
npm run start:bff
npm run start:app

docker compose down
```

## Deployment

```
docker compose build
docker compose up -d
```

### Create .htpasswd for Password Protection

Install apache2-utils:

`sudo apt-get install apache2-utils`

Generate a password file:

`sudo htpasswd -c /etc/nginx/.htpasswd username`

## Navigating the tmux Environment

    * Detach the tmux Session: Press `Ctrl+b` and then `d` to detach the session while leaving the processes running.
    * Switch Between Panes: Use `Ctrl+b` followed by an `arrow key` to switch between panes.
    * to make current pane whole window press `Ctrl+b` and then `z` and to toggle back `Ctrl+b` and then `z`

Reattach to the tmux Session: Run:

`tmux attach-session -t uxp-dev` or just `devserver.sh`

Kill the tmux Session: Exit all panes or kill the session with:

`tmux kill-session -t uxp-dev` or just `devserver.sh stop`
