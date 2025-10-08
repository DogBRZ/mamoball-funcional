const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

app.get('/', (req, res) => {
  res.send('🎯 MAMOBALL FUNCIONANDO! 🚀');
});

app.get('/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log('📱 Jogador conectado');
  socket.emit('conectado', { message: 'Bem-vindo!' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});