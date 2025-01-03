# Unified Experience Platform (UXP)

The **Unified Experience Platform (UXP)** is a work-in-progress project aimed at building a modular and extensible platform to unify multiple applications under a single, cohesive user experience. The framework is designed to act as a reverse proxy, integrating backend applications and rendering their content within the same site using a Shadow DOM for isolation and flexibility.

## Vision (Work in Progress)

- **Reverse Proxy Integration**: Fetch and render remote applications with resource URL rewriting for seamless embedding.
- **Shadow DOM Rendering**: Ensure style and functionality isolation for embedded apps.
- **Centralized Role Management**: Define and control access to routes and content using user groups.
- **Flexible Page Composition**: Mix and order external apps and internal components on a single page.
- **Localization Support**: Enable multilingual capabilities for routes, links, and page names.
- **Born from a Practical Need**: Inspired by the challenge of managing and navigating numerous small applications around the house, which proved to be cumbersome and inefficient.

### Note
This project is in its early stages and is still far from implementing all of the envisioned features. Contributions, ideas, and feedback are welcome as the project evolves!

## Project Structure

The project is organized as a **TypeScript** monorepo with the following packages:

- **`demo-bff`**: Backend for the demo remote application.
- **`demo-ui`**: Frontend UI for the demo remote application.
- **`h2c-bff`**: Backend for the H2C (House to Care) remote application.
- **`h2c-common`**: Shared utilities for the H2C app UI and BFF.
- **`h2c-ui`**: Frontend UI for the H2C remote application.
- **`tools`**: Miscellaneous tools and utilities.
- **`uxp-bff`**: Backend for frontend services for the UXP.
- **`uxp-bff-common`**: Shared utilities for UXP remote applications.
- **`uxp-common`**: Shared utilities and types shared across UXP UI, BFF, and remote applications.
- **`uxp-ui`**: Frontend for the UXP.
- **`uxp-ui-lib`**: Shared UI components for the UXP and its remote applications.

![Architecture Diagram](out/docs/uxp/uxp.png)

## Setup

1. Copy the `.env.template` file to create `.env.dev` and `.env.prod` files:

   ```sh
   cp .env.template .env.dev
   cp .env.template .env.prod

   ```
2. Update the environment variables in `.env.dev` and `.env.prod` as needed:

   - For development, set `DATABASE_HOST` to `localhost`.
   - For production, set `DATABASE_HOST` to match the Docker Compose host name for the MySQL image.

## Development environment

To start the development environment, run:

> Starts the development server in a tmux session with multiple windows for different services

```sh
devserver.sh`
```

### Stop

Press `Ctrl-b + d` to detach the session, then run the following command to stop the development server:

```sh
devserver.sh stop
```

## Create Production build

To create a production build, run:

```
./compose.sh build
```

## Start and Stop Production Build

```
./compose.sh up
./compose.sh down

```

## Additional Information

- Ensure you have Docker and Docker Compose installed on your machine.
- Use pnpm for package management. Install it globally if you haven't already:
  ```sh
  npm install -g pnpm
  ```

## Troubleshooting

If you encounter any issues, check the logs for more information:

- Ensure all environment variables are correctly set in the .env files.
- Check the Docker Compose logs:
  ```sh
  docker compose logs
  ```
- Run the following scripts to check logs for specific services:
  ```sh
  ./mysql.sh
  ./log.sh bff
  ./log.sh web
  ./log.sh db
  ```
- Run the following scripts to open a shell in specific services:
  ```sh
  ./shell.sh bff
  ./shell.sh web
  ./shell.sh db
  ```
- Run the following scripts to access the database:
  ```sh
  ./mysql.sh
  ```

### Create .htpasswd for Password Protection

1. Install apache2-utils:

   ```sh
   sudo apt-get install apache2-utils
   ```
2. Generate a password file:

   ```sh
   sudo htpasswd -c /etc/nginx/.htpasswd username
   ```

   `sudo apt-get install apache2-utils`

Generate a password file:

## Navigating the tmux Environment

- **Detach the tmux Session:** Press `Ctrl+b` and then `d` to detach the session while leaving the processes running.
- **Switch Between Panes:** Use `Ctrl+b` followed by an `arrow key` to switch between panes.
- **Toggle Pane Size:** To make the current pane the whole window, press `Ctrl+b` and then `z`. To toggle back, press `Ctrl+b` and then `z` again.
- **Reattach to the tmux Session:** Run `tmux attach-session -t uxp-dev` or just `devserver.sh`.
- **Kill the tmux Session:** Exit all panes or kill the session with `tmux kill-session -t uxp-dev` or just `devserver.sh stop`.

`tmux kill-session -t uxp-dev` or just `devserver.sh stop`

`tmux kill-server` Will kille the whole tmux server
