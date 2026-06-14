const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const CELL_SIZE = 20;
const WIDTH = canvas.width / CELL_SIZE;
const HEIGHT = canvas.height / CELL_SIZE;
let MOVE_INTERVAL = 120;

let opponentType = '2p';
let matchMode = 'classic';
let gameLoop = null;
let gameActive = true;
let winner = null;
let countdownActive = false;
let countdownValue = 3;
let crashEffect = { active: false, x: 0, y: 0, color: '#ffffff', timer: 0 };
let paused = false;
let particles = [];
let currentSteps = 0;
let bestRecord = localStorage.getItem('tronRecord') ? parseInt(localStorage.getItem('tronRecord')) : 0;

let tournamentScore = [0, 0];
let tournamentTarget = 3;
let tournamentActive = false;
let survivalEnemies = [];

// ========== ЗВУК ==========
let bgMusic = null;
let crashSound = null;
let soundEnabled = true;

function initSound() {
    try {
        bgMusic = new Audio('assets/sounds/tron-music.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.4;
        crashSound = new Audio('crash.mp3');
        crashSound.volume = 0.6;
    } catch(e) { console.log('Sound not loaded'); }
}

function playBgMusic() {
    if (bgMusic && soundEnabled && bgMusic.paused) {
        bgMusic.play().catch(e => console.log('Autoplay blocked'));
    }
}

function stopBgMusic() {
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
}

function playCrashSound() {
    if (crashSound && soundEnabled) {
        crashSound.currentTime = 0;
        crashSound.play().catch(e => console.log('Sound error'));
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('soundToggle');
    if (soundEnabled) {
        btn.textContent = '🔊';
        playBgMusic();
    } else {
        btn.textContent = '🔇';
        stopBgMusic();
    }
}

const players = [
    { color: '#00ffff', name: 'Синий', x: 5, y: Math.floor(HEIGHT / 2), dirX: 1, dirY: 0, trail: [], alive: true, score: 0 },
    { color: '#ffaa00', name: 'Оранжевый', x: WIDTH - 6, y: Math.floor(HEIGHT / 2), dirX: -1, dirY: 0, trail: [], alive: true, score: 0 }
];

let ttsVoice = null;
function loadTTSVoice() {
    const voices = window.speechSynthesis.getVoices();
    ttsVoice = voices.find(voice => voice.name === 'Microsoft Pavel' && voice.lang === 'ru-RU');
    if (!ttsVoice) setTimeout(loadTTSVoice, 200);
}
if (typeof window !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = loadTTSVoice;
    loadTTSVoice();
}
function speak(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 0.85;
    utterance.pitch = 0.6;
    if (ttsVoice) utterance.voice = ttsVoice;
    window.speechSynthesis.speak(utterance);
}

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

function aiMove() {
    if (opponentType !== 'ai') return;
    if (!players[1].alive) return;
    const p = players[1];
    const enemy = players[0];
    const dirs = [
        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
    ];
    let moveScores = [];
    for (const dir of dirs) {
        let newX = p.x + dir.dx;
        let newY = p.y + dir.dy;
        if (!isSafe(newX, newY, p.trail, enemy.trail)) {
            moveScores.push({ dir: dir, score: -999 });
            continue;
        }
        let simX = newX, simY = newY;
        let simTrail = [...p.trail, { x: simX, y: simY }];
        let simDirX = dir.dx, simDirY = dir.dy;
        let steps = 0;
        for (let step = 0; step < 30; step++) {
            const possibleMoves = [
                { dx: simDirX, dy: simDirY },
                { dx: -simDirY, dy: simDirX },
                { dx: simDirY, dy: -simDirX },
                { dx: -simDirX, dy: -simDirY }
            ];
            let moved = false;
            for (const move of possibleMoves) {
                const nextX = simX + move.dx;
                const nextY = simY + move.dy;
                if (isSafe(nextX, nextY, simTrail, enemy.trail)) {
                    simX = nextX; simY = nextY;
                    simDirX = move.dx; simDirY = move.dy;
                    simTrail.push({ x: simX, y: simY });
                    steps++;
                    moved = true;
                    break;
                }
            }
            if (!moved) break;
        }
        const distToEnemy = Math.abs(simX - enemy.x) + Math.abs(simY - enemy.y);
        const aggressionBonus = (30 - distToEnemy) * 2;
        const randomBonus = Math.floor(Math.random() * 7) - 3;
        moveScores.push({ dir: dir, score: steps * 10 + aggressionBonus + randomBonus });
    }
    moveScores.sort((a, b) => b.score - a.score);
    const bestDir = moveScores[0].dir;
    p.dirX = bestDir.dx;
    p.dirY = bestDir.dy;
}

function spawnSurvivalEnemies() {
    survivalEnemies = [];
    const spawnPoints = [
        { x: 3, y: 3, dirX: 1, dirY: 0 },
        { x: WIDTH - 4, y: 3, dirX: -1, dirY: 0 },
        { x: 3, y: HEIGHT - 4, dirX: 1, dirY: 0 }
    ];
    for (let i = 0; i < 3; i++) {
        let sp = spawnPoints[i];
        survivalEnemies.push({
            x: sp.x, y: sp.y, dirX: sp.dirX, dirY: sp.dirY,
            trail: [{ x: sp.x, y: sp.y }], alive: true, color: '#ff5555'
        });
    }
}

function updateSurvival() {
    if (opponentType !== 'survival') return;
    for (let i = 0; i < survivalEnemies.length; i++) {
        let e = survivalEnemies[i];
        if (!e.alive) continue;
        let bestDir = null;
        let bestDist = Infinity;
        const dirs = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
        ];
        for (let dir of dirs) {
            let nx = e.x + dir.dx;
            let ny = e.y + dir.dy;
            if (nx < 1 || nx >= WIDTH-1 || ny < 1 || ny >= HEIGHT-1) continue;
            let safe = true;
            for (let seg of e.trail) {
                if (seg.x === nx && seg.y === ny) { safe = false; break; }
            }
            if (!safe) continue;
            let dist = Math.abs(nx - players[0].x) + Math.abs(ny - players[0].y);
            if (dist < bestDist) {
                bestDist = dist;
                bestDir = dir;
            }
        }
        if (bestDir) {
            e.dirX = bestDir.dx;
            e.dirY = bestDir.dy;
        }
        e.x += e.dirX;
        e.y += e.dirY;
        e.trail.push({ x: e.x, y: e.y });
        if (e.x === players[0].x && e.y === players[0].y) players[0].alive = false;
        if (e.trail.length > 150) e.trail.shift();
    }
    survivalEnemies = survivalEnemies.filter(e => e.alive);
    if (survivalEnemies.length === 0) {
        spawnSurvivalEnemies();
    }
}

function showVictory(name) {
    const overlay = document.getElementById('victoryOverlay');
    overlay.innerText = `${name.toUpperCase()} ПОБЕДИЛ!`;
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 2000);
    if (matchMode === 'tournament') {
        if (name === 'Синий') tournamentScore[0]++;
        else if (name === 'Оранжевый') tournamentScore[1]++;
        updateUI();
        if (tournamentScore[0] >= tournamentTarget || tournamentScore[1] >= tournamentTarget) {
            let finalWinner = tournamentScore[0] >= tournamentTarget ? 'Синий' : 'Оранжевый';
            showMessage(`🏆 ТУРНИР ВЫИГРАЛ ${finalWinner.toUpperCase()}! 🏆`);
            tournamentScore = [0, 0];
            tournamentActive = false;
            return;
        }
        resetGame();
        showMessage(`Счёт турнира: ${tournamentScore[0]} : ${tournamentScore[1]} (до ${tournamentTarget})`);
        return;
    }
    if (currentSteps > bestRecord) {
        bestRecord = currentSteps;
        localStorage.setItem('tronRecord', bestRecord);
        document.getElementById('recordDisplay').innerText = bestRecord;
        showMessage(`🏆 НОВЫЙ РЕКОРД: ${bestRecord} шагов!`);
    }
}

