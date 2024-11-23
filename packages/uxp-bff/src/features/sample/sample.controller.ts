import { FastifyReply, FastifyRequest } from "fastify";
import { Route } from "../../decorator/route.decorator";

export class UserController {
  @Route("get", "/sample/users")
  async getUsers(_req: FastifyRequest, _reply: FastifyReply) {
    // Simulate fetching users
    const users = [{ id: 1, name: "John Doe", email: "john.doe@example.com" }];
    //reply.send(users)
    return users;
  }

  @Route("post", "/sample/users", {
    schema: {
      body: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1 },
          email: { type: "string", minLength: 1 },
        },
        required: ["name", "email"],
      },
    },
  })
  async createUser(req: FastifyRequest<{ Body: { name: string; email: string } }>, _reply: FastifyReply) {
    const { name, email } = req.body;
    // Simulate user creation
    const newUser = { id: 2, name, email };
    return newUser;
  }
}
