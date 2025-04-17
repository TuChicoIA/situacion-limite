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
    {
        situation: "3. Te despiertas en una habitación oscura sin recordar cómo llegaste ahí. Encuentras una puerta cerrada y tres llaves. ¿Qué haces?",
        options: [
            "A) Pruebas las llaves una por una hasta que una funcione.",
            "B) Buscas más pistas antes de intentar abrir la puerta.",
            "C) Gritas pidiendo ayuda.",
            "D) Te quedas en la habitación por miedo a lo que hay fuera."
        ]
    },
    {
        situation: "4. Estás en un barco y ves a una persona caer al agua. El mar está agitado. ¿Cómo actúas?",
        options: [
            "A) Saltas inmediatamente al agua para salvarla.",
            "B) Lanzas un salvavidas y pides ayuda.",
            "C) Intentas maniobrar el barco para acercarte.",
            "D) Gritas desesperado sin saber qué hacer."
        ]
    },
    {
        situation: "5. Te despiertas y descubres que eres el único ser humano en la ciudad. ¿Cuál es tu primer paso?",
        options: [
            "A) Buscar comida y provisiones.",
            "B) Tratar de encontrar a otros supervivientes.",
            "C) Disfrutar de la libertad y hacer lo que quieras.",
            "D) Entrar en pánico y esperar que alguien aparezca."
        ]
    },
    {
        situation: "6. Te ofrecen una maleta con 10 millones de euros, pero a cambio no puedes volver a hablar con tu familia. ¿Aceptas?",
        options: [
            "A) Sí, el dinero lo vale.",
            "B) No, la familia es más importante.",
            "C) Lo acepto, pero intentaría romper la regla.",
            "D) Pido tiempo para pensarlo, pero nunca decidiría."
        ]
    },
    {
        situation: "7. Ves un incendio en un edificio y escuchas gritos pidiendo ayuda. ¿Qué haces?",
        options: [
            "A) Llamas a los bomberos y esperas fuera.",
            "B) Intentas entrar para rescatar a la persona.",
            "C) Buscas una escalera o forma segura de ayudar.",
            "D) Sigues caminando sin involucrarte."
        ]
    },
    {
        situation: "8. Ganas un billete para viajar al espacio, pero con un 10% de riesgo de no regresar. ¿Qué decides?",
        options: [
            "A) Aceptas el reto sin dudarlo.",
            "B) Rechazas la oportunidad, no vale la pena.",
            "C) Lo vendes a otra persona.",
            "D) Aceptas, pero con mucho miedo."
        ]
    },
    {
        situation: "9. Te pierdes en el desierto con pocas provisiones. ¿Cuál es tu prioridad?",
        options: [
            "A) Caminar sin parar hasta encontrar ayuda.",
            "B) Racionar el agua y buscar sombra.",
            "C) Enterrarte en la arena para mantener la temperatura.",
            "D) Gritar y esperar que alguien te rescate."
        ]
    },
    {
        situation: "10. Un desconocido te ofrece un trato: ganar un millón de euros, pero alguien en el mundo morirá sin que lo sepas. ¿Qué eliges?",
        options: [
            "A) Aceptas el dinero sin pensarlo.",
            "B) Rechazas el trato, es inmoral.",
            "C) Preguntas si puedes elegir a la persona.",
            "D) Aceptas pero luego te arrepientes."
        ]
    },
    {
        situation: "11. Encuentras una lámpara mágica con un genio, pero solo puedes pedir un deseo. ¿Cuál eliges?",
        options: [
            "A) Dinero infinito.",
            "B) Salud eterna.",
            "C) Amor verdadero.",
            "D) Inteligencia sobrehumana."
        ]
    },
    {
        situation: "12. En medio de una tormenta, el coche se queda sin batería en un bosque. ¿Cómo reaccionas?",
        options: [
            "A) Te quedas dentro esperando que pase la tormenta.",
            "B) Sales a buscar ayuda a pie.",
            "C) Intentas arreglar el coche aunque no sepas cómo.",
            "D) Enciendes una fogata y esperas ser rescatado."
        ]
    },
    {
        situation: "13. Una persona sospechosa te sigue por la calle. ¿Cómo actúas?",
        options: [
            "A) Aceleras el paso y tratas de perderla.",
            "B) Te enfrentas directamente y preguntas qué quiere.",
            "C) Entras en una tienda o sitio público.",
            "D) Sacas el móvil y finges llamar a la policía."
        ]
    },
    {
        situation: "14. Recibes un sobre con información clasificada del gobierno. ¿Qué haces?",
        options: [
            "A) Lo destruyes sin leerlo.",
            "B) Lo lees y lo guardas en secreto.",
            "C) Lo vendes al mejor postor.",
            "D) Lo entregas a la policía."
        ]
    },
    {
        situation: "15. Descubres que tu mejor amigo ha cometido un crimen. ¿Qué haces?",
        options: [
            "A) Lo denuncias inmediatamente.",
            "B) Lo ayudas a encubrirlo.",
            "C) Hablas con él para convencerlo de entregarse.",
            "D) Guardas silencio y finges no saber nada."
        ]
    },
    {
        situation: "16. Te encuentras una cartera con 5000€ y documentos personales. ¿Cómo actúas?",
        options: [
            "A) La devuelves tal cual.",
            "B) Tomas el dinero y devuelves los documentos.",
            "C) Te quedas con todo.",
            "D) Ignoras la cartera y sigues caminando."
        ]
    },
    {
        situation: "17. Despiertas en el pasado con la posibilidad de cambiar la historia. ¿Qué harías?",
        options: [
            "A) Evitar guerras y desastres.",
            "B) Hacerte rico con información del futuro.",
            "C) No cambiar nada para no alterar el presente.",
            "D) Intentar traer tecnología avanzada a la época."
        ]
    },
    {
        situation: "18. Ves a alguien robando en una tienda. ¿Cómo reaccionas?",
        options: [
            "A) Lo denuncias al encargado.",
            "B) Lo confrontas y le dices que lo devuelva.",
            "C) Ignoras la situación.",
            "D) Tomas algo tú también."
        ]
    },
    {
        situation: "19. Descubres que tu pareja te ha sido infiel. ¿Cuál es tu reacción?",
        options: [
            "A) Rompes inmediatamente.",
            "B) Tratas de entender su motivo antes de decidir.",
            "C) Le devuelves la infidelidad por venganza.",
            "D) Finges que no pasó nada para no perder la relación."
        ]
    },
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

