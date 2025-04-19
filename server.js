console.log('🔥 Arrancando el servidor con el código actualizado');

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Almacenamiento en memoria
type: const games = new Map(); // Almacena las partidas activas
const users = new Map(); // Almacena los usuarios conectados

// Base de datos de preguntas
const questions = [ /* ... */ ];

/**
 * Extrae una pregunta aleatoria de las disponibles en la partida
 * y la elimina para evitar repeticiones.
 */
function extractRandomQuestion(game) {
  // ... implementación ...
}

// Eventos de Socket.io
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  // Crear nueva partida
  socket.on('create_game', (username) => {
    const gameCode = generateGameCode();
    const game = {
      code: gameCode,
      creator: socket.id,
      players: [{ id: socket.id, username, points: 0 }],
      currentPlayer: 0,
      questionCount: 0,
      currentQuestion: null,
      answers: new Map(),
      status: 'waiting',
      // Inicializa la lista de preguntas que quedan por usar
      preguntasRestantes: [...questions]
    };

    games.set(gameCode, game);
    users.set(socket.id, { gameCode, username });
    socket.join(gameCode);
    socket.emit('game_created', { gameCode, game });
  });

  // Unirse a partida
  socket.on('join_game', ({ gameCode, username }) => {
    const game = games.get(gameCode);
    if (!game) {
      socket.emit('error', 'Código de partida no válido');
      return;
    }
    // Registrar usuario en memoria
    users.set(socket.id, { gameCode, username });
    // Añadirlo al array de jugadores
    game.players.push({ id: socket.id, username, points: 0 });
    // Unir socket a la sala
    socket.join(gameCode);
    // Notificar a todos en la sala que hay un nuevo jugador
    io.to(gameCode).emit('player_joined', game);
  });

  // Manejadores de respuestas y lógica de juego...
  socket.on('main_player_answer', (answer) => {
    // ... lógica existente ...
  });

  socket.on('player_answer', (answer) => {
    // ... lógica existente ...
  });

  socket.on('disconnect', () => {
    // ... lógica existente ...
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