function initGame() {
    players[0].x = 5; players[0].y = Math.floor(HEIGHT / 2);
    players[0].dirX = 1; players[0].dirY = 0;
    players[0].trail = [{ x: players[0].x, y: players[0].y }];
    players[0].alive = true;
    players[1].x = WIDTH - 6; players[1].y = Math.floor(HEIGHT / 2);
    players[1].dirX = -1; players[1].dirY = 0;
    players[1].trail = [{ x: players[1].x, y: players[1].y }];
    players[1].alive = true;
    if (opponentType === 'survival') {
        spawnSurvivalEnemies();
        players[1].alive = false;
    }
    gameActive = false; winner = null;
    countdownActive = true; countdownValue = 3;
    crashEffect.active = false; particles = [];
    currentSteps = 0; updateUI(); draw();
    const countdownInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue === 2) { document.getElementById('gameMessage').textContent = '2...'; speak("Два"); draw(); }
        else if (countdownValue === 1) { document.getElementById('gameMessage').textContent = '1...'; speak("Один"); draw(); }
        else if (countdownValue === 0) { document.getElementById('gameMessage').textContent = 'ВПЕРЁД!'; speak("Вперёд"); draw(); }
        else if (countdownValue < 0) {
            clearInterval(countdownInterval);
            document.getElementById('gameMessage').textContent = '';
            gameActive = true; countdownActive = false; paused = false;
            playBgMusic();
            if (gameLoop) clearInterval(gameLoop);
            gameLoop = setInterval(() => {
                if (paused || !gameActive) return;
                let speedBonus = Math.floor(currentSteps / 200);
                let currentInterval = Math.max(40, MOVE_INTERVAL - speedBonus);
                if (gameLoop) clearInterval(gameLoop);
                gameLoop = setInterval(updateGame, currentInterval);
                updateGame();
            }, MOVE_INTERVAL);
        }
    }, 1000);
}

