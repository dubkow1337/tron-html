// ========== БОНУСЫ ==========
let bonuses = [];
let bonusTimer = 0;
let shieldActive = false;
let shieldEndTime = 0;
let enemySlowActive = false;
let enemySlowEndTime = 0;

const bonusTypes = {
    speed: { name: 'Ускорение', color: '#00ff00', symbol: '⚡', duration: 5000 },
    shield: { name: 'Щит', color: '#0088ff', symbol: '🛡️', duration: 8000 },
    slowEnemies: { name: 'Замедление врагов', color: '#ff6600', symbol: '🐢', duration: 6000 },
    shortTrail: { name: 'Короткий след', color: '#aa00ff', symbol: '✂️', duration: 7000 }
};

function spawnBonus() {
    if (bonuses.length >= 3) return;
    
    const types = ['speed', 'shield', 'slowEnemies', 'shortTrail'];
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
        for (let e of survivalEnemies) {
            if (e.alive && e.x === x && e.y === y) free = false;
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
    
    // Проверка щита
    if (shieldActive && Date.now() > shieldEndTime) {
        shieldActive = false;
        showMessage('🛡️ Щит исчез!');
    }
    
    // Проверка замедления врагов
    if (enemySlowActive && Date.now() > enemySlowEndTime) {
        enemySlowActive = false;
        showMessage('🐢 Враги ускорились!');
    }
}

function collectBonus(bonus, player) {
    const type = bonus.type;
    const b = bonusTypes[type];
    
    showMessage(`✨ ${b.name}! ${b.symbol}`);
    
    switch(type) {
        case 'speed':
            const oldInterval = MOVE_INTERVAL;
            MOVE_INTERVAL = Math.max(35, MOVE_INTERVAL - 25);
            setTimeout(() => { 
                MOVE_INTERVAL = oldInterval;
                showMessage('⚡ Ускорение закончилось');
            }, b.duration);
            break;
            
        case 'shield':
            shieldActive = true;
            shieldEndTime = Date.now() + b.duration;
            break;
            
        case 'slowEnemies':
            if (opponentType === 'survival') {
                enemySlowActive = true;
                enemySlowEndTime = Date.now() + b.duration;
            } else {
                showMessage('❌ Бесполезно в этом режиме!');
            }
            break;
            
        case 'shortTrail':
            const maxTrail = 15;
            const currentLength = player.trail.length;
            if (currentLength > maxTrail) {
                player.trail = player.trail.slice(-maxTrail);
            }
            setTimeout(() => {
                showMessage('✂️ Длина следа восстановлена');
            }, b.duration);
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
    
    // Индикатор щита
    if (shieldActive) {
        ctx.fillStyle = '#0088ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🛡️', 10, 40);
        
        // Оставшееся время щита
        const remaining = Math.max(0, Math.ceil((shieldEndTime - Date.now()) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, 30, 40);
    }
    
    // Индикатор замедления врагов
    if (enemySlowActive && opponentType === 'survival') {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🐢', 70, 40);
        
        const remaining = Math.max(0, Math.ceil((enemySlowEndTime - Date.now()) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, 90, 40);
    }
}
