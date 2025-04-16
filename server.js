// Reemplaza tu server.js por este
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('public'));

// Ruta explícita para producción en Railway
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const games = new Map();
const users = new Map();

const questions = [
    {
        situation: "1. Estás en un avión cuando...",
        options: ["A) ...", "B) ...", "C) ...", "D) ..."]
    },
    // ... hasta la 20
];

const MAX_PREGUNTAS_POR_PARTIDA = 10;

function getNextQuestion(game) {
    if (!game.usedIndexes) game.usedIndexes = [];
    const index = game.usedIndexes.length;
    if (index >= MAX_PREGUNTAS_POR_PARTIDA) return null;
    game.usedIndexes.push(index);
    return questions[index];
}

io.on('connection', (socket) => {
    socket.on('create_game', (username) => {
        const gameCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const game = {
            code: gameCode,
            creator: socket.id,
            players: [{id: socket.id, username: username, points: 0}],
            currentPlayer: 0,
            questionCount: 0,
            currentQuestion: null,
            answers: new Map(),
            status: 'waiting',
            usedIndexes: []
        };
        games.set(gameCode, game);
        users.set(socket.id, {gameCode: gameCode, username: username});
        socket.join(gameCode);
        socket.emit('game_created', {gameCode, game});
    });

    socket.on('join_game', ({gameCode, username}) => {
        const game = games.get(gameCode);
        if (!game || game.status !== 'waiting') return socket.emit('error', 'No se puede unir.');
        game.players.push({id: socket.id, username, points: 0});
        users.set(socket.id, {gameCode, username});
        socket.join(gameCode);
        io.to(gameCode).emit('player_joined', game);
    });

    socket.on('start_game', () => {
        const user = users.get(socket.id);
        const game = games.get(user?.gameCode);
        if (!game || game.creator !== socket.id) return;
        game.status = 'playing';
        game.currentQuestion = getNextQuestion(game);
        game.waitingForMainPlayer = true;
        io.to(game.code).emit('game_started', game);
    });

    socket.on('main_player_answer', (answer) => {
        const user = users.get(socket.id);
        const game = games.get(user?.gameCode);
        if (!game || game.players[game.currentPlayer].id !== socket.id) return;
        game.mainPlayerAnswer = answer;
        game.waitingForMainPlayer = false;
        io.to(game.code).emit('main_player_answered', answer);
    });

    socket.on('player_answer', (answer) => {
        const user = users.get(socket.id);
        const game = games.get(user?.gameCode);
        if (!game) return;
        game.answers.set(socket.id, answer);
        if (game.answers.size === game.players.length - 1) {
            game.players.forEach(player => {
                if (player.id !== game.players[game.currentPlayer].id && game.answers.get(player.id) === game.mainPlayerAnswer) {
                    player.points += 5;
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
            if (game.questionCount >= MAX_PREGUNTAS_POR_PARTIDA || game.usedIndexes.length >= MAX_PREGUNTAS_POR_PARTIDA) {
                io.to(game.code).emit('game_over', game.players);
                games.delete(game.code);
            } else {
                game.currentQuestion = getNextQuestion(game);
                setTimeout(() => {
                    io.to(game.code).emit('new_round', game);
                }, 3000);
            }
        }
    });

    socket.on('end_game', () => {
        const user = users.get(socket.id);
        const game = games.get(user?.gameCode);
        if (!game || game.creator !== socket.id) return;
        io.to(game.code).emit('game_over', game.players);
        games.delete(game.code);
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        const game = games.get(user?.gameCode);
        if (game) {
            game.players = game.players.filter(p => p.id !== socket.id);
            if (game.players.length === 0) games.delete(user.gameCode);
            else io.to(game.code).emit('player_left', game);
        }
        users.delete(socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
