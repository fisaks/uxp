import { AppError, AppLogger, REFRESH_TOKEN, Route, Token, UseQueryRunner } from "@uxp/bff-common";
import {
    ErrorCodes,
    LockUserPayload,
    LockUserResponse,
    LockUserSchema,
    LoginPayload,
    LoginResponse,
    LoginSchema,
    ProfilePayload,
    ProfileSchema,
    RegisterPayload,
    RegisterResponse,
    RegisterSchema,
    UnlockUserPayload,
    UnlockUserReponse,
    UnlockUserSchema,
    UpdateTokenVersionPayload,
    UpdateTokenVersionResponse,
    UpdateTokenVersionSchema,
    UpdateUserRoleSchema,
    UpdateUserRolesPayload,
    UpdateUserRolesResponse,
    WhoAmIResponse,
} from "@uxp/common";
import { sendErrorResponse } from "@uxp/bff-common";
import bcrypt from "bcrypt";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import { QueryRunner } from "typeorm";
import { BCRYPT_SALT_ROUNDS, MAX_FAILD_LOGIN } from "../../config/constant";

import { User } from "../../db/entities/User";

import { UserService } from "../../services/user.service";

import {
    clearAuthCookies,
    generateAccessToken,
    generateRefreshToken,
    setAuthCookies,
    verifyRefreshToken,
} from "../../utils/tokenUtils";

export class UserController {
    private fastify: FastifyInstance;

    constructor(fastify: FastifyInstance) {
        this.fastify = fastify;
    }

    @Route("post", "/register", { authenticate: false, schema: RegisterSchema })
    @UseQueryRunner()
    async register(req: FastifyRequest<{ Body: RegisterPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { username, password, email, firstName, lastName } = req.body;

        const loggedInUser = UserService.getLoggedInUser(req);

        if (loggedInUser) {
            // Allow only admins to register new users while logged in
            if (!UserService.isUserInRole(req, "admin")) {
                return sendErrorResponse({
                    reply,
                    req,
                    statusCode: 400,
                    code: ErrorCodes.ALREADY_REGISTERED,
                    message: "Only admins can register new users while logged in.",
                });
            }
        }

        const existingUser = await UserService.findByUsername(queryRunner, username);

        if (existingUser) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USERNAME_EXISTS,
                message: "Username already exists",
                params: { username },
            });
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        const user = new User({
            username,
            passwordHash,
            firstName,
            lastName,
            email,
            roles: [],
            failedLoginAttempts: 0,
            isDisabled: false,
        });

        await UserService.saveUser(queryRunner, user);

