import fastifyJwt from "@fastify/jwt";

import fp from "fastify-plugin";
import { ACCESS_TOKEN } from "../config/constant";

export default fp(async (fastify) => {
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || "your-secret-key",
        cookie: {
            cookieName: ACCESS_TOKEN,
            signed: false,
        },
    });
});
