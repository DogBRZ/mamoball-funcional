// server.js - VERSÃO MULTIPLAYER COMPLETA
console.log('🔧 Iniciando servidor Mamoball Multiplayer...');

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);

// ✅ Configuração CORRETA do Socket.IO
const io = socketIO(server, {
  cors: {
    origin: "*", // Aceita de qualquer lugar
    methods: ["GET", "POST"]
  }
});

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Rota PRINCIPAL
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>🎮 Mamoball Multiplayer</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          h1 { font-size: 3em; margin-bottom: 10px; }
          .status { 
            background: rgba(255,255,255,0.2); 
            padding: 20px; 
            border-radius: 10px;
            margin: 20px auto;
            max-width: 500px;
          }
          .players { font-size: 1.2em; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>⚽ MAMOBALL 🎮</h1>
        <div class="status">
          <h2>🚀 SERVIDOR MULTIPLAYER ONLINE!</h2>
          <p>Conecte os APKs para jogar 1vs1!</p>
          <div class="players" id="players">Jogadores online: 0</div>
        </div>
        <p>⏰ ${new Date().toLocaleString('pt-BR')}</p>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          socket.on('jogadores_online', (data) => {
            document.getElementById('players').textContent = 'Jogadores online: ' + data.total;
          });
        </script>
      </body>
    </html>
  `);
});

// ✅ Rota de saúde
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    message: 'Servidor Mamoball Multiplayer OK!',
    jogadoresOnline: Object.keys(io.sockets.sockets).length,
    timestamp: new Date().toISOString()
  });
});

// 🎮 SISTEMA DE MULTIPLAYER
let jogadores = {};
let partidaAtiva = false;

io.on('connection', (socket) => {
  console.log('📱 NOVO JOGADOR CONECTOU:', socket.id);
  
  // Adiciona jogador
  jogadores[socket.id] = {
    id: socket.id,
    conectadoEm: new Date(),
    pronto: false
  };
  
  // Atualiza contagem para todos
  io.emit('jogadores_online', { 
    total: Object.keys(jogadores).length 
  });
  
  // Envia confirmação de conexão
  socket.emit('conectado', {
    seuId: socket.id,
    totalJogadores: Object.keys(jogadores).length,
    mensagem: 'Conectado ao servidor Mamoball!'
  });
  
  // 📨 SISTEMA DE MOVIMENTO
  socket.on('movimento', (data) => {
    // console.log('🎮 Movimento:', socket.id, data);
    
    // Repassa movimento para TODOS os outros jogadores
    socket.broadcast.emit('movimento_oponente', {
      jogadorId: socket.id,
      posicao: data
    });
  });
  
  // 📨 SISTEMA DE CHUTE
  socket.on('chute', (data) => {
    console.log('⚽ Chute detectado:', socket.id);
    
    socket.broadcast.emit('chute_oponente', {
      jogadorId: socket.id,
      forca: data.forca,
      direcao: data.direcao
    });
  });
  
  // 📨 SISTEMA DE GOL
  socket.on('gol', (data) => {
    console.log('🎉 GOL MARCADO por:', socket.id);
    
    io.emit('gol_marcado', {
      jogadorId: socket.id,
      time: data.time
    });
  });
  
  // 📨 SISTEMA DE POSSE DE BOLA
  socket.on('bola_posse', (data) => {
    socket.broadcast.emit('bola_posse_oponente', {
      jogadorId: socket.id,
      comPosse: data.comPosse
    });
  });
  
  // 🚪 Quando jogador desconecta
  socket.on('disconnect', () => {
    console.log('❌ JOGADOR DESCONECTOU:', socket.id);
    delete jogadores[socket.id];
    
    io.emit('jogadores_online', { 
      total: Object.keys(jogadores).length 
    });
    
    // Avisa que alguém saiu
    socket.broadcast.emit('jogador_saiu', {
      jogadorId: socket.id
    });
  });
});

// ✅ INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🚀 MAMOBALL MULTIPLAYER INICIADO!');
  console.log(`📍 Porta: ${PORT}`);
  console.log(`🌐 URL: https://seu-projeto.up.railway.app`);
  console.log('✅ PRONTO PARA 1vs1!');
  console.log('=================================');
});

console.log('🔧 Configuração do servidor concluída');
