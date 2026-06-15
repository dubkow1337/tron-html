// ========== БОНУСЫ ==========
let bonuses = [];
let bonusTimer = 0;

// Активные эффекты (уникальные имена с префиксом bonus)
let bonusShieldActive = false;
let bonusShieldEndTime = 0;
let bonusSpeedActive = false;
let bonusSpeedEndTime = 0;
let bonusSlowActive = false;
let bonusSlowEndTime = 0;
let bonusNoTrailActive = false;
let bonusNoTrailEndTime = 0;

const bonusTypes = {
    speed: { name: 'Ускорение', color: '#00ff00', symbol: '⚡', duration: 5000 },
    shield: { name: 'Щит', color: '#0088ff', symbol: '🛡️', duration: 8000 },
    slowEnemies: { name: 'Замедление врагов', color: '#ff6600', symbol: '🐢', duration: 6000 },
    noTrail: { name: 'Стереть след врага', color: '#aa00ff', symbol: '✂️', duration: 7000 }
};

function spawnBonus() {
    if (bonuses.length >= 3) return;
    if (typeof WIDTH === 'undefined' || typeof HEIGHT === 'undefined') return;
    
    const types = ['speed', 'shield', 'slowEnemies', 'noTrail'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let x, y;
    let free = false;
    let attempts = 0;
    while (!free && attempts < 50) {
        x = Math.floor(Math.random() * WIDTH);
        y = Math.floor(Math.random() * HEIGHT);
        free = true;
        
        if (typeof players !== 'undefined') {
            for (let p of players) {
                if (p.alive && p.x === x && p.y === y) free = false;
            }
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
    if (typeof bonuses === 'undefined') return;
    
    for (let i = 0; i < bonuses.length; i++) {
        bonuses[i].life--;
        if (bonuses[i].life <= 0) {
            bonuses.splice(i, 1);
            i--;
        }
    }
    
    bonusTimer++;
    if (bonusTimer > 250 && bonuses.length < 3) {
        bonusTimer = 0;
        spawnBonus();
    }
    
    const now = Date.now();
    
    if (bonusSpeedActive && now > bonusSpeedEndTime) {
        bonusSpeedActive = false;
        if (typeof showMessage === 'function') showMessage('⚡ Ускорение закончилось');
    }
    
    if (bonusShieldActive && now > bonusShieldEndTime) {
        bonusShieldActive = false;
        if (typeof showMessage === 'function') showMessage('🛡️ Щит исчез!');
    }
    
    if (bonusSlowActive && now > bonusSlowEndTime) {
        bonusSlowActive = false;
        if (typeof showMessage === 'function') showMessage('🐢 Враги ускорились!');
    }
    
    if (bonusNoTrailActive && now > bonusNoTrailEndTime) {
        bonusNoTrailActive = false;
        if (typeof showMessage === 'function') showMessage('✂️ У врагов снова появился след!');
    }
}

function collectBonus(bonus, player) {
    const type = bonus.type;
    const b = bonusTypes[type];
    
    if (typeof showMessage === 'function') showMessage(`✨ ${b.name}! ${b.symbol}`);
    const now = Date.now();
    
    switch(type) {
        case 'speed':
            bonusSpeedActive = true;
            bonusSpeedEndTime = now + b.duration;
            if (typeof showMessage === 'function') showMessage(`⚡ СКОРОСТЬ УВЕЛИЧЕНА!`);
            break;
        case 'shield':
            bonusShieldActive = true;
            bonusShieldEndTime = now + b.duration;
            if (typeof showMessage === 'function') showMessage(`🛡️ ЩИТ АКТИВИРОВАН! (Неуязвимость)`);
            break;
        case 'slowEnemies':
            bonusSlowActive = true;
            bonusSlowEndTime = now + b.duration;
            if (typeof showMessage === 'function') showMessage(`🐢 ВРАГИ ЗАМЕДЛЕНЫ!`);
            break;
        case 'noTrail':
            bonusNoTrailActive = true;
            bonusNoTrailEndTime = now + b.duration;
            
            if (typeof opponentType !== 'undefined' && opponentType === 'survival' && typeof survivalEnemies !== 'undefined') {
                for (let e of survivalEnemies) {
                    e.trail = [{ x: e.x, y: e.y }];
                }
            }
            if (typeof opponentType !== 'undefined' && opponentType === 'ai' && typeof players !== 'undefined' && players[1] && players[1].alive) {
                players[1].trail = [{ x: players[1].x, y: players[1].y }];
            }
            if (typeof showMessage === 'function') showMessage(`✂️ СЛЕД ПРОТИВНИКА СТЁРТ!`);
            break;
    }
}

function drawBonuses() {
    if (typeof bonuses === 'undefined' || typeof ctx === 'undefined' || typeof CELL_SIZE === 'undefined') return;
    
    for (let b of bonuses) {
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
    
    if (bonusSpeedActive) {
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('⚡', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((bonusSpeedEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
        offsetX += 50;
    }
    
    if (bonusShieldActive) {
        ctx.fillStyle = '#0088ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🛡️', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((bonusShieldEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 25, offsetY);
        offsetX += 50;
    }
    
    if (bonusSlowActive) {
        ctx.fillStyle = '#ff6600';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('🐢', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((bonusSlowEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
        offsetX += 50;
    }
    
    if (bonusNoTrailActive) {
        ctx.fillStyle = '#aa00ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('✂️', offsetX, offsetY);
        const remaining = Math.max(0, Math.ceil((bonusNoTrailEndTime - now) / 1000));
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`${remaining}s`, offsetX + 20, offsetY);
    }
}

function resetBonuses() {
    bonuses = [];
    bonusTimer = 0;
    bonusShieldActive = false;
    bonusSpeedActive = false;
    bonusSlowActive = false;
    bonusNoTrailActive = false;
}
