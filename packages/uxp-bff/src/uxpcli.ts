#!/usr/bin/env node

import bcrypt from "bcrypt";
import { Command } from "commander";
import { UserRole } from "packages/uxp-common/src";
import { DataSource, Repository } from "typeorm";
import { BCRYPT_SALT_ROUNDS } from "./config/constant";
import { User } from "./db/entities/User";

let AppDataSource: DataSource;
const program = new Command();

const withUser = async (
    username: string,
    operation: (user: User, userRepository: Repository<User>) => Promise<void>
) => {
    const userRepository = AppDataSource.getRepository(User);
    try {
        const user: User | null = await userRepository.findOneBy({ username });
        if (!user) {
            throw new Error(`User '${username}' not found.`);
        }

        await operation(user, userRepository);
    } catch (error: any) {
        if (error.message.includes("User")) {
            console.error("Custom Error: User not found.");
        } else {
            console.error("An unexpected error occurred:", error.message);
        }
    } finally {
        if (AppDataSource.isInitialized) {
            console.log("Closing database connection...");
            await AppDataSource.destroy();
            console.log("Database connection closed.");
        }
    }
};

const updatePassword = async (username: string, password: string): Promise<void> => {
    await withUser(username, async (user, userRepository) => {
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
        user.passwordHash = passwordHash;

        await userRepository.save(user);
        console.log(`Password for user '${username}' has been updated.`);
    });
};

const updateRoles = async (username: string, roles: string): Promise<void> => {
    await withUser(username, async (user, userRepository) => {
        user.roles = roles.split(",") as UserRole[];

        await userRepository.save(user);
        console.log(`Roles for user '${username}' have been updated to ${roles}.`);
    });
};

const updateDisableUser = async (username: string, disable: boolean): Promise<void> => {
    await withUser(username, async (user, userRepository) => {
        user.isDisabled = disable;
        user.failedLoginAttempts = disable ? user.failedLoginAttempts : 0;
        await userRepository.save(user);
        console.log(`User '${username}' disable status has been updated to ${disable}.`);
    });
};

const updateTokenVersion = async (username: string): Promise<void> => {
    await withUser(username, async (user, userRepository) => {
        user.tokenVersion = user.tokenVersion + 1;

        await userRepository.save(user);
        console.log(`User '${username}' token version is now ${user.tokenVersion}.`);
    });
};

// Initialize database and start the CLI
const initializeAndRunCLI = async () => {
    try {
        program.name("uxpcli").description("A CLI tool for managing the UXP system.").version("1.0.0");
        program.option("--env <environment>", "Set the environment (default: dev)", "dev");
        program.option(
            "--host <environment>",
            "Override the db host from env file needed for prod when run outside the docker network"
        );

        // Middleware to set NODE_ENV based on --env option
        program.hook("preAction", async (thisCommand) => {
            const envOption = thisCommand.opts().env;
            const host = thisCommand.opts().host;
            process.env.NODE_ENV = envOption;
            console.log(`Environment set to ${process.env.NODE_ENV}`);

            const envModule = await import("./config/env");
            const env: typeof envModule.default = envModule.default;

            if (host) {
                env.DATABASE_HOST = host;
            }
            console.log("Initializing database connection...");
            const { AppDataSource: LoadedAppDataSource } = require("./db/typeorm.config");
            await LoadedAppDataSource.initialize();
            AppDataSource = LoadedAppDataSource;

            console.log(`Database connected to ${env.MYSQL_UXP_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);
        });

        program
            .command("update-password")
            .description("Update a user's password.")
            .argument("<username>", "Username of the account to update")
            .argument("<password>", "New password for the account")
            .action(async (username: string, password: string) => {
                try {
                    await updatePassword(username, password);
                } catch (error: any) {
                    console.error(`Error updating password: ${error.message}`);
                }
            });
        program
            .command("set-roles")
            .description("Update a user's roles")
            .argument("<username>", "Username of the account to update")
            .argument("<roles>", "comma separated list of roles")
            .action(async (username: string, roles: string) => {
                try {
                    await updateRoles(username, roles);
                } catch (error: any) {
                    console.error(`Error updating password: ${error.message}`);
                }
            });

        program
            .command("disable-user")
            .description("Update a user's disable status")
            .argument("<username>", "Username of the account to update")
            .argument("<disable>", "true or false to set disable status")
            .action(async (username: string, disable: string) => {
                if (!["true", "false"].includes(disable.toLocaleLowerCase())) {
                    console.error("true or false for the disable argument");
                    process.exit(1);
                }
                try {
                    await updateDisableUser(username, disable.toLocaleLowerCase() === "false" ? false : true);
                } catch (error: any) {
                    console.error(`Error updating users disable status: ${error.message}`);
                }
            });

        program
            .command("token-version")
            .description("Update a user's token version to invalidate any refresh token")
            .argument("<username>", "Username of the account to update")
            .action(async (username: string) => {
                try {
                    await updateTokenVersion(username);
                } catch (error: any) {
                    console.error(`Error updating users disable status: ${error.message}`);
                }
            });

        program.parse(process.argv);
    } catch (err: any) {
        console.error("Error during Data Source initialization:", err.message);
        process.exit(1); // Exit with failure status
    }
};

// Start the process
initializeAndRunCLI();
