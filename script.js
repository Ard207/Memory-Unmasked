const sounds = {
    flip: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    match: new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'),
    error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
    victory: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    combo: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    frenzy: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3') // NOVO SOM
};

// --- VARIÁVEIS DE ESTADO ---
let isMuted = JSON.parse(localStorage.getItem('memory_unmasked_muted')) || false;
let comboCount = 0;
let isFrenzy = false; // NOVA VARIÁVEL
let progress = JSON.parse(localStorage.getItem('memory_unmasked_v100')) || { stars: {}, bests: {} };
let activeLevel, attempts, firstCard, secondCard, lockBoard = false, timerInterval, timeLeft, currentMaxTime;

const worldNames = ["O Despertar", "Sombras Digitais", "Neblina de Neon", "Ruínas do Pensamento", "A Máscara Final"];
const levelsConfig = {};
let currentWorld = 1;

const masks = ['👽', '👹', '👻', '🤖', '🤡', '💀', '🎃', '🥷', '👾', '🐲', '👺', '💩', '🧛', '🧟', '🧙'];
const faces = ['😀', '😎', '🦊', '🐶', '🐸', '🦁', '🐯', '🐱', '🍎', '🍌', '🍕', '🚀', '💎', '⚽', '🎨'];

// --- INICIALIZAÇÃO ---
function setupLevels() {
    for (let w = 0; w < 5; w++) {
        let worldStart = (w * 20) + 1;
        let worldEnd = worldStart + 19;
        let levelsInWorld = [];
        for (let i = worldStart; i <= worldEnd; i++) levelsInWorld.push(i);

        let selectedTimerLevels = levelsInWorld.filter(lvl => lvl >= 5);
        let timerIndices = selectedTimerLevels.filter((lvl, idx) => (lvl % 2 === 0 || lvl % 3 === 0)).slice(0, 10);

        levelsInWorld.forEach(i => {
            const pairs = Math.min(3 + Math.floor(i / 10), 12); 
            // NOVO: Adicionada propriedade isMystery para Mundos 3, 4 e 5
            const hasMystery = (w >= 2 && i % 3 === 0);
            levelsConfig[i] = { 
                pairs: pairs, 
                hasTimer: timerIndices.includes(i),
                isMystery: hasMystery
            };
        });
    }
}
setupLevels();

function playSfx(name) {
    if (isMuted) return; 
    sounds[name].currentTime = 0;
    sounds[name].volume = 0.3;
    sounds[name].play().catch(() => {});
}

