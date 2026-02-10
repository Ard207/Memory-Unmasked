const sounds = {
    flip: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
    match: new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'),
    error: new Audio('https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'),
    victory: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
    click: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3')
};

// --- NOVAS VARIÁVEIS DE CONFIGURAÇÃO (Persistentes) ---
let isMuted = JSON.parse(localStorage.getItem('memory_unmasked_muted')) || false;

// Função de som atualizada para respeitar o Mudo
function playSfx(name) {
    if (isMuted) return; 
    sounds[name].currentTime = 0;
    sounds[name].volume = 0.3;
    sounds[name].play().catch(() => {});
}

// --- CONFIGURAÇÃO ---
const TOTAL_LEVELS = 100;
const levelsConfig = {};
const worldNames = ["O Despertar", "Sombras Digitais", "Neblina de Neon", "Ruínas do Pensamento", "A Máscara Final"];
let currentWorld = 1;

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
            levelsConfig[i] = { 
                pairs: pairs, 
                hasTimer: timerIndices.includes(i) 
            };
        });
    }
}
setupLevels();

let progress = JSON.parse(localStorage.getItem('memory_unmasked_v100')) || { stars: {}, bests: {} };
let activeLevel, attempts, firstCard, secondCard, lockBoard = false, timerInterval, timeLeft;

const masks = ['👽', '👹', '👻', '🤖', '🤡', '💀', '🎃', '🥷', '👾', '🐲', '👺', '💩', '🧛', '🧟', '🧙'];
const faces = ['😀', '😎', '🦊', '🐶', '🐸', '🦁', '🐯', '🐱', '🍎', '🍌', '🍕', '🚀', '💎', '⚽', '🎨'];

// --- NAVEGAÇÃO E TEMAS ---