        const savedUser = await UserService.findByUsername(queryRunner, username);
        if (!savedUser) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 500,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "Could not find created user",
                params: { username },
            });
        }

        reply.send({ uuid: savedUser.uuid } as RegisterResponse);
    }

    @Route("post", "/login", { authenticate: false, schema: LoginSchema })
    @UseQueryRunner()
    async login(req: FastifyRequest<{ Body: LoginPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { username, password } = req.body;

        const user = await UserService.findByUsername(queryRunner, username);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.INVALID_USERNAME_PASSWORD,
                message: "Invalid username or password",
            });
        }
        if (user.isDisabled || user.failedLoginAttempts > MAX_FAILD_LOGIN) {
            if (!user.isDisabled) {
                user.isDisabled = true;
                await UserService.saveUser(queryRunner, user);
                AppLogger.warn(req, { message: `To many failed logins locking user` });
            } else {
                AppLogger.warn(req, { message: `User is locked` });
            }

            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.INVALID_USERNAME_PASSWORD,
                message: "Invalid username or password",
            });
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            user.failedLoginAttempts++;
            user.isDisabled = user.isDisabled ? user.isDisabled : user.failedLoginAttempts > 5;
            await UserService.saveUser(queryRunner, user);

            AppLogger.warn(req, { message: `Failed login attempt ${user.failedLoginAttempts}/${MAX_FAILD_LOGIN}` });

            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.INVALID_USERNAME_PASSWORD,
                message: "Invalid username or password",
            });
        }

        const accessToken = generateAccessToken(this.fastify, user);
        const refreshToken = generateRefreshToken(this.fastify, user);

        setAuthCookies(reply, accessToken, refreshToken);

        user.failedLoginAttempts = 0;
        user.lastLogin = DateTime.now();
        await UserService.saveUser(queryRunner, user);

        reply.send({ user: UserService.toUserPublic(user) } as LoginResponse);
    }

    @Route("put", "/profile/:uuid", { authenticate: true, roles: [], schema: ProfileSchema })
    @UseQueryRunner()
    async profile(
        req: FastifyRequest<{ Body: ProfilePayload; Params: { uuid: string } }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid } = req.params;
        const { passwordOld, password, email, firstName, lastName } = req.body;
        const adminRole = UserService.isUserInRole(req, "admin");
        const loggedInUser = UserService.getLoggedInUser(req);

        if (!loggedInUser) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 401,
                code: ErrorCodes.UNAUTHORIZED,
                message: "No a logged in user",
            });
        }

        const user = await UserService.findByUuid(queryRunner, loggedInUser.uuid);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
                params: { uuid: loggedInUser.uuid },
            });
        }
        if (user.uuid !== uuid && !adminRole) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 400,
                code: ErrorCodes.VALIDATION,
                message: "Logged in user trying to update other user",
                params: { uuid: loggedInUser.uuid },
            });
        }

        if (password) {
            AppLogger.info(req, { message: "Changing password for user" });
            const oldPasswordOk = await bcrypt.compare(passwordOld, user.passwordHash);

            if (!oldPasswordOk) {
                return sendErrorResponse({
                    reply,
                    req,
                    statusCode: 400,
                    code: ErrorCodes.USER_OLD_PASSWORD_NOT_MATCH,
                    message: "Users old password don't match",
                });
            }
            const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
            user.passwordHash = passwordHash;
        }
        user.email = email;
        user.firstName = firstName;
        user.lastName = lastName;

        await UserService.saveUser(queryRunner, user);

        if (!adminRole) {
            const accessToken = generateAccessToken(this.fastify, user);
            setAuthCookies(reply, accessToken);
        }

        reply.status(204).send();
    }

    @Route("post", "/refresh-token", { authenticate: false })
    @UseQueryRunner()
    async refreshToken(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        try {
            const refreshToken = req.cookies[REFRESH_TOKEN];
            if (!refreshToken) {
                return sendErrorResponse({
                    reply,
                    req,
                    code: ErrorCodes.INVALID_REFRESH_TOKEN,
                    message: "Refresh token missing from cookies",
                    statusCode: 401,
                });
            }

            const decoded = verifyRefreshToken(this.fastify, refreshToken);
            const user = await UserService.findByUuid(queryRunner, decoded.uuid);

            if (!user || user.tokenVersion === undefined || user.tokenVersion !== decoded.tokenVersion) {
                return sendErrorResponse({
                    reply,
                    req,
                    code: ErrorCodes.INVALID_REFRESH_TOKEN,
                    message: "Invalid refresh token",
                    statusCode: 401,
                });
            }

            // Generate new tokens
            const newAccessToken = generateAccessToken(this.fastify, user);
            const newRefreshToken = generateRefreshToken(this.fastify, user);

            setAuthCookies(reply, newAccessToken, newRefreshToken);

            AppLogger.info(req, { message: "User tokens refreshed successfully" });

            reply.status(204).send();
        } catch (err) {
            AppLogger.error(req, { error: err as Error });
            if (err instanceof AppError) {
                if (err.code === ErrorCodes.INVALID_REFRESH_TOKEN) {
                    clearAuthCookies(reply);
                }
                throw err;
            }
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.UNAUTHORIZED,
                statusCode: 401,
            });
        }
    }

    @Route("get", "/whoami", { authenticate: true, roles: [] })
    @UseQueryRunner()
    async whoAmI(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.user as Token;
        const user = await UserService.findByUuid(queryRunner, uuid);
        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
                statusCode: 404,
            });
        }
        reply.send({ user: UserService.toUserPublic(user) } as WhoAmIResponse);
    }

    @Route("post", "/logout", { authenticate: false })
    @Route("get", "/logout", { authenticate: false })
    @UseQueryRunner()
    async logout(req: FastifyRequest, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.user as Token;
        if (uuid) {
            const user = await UserService.findByUuid(queryRunner, uuid);

            if (user) {
                user.tokenVersion += 1;
                await UserService.saveUser(queryRunner, user);
                AppLogger.info(req, { message: "User logged out successfully" });
            }
        }

        // Clear the cookies
        clearAuthCookies(reply).code(204).send();
    }

    @Route("post", "/user/unlock", { authenticate: true, roles: ["admin"], schema: UnlockUserSchema })
    @UseQueryRunner()
    async unlockUser(req: FastifyRequest<{ Body: UnlockUserPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.body;
        const user = await UserService.findByUuid(queryRunner, uuid);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
            });
        }

        user.isDisabled = false;
        user.failedLoginAttempts = 0;
        await UserService.saveUser(queryRunner, user);
        const adminUser = UserService.getLoggedInUser(req);
        AppLogger.info(req, { message: `User %s unlocked by admin %s`, args: [user.username, adminUser?.username] });

        reply.send({ user: UserService.toUserAdminView(user) } as UnlockUserReponse);
    }
    @Route("post", "/user/lock", { authenticate: true, roles: ["admin"], schema: LockUserSchema })
    @UseQueryRunner()
    async lockUser(req: FastifyRequest<{ Body: LockUserPayload }>, reply: FastifyReply, queryRunner: QueryRunner) {
        const { uuid } = req.body;
        const user = await UserService.findByUuid(queryRunner, uuid);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
            });
        }
        const adminUser = UserService.getLoggedInUser(req);

        if (adminUser?.uuid === user.uuid) {
            return sendErrorResponse({
                reply,
                req,
                statusCode: 500,
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "User Can't lock himself",
            });
        }
        user.isDisabled = true;
        await UserService.saveUser(queryRunner, user);

        AppLogger.info(req, { message: `User %s Locked by admin %s`, args: [user.username, adminUser?.username] });

        reply.send({ user: UserService.toUserAdminView(user) } as LockUserResponse);
    }

    @Route("post", "/user/roles", { authenticate: true, roles: ["admin"], schema: UpdateUserRoleSchema })
    @UseQueryRunner()
    async updateUserRoles(
        req: FastifyRequest<{ Body: UpdateUserRolesPayload }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid, roles } = req.body;
        const user = await UserService.findByUuid(queryRunner, uuid);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
            });
        }
        const adminUser = UserService.getLoggedInUser(req);

        user.roles = adminUser?.uuid === user.uuid && !roles.includes("admin") ? [...roles, "admin"] : roles;
        await UserService.saveUser(queryRunner, user);

        AppLogger.info(req, {
            message: `User %s roles updated by admin %s to %s`,
            args: [user.username, adminUser?.username, user.roles],
        });

        reply.send({ user: UserService.toUserAdminView(user) } as UpdateUserRolesResponse);
    }

    @Route("post", "/user/token-version", { authenticate: true, roles: ["admin"], schema: UpdateTokenVersionSchema })
    @UseQueryRunner()
    async updateUserTokenVersion(
        req: FastifyRequest<{ Body: UpdateTokenVersionPayload }>,
        reply: FastifyReply,
        queryRunner: QueryRunner
    ) {
        const { uuid } = req.body;
        const user = await UserService.findByUuid(queryRunner, uuid);

        if (!user) {
            return sendErrorResponse({
                reply,
                req,
                code: ErrorCodes.USER_NOT_FOUND,
                message: "User not found",
            });
        }
        const adminUser = UserService.getLoggedInUser(req);

        user.tokenVersion += 1;
        await UserService.saveUser(queryRunner, user);

        AppLogger.info(req, {
            message: `User %s token version updated by admin %s`,
            args: [user.username, adminUser?.username],
        });

        reply.send({ user: UserService.toUserAdminView(user) } as UpdateTokenVersionResponse);
    }
}
