const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CELL_SIZE = 20;
const WIDTH = canvas.width / CELL_SIZE;
const HEIGHT = canvas.height / CELL_SIZE;
const MOVE_INTERVAL = 120;

let gameMode = '2p';
let gameLoop = null;
let gameActive = true;
let winner = null;
let countdownActive = false;
let countdownValue = 3;
let crashEffect = { active: false, x: 0, y: 0, color: '#ffffff', timer: 0 };
let paused = false;
let particles = [];

const players = [
    { color: '#00ffff', name: 'Синий', x: 5, y: Math.floor(HEIGHT / 2), dirX: 1, dirY: 0, trail: [], alive: true, score: 0 },
    { color: '#ffaa00', name: 'Оранжевый', x: WIDTH - 6, y: Math.floor(HEIGHT / 2), dirX: -1, dirY: 0, trail: [], alive: true, score: 0 }
];

function addParticles(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            y: y * CELL_SIZE + CELL_SIZE / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 0.5,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

function updateParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;
        particles[i].life -= 0.02;
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function drawParticles() {
    for (let p of particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

// ========== УМНЫЙ, АГРЕССИВНЫЙ, НЕПРЕДСКАЗУЕМЫЙ ИИ ==========
function aiMove() {
    if (gameMode !== 'ai') return;
    if (!players[1].alive) return;
    
    const p = players[1];
    const enemy = players[0];
    const dirs = [
        { dx: 0, dy: -1 }, // вверх
        { dx: 0, dy: 1 },  // вниз
        { dx: -1, dy: 0 }, // влево
        { dx: 1, dy: 0 }   // вправо
    ];
    
    function isSafe(x, y, selfTrail, opponentTrail) {
        if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return false;
        for (let i = 0; i < selfTrail.length - 1; i++) {
            if (selfTrail[i].x === x && selfTrail[i].y === y) return false;
        }
        for (let i = 0; i < opponentTrail.length; i++) {
            if (opponentTrail[i].x === x && opponentTrail[i].y === y) return false;
        }
        return true;
    }
    
    let moveScores = [];
    
    for (const dir of dirs) {
        let newX = p.x + dir.dx;
        let newY = p.y + dir.dy;
        
        if (!isSafe(newX, newY, p.trail, enemy.trail)) {
            moveScores.push({ dir: dir, score: -999 });
            continue;
        }
        
        // Симуляция 30 шагов вперёд
        let simX = newX;
        let simY = newY;
        let simTrail = [...p.trail, { x: simX, y: simY }];
        let simDirX = dir.dx;
        let simDirY = dir.dy;
        let steps = 0;
        const maxSteps = 30;
        
        for (let step = 0; step < maxSteps; step++) {
            const possibleMoves = [
                { dx: simDirX, dy: simDirY },           // прямо
                { dx: -simDirY, dy: simDirX },          // налево
                { dx: simDirY, dy: -simDirX },          // направо
                { dx: -simDirX, dy: -simDirY }          // разворот
            ];
            let moved = false;
            for (const move of possibleMoves) {
                const nextX = simX + move.dx;
                const nextY = simY + move.dy;
                if (isSafe(nextX, nextY, simTrail, enemy.trail)) {
                    simX = nextX;
                    simY = nextY;
                    simDirX = move.dx;
                    simDirY = move.dy;
                    simTrail.push({ x: simX, y: simY });
                    steps++;
                    moved = true;
                    break;
                }
            }
            if (!moved) break;
        }
        
        // Агрессия: чем ближе к врагу, тем лучше
        const distToEnemy = Math.abs(simX - enemy.x) + Math.abs(simY - enemy.y);
        const aggressionBonus = (maxSteps - distToEnemy) * 2;
        
        // Случайность: добавляем шум чтобы бот не ходил одинаково
        const randomBonus = Math.floor(Math.random() * 7) - 3;
        
        const totalScore = steps * 10 + aggressionBonus + randomBonus;
        moveScores.push({ dir: dir, score: totalScore });
    }
    
    // Выбираем направление с максимальным счётом
    moveScores.sort((a, b) => b.score - a.score);
    const bestDir = moveScores[0].dir;
    
    p.dirX = bestDir.dx;
    p.dirY = bestDir.dy;
}

function initGame() {
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
    
    gameActive = false;
    winner = null;
    countdownActive = true;
    countdownValue = 3;
    crashEffect.active = false;
    particles = [];
    document.getElementById('gameMessage').textContent = '3...';
    draw();
    
    const countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            document.getElementById('gameMessage').textContent = countdownValue + '...';
            draw();
        } else if (countdownValue === 0) {
            document.getElementById('gameMessage').textContent = 'GO!';
            draw();
        } else {
            clearInterval(countdownInterval);
            document.getElementById('gameMessage').textContent = '';
            gameActive = true;
            countdownActive = false;
            paused = false;
            
            if (gameLoop) clearInterval(gameLoop);
            gameLoop = setInterval(() => {
                if (paused || !gameActive) return;
                
                for (let p of players) {
                    if (!p.alive) continue;
                    p.x += p.dirX;
                    p.y += p.dirY;
                    p.trail.push({ x: p.x, y: p.y });
                    addParticles(p.x, p.y, p.color);
                }
                
                aiMove();
                updateParticles();
                
                for (let p of players) {
                    if (!p.alive) continue;
                    if (p.x < 0 || p.x >= WIDTH || p.y < 0 || p.y >= HEIGHT) { 
                        p.alive = false; 
                        crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 };
                        continue; 
                    }
                    for (let i = 0; i < p.trail.length - 1; i++) {
                        if (p.trail[i].x === p.x && p.trail[i].y === p.y) { 
                            p.alive = false; 
                            crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 };
                            break; 
                        }
                    }
                    if (p.alive) {
                        for (let other of players) {
                            if (other === p || !other.alive) continue;
                            for (let seg of other.trail) {
                                if (seg.x === p.x && seg.y === p.y) { 
                                    p.alive = false; 
                                    crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 };
                                    break; 
                                }
                            }
                            if (!p.alive) break;
                        }
                    }
                }
                
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
            }, MOVE_INTERVAL);
        }
    }, 1000);
}

