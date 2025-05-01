console.log('🔥 Arrancando el servidor con el código actualizado');

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Almacenamiento en memoria
const games = new Map(); // Almacena las partidas activas
const users = new Map(); // Almacena los usuarios conectados

// Base de datos de preguntas
const questions = [
    {
        situation: "1. Estás en un avión cuando, de repente, los motores fallan y empieza a caer en picado. ¿Qué haces?",
        options: [
            "A) Agarrarte fuerte al asiento y rezar.",
            "B) Buscar instrucciones de emergencia y seguirlas.",
            "C) Intentar calmar a los pasajeros y esperar órdenes.",
            "D) Saltar sin paracaídas porque el miedo te paraliza."
        ]
    },
    // ... (resto de preguntas hasta la 20) ...
    {
        situation: "20. En una cena elegante, sin querer, tiras una copa de vino sobre una persona importante. ¿Qué haces?",
        options: [
            "A) Te disculpas y ofreces pagar la tintorería.",
            "B) Huyes rápidamente del lugar.",
            "C) Te ríes y lo minimizas como si fuera broma.",
            "D) Culpas a otra persona para evitar problemas."
        ]
    }
];

/**
 * Extrae una pregunta aleatoria de las disponibles en la partida
 * y la elimina para evitar repeticiones.
 */
function extractRandomQuestion(game) {
    const disponibles = game.preguntasRestantes;
    if (!disponibles || disponibles.length === 0) return null;
    const idx = Math.floor(Math.random() * disponibles.length);
    const [pregunta] = disponibles.splice(idx, 1);
    return pregunta;
}

// Genera un código aleatorio para la partida
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Conexión de clientes
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
        users.set(socket.id, { gameCode, username });
        game.players.push({ id: socket.id, username, points: 0 });
        socket.join(gameCode);
        io.to(gameCode).emit('player_joined', game);
    });

    // Iniciar partida
    socket.on('start_game', () => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game || game.creator !== socket.id) return;

        game.status = 'playing';
        game.waitingForMainPlayer = true;
        game.currentQuestion = extractRandomQuestion(game);

        io.to(game.code).emit('game_started', game);
    });

    // Respuesta del jugador principal
    socket.on('main_player_answer', (answer) => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game) return;

        const current = game.players[game.currentPlayer];
        if (current.id !== socket.id) return;

        game.mainPlayerAnswer = answer;
        game.waitingForMainPlayer = false;
        io.to(game.code).emit('main_player_answered', answer);
    });

    // Respuestas de los demás jugadores
    socket.on('player_answer', (answer) => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game) return;

        game.answers.set(socket.id, answer);

        if (game.answers.size === game.players.length - 1) {
            game.players.forEach(p => {
                if (p.id !== game.players[game.currentPlayer].id) {
                    if (game.answers.get(p.id) === game.mainPlayerAnswer) {
                        p.points += 5;
                    }
                }
            });

            io.to(game.code).emit('round_results', {
                mainPlayerAnswer: game.mainPlayerAnswer,
                answers: Array.from(game.answers),
                players: game.players
            });

            game.questionCount++;
            game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
            game.answers.clear();

            if (game.questionCount >= 20 || game.preguntasRestantes.length === 0) {
                io.to(game.code).emit('game_over', game.players);
                games.delete(game.code);
            } else {
                game.currentQuestion = extractRandomQuestion(game);
                setTimeout(() => io.to(game.code).emit('new_round', game), 3000);
            }
        }
    });

    // Desconexión de clientes
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const game = games.get(user.gameCode);
            if (game) {
                game.players = game.players.filter(p => p.id !== socket.id);
                if (game.players.length === 0) games.delete(user.gameCode);
                else io.to(game.code).emit('player_left', game);
            }
            users.delete(socket.id);
        }
    });

    // Permitir al jugador principal forzar el fin de la partida
    socket.on('end_game', () => {
        const user = users.get(socket.id);
        if (!user) return;
        const game = games.get(user.gameCode);
        if (!game || game.creator !== socket.id) return;
        io.to(game.code).emit('game_over', game.players);
        games.delete(game.code);
    });
});

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Arranque del servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`🔥 Servidor corriendo en puerto ${PORT}`);
});