function updateGame() {
    if (!gameActive) return;
    for (let p of players) if (p.alive) { p.x += p.dirX; p.y += p.dirY; p.trail.push({ x: p.x, y: p.y }); addParticles(p.x, p.y, p.color); }
    if (opponentType === 'survival') updateSurvival();
    else aiMove();
    updateParticles();
    for (let p of players) {
        if (!p.alive) continue;
        if (p.x < 0 || p.x >= WIDTH || p.y < 0 || p.y >= HEIGHT) { p.alive = false; crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 }; playCrashSound(); continue; }
        for (let i = 0; i < p.trail.length - 1; i++) {
            if (p.trail[i].x === p.x && p.trail[i].y === p.y) { p.alive = false; crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 }; playCrashSound(); break; }
        }
        if (p.alive) {
            for (let other of players) {
                if (other === p || !other.alive) continue;
                for (let seg of other.trail) {
                    if (seg.x === p.x && seg.y === p.y) { p.alive = false; crashEffect = { active: true, x: p.x, y: p.y, color: p.color, timer: 5 }; playCrashSound(); break; }
                }
                if (!p.alive) break;
            }
        }
    }
    for (let e of survivalEnemies) {
        if (!e.alive) continue;
        if (e.x < 0 || e.x >= WIDTH || e.y < 0 || e.y >= HEIGHT) e.alive = false;
        for (let i = 0; i < e.trail.length - 1; i++) {
            if (e.trail[i].x === e.x && e.trail[i].y === e.y) { e.alive = false; break; }
        }
    }
    const alivePlayers = players.filter(p => p.alive);
    if (alivePlayers.length === 1 && opponentType !== 'survival') {
        let winnerIdx = players.findIndex(p => p.alive);
        players[winnerIdx].score++;
        winner = players[winnerIdx];
        gameActive = false;
        showVictory(winner.name);
        updateUI(); draw();
        showMessage(`${winner.name} победил! Нажмите ИГРАТЬ`);
        stopBgMusic();
        return;
    }
    if (alivePlayers.length === 0 && opponentType !== 'survival') { gameActive = false; showMessage('Ничья!'); stopBgMusic(); return; }
    if (opponentType === 'survival' && !players[0].alive) {
        gameActive = false;
        showMessage('ВЫ ПРОИГРАЛИ! Нажмите ИГРАТЬ');
        stopBgMusic();
        return;
    }
    currentSteps++;
    updateUI(); draw();
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
        ctx.beginPath(); ctx.moveTo(i * CELL_SIZE, 0); ctx.lineTo(i * CELL_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL_SIZE); ctx.lineTo(canvas.width, i * CELL_SIZE); ctx.stroke();
    }
    
    // Рисуем следы (ТОНЬШЕ — размер CELL_SIZE - 6)
    for (let p of players) {
        let trailLength = p.trail.length;
        for (let i = 0; i < trailLength; i++) {
            let intensity = 0.2 + (i / trailLength) * 0.6;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.globalAlpha = intensity;
            ctx.fillRect(p.trail[i].x * CELL_SIZE, p.trail[i].y * CELL_SIZE, CELL_SIZE - 6, CELL_SIZE - 6);
        }
    }
    
    // Рисуем врагов в режиме выживания
    for (let e of survivalEnemies) {
        for (let seg of e.trail) {
            ctx.fillStyle = e.color;
            ctx.globalAlpha = 0.6;
            ctx.fillRect(seg.x * CELL_SIZE, seg.y * CELL_SIZE, CELL_SIZE - 4, CELL_SIZE - 4);
        }
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(e.x * CELL_SIZE, e.y * CELL_SIZE, CELL_SIZE - 4, CELL_SIZE - 4);
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
    
    let blurLevel = Math.min(12, Math.floor(currentSteps / 50));
    
    // Рисуем живые мотоциклы (ШИРЕ — размер CELL_SIZE - 2)
    for (let p of players) {
        if (p.alive) {
            ctx.shadowBlur = 15 + 5 * Math.sin(Date.now() * 0.01) + blurLevel;
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
            let scale = 1 + Math.sin(Date.now() * 0.02) * 0.2;
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
        ctx.fillText('⏸ ПАУЗА', canvas.width/2 - 70, canvas.height/2);
    }
    ctx.shadowBlur = 0;
}

function updateUI() {
    document.getElementById('player1Score').innerText = matchMode === 'tournament' ? tournamentScore[0] : players[0].score;
    document.getElementById('player2Score').innerText = matchMode === 'tournament' ? tournamentScore[1] : players[1].score;
    if (opponentType === 'survival') document.getElementById('player2Score').innerText = survivalEnemies.length;
}
function showMessage(msg) { document.getElementById('gameMessage').innerText = msg; }

function setActiveButton(group, activeId) {
    const buttons = document.querySelectorAll(group);
    buttons.forEach(btn => btn.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

document.getElementById('opponent2p').addEventListener('click', () => {
    opponentType = '2p';
    setActiveButton('.mode-selector .mode-btn', 'opponent2p');
    showMessage('Противник: 2 игрока. Выберите режим матча и нажмите ИГРАТЬ');
});
document.getElementById('opponentAI').addEventListener('click', () => {
    opponentType = 'ai';
    setActiveButton('.mode-selector .mode-btn', 'opponentAI');
    showMessage('Противник: VS AI. Выберите режим матча и нажмите ИГРАТЬ');
});
document.getElementById('opponentSurvival').addEventListener('click', () => {
    opponentType = 'survival';
    setActiveButton('.mode-selector .mode-btn', 'opponentSurvival');
    showMessage('Противник: ВЫЖИВАНИЕ. Выберите режим матча и нажмите ИГРАТЬ');
});

document.getElementById('matchClassic').addEventListener('click', () => {
    matchMode = 'classic';
    setActiveButton('.arena-selector .mode-btn', 'matchClassic');
    tournamentActive = false;
    showMessage('Режим матча: Классика (до 1 победы)');
});
document.getElementById('matchTournament').addEventListener('click', () => {
    matchMode = 'tournament';
    setActiveButton('.arena-selector .mode-btn', 'matchTournament');
    tournamentScore = [0, 0];
    tournamentActive = true;
    showMessage('Режим матча: ТУРНИР до 3 побед');
});

document.getElementById('playButton').addEventListener('click', () => {
    resetGame();
});
document.getElementById('soundToggle').addEventListener('click', toggleSound);

window.addEventListener('DOMContentLoaded', () => {
    setActiveButton('.mode-selector .mode-btn', 'opponent2p');
    setActiveButton('.arena-selector .mode-btn', 'matchClassic');
    opponentType = '2p';
    matchMode = 'classic';
    tournamentActive = false;
    initSound();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (!gameActive || countdownActive) return; paused = !paused; draw(); }
    if (!gameActive || paused || countdownActive) return;
    if (players[0].alive) {
        if (e.key === 'ArrowUp' && players[0].dirY !== 1) { players[0].dirX = 0; players[0].dirY = -1; }
        if (e.key === 'ArrowDown' && players[0].dirY !== -1) { players[0].dirX = 0; players[0].dirY = 1; }
        if (e.key === 'ArrowLeft' && players[0].dirX !== 1) { players[0].dirX = -1; players[0].dirY = 0; }
        if (e.key === 'ArrowRight' && players[0].dirX !== -1) { players[0].dirX = 1; players[0].dirY = 0; }
    }
    if (opponentType === '2p' && players[1].alive) {
        if (e.key === 'w' && players[1].dirY !== 1) { players[1].dirX = 0; players[1].dirY = -1; }
        if (e.key === 's' && players[1].dirY !== -1) { players[1].dirX = 0; players[1].dirY = 1; }
        if (e.key === 'a' && players[1].dirX !== 1) { players[1].dirX = -1; players[1].dirY = 0; }
        if (e.key === 'd' && players[1].dirX !== -1) { players[1].dirX = 1; players[1].dirY = 0; }
    }
});

document.getElementById('player2-controls').style.opacity = opponentType === '2p' ? '1' : '0.5';
initSound();
showMessage('Выберите противника и режим матча, затем нажмите ИГРАТЬ');
draw();