function resetGame() {
    if (gameLoop) clearInterval(gameLoop);
    paused = false;
    initGame();
}

function draw() {
    ctx.fillStyle = '#03050a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#0f3f3a';
    ctx.lineWidth = 1;
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
    
    for (let p of players) {
        const trailLength = p.trail.length;
        for (let i = 0; i < trailLength; i++) {
            const intensity = 0.2 + (i / trailLength) * 0.6;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = intensity;
            ctx.fillRect(p.trail[i].x * CELL_SIZE, p.trail[i].y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
        }
    }
    ctx.globalAlpha = 1;
    
    drawParticles();
    
    if (crashEffect.active) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = crashEffect.color;
        ctx.fillRect(crashEffect.x * CELL_SIZE, crashEffect.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        crashEffect.timer--;
        if (crashEffect.timer <= 0) crashEffect.active = false;
    }
    
    for (let p of players) {
        if (p.alive) {
            ctx.shadowBlur = 15 + 5 * Math.sin(Date.now() * 0.01);
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x * CELL_SIZE, p.y * CELL_SIZE, CELL_SIZE - 2, CELL_SIZE - 2);
        }
    }
    
    if (countdownActive) {
        ctx.font = 'bold 64px "Courier New"';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00ffff';
        ctx.fillStyle = '#00ffff';
        let text = countdownValue > 0 ? countdownValue.toString() : '';
        if (countdownValue === 0) text = 'GO!';
        if (text) {
            const scale = 1 + Math.sin(Date.now() * 0.02) * 0.2;
            ctx.save();
            ctx.translate(canvas.width/2, canvas.height/2);
            ctx.scale(scale, scale);
            ctx.fillText(text, -ctx.measureText(text).width/2, 20);
            ctx.restore();
        }
    }
    
    if (paused && gameActive && !countdownActive) {
        ctx.font = 'bold 36px "Courier New"';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText('⏸ ПАУЗА', canvas.width/2 - 70, canvas.height/2);
    }
    
    ctx.shadowBlur = 0;
}

function updateUI() {
    document.getElementById('player1Score').textContent = players[0].score;
    document.getElementById('player2Score').textContent = players[1].score;
}

function showMessage(msg) {
    const msgDiv = document.getElementById('gameMessage');
    msgDiv.textContent = msg;
    setTimeout(() => {
        if (!gameActive && winner === null) msgDiv.textContent = 'Нажмите ИГРАТЬ';
        else if (!gameActive && winner) msgDiv.textContent = `${winner.name} победил! Нажмите ИГРАТЬ`;
    }, 2000);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        e.preventDefault();
        if (!gameActive || countdownActive) return;
        paused = !paused;
        draw();
    }
});

document.getElementById('mode2p').title = 'Игра вдвоём на одном компьютере';
document.getElementById('modeAI').title = 'Сразитесь с искусственным интеллектом';
document.getElementById('playButton').title = 'Начать новый заезд';

document.getElementById('mode2p').addEventListener('click', () => {
    gameMode = '2p';
    document.getElementById('mode2p').classList.add('active');
    document.getElementById('modeAI').classList.remove('active');
    document.getElementById('player2-controls').style.opacity = '1';
    resetGame();
});

document.getElementById('modeAI').addEventListener('click', () => {
    gameMode = 'ai';
    document.getElementById('modeAI').classList.add('active');
    document.getElementById('mode2p').classList.remove('active');
    document.getElementById('player2-controls').style.opacity = '0.5';
    resetGame();
});

document.getElementById('playButton').addEventListener('click', () => {
    resetGame();
});

document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (!gameActive || paused || countdownActive) return;
    
    if (players[0].alive) {
        if (key === 'ArrowUp' && players[0].dirY !== 1) { players[0].dirX = 0; players[0].dirY = -1; }
        if (key === 'ArrowDown' && players[0].dirY !== -1) { players[0].dirX = 0; players[0].dirY = 1; }
        if (key === 'ArrowLeft' && players[0].dirX !== 1) { players[0].dirX = -1; players[0].dirY = 0; }
        if (key === 'ArrowRight' && players[0].dirX !== -1) { players[0].dirX = 1; players[0].dirY = 0; }
    }
    
    if (gameMode === '2p' && players[1].alive) {
        if (key === 'w' && players[1].dirY !== 1) { players[1].dirX = 0; players[1].dirY = -1; }
        if (key === 's' && players[1].dirY !== -1) { players[1].dirX = 0; players[1].dirY = 1; }
        if (key === 'a' && players[1].dirX !== 1) { players[1].dirX = -1; players[1].dirY = 0; }
        if (key === 'd' && players[1].dirX !== -1) { players[1].dirX = 1; players[1].dirY = 0; }
    }
});

initGame();
