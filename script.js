const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размеры и настройки
const CELL_SIZE = 20;
const WIDTH = canvas.width / CELL_SIZE;
const HEIGHT = canvas.height / CELL_SIZE;

// Скорость движения (мс между шагами)
const MOVE_INTERVAL = 120;

// Игроки
const players = [
    {
        color: '#00ffff',
        name: 'Синий',
        x: 5,
        y: Math.floor(HEIGHT / 2),
        dirX: 1,
        dirY: 0,
        trail: [],
        alive: true,
        score: 0,
        keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false }
    },
    {
        color: '#ff00ff',
        name: 'Красный',
        x: WIDTH - 6,
        y: Math.floor(HEIGHT / 2),
        dirX: -1,
        dirY: 0,
        trail: [],
        alive: true,
        score: 0,
        keys: { w: false, s: false, a: false, d: false }
    }
];

let gameLoop = null;
let gameActive = true;
let winner = null;

// Инициализация трейлов
players.forEach(p => p.trail.push({ x: p.x, y: p.y }));

// Управление
document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    // Перезапуск по пробелу
    if (key === ' ' || key === 'Space') {
        e.preventDefault();
        resetGame();
        return;
    }
    
    if (!gameActive) return;
    
    // Игрок 1 (синий) - стрелки
    if (players[0].alive) {
        if (key === 'ArrowUp' && players[0].dirY !== 1) { players[0].dirX = 0; players[0].dirY = -1; }
        if (key === 'ArrowDown' && players[0].dirY !== -1) { players[0].dirX = 0; players[0].dirY = 1; }
        if (key === 'ArrowLeft' && players[0].dirX !== 1) { players[0].dirX = -1; players[0].dirY = 0; }
        if (key === 'ArrowRight' && players[0].dirX !== -1) { players[0].dirX = 1; players[0].dirY = 0; }
    }
    
    // Игрок 2 (красный) - WASD
    if (players[1].alive) {
        if (key === 'w' && players[1].dirY !== 1) { players[1].dirX = 0; players[1].dirY = -1; }
        if (key === 's' && players[1].dirY !== -1) { players[1].dirX = 0; players[1].dirY = 1; }
        if (key === 'a' && players[1].dirX !== 1) { players[1].dirX = -1; players[1].dirY = 0; }
        if (key === 'd' && players[1].dirX !== -1) { players[1].dirX = 1; players[1].dirY = 0; }
    }
});

function updateGame() {
    if (!gameActive) return;
    
    // Двигаем игроков
    for (let p of players) {
        if (!p.alive) continue;
        
        p.x += p.dirX;
        p.y += p.dirY;
        p.trail.push({ x: p.x, y: p.y });
        
        // Ограничение длины следа (не обязательно)
        if (p.trail.length > 2000) p.trail.shift();
    }
    
    // Проверка столкновений
    for (let p of players) {
        if (!p.alive) continue;
        
        // Столкновение со стеной
        if (p.x < 0 || p.x >= WIDTH || p.y < 0 || p.y >= HEIGHT) {
            p.alive = false;
            continue;
        }
        
        // Столкновение со своим следом
        for (let i = 0; i < p.trail.length - 1; i++) {
            if (p.trail[i].x === p.x && p.trail[i].y === p.y) {
                p.alive = false;
                break;
            }
        }
        
        // Столкновение со следом другого игрока
        if (p.alive) {
            for (let other of players) {
                if (other === p || !other.alive) continue;
                for (let seg of other.trail) {
                    if (seg.x === p.x && seg.y === p.y) {
                        p.alive = false;
                        break;
                    }
                }
                if (!p.alive) break;
            }
        }
    }
    
    // Определение победителя
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 1) {
        const winnerIdx = players.findIndex(p => p.alive);
        players[winnerIdx].score++;
        winner = players[winnerIdx];
        gameActive = false;
        updateUI();
        draw();
        showMessage(`${winner.name} победил!`);
        return;
    }
    
    if (alivePlayers.length === 0) {
        gameActive = false;
        showMessage('Ничья!');
        return;
    }
    
    updateUI();
    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Сетка (фон)
    ctx.strokeStyle = '#0f1f2f';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= WIDTH; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CELL_SIZE, 0);
        ctx.lineTo(i * CELL_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * CELL_SIZE);
        ctx.lineTo(canvas.width, i * CELL_SIZE);
        ctx.stroke();
    }
    
    // Рисуем следы
    for (let p of players) {
        for (let i = 0; i < p.trail.length; i++) {
            const seg = p.trail[i];
            const intensity = 0.3 + (i / p.trail.length) * 0.7;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = intensity;
            ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
    }
    ctx.globalAlpha = 1;
    
    // Рисуем живых игроков
    for (let p of players) {
        if (p.alive) {
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = p.color;
            ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    ctx.shadowBlur = 0;
}

function updateUI() {
    document.querySelector('.player1-score').textContent = players[0].score;
    document.querySelector('.player2-score').textContent = players[1].score;
}

function showMessage(msg) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = msg;
    setTimeout(() => {
        if (!gameActive && winner === null) msgDiv.textContent = 'Нажмите Пробел';
        else if (!gameActive && winner) msgDiv.textContent = `${winner.name} победил! Пробел — дальше`;
    }, 2000);
}

function resetGame() {
    if (gameLoop) clearInterval(gameLoop);
    
    players[0].x = 5;
    players[0].y = Math.floor(HEIGHT / 2);
    players[0].dirX = 1;
    players[0].dirY = 0;
    players[0].trail = [{ x: players[0].x, y: players[0].y }];
    players[0].alive = true;
    
    players[1].x = WIDTH - 6;
    players[1].y = Math.floor(HEIGHT / 2);
    players[1].dirX = -1;
    players[1].dirY = 0;
    players[1].trail = [{ x: players[1].x, y: players[1].y }];
    players[1].alive = true;
    
    gameActive = true;
    winner = null;
    document.getElementById('message').textContent = '';
    
    gameLoop = setInterval(() => {
        if (gameActive) updateGame();
    }, MOVE_INTERVAL);
    
    draw();
}

// Старт игры
resetGame();
