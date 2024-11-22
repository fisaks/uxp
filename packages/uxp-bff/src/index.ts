import path from 'path';
require('./config/env');
const env  = require('./config/envValidator')
const {AppDataSource} = require("./db/typeorm.config")
import express, { Request, Response } from "express";
//import { AppDataSource } from './db/typeorm.config';

import { transactionMiddleware } from './db/transactionMiddleware';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { registerWebSocketHandlers } from './decorator/websocket.decorator';
import { registerRoutes } from './decorator/route.decorator';
import { discoverHandlers } from './decorator/handler.discovery';


AppDataSource.initialize()
  .then(() => console.log(`Database connected to ${env.MYSQL_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`))
  .catch((err:Error) => console.error('Error during Data Source initialization', err));


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const port = 3001;

// Middleware
app.use(express.json());
app.use(transactionMiddleware);
// Discover and register REST and WebSocket handlers
const handlers = discoverHandlers(path.join(__dirname, './features'));

registerRoutes(app, handlers);
registerWebSocketHandlers(io, handlers);



// Start the server
app.listen(port, () => {
  console.log(`BFF is running at http://localhost:${port}`);
});
