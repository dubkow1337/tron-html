// ========== УПРАВЛЕНИЕ РЕЖИМАМИ ==========

function setActiveModeButton(activeId) {
    const buttons = ['opponent2p', 'opponentAI', 'opponentSurvival'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function setActiveMatchButton(activeId) {
    const buttons = ['matchClassic', 'matchTournament'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

// Обработчики выбора противника
document.getElementById('opponent2p').addEventListener('click', () => {
    opponentType = '2p';
    setActiveModeButton('opponent2p');
    showMessage('Противник: 2 игрока. Выберите режим матча и нажмите ИГРАТЬ');
});

document.getElementById('opponentAI').addEventListener('click', () => {
    opponentType = 'ai';
    setActiveModeButton('opponentAI');
    showMessage('Противник: VS AI. Выберите режим матча и нажмите ИГРАТЬ');
});

document.getElementById('opponentSurvival').addEventListener('click', () => {
    opponentType = 'survival';
    setActiveModeButton('opponentSurvival');
    showMessage('Противник: ВЫЖИВАНИЕ. Выберите режим матча и нажмите ИГРАТЬ');
});

// Обработчики выбора режима матча
document.getElementById('matchClassic').addEventListener('click', () => {
    matchMode = 'classic';
    setActiveMatchButton('matchClassic');
    tournamentActive = false;
    tournamentScore = [0, 0];
    showMessage('Режим матча: Классика (до 1 победы)');
});

document.getElementById('matchTournament').addEventListener('click', () => {
    matchMode = 'tournament';
    setActiveMatchButton('matchTournament');
    tournamentScore = [0, 0];
    tournamentActive = true;
    showMessage('Режим матча: ТУРНИР до 3 побед');
});

// Инициализация кнопок при загрузке
function initModeButtons() {
    setActiveModeButton('opponent2p');
    setActiveMatchButton('matchClassic');
    opponentType = '2p';
    matchMode = 'classic';
    tournamentActive = false;
    tournamentScore = [0, 0];
}
