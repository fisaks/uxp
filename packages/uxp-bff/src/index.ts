import path from 'path';

require('./config/env');
const env = require('./config/envValidator')
const { AppDataSource } = require("./db/typeorm.config")

import fastifyWebsocket from '@fastify/websocket';
import Fastify from 'fastify';

import { discoverHandlers } from './decorator/handler.discovery';
import { registerRoutes } from './decorator/route.decorator';
import { registerWebSocketHandlers } from './decorator/websocket.decorator';


AppDataSource.initialize()
  .then(() => {
    console.log(`Database connected to ${env.MYSQL_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`)
    console.log('Entities:', AppDataSource.entityMetadatas.map((meta: { name: string }) => meta.name));
  })
  .catch((err: Error) => console.error('Error during Data Source initialization', err));


const port = 3001;
const fastify = Fastify({ logger: true });
fastify.register(fastifyWebsocket);



// Discover and register REST and WebSocket handlers
const handlers = discoverHandlers(path.join(__dirname, './features'));

registerRoutes(fastify, handlers);
registerWebSocketHandlers(fastify, handlers);




// Start the server :)
fastify.listen({ port: port, host: '0.0.0.0' }, (err, address) => {
  if (err) throw err;
  console.log(`BFF is running at address ${address}`);
});

