// ========== БОНУСЫ ==========
let bonuses = [];
let bonusTimer = 0;

// Активные эффекты (глобальные флаги, которые использует script.js)
let shieldActive = false;
let shieldEndTime = 0;

let speedActive = false;
let speedEndTime = 0;

let enemySlowActive = false;
let enemySlowEndTime = 0;

let enemyNoTrailActive = false;
let enemyNoTrailEndTime = 0;

const bonusTypes = {
    speed: { name: 'Ускорение', color: '#00ff00', symbol: '⚡', duration: 5000 },
    shield: { name: 'Щит', color: '#0088ff', symbol: '🛡️', duration: 8000 },
    slowEnemies: { name: 'Замедление врагов', color: '#ff6600', symbol: '🐢', duration: 6000 },
    noTrail: { name: 'Стереть след врага', color: '#aa00ff', symbol: '✂️', duration: 7000 }
};

function spawnBonus() {
    if (bonuses.length >= 3) return;
    
    const types = ['speed', 'shield', 'slowEnemies', 'noTrail'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let x, y;
    let free = false;
    let attempts = 0;
    while (!free && attempts < 50) {
        x = Math.floor(Math.random() * WIDTH);
        y = Math.floor(Math.random() * HEIGHT);
        free = true;
        
        for (let p of players) {
            if (p.alive && p.x === x && p.y === y) free = false;
        }
        if (typeof survivalEnemies !== 'undefined') {
            for (let e of survivalEnemies) {
                if (e.alive && e.x === x && e.y === y) free = false;
            }
        }
        for (let b of bonuses) {
            if (b.x === x && b.y === y) free = false;
        }
        attempts++;
    }
    
    if (free) {
        bonuses.push({ 
            x: x, y: y, 
            type: type, 
            life: 300,
            color: bonusTypes[type].color,
            symbol: bonusTypes[type].symbol
        });
    }
}

function updateBonuses() {
    // Обновление таймеров бонусов на поле
    for (let i = 0; i < bonuses.length; i++) {
        bonuses[i].life--;
        if (bonuses[i].life <= 0) {
            bonuses.splice(i, 1);
            i--;
        }
    }
    
    // Спавн новых бонусов (каждые ~5 секунд)
    bonusTimer++;
    if (bonusTimer > 250 && bonuses.length < 3) {
        bonusTimer = 0;
        spawnBonus();
    }
    
    const now = Date.now();
    
    // Проверка ускорения
    if (speedActive && now > speedEndTime) {
        speedActive = false;
        showMessage('⚡ Ускорение закончилось');
    }
    
    // Проверка щита
    if (shieldActive && now > shieldEndTime) {
        shieldActive = false;
        showMessage('🛡️ Щит исчез!');
    }
    
    // Проверка замедления врагов
    if (enemySlowActive && now > enemySlowEndTime) {
        enemySlowActive = false;
        showMessage('🐢 Враги ускорились!');
    }
    
    // Проверка исчезновения следа врагов
    if (enemyNoTrailActive && now > enemyNoTrailEndTime) {
        enemyNoTrailActive = false;
        showMessage('✂️ У врагов снова появился след!');
    }
}

function collectBonus(bonus, player) {
    const type = bonus.type;
    const b = bonusTypes[type];
    
    showMessage(`✨ ${b.name}! ${b.symbol}`);
    const now = Date.now();
    
    switch(type) {
        case 'speed':
            if (!speedActive) {
                showMessage(`⚡ СКОРОСТЬ УВЕЛИЧЕНА! (до конца раунда)`);
            }
            speedActive = true;
            speedEndTime = now + b.duration;
            break;
            
        case 'shield':
            shieldActive = true;
            shieldEndTime = now + b.duration;
            showMessage(`🛡️ ЩИТ АКТИВИРОВАН! (Неуязвимость)`);
            break;
            
        case 'slowEnemies':
            if (!enemySlowActive) {
                showMessage(`🐢 ВРАГИ ЗАМЕДЛЕНЫ!`);
            }
            enemySlowActive = true;
            enemySlowEndTime = now + b.duration;
            break;
            
        case 'noTrail':
            enemyNoTrailActive = true;
            enemyNoTrailEndTime = now + b.duration;
            
            // Очищаем следы врагов
            if (opponentType === 'survival') {
                for (let e of survivalEnemies) {
                    e.trail = [{ x: e.x, y: e.y }];
                }
            }
            if (opponentType === 'ai' && players[1] && players[1].alive) {
                players[1].trail = [{ x: players[1].x, y: players[1].y }];
            }
            showMessage(`✂️ СЛЕД ПРОТИВНИКА СТЁРТ!`);
            break;
    }
}

function drawBonuses() {
    for (let b of bonuses) {
        // Пульсирующий эффект
        const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;
        ctx.fillStyle = b.color;
        ctx.globalAlpha = pulse;
        ctx.fillRect(b.x * CELL_SIZE, b.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000000';
        ctx.font = `${CELL_SIZE-4}px monospace`;
        ctx.fillText(b.symbol, b.x * CELL_SIZE + 3, b.y * CELL_SIZE + CELL_SIZE - 5);
    }
    
    let offsetX = 10;
    let offsetY = 25;
    const now = Date.now();
    
    // Индикатор ускорения
    if (speedActive) {
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('⚡', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((speedEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
        offsetX += 50;
    }
    
    // Индикатор щита
    if (shieldActive) {
        ctx.fillStyle = '#0088ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🛡️', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((shieldEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 25, offsetY);
        offsetX += 50;
    }
    
    // Индикатор замедления врагов
    if (enemySlowActive) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🐢', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((enemySlowEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
        offsetX += 50;
    }
    
    // Индикатор отсутствия следа у врагов
    if (enemyNoTrailActive) {
        ctx.fillStyle = '#aa00ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('✂️', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((enemyNoTrailEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
    }
}

// Функция сброса бонусов (вызывать при новом раунде)
function resetBonuses() {
    bonuses = [];
    bonusTimer = 0;
    shieldActive = false;
    speedActive = false;
    enemySlowActive = false;
    enemyNoTrailActive = false;
}
