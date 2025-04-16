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
    {
        situation: "2. Mientras caminas por una zona boscosa, te encuentras con un oso enorme que te mira fijamente. ¿Cómo reaccionas?",
        options: [
            "A) Sales corriendo lo más rápido posible.",
            "B) Te quedas quieto y evitas el contacto visual.",
            "C) Le lanzas piedras para intimidarlo.",
            "D) Intentas trepar un árbol desesperadamente."
        ]
    },
    // ... (18 preguntas más)
];

io.on('connection', (socket) => {
    socket.on('create_game', (username) => {
        const gameCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const game = {
            players: [{ id: socket.id, name: username }],
            currentQuestionIndex: 0,
            usedQuestions: [...questions] // Copia exacta en orden, sin aleatoriedad ni repeticiones
        };
        games.set(gameCode, game);
        users.set(socket.id, gameCode);

        socket.join(gameCode);
        socket.emit('game_created', { gameCode, game });
    });

    socket.on('join_game', ({ gameCode, username }) => {
        const game = games.get(gameCode);
        if (game) {
            game.players.push({ id: socket.id, name: username });
            users.set(socket.id, gameCode);
            socket.join(gameCode);

            io.to(gameCode).emit('player_joined', game);
        }
    });

    socket.on('start_game', () => {
        const gameCode = users.get(socket.id);
        const game = games.get(gameCode);
        if (game) {
            sendNextQuestion(gameCode);
        }
    });

    socket.on('next_question', () => {
        const gameCode = users.get(socket.id);
        const game = games.get(gameCode);
        if (game) {
            sendNextQuestion(gameCode);
        }
    });

    socket.on('disconnect', () => {
        const gameCode = users.get(socket.id);
        if (gameCode) {
            const game = games.get(gameCode);
            if (game) {
                game.players = game.players.filter(p => p.id !== socket.id);
                io.to(gameCode).emit('player_left', game);
            }
            users.delete(socket.id);
        }
    });
});

function sendNextQuestion(gameCode) {
    const game = games.get(gameCode);
    if (game.currentQuestionIndex < game.usedQuestions.length) {
        const question = game.usedQuestions[game.currentQuestionIndex];
        io.to(gameCode).emit('next_question', {
            questionIndex: game.currentQuestionIndex + 1,
            totalQuestions: game.usedQuestions.length,
            situation: question.situation,
            options: question.options
        });
        game.currentQuestionIndex++;
    } else {
        io.to(gameCode).emit('game_over');
    }
}

http.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});
