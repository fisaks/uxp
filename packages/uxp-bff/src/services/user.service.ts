// userService.ts
import { Token } from "@uxp/bff-common";
import { UserAdminView, UserPublic, UserRole } from "@uxp/common";
import { FastifyRequest } from "fastify";
import { QueryRunner } from "typeorm";
import { User } from "../db/entities/User";

export class UserService {
    static async findByUuid(queryRunner: QueryRunner, uuid: string): Promise<User | null> {
        return queryRunner.manager.findOne(User, { where: { uuid } });
    }

    static async findByUsername(queryRunner: QueryRunner, username: string): Promise<User | null> {
        return queryRunner.manager.findOne(User, { where: { username } });
    }

    static async saveUser(queryRunner: QueryRunner, user: User): Promise<User> {
        return queryRunner.manager.save(user);
    }

    static getLoggedInUser = (req: FastifyRequest) => {
        return req.user as Token | undefined;
    };
    static isUserInRole = (req: FastifyRequest, role: UserRole) => {
        const user = req.user as Token | undefined;
        return (user?.roles ?? []).includes(role);
    };

    static toUserPublic = (user: User) => {
        const { uuid, username, firstName, lastName, createdAt, email, roles, lastLogin } = user;
        const userPublic: UserPublic = {
            uuid,
            username,
            firstName,
            lastName,
            createdAt: createdAt.toISO()!,
            email,
            roles,
            lastLogin: lastLogin?.toISO(),
        };
        return userPublic;
    };

    static toUserAdminView = (user: User) => {
        const { uuid, username, firstName, lastName, createdAt, email, roles, lastLogin, failedLoginAttempts, isDisabled, tokenVersion } =
            user;
        const userPublic: UserAdminView = {
            uuid,
            username,
            firstName,
            lastName,
            createdAt: createdAt.toISO()!,
            email,
            roles,
            lastLogin: lastLogin?.toISO(),
            failedLoginAttempts: failedLoginAttempts,
            isDisabled: isDisabled,
            tokenVersion: tokenVersion,
        };
        return userPublic;
    };
}
