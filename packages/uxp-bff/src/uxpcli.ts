#!/usr/bin/env node

import env from "./config/env";
import bcrypt from "bcrypt";
import { Command } from "commander";
import { UserRole } from "packages/uxp-common/src";
import { Repository } from "typeorm";
import { BCRYPT_SALT_ROUNDS } from "./config/constant";
import { User } from "./db/entities/User";

const { AppDataSource } = require("./db/typeorm.config");

const program = new Command();

const withUser = async (
    username: string,
    operation: (user: User, userRepository: Repository<User>) => Promise<void>
) => {
    const userRepository = AppDataSource.getRepository(User);
    try {
        const user: User = await userRepository.findOneBy({ username });
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
        console.log("Initializing database connection...");
        await AppDataSource.initialize();
        console.log(`Database connected to ${env.MYSQL_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);

        program.name("uxpcli").description("A CLI tool for managing the UXP system.").version("1.0.0");

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
