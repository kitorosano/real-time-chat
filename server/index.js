import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'node:http';
import { db } from '@vercel/postgres';

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
  connectionStateRecovery: {}
});

const client = await db.connect();
try {
  await client.sql`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      username TEXT NOT NULL
    );
  `;
} catch (e) {
  console.error(e);
}

io.on('connection', async (socket) => {
  console.log('a user has connected!');

  socket.on('disconnect', () => {
    console.log('a user has disconnected!');
  });

  socket.on('chat message', async (msg) => {
    let result;
    const username = socket.handshake.auth.username ?? 'anonymous';
    try {
      result = await client.sql`
        INSERT INTO messages (content, username) VALUES (${msg}, ${username});
      `;
    } catch (e) {
      console.error(e);
      return;
    }

    io.emit('chat message', msg, result.id, username);
  });

  if (!socket.recovered) {
    try {
      const serverOffset = socket.handshake.auth.serverOffset ?? 0;
      const result = await client.sql`
        SELECT id, content, username FROM messages WHERE id > ${serverOffset};
      `;
      for (const row of result.rows) {
        socket.emit('chat message', row.content, row.id, row.username);
      }
    } catch (e) {
      console.error(e);
    }
  }
});
