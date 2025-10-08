// server.js - VERSÃO MULTIPLAYER COMPLETA COM LOBBY
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
          .lobby-info { margin: 20px 0; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; }
        </style>
      </head>
      <body>
        <h1>⚽ MAMOBALL 🎮</h1>
        <div class="status">
          <h2>🚀 SERVIDOR MULTIPLAYER ONLINE!</h2>
          <p>Conecte os APKs para jogar 1vs1!</p>
          <div class="lobby-info">
            <div class="players" id="players">Jogadores online: 0</div>
            <div id="fila">Jogadores na fila: 0</div>
            <div id="partidas">Partidas ativas: 0</div>
          </div>
        </div>
        <p>⏰ ${new Date().toLocaleString('pt-BR')}</p>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
          const socket = io();
          socket.on('jogadores_online', (data) => {
            document.getElementById('players').textContent = 'Jogadores online: ' + data.total;
            document.getElementById('fila').textContent = 'Jogadores na fila: ' + data.naFila;
            document.getElementById('partidas').textContent = 'Partidas ativas: ' + data.partidasAtivas;
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

// 🎯 SISTEMA DE LOBBY E MATCHMAKING
let jogadores = {};
let filaEspera = [];
let salas = {};

function atualizarEstatisticas() {
  const estatisticas = {
    total: Object.keys(jogadores).length,
    naFila: filaEspera.length,
    partidasAtivas: Object.keys(salas).length
  };
  
  io.emit('jogadores_online', estatisticas);
  return estatisticas;
}

function criarPartida(jogador1, jogador2) {
  const salaId = 'sala_' + Date.now();
  
  salas[salaId] = {
    id: salaId,
    jogadores: [jogador1, jogador2],
    estado: 'ativa',
    criadaEm: new Date(),
    placar: { [jogador1]: 0, [jogador2]: 0 }
  };
  
  console.log(`🎯 PARTIDA CRIADA: ${salaId}`);
  console.log(`   👤 Jogador 1: ${jogador1}`);
  console.log(`   👤 Jogador 2: ${jogador2}`);
  
  // Remove jogadores da fila e atualiza status
  jogadores[jogador1].naFila = false;
  jogadores[jogador1].salaId = salaId;
  jogadores[jogador2].naFila = false;
  jogadores[jogador2].salaId = salaId;
  
  // Avisa AMBOS os jogadores que a partida começou
  io.to(jogador1).emit('partida_encontrada', {
    salaId: salaId,
    oponenteId: jogador2,
    voceEhJogador1: true,
    mensagem: 'Partida encontrada! Iniciando jogo...'
  });
  
  io.to(jogador2).emit('partida_encontrada', {
    salaId: salaId,
    oponenteId: jogador1,
    voceEhJogador1: false,
    mensagem: 'Partida encontrada! Iniciando jogo...'
  });
  
  // Atualiza estatísticas
  atualizarEstatisticas();
  
  return salaId;
}

function procurarPartida(socketId) {
  console.log(`🔍 ${socketId} entrou na fila de matchmaking`);
  
  // Adiciona à fila se não estiver lá
  if (!filaEspera.includes(socketId)) {
    filaEspera.push(socketId);
    jogadores[socketId].naFila = true;
  }
  
  // Se tem pelo menos 2 na fila, forma partida
  if (filaEspera.length >= 2) {
    const jogador1 = filaEspera.shift();
    const jogador2 = filaEspera.shift();
    criarPartida(jogador1, jogador2);
  }
  
  // Atualiza estatísticas
  atualizarEstatisticas();
}

// 🎮 SISTEMA DE MULTIPLAYER
io.on('connection', (socket) => {
  console.log('📱 NOVO JOGADOR CONECTOU:', socket.id);
  
  // Adiciona jogador
  jogadores[socket.id] = {
    id: socket.id,
    conectadoEm: new Date(),
    naFila: false,
    salaId: null,
    pronto: false
  };
  
  // Envia confirmação de conexão
  socket.emit('conectado', {
    seuId: socket.id,
    totalJogadores: Object.keys(jogadores).length,
    mensagem: 'Conectado ao servidor Mamoball!'
  });
  
  // Atualiza estatísticas para todos
  atualizarEstatisticas();
  
  // ✅ EVENTO: Entrar na fila de matchmaking
  socket.on('entrar_fila', () => {
    console.log(`🎯 ${socket.id} solicitou entrar na fila`);
    procurarPartida(socket.id);
    
    // Confirma que entrou na fila
    socket.emit('entrou_fila', {
      posicao: filaEspera.indexOf(socket.id) + 1,
      totalNaFila: filaEspera.length,
      mensagem: 'Procurando oponente...'
    });
  });
  
  // ✅ EVENTO: Sair da fila
  socket.on('sair_fila', () => {
    console.log(`🚪 ${socket.id} saiu da fila`);
    
    // Remove da fila
    filaEspera = filaEspera.filter(id => id !== socket.id);
    jogadores[socket.id].naFila = false;
    
    socket.emit('saiu_fila', {
      mensagem: 'Você saiu da fila de espera'
    });
    
    atualizarEstatisticas();
  });
  
  // ✅ EVENTO: Jogador pronto
  socket.on('pronto_para_jogar', () => {
    console.log(`✅ ${socket.id} está pronto para jogar`);
    jogadores[socket.id].pronto = true;
    
    // Se está em uma sala, avisa o oponente
    const salaId = jogadores[socket.id].salaId;
    if (salaId && salas[salaId]) {
      socket.broadcast.to(salaId).emit('oponente_pronto', {
        jogadorId: socket.id
      });
    }
  });
  
  // 📨 SISTEMA DE MOVIMENTO (só envia para jogadores na mesma sala)
  socket.on('movimento', (data) => {
    const salaId = jogadores[socket.id]?.salaId;
    
    if (salaId && salas[salaId]) {
      // Repassa movimento apenas para jogadores na MESMA SALA
      socket.to(salaId).emit('movimento_oponente', {
        jogadorId: socket.id,
        posicao: data
      });
    }
  });
  
  // 📨 SISTEMA DE CHUTE
  socket.on('chute', (data) => {
    console.log('⚽ Chute detectado:', socket.id);
    const salaId = jogadores[socket.id]?.salaId;
    
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('chute_oponente', {
        jogadorId: socket.id,
        forca: data.forca,
        direcao: data.direcao
      });
    }
  });
  
  // 📨 SISTEMA DE GOL
  socket.on('gol', (data) => {
    console.log('🎉 GOL MARCADO por:', socket.id);
    const salaId = jogadores[socket.id]?.salaId;
    
    if (salaId && salas[salaId]) {
      // Atualiza placar
      salas[salaId].placar[socket.id]++;
      
      io.to(salaId).emit('gol_marcado', {
        jogadorId: socket.id,
        time: data.time,
        placar: salas[salaId].placar
      });
    }
  });
  
  // 📨 SISTEMA DE POSSE DE BOLA
  socket.on('bola_posse', (data) => {
    const salaId = jogadores[socket.id]?.salaId;
    
    if (salaId && salas[salaId]) {
      socket.to(salaId).emit('bola_posse_oponente', {
        jogadorId: socket.id,
        comPosse: data.comPosse
      });
    }
  });
  
  // 🚪 Quando jogador desconecta
  socket.on('disconnect', () => {
    console.log('❌ JOGADOR DESCONECTOU:', socket.id);
    
    const jogador = jogadores[socket.id];
    
    // Remove da fila se estava nela
    if (jogador?.naFila) {
      filaEspera = filaEspera.filter(id => id !== socket.id);
    }
    
    // Se estava em uma sala, avisa o oponente e remove a sala
    if (jogador?.salaId) {
      const salaId = jogador.salaId;
      const sala = salas[salaId];
      
      if (sala) {
        // Avisa o oponente que o jogador saiu
        socket.to(salaId).emit('oponente_desconectou', {
          jogadorId: socket.id,
          mensagem: 'Oponente desconectou'
        });
        
        // Remove a sala
        delete salas[salaId];
        console.log(`🗑️ Sala ${salaId} removida (jogador desconectou)`);
      }
    }
    
    // Remove jogador
    delete jogadores[socket.id];
    
    // Atualiza estatísticas
    atualizarEstatisticas();
  });
});

// ✅ INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('=================================');
  console.log('🚀 MAMOBALL MULTIPLAYER INICIADO!');
  console.log(`📍 Porta: ${PORT}`);
  console.log('🎯 SISTEMA DE LOBBY ATIVO');
  console.log('✅ PRONTO PARA MATCHMAKING 1vs1!');
  console.log('=================================');
});

// Função para limpar salas antigas (manutenção)
setInterval(() => {
  const agora = new Date();
  let salasRemovidas = 0;
  
  for (const salaId in salas) {
    const sala = salas[salaId];
    const tempoCriacao = new Date(sala.criadaEm);
    const diferencaMinutos = (agora - tempoCriacao) / (1000 * 60);
    
    // Remove salas com mais de 30 minutos
    if (diferencaMinutos > 30) {
      delete salas[salaId];
      salasRemovidas++;
    }
  }
  
  if (salasRemovidas > 0) {
    console.log(`🧹 Limpeza: ${salasRemovidas} salas antigas removidas`);
  }
}, 60000); // Executa a cada 1 minuto

console.log('🔧 Configuração do servidor concluída');
