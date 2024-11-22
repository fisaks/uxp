import { AnySchema } from 'joi';
import 'reflect-metadata';
import { Server } from 'socket.io';


const WEBSOCKET_ACTIONS_METADATA_KEY = 'websocket:actions';

export interface WebSocketActionMetadata {
    action: string;
    handlerName: string;
    validate?: (payload: any) => boolean;
    schema?: AnySchema;
}

export function WebSocketAction(
    action: string,
    options?: { validate?: (payload: any) => boolean; schema?: AnySchema }
) {
    return function (target: any, propertyKey: string) {
        const actions: WebSocketActionMetadata[] =
            Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target) || [];
        actions.push({
            action,
            handlerName: propertyKey,
            validate: options?.validate,
            schema: options?.schema,
        });
        Reflect.defineMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, actions, target);
    };
}

export function getWebSocketActions(target: any): WebSocketActionMetadata[] {
    return Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target) || [];
}



export function registerWebSocketHandlers(io: Server, handlers: any[]) {
    handlers.forEach((HandlerClass) => {
      const instance = new HandlerClass();
      const actions = getWebSocketActions(HandlerClass.prototype);
  
      actions.forEach(({ action, validate, schema, handlerName }) => {
        console.log(`IO Handler:\t${action}  => ${HandlerClass.name}.${handlerName}`)
        const method = instance[handlerName].bind(instance);
  
        io.on('connection', (socket) => {
          socket.on(action, (payload) => {
            // Schema validation
            if (schema) {
              const { error } = schema.validate(payload);
              if (error) {
                socket.emit('error', `Invalid payload for action: ${action}`);
                return;
              }
            }
  
            // Validation function
            if (validate && !validate(payload)) {
              socket.emit('error', `Invalid payload for action: ${action}`);
              return;
            }
  
            method(socket, payload);
          });
        });
      });
    });
  }

  