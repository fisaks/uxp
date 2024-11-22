import { Route } from '../../decorator/route.decorator';
import { Request, Response } from 'express';
import Joi from 'joi';

const createUserSchema = Joi.object({
  name: Joi.string().min(1).required(),
  email: Joi.string().email().required(),
});

export class UserController {
  @Route('get', '/sample/users')
  async getUsers(req: Request, res: Response) {
    // Simulate fetching users
    const users = [{ id: 1, name: 'John Doe', email: 'john.doe@example.com' }];
    res.json(users);
  }

  @Route('post', '/sample/users', { schema: createUserSchema })
  async createUser(req: Request, res: Response) {
    const { name, email } = req.body;
    // Simulate user creation
    const newUser = { id: 2, name, email };
    res.status(201).json(newUser);
  }
}