// --- NAVEGAÇÃO ---
function renderWorlds() {
    document.body.className = 'world-1'; 
    document.getElementById('world-selection-screen').style.display = 'flex';
    document.getElementById('level-selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('settings-trigger').style.display = 'block';

    const container = document.getElementById('worlds-container');
    container.innerHTML = '';
    
    worldNames.forEach((name, index) => {
        const worldNum = index + 1;
        const firstLevelOfWorld = (index * 20) + 1;
        const isUnlocked = worldNum === 1 || (progress.stars && progress.stars[firstLevelOfWorld - 1]);
        
        const card = document.createElement('div');
        card.className = `world-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <div class="world-info"><small>Capítulo 0${worldNum}</small><h3>${name}</h3></div>
            <div class="status-icon">${isUnlocked ? '▶' : '🔒'}</div>
        `;
        if(isUnlocked) card.onclick = () => { playSfx('click'); openWorld(worldNum); };
        container.appendChild(card);
    });
}

// ATUALIZAÇÃO: Função de abrir mundo agora inclui Tela de Carregamento e esconde a engrenagem
function openWorld(num) {
    const loader = document.getElementById('loading-screen');
    const settingsBtn = document.getElementById('settings-trigger');

    // 1. Ativa o loader e remove a engrenagem
    loader.classList.remove('loader-hidden');
    settingsBtn.style.display = 'none';

    setTimeout(() => {
        currentWorld = num;
        document.body.className = `world-${num}`; 
        document.getElementById('world-selection-screen').style.display = 'none';
        document.getElementById('level-selection-screen').style.display = 'flex';
        document.getElementById('current-world-name').textContent = `Mundo ${num}: ${worldNames[num-1]}`;
        renderLevels();

        // 2. Esconde o loader após o processamento
        setTimeout(() => {
            loader.classList.add('loader-hidden');
            settingsBtn.style.display = 'block';
        }, 1200); // Tempo do carregamento interno do mundo
    }, 400); // Pequeno atraso para a tela de loading cobrir suavemente
}

function backToWorlds() {
    playSfx('click');
    document.body.className = 'world-1'; 
    document.getElementById('level-selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('world-selection-screen').style.display = 'flex';
    renderWorlds();
}

function renderLevels() {
    const map = document.getElementById('level-map');
    map.innerHTML = '';
    const start = (currentWorld - 1) * 20 + 1;
    for (let i = start; i <= start + 19; i++) {
        const btn = document.createElement('button');
        const isUnlocked = i === 1 || (progress.stars && progress.stars[i-1]);
        
        const fixedFactor = ((i * 123.45) % 0.9) + 0.5;
        const isHard = levelsConfig[i].hasTimer && fixedFactor <= 0.75;

        btn.className = `level-node ${progress.stars[i] ? 'completed' : ''} ${isUnlocked ? 'unlocked' : ''} ${isHard ? 'level-hard' : ''}`;
        const diffText = isHard ? '<br><small class="map-diff-tag">DIFÍCIL</small>' : '';
        btn.innerHTML = `<span>${i}${levelsConfig[i].hasTimer?'⏱️':''}</span>${diffText}<div class="level-stars">${'⭐'.repeat(progress.stars[i] || 0)}</div>`;
        
        if(isUnlocked) btn.onclick = () => { playSfx('click'); startLevel(i); };
        map.appendChild(btn);
    }
}

// --- LÓGICA DO JOGO ---
function startLevel(num) {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('settings-trigger').style.display = 'none';

    activeLevel = num;
    attempts = 0;
    comboCount = 0;
    isFrenzy = false; // Reset Frenesi
    document.body.classList.remove('frenzy-active');

    const config = levelsConfig[num];
    [firstCard, secondCard, lockBoard] = [null, null, false];
    
    document.getElementById('attempts').textContent = '0';
    document.getElementById('current-level-id').textContent = num;
    document.getElementById('best-score').textContent = progress.bests[num] ?? '-';
    document.getElementById('level-selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    createBoard(config.pairs, config.isMystery); // Passa info de mistério
    clearInterval(timerInterval);

    const timerBar = document.getElementById('timer-bar');
    const diffLabel = document.getElementById('difficulty-label');
    timerBar.classList.remove('bar-danger');

    if (config.hasTimer) {
        const baseTime = config.pairs * 8; 
        const worldSpeedFactor = 1 - ((currentWorld - 1) * 0.1); 
        const fixedFactor = ((num * 123.45) % 0.9) + 0.5; 
        let finalTime = Math.floor(baseTime * fixedFactor * worldSpeedFactor);

        if (fixedFactor <= 0.75) {
            finalTime = Math.floor(finalTime * 0.5); 
            diffLabel.textContent = "DIFICIL 🔥"; 
            diffLabel.className = 'difficulty-tag diff-hard';
        } else {
            diffLabel.textContent = "NORMAL";
            diffLabel.className = 'difficulty-tag diff-normal';
        }

        currentMaxTime = finalTime;
        document.getElementById('timer-container').style.display = 'block';
        runTimer(finalTime);
    } else {
        document.getElementById('timer-container').style.display = 'none';
    }
}

function runTimer(seconds) {
    timeLeft = seconds;
    const bar = document.getElementById('timer-bar');

    timerInterval = setInterval(() => {
        if (!isFrenzy) timeLeft -= 0.1; // NOVO: Tempo não cai no Frenesi
        
        let percentage = (timeLeft / currentMaxTime * 100);
        bar.style.width = Math.max(0, percentage) + '%';

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            playSfx('error');
            alert("O tempo acabou!");
            startLevel(activeLevel);
        }
    }, 100);
}

function createBoard(pairs, isMystery) {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    let total = pairs * 2;
    let cols = total <= 8 ? 3 : (total <= 16 ? 4 : 5);
    board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let data = [];
    for(let i=0; i<pairs; i++) {
        let pair = { id: i, m: masks[i % masks.length], f: faces[i % faces.length] };
        data.push(pair, {...pair});
    }
    data.sort(() => Math.random() - 0.5);

    data.forEach(item => {
        const card = document.createElement('div');
        // NOVO: Adiciona classe mystery se o nível exigir
        card.className = `card ${isMystery ? 'mystery' : ''}`;
        card.dataset.id = item.id;
        card.innerHTML = `<div class="prop">${item.m}</div><div class="face">${item.f}</div>`;
        
        // NOVO: Revelação inicial para cartas mistério
        if(isMystery) {
            card.classList.add('unmasked');
            setTimeout(() => card.classList.remove('unmasked'), 1200);
        }

        card.onclick = flipCard;
        board.appendChild(card);
    });
}

function flipCard() {
    if (lockBoard || this === firstCard || this.classList.contains('matched')) return;
    playSfx('flip');
    this.classList.add('unmasked');
    
    if (!firstCard) { firstCard = this; return; }
    
    secondCard = this;
    attempts++;
    document.getElementById('attempts').textContent = attempts;
    lockBoard = true;

    if (firstCard.dataset.id === secondCard.dataset.id) {
        // --- ACERTO ---
        comboCount++; 
        
        // NOVO: Inicia Frenesi no Combo 5
        if (comboCount >= 5 && !isFrenzy) startFrenzy();
        
        handleCombo(secondCard); 
        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        setTimeout(() => playSfx('match'), 200);
        [firstCard, secondCard, lockBoard] = [null, null, false];

        if (document.querySelectorAll('.card.matched').length === levelsConfig[activeLevel].pairs * 2) {
            clearInterval(timerInterval);
            setTimeout(win, 500);
        }
    } else {
        // --- ERRO ---
        comboCount = 0; 
        playSfx('error');
        triggerFlash('red'); // NOVO: Flash de dano
        
        if (levelsConfig[activeLevel].hasTimer && !isFrenzy) {
            timeLeft -= 3; 
            showPenalty(secondCard);
            const bar = document.getElementById('timer-bar');
            bar.classList.add('bar-danger');
            setTimeout(() => bar.classList.remove('bar-danger'), 300);
        }

        this.classList.add('shake');
        firstCard.classList.add('shake');
        setTimeout(() => {
            if(firstCard) firstCard.classList.remove('unmasked', 'shake');
            if(secondCard) secondCard.classList.remove('unmasked', 'shake');
            [firstCard, secondCard, lockBoard] = [null, null, false];
        }, 1000);
    }
}

// --- NOVAS FUNÇÕES DE ADRENALINA ---

function startFrenzy() {
    isFrenzy = true;
    playSfx('frenzy');
    document.body.classList.add('frenzy-active');
    triggerFlash('gold');
    
    // Modo Febre dura 5 segundos
    setTimeout(() => {
        isFrenzy = false;
        document.body.classList.remove('frenzy-active');
    }, 5000);
}

function triggerFlash(type) {
    const screen = document.getElementById('game-screen');
    const className = type === 'red' ? 'flash-red' : 'flash-gold';
    screen.classList.add(className);
    setTimeout(() => screen.classList.remove(className), 500);
}

// --- EFEITOS ESPECIAIS (COMBO E PUNIÇÃO) ---
function handleCombo(cardElement) {
    if (comboCount < 2) return; 
    playSfx('combo');
    const comboDiv = document.getElementById('combo-text');
    const rect = cardElement.getBoundingClientRect();
    
    comboDiv.style.left = `${rect.left + rect.width / 2}px`;
    comboDiv.style.top = `${rect.top}px`;
    comboDiv.textContent = `COMBO X${comboCount}!`;
    
    comboDiv.classList.remove('combo-animation');
    void comboDiv.offsetWidth; 
    comboDiv.classList.add('combo-animation');

    if (levelsConfig[activeLevel].hasTimer) {
        timeLeft += Math.min(comboCount, 5); 
        const bar = document.getElementById('timer-bar');
        bar.classList.add('timer-boost');
        setTimeout(() => bar.classList.remove('timer-boost'), 500);
    }
}

function showPenalty(cardElement) {
    const penaltyDiv = document.getElementById('penalty-text');
    const rect = cardElement.getBoundingClientRect();
    penaltyDiv.style.left = `${rect.left + rect.width / 2}px`;
    penaltyDiv.style.top = `${rect.top}px`;
    penaltyDiv.textContent = `-3s`;
    
    penaltyDiv.classList.remove('penalty-animation');
    void penaltyDiv.offsetWidth; 
    penaltyDiv.classList.add('penalty-animation');
}

// --- VITÓRIA ---
function win() {
    playSfx('victory');
    let best = progress.bests[activeLevel];
    let isNew = (best === undefined || attempts < best);
    if (isNew) progress.bests[activeLevel] = attempts;
    
    let p = levelsConfig[activeLevel].pairs;
    let stars = attempts <= p + 2 ? 3 : (attempts <= p + 5 ? 2 : 1);
    
    progress.stars[activeLevel] = Math.max(progress.stars[activeLevel] || 0, stars);
    localStorage.setItem('memory_unmasked_v100', JSON.stringify(progress));
    
    document.getElementById('final-attempts').textContent = attempts;
    document.getElementById('new-record-msg').style.display = isNew ? 'block' : 'none';
    document.getElementById('stars-container').innerHTML = '⭐'.repeat(stars);
    document.getElementById('victory-modal').style.display = 'flex';
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

// --- CONFIGURAÇÕES ---
function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    updateMuteUI();
}

// ==========================================================================
// ADIÇÃO: SISTEMA DE MUDO ABSOLUTO (PARA INTERROMPER TODOS OS SONS)
// ==========================================================================
function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('memory_unmasked_muted', JSON.stringify(isMuted));
    
    // Se o usuário desligar o som, paramos tudo o que estiver tocando AGORA
    if (isMuted) {
        Object.values(sounds).forEach(audio => {
            audio.pause();        // Para o áudio imediatamente
            audio.currentTime = 0; // Reseta para o começo
        });
    }
    
    updateMuteUI();
}

function updateMuteUI() {
    const statusTxt = document.getElementById('mute-status');
    if(statusTxt) statusTxt.textContent = isMuted ? "DESLIGADO" : "LIGADO";
}

// --- EVENTOS ---
window.addEventListener('load', () => {
    // ATUALIZAÇÃO: Garante que a engrenagem suma na tela de carregamento inicial também
    const settingsBtn = document.getElementById('settings-trigger');
    if(settingsBtn) settingsBtn.style.display = 'none';

    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if(loader) loader.classList.add('loader-hidden');
        if(settingsBtn) settingsBtn.style.display = 'block';
        renderWorlds();
    }, 2200);
});

document.getElementById('restart-level-btn').onclick = () => { startLevel(activeLevel); };
document.getElementById('mute-btn').onclick = toggleMute;
document.getElementById('back-btn').onclick = () => {
    clearInterval(timerInterval);
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('level-selection-screen').style.display = 'flex';
    document.getElementById('settings-trigger').style.display = 'block';
    renderLevels();
};
document.getElementById('continue-btn').onclick = () => {
    document.getElementById('victory-modal').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';
    document.getElementById('level-selection-screen').style.display = 'flex';
    document.getElementById('settings-trigger').style.display = 'block';
    renderLevels();
};
document.getElementById('clear-save-settings').onclick = () => { 
    if(confirm("Apagar progresso?")) { localStorage.clear(); location.reload(); } 
};