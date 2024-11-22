import { WebSocketAction } from '../../decorator/websocket.decorator';
import { Socket } from 'socket.io';
import Joi from 'joi';

const messageSchema = Joi.object({
  room: Joi.string().required(),
  message: Joi.string().required(),
});

export class ChatHandler {
  private rooms: Map<string, string[]> = new Map();

  @WebSocketAction('join_room')
  async joinRoom(socket: Socket, payload: { room: string }) {
    const { room } = payload;
    if (!this.rooms.has(room)) {
      this.rooms.set(room, []);
    }
    this.rooms.get(room)!.push(socket.id);
    socket.join(room);
    socket.emit('joined_room', { room });
    console.log(`Socket ${socket.id} joined room ${room}`);
  }

  @WebSocketAction('send_message', { schema: messageSchema })
  async sendMessage(socket: Socket, payload: { room: string; message: string }) {
    const { room, message } = payload;
    socket.to(room).emit('receive_message', { room, message, sender: socket.id });
    console.log(`Socket ${socket.id} sent message to room ${room}: ${message}`);
  }
}
