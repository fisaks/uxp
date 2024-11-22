import { Application } from 'express';
import { AnySchema } from 'joi';
import 'reflect-metadata';

const ROUTES_METADATA_KEY = 'rest:routes';

export interface RouteMetadata {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    handlerName: string;
    validate?: (payload: any) => boolean;
    schema?: AnySchema;
}

export function Route(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options?: { validate?: (payload: any) => boolean; schema?: AnySchema }
) {

    return function (target: any, propertyKey: string) {

        const routes: RouteMetadata[] =
            Reflect.getMetadata(ROUTES_METADATA_KEY, target.constructor) || [];
        routes.push({
            method,
            path,
            handlerName: propertyKey,
            validate: options?.validate,
            schema: options?.schema,
        });
        Reflect.defineMetadata(ROUTES_METADATA_KEY, routes, target.constructor);
    };
}

export function getRoutes(target: any): RouteMetadata[] {
    return Reflect.getMetadata(ROUTES_METADATA_KEY, target) || [];
}


export function registerRoutes(app: Application, controllers: any[]) {
    controllers.forEach((ControllerClass) => {
        const instance = new ControllerClass();
        const routes = getRoutes(ControllerClass);

        routes.forEach(({ method, path, validate, schema, handlerName }) => {
            console.log(`Restroute:\t${method} ${path} => ${ControllerClass.name}.${handlerName}`)
            const handler = instance[handlerName].bind(instance);

            app[method](path, async (req, res, next) => {
                try {
                    // Schema validation
                    if (schema) {
                        const { error } = schema.validate(req.body);
                        if (error) {
                            res.status(400).json({ error: `Invalid payload: ${error.message}` });
                            return;
                        }
                    }

                    // Validation function
                    if (validate && !validate(req.body)) {
                        res.status(400).json({ error: 'Invalid payload' });
                        return;
                    }

                    await handler(req, res, next);
                } catch (err) {
                    next(err);
                }
            });
        });
    });
}