// Función para obtener una pregunta aleatoria
function getRandomQuestion() {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
}

// Genera un código aleatorio para la partida
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    // Crear nueva partida
    socket.on('create_game', (username) => {
        const gameCode = generateGameCode();
        const game = {
            code: gameCode,
            creator: socket.id,
            players: [{id: socket.id, username: username, points: 0}],
            currentPlayer: 0,
            questionCount: 0,
            currentQuestion: null,
            answers: new Map(),
            status: 'waiting'
        };
        
        games.set(gameCode, game);
        users.set(socket.id, {gameCode: gameCode, username: username});
        
        socket.join(gameCode);
        socket.emit('game_created', {gameCode: gameCode, game: game});
    });

    // Unirse a una partida
    socket.on('join_game', ({gameCode, username}) => {
        const game = games.get(gameCode);
        
        if (!game) {
            socket.emit('error', 'Partida no encontrada');
            return;
        }

        if (game.status !== 'waiting') {
            socket.emit('error', 'La partida ya ha comenzado');
            return;
        }

        game.players.push({id: socket.id, username: username, points: 0});
        users.set(socket.id, {gameCode: gameCode, username: username});
        
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
        game.currentQuestion = getRandomQuestion();

        io.to(game.code).emit('game_started', game);
    });

    // Respuesta del jugador principal
    socket.on('main_player_answer', (answer) => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game) return;

        const currentPlayer = game.players[game.currentPlayer];
        if (currentPlayer.id !== socket.id) return;

        game.mainPlayerAnswer = answer;
        game.waitingForMainPlayer = false;
        io.to(game.code).emit('main_player_answered', answer);
    });

    // Respuesta de los demás jugadores
    socket.on('player_answer', (answer) => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game) return;

        game.answers.set(socket.id, answer);

        // Verificar si todos han respondido
        if (game.answers.size === game.players.length - 1) {
            // Calcular puntos
            game.players.forEach(player => {
                if (player.id !== game.players[game.currentPlayer].id) {
                    if (game.answers.get(player.id) === game.mainPlayerAnswer) {
                        player.points += 5;
                    }
                }
            });

            // Enviar resultados
            io.to(game.code).emit('round_results', {
                mainPlayerAnswer: game.mainPlayerAnswer,
                answers: Array.from(game.answers),
                players: game.players
            });

            // Preparar siguiente ronda
            game.questionCount++;
            game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
            game.answers.clear();

            // Verificar fin del juego
            if (game.questionCount >= 20) {
                io.to(game.code).emit('game_over', game.players);
                games.delete(game.code);
            } else {
                // Nueva pregunta
                game.currentQuestion = getRandomQuestion();
                setTimeout(() => {
                    io.to(game.code).emit('new_round', game);
                }, 3000);
            }
        }
    });

    // Finalizar partida manualmente
    socket.on('end_game', () => {
        const user = users.get(socket.id);
        if (!user) return;

        const game = games.get(user.gameCode);
        if (!game || game.creator !== socket.id) return;

        io.to(game.code).emit('game_over', game.players);
        games.delete(game.code);
    });

    // Desconexión
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const game = games.get(user.gameCode);
            if (game) {
                game.players = game.players.filter(p => p.id !== socket.id);
                if (game.players.length === 0) {
                    games.delete(user.gameCode);
                } else {
                    io.to(game.code).emit('player_left', game);
                }
            }
            users.delete(socket.id);
        }
    });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
