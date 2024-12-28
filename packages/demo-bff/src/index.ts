import Fastify from "fastify";

const fastify = Fastify();

fastify.get("/api/template", async (request, reply) => {
    return "Hello, world!";
});

const port = 3021;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