function renderWorlds() {
    document.body.className = 'world-1'; 
    document.getElementById('world-selection-screen').style.display = 'flex';
    document.getElementById('level-selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'none';

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

function openWorld(num) {
    currentWorld = num;
    document.body.className = `world-${num}`; 
    document.getElementById('world-selection-screen').style.display = 'none';
    document.getElementById('level-selection-screen').style.display = 'flex';
    document.getElementById('current-world-name').textContent = `Mundo ${num}: ${worldNames[num-1]}`;
    renderLevels();
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
    activeLevel = num;
    const config = levelsConfig[num];
    attempts = 0;
    [firstCard, secondCard, lockBoard] = [null, null, false];
    
    // Atualizado para mostrar o contador de JOGADAS inicializado
    const attemptsDisplay = document.getElementById('attempts');
    attemptsDisplay.textContent = '0';
    attemptsDisplay.classList.remove('pop-effect'); // Garante que comece sem animação

    document.getElementById('current-level-id').textContent = num;
    document.getElementById('best-score').textContent = progress.bests[num] ?? '-';
    document.getElementById('level-selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display = 'flex';
    
    createBoard(config.pairs);
    clearInterval(timerInterval);

    const restartBtn = document.getElementById('restart-level-btn');
    const diffLabel = document.getElementById('difficulty-label');
    const timerBar = document.getElementById('timer-bar');
    
    restartBtn.classList.remove('timer-danger');
    timerBar.style.animation = "none";
    diffLabel.className = 'difficulty-tag';

    if (config.hasTimer) {
        const baseTime = config.pairs * 8; 
        const worldSpeedFactor = 1 - ((currentWorld - 1) * 0.1); 
        const fixedFactor = ((num * 123.45) % 0.9) + 0.5; 
        
        let finalTime = Math.floor(baseTime * fixedFactor * worldSpeedFactor);

        if (fixedFactor <= 0.75) {
            finalTime = Math.floor(finalTime * 0.5); 
            diffLabel.textContent = "DIFICIL 🔥"; 
            diffLabel.classList.add('diff-hard'); 
            timerBar.style.animation = "pulse-fast 0.3s infinite";
        } else if (fixedFactor >= 1.2) {
            diffLabel.textContent = "RELAX ✨";
            diffLabel.classList.add('diff-easy');
        } else {
            diffLabel.textContent = "NORMAL";
            diffLabel.classList.add('diff-normal');
        }

        document.getElementById('timer-container').style.display = 'block';
        runTimer(finalTime);
    } else {
        diffLabel.textContent = "SEM TEMPO";
        diffLabel.classList.add('diff-normal');
        document.getElementById('timer-container').style.display = 'none';
    }
}

function runTimer(seconds) {
    timeLeft = seconds;
    const bar = document.getElementById('timer-bar');
    const restartBtn = document.getElementById('restart-level-btn');

    timerInterval = setInterval(() => {
        timeLeft -= 0.1;
        let percentage = (timeLeft / seconds * 100);
        bar.style.width = percentage + '%';

        if (percentage < 30 && timeLeft < 5) {
            bar.classList.add('bar-danger');
            restartBtn.classList.add('timer-danger');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            restartBtn.classList.remove('timer-danger');
            playSfx('error');
            alert("O tempo te venceu!");
            startLevel(activeLevel);
        }
    }, 100);
}

function createBoard(pairs) {
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
        card.className = 'card';
        card.dataset.id = item.id;
        card.innerHTML = `<div class="prop">${item.m}</div><div class="face">${item.f}</div>`;
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
    const attemptsDisplay = document.getElementById('attempts');
    attemptsDisplay.textContent = attempts;
    
    lockBoard = true;

    if (firstCard.dataset.id === secondCard.dataset.id) {
        // --- ATUALIZAÇÃO: Efeito visual no contador ao acertar ---
        attemptsDisplay.classList.add('pop-effect');
        setTimeout(() => attemptsDisplay.classList.remove('pop-effect'), 400);

        firstCard.classList.add('matched');
        secondCard.classList.add('matched');
        setTimeout(() => playSfx('match'), 200);
        [firstCard, secondCard, lockBoard] = [null, null, false];
        if (document.querySelectorAll('.card.matched').length === levelsConfig[activeLevel].pairs * 2) {
            clearInterval(timerInterval);
            setTimeout(win, 500);
        }
    } else {
        playSfx('error');
        this.classList.add('shake');
        firstCard.classList.add('shake');
        setTimeout(() => {
            firstCard.classList.remove('unmasked', 'shake');
            secondCard.classList.remove('unmasked', 'shake');
            [firstCard, secondCard, lockBoard] = [null, null, false];
        }, 1000);
    }
}

function win() {
    document.getElementById('restart-level-btn').classList.remove('timer-danger');
    playSfx('victory');
    let best = progress.bests[activeLevel];
    let isNew = (best === undefined || attempts < best);
    if (isNew) progress.bests[activeLevel] = attempts;
    
    let p = levelsConfig[activeLevel].pairs;
    let isHard = document.getElementById('difficulty-label').textContent.includes("DIFICIL");
    
    let tolerance = isHard ? 4 : 1; 
    let stars = attempts <= p + tolerance ? 3 : (attempts <= p + tolerance + 3 ? 2 : 1);
    
    progress.stars[activeLevel] = Math.max(progress.stars[activeLevel] || 0, stars);
    localStorage.setItem('memory_unmasked_v100', JSON.stringify(progress));
    
    document.getElementById('final-attempts').textContent = attempts;
    document.getElementById('new-record-msg').style.display = isNew ? 'block' : 'none';
    document.getElementById('stars-container').innerHTML = '⭐'.repeat(stars);
    document.getElementById('victory-modal').style.display = 'flex';
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
}

// --- FUNÇÕES DO MENU DE CONFIGURAÇÕES ---

function toggleSettings() {
    const modal = document.getElementById('settings-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    updateMuteUI();
}

function toggleMute() {
    isMuted = !isMuted;
    localStorage.setItem('memory_unmasked_muted', JSON.stringify(isMuted));
    updateMuteUI();
}

function updateMuteUI() {
    const statusTxt = document.getElementById('mute-status');
    const icon = document.getElementById('mute-icon');
    if(statusTxt) statusTxt.textContent = isMuted ? "DESLIGADO" : "LIGADO";
    if(icon) icon.textContent = isMuted ? "🔇" : "🔊";
    const muteBtn = document.getElementById('mute-btn');
    if(muteBtn) muteBtn.style.opacity = isMuted ? "0.6" : "1";
}

// --- EVENTOS ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        if(loader) loader.classList.add('loader-hidden');
        renderWorlds();
    }, 2200);
});

document.getElementById('restart-level-btn').onclick = () => { 
    playSfx('click'); 
    startLevel(activeLevel); 
};

document.getElementById('back-btn').onclick = () => { 
    clearInterval(timerInterval); 
    document.getElementById('game-screen').style.display = 'none'; 
    document.getElementById('level-selection-screen').style.display = 'flex'; 
    renderLevels(); 
};

document.getElementById('continue-btn').onclick = () => { 
    document.getElementById('victory-modal').style.display = 'none'; 
    document.getElementById('game-screen').style.display = 'none'; 
    document.getElementById('level-selection-screen').style.display = 'flex'; 
    renderLevels(); 
};

document.getElementById('back-to-worlds').onclick = backToWorlds;
document.getElementById('mute-btn').onclick = toggleMute;
document.getElementById('clear-save-settings').onclick = () => { 
    if(confirm("ATENÇÃO: Isso apagará todas as suas estrelas e recordes. Deseja continuar?")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
};