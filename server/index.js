import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';

const port = process.env.PORT || 3000;

const app = express();
app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

const server = createServer(app);
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const io = new Server(server, {
  // the backup duration of the sessions and the packets
  maxDisconnectionDuration: 2 * 60 * 1000,
  // whether to skip middlewares upon successful recovery
  skipMiddlewares: true
});
io.on('connection', (socket) => {
  console.log('a user has connected!');
  if (socket.recovered) {
    console.log('this socket was recovered from a client-side disconnect');
  }

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('a user has disconnected!');
  });
});
