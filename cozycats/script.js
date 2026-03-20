// --- Web Audio API Cute Music Generator ---
class CatPuzzleAudio {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.tempo = 82;
        this.currentNote = 0;
        this.timerID = null;

        this.melody = [
            [523.25, 1.5], [587.33, 0.5], [659.25, 2],
            [783.99, 1], [880.00, 1], [783.99, 2],
            [659.25, 0.5], [587.33, 0.5], [523.25, 1], [587.33, 2],
            [659.25, 1], [587.33, 1], [523.25, 4],
            [0, 4] // The "Ear Refresh"
        ];
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // --- MASTER EFFECTS CHAIN ---
            // A "Low-Pass" filter to make the 8-bit sound cozy and soft
            this.masterFilter = this.ctx.createBiquadFilter();
            this.masterFilter.type = 'lowpass';
            this.masterFilter.frequency.value = 2200; // Shaves off the "sharp" buzz

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.6; // Overall volume control

            this.masterFilter.connect(this.masterGain);
            this.masterGain.connect(this.ctx.destination);
        }
    }

    createOscillator(freq, startTime, duration) {
        // IMPROVEMENT 1: Guard clause for silence
        if (freq <= 0) return;

        // --- 1. The Soft Lead (Square) ---
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, startTime);
        panner.pan.setValueAtTime(-0.2, startTime); // Slightly left

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.07, startTime + 0.05); // Gentler "fade in"
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterFilter);

        // --- 2. The Purr Layer (Triangle) ---
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        const bassPanner = this.ctx.createStereoPanner();

        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(freq / 2, startTime); // IMPROVEMENT 3: One octave down
        bassPanner.pan.setValueAtTime(0.2, startTime); // Slightly right

        bassGain.gain.setValueAtTime(0, startTime);
        bassGain.gain.linearRampToValueAtTime(0.12, startTime + 0.1); // "Slower" attack for bass
        bassGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        bassOsc.connect(bassGain);
        bassGain.connect(bassPanner);
        bassPanner.connect(this.masterFilter);

        osc.start(startTime);
        osc.stop(startTime + duration);
        bassOsc.start(startTime);
        bassOsc.stop(startTime + duration);
    }

    scheduler() {
        if (!this.isPlaying || !this.ctx) return;
        const scheduleAheadTime = 0.1;
        const secondsPerBeat = 60.0 / this.tempo;

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            const [freq, beats] = this.melody[this.currentNote];
            const duration = beats * secondsPerBeat;
            this.createOscillator(freq, this.nextNoteTime, duration);

            this.nextNoteTime += duration;
            this.currentNote = (this.currentNote + 1) % this.melody.length;
        }
        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    toggle() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        if (this.isPlaying) {
            this.isPlaying = false;
            clearTimeout(this.timerID);
            return false;
        } else {
            this.isPlaying = true;
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
            return true;
        }
    }
}

// --- Audio Feedback (Sfx) ---
class CuteFeedbackGenerator {
    constructor() { this.ctx = null; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }

    playTone(freq, duration, type = 'sine', slideTo = null) {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + duration);
    }

    playPositive() { this.playTone(523.25, 0.15, 'sine', 659.25); }
    playNegative() { this.playTone(261.63, 0.25, 'triangle', 220.00); }
    playLevelComplete() {
        this.playTone(523.25, 0.15, 'sine');
        setTimeout(() => this.playTone(659.25, 0.15, 'sine'), 150);
        setTimeout(() => this.playTone(783.99, 0.15, 'sine'), 300);
        setTimeout(() => this.playTone(1046.50, 0.4, 'sine'), 450);
    }
}

// --- Main Game Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const housesContainer = document.getElementById('houses-container');
    const catsContainer = document.getElementById('cats-container');
    const winScreen = document.getElementById('win-screen');
    const levelSelectScreen = document.getElementById('level-select-screen');
    const levelsGrid = document.getElementById('levels-grid');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const levelSelectBtn = document.getElementById('level-select-btn');
    const closeSelectBtn = document.getElementById('close-select-btn');
    const levelDisplay = document.getElementById('level-display');
    const musicBtn = document.getElementById('music-btn');

    let currentLevelIndex = parseInt(localStorage.getItem('cozycats_level')) || 0;
    let completedLevels = JSON.parse(localStorage.getItem('cozycats_completed')) || [];
    let matchedCount = 0;
    let totalCats = 0;
    let activeCat = null;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const musicPlayer = new CatPuzzleAudio();
    const feedbackPlayer = new CuteFeedbackGenerator();

    const AVAILABLE_COLORS = [
        { name: 'orange', img: 'assets/cat_orange.png', filter: 'none', houseFilter: 'none' },
        { name: 'blue', img: 'assets/cat_blue.png', filter: 'none', houseFilter: 'hue-rotate(180deg) brightness(1.2)' },
        { name: 'green', img: 'assets/cat_green.png', filter: 'none', houseFilter: 'hue-rotate(100deg) brightness(1.1)' },
        { name: 'purple', img: 'assets/cat_purple.png', filter: 'none', houseFilter: 'hue-rotate(280deg)' },
        { name: 'red', img: 'assets/cat_orange.png', filter: 'hue-rotate(330deg) brightness(0.9)', houseFilter: 'hue-rotate(330deg) brightness(0.9)' },
        { name: 'yellow', img: 'assets/cat_orange.png', filter: 'hue-rotate(40deg) brightness(1.2)', houseFilter: 'hue-rotate(40deg) brightness(1.2)' },
        { name: 'pink', img: 'assets/cat_orange.png', filter: 'hue-rotate(300deg) brightness(1.1)', houseFilter: 'hue-rotate(300deg) brightness(1.1)' },
        { name: 'cyan', img: 'assets/cat_orange.png', filter: 'hue-rotate(165deg)', houseFilter: 'hue-rotate(165deg)' },
        { name: 'lime', img: 'assets/cat_orange.png', filter: 'hue-rotate(70deg) brightness(1.2)', houseFilter: 'hue-rotate(70deg) brightness(1.2)' },
        { name: 'brown', img: 'assets/cat_orange.png', filter: 'hue-rotate(30deg) saturate(0.5) brightness(0.8)', houseFilter: 'hue-rotate(30deg) saturate(0.5) brightness(0.8)' }
    ];

    const LEVELS = [
        { houses: ['orange'], cats: ['orange'] },
        { houses: ['orange', 'blue'], cats: ['orange', 'blue'] },
        { houses: ['orange', 'blue', 'green'], cats: ['orange', 'blue', 'green'] },
        { houses: ['orange', 'blue', 'green', 'purple'], cats: ['orange', 'blue', 'green', 'purple'] },
        { houses: ['orange'], cats: ['orange', 'orange'] },
        { houses: ['orange', 'blue'], cats: ['orange', 'orange', 'blue', 'blue'] },
        { houses: ['orange', 'blue', 'green'], cats: ['orange', 'orange', 'blue', 'blue', 'green', 'green'] },
        { houses: ['orange', 'blue', 'green', 'purple'], cats: ['orange', 'orange', 'blue', 'blue', 'green', 'green', 'purple', 'purple'] },
        { houses: ['orange', 'blue', 'green'], cats: ['orange', 'orange', 'orange', 'blue', 'blue', 'blue', 'green', 'green', 'green'] },
        { houses: ['orange', 'blue', 'green', 'purple'], cats: ['orange', 'orange', 'orange', 'blue', 'blue', 'blue', 'green', 'green', 'green', 'purple', 'purple', 'purple'] },
        { houses: ['orange', 'blue', 'green', 'purple', 'red'], cats: ['orange', 'orange', 'blue', 'blue', 'green', 'green', 'purple', 'purple', 'red', 'red'] },
        { houses: ['orange', 'blue', 'green', 'purple', 'red', 'yellow'], cats: ['orange', 'orange', 'blue', 'blue', 'green', 'green', 'purple', 'purple', 'red', 'red', 'yellow', 'yellow', 'orange', 'blue', 'green'], randomize: true }
    ];

    function loadLevel(levelIdx) {
        currentLevelIndex = levelIdx;
        localStorage.setItem('cozycats_level', currentLevelIndex);
        matchedCount = 0;
        housesContainer.innerHTML = '';
        catsContainer.innerHTML = '';
        winScreen.classList.add('hidden');
        levelSelectScreen.classList.add('hidden');

        const config = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];
        levelDisplay.textContent = `Level: ${levelIdx + 1}`;
        
        totalCats = config.cats.length;

        // Create Houses
        config.houses.forEach(colorName => {
            const colorDef = AVAILABLE_COLORS.find(c => c.name === colorName);
            const house = document.createElement('div');
            house.className = `house ${colorName}`;
            house.dataset.color = colorName;
            house.dataset.needed = config.cats.filter(c => c === colorName).length;
            house.dataset.current = 0;
            house.style.filter = colorDef.houseFilter;
            housesContainer.appendChild(house);
        });

        // Create Cats
        let catColors = [...config.cats];
        if (config.randomize) catColors.sort(() => Math.random() - 0.5);

        catColors.forEach(colorName => {
            const colorDef = AVAILABLE_COLORS.find(c => c.name === colorName);
            const cat = document.createElement('div');
            cat.className = 'cat';
            cat.dataset.color = colorName;
            cat.style.backgroundImage = `url('${colorDef.img}')`;
            cat.style.filter = colorDef.filter;
            cat.addEventListener('mousedown', startDrag);
            cat.addEventListener('touchstart', startDrag, { passive: false });
            catsContainer.appendChild(cat);
        });
    }

    function startDrag(e) {
        if (e.target.classList.contains('matched')) return;
        activeCat = e.target;
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        startX = touch.clientX; startY = touch.clientY;
        const rect = activeCat.getBoundingClientRect();
        activeCat.style.position = 'fixed';
        activeCat.style.left = rect.left + 'px'; activeCat.style.top = rect.top + 'px';
        activeCat.style.width = rect.width + 'px'; activeCat.style.height = rect.height + 'px';
        activeCat.style.zIndex = '1000';
        initialLeft = rect.left; initialTop = rect.top;
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        if (!activeCat) return;
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        activeCat.style.left = (initialLeft + (touch.clientX - startX)) + 'px';
        activeCat.style.top = (initialTop + (touch.clientY - startY)) + 'px';
        
        // Haptic feedback feel (pseudo)
        const house = findHouseUnderCat();
        document.querySelectorAll('.house').forEach(h => h.classList.remove('drag-over'));
        if (house) house.classList.add('drag-over');
    }

    function findHouseUnderCat() {
        const rect = activeCat.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        activeCat.style.display = 'none';
        const house = document.elementFromPoint(centerX, centerY)?.closest('.house');
        activeCat.style.display = 'block';
        return house;
    }

    function endDrag() {
        if (!activeCat) return;
        const house = findHouseUnderCat();
        document.querySelectorAll('.house').forEach(h => h.classList.remove('drag-over'));

        if (house && house.dataset.color === activeCat.dataset.color) {
            feedbackPlayer.playPositive();
            handleMatch(activeCat, house);
        } else {
            feedbackPlayer.playNegative();
            resetCat();
        }
        activeCat.style.zIndex = '';
        activeCat = null;
        document.removeEventListener('mousemove', drag); document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', drag); document.removeEventListener('touchend', endDrag);
    }

    function handleMatch(cat, house) {
        matchedCount++;
        cat.classList.add('matched');
        cat.style.position = 'absolute';
        
        // Stack cats slightly if multiple in one house
        let currentInHouse = parseInt(house.dataset.current);
        house.dataset.current = currentInHouse + 1;
        
        cat.style.left = (40 + (currentInHouse * 10)) + '%'; 
        cat.style.bottom = '15%';
        cat.style.transform = `translateX(-50%) rotate(${ (currentInHouse % 2 === 0 ? -5 : 5) }deg)`;
        
        house.appendChild(cat);

        // Visual feedback for house
        if (parseInt(house.dataset.current) === parseInt(house.dataset.needed)) {
            house.classList.add('completed');
        }

        if (matchedCount === totalCats) {
            if (!completedLevels.includes(currentLevelIndex)) {
                completedLevels.push(currentLevelIndex);
                localStorage.setItem('cozycats_completed', JSON.stringify(completedLevels));
            }
            setTimeout(() => {
                winScreen.classList.remove('hidden');
                feedbackPlayer.playLevelComplete();
            }, 500);
        }
    }

    function resetCat() {
        activeCat.style.position = 'relative';
        activeCat.style.left = 'auto'; activeCat.style.top = 'auto';
        activeCat.style.width = ''; activeCat.style.height = '';
    }

    function showLevelSelect() {
        levelsGrid.innerHTML = '';
        for (let i = 0; i < LEVELS.length; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            if (completedLevels.includes(i)) btn.classList.add('completed');
            
            // Unlock if previous is completed or it's level 1
            const isUnlocked = i === 0 || completedLevels.includes(i - 1);
            if (!isUnlocked) {
                btn.classList.add('locked');
                btn.innerHTML = '🔒';
            } else {
                btn.textContent = i + 1;
                btn.onclick = () => loadLevel(i);
            }
            levelsGrid.appendChild(btn);
        }
        levelSelectScreen.classList.remove('hidden');
    }

    nextLevelBtn.addEventListener('click', () => { 
        currentLevelIndex++; 
        loadLevel(currentLevelIndex); 
    });

    levelSelectBtn.addEventListener('click', showLevelSelect);
    closeSelectBtn.addEventListener('click', () => levelSelectScreen.classList.add('hidden'));

    musicBtn.addEventListener('click', () => {
        const isPlaying = musicPlayer.toggle();
        musicBtn.textContent = isPlaying ? '⏸️ Pause' : '🎵 Music';
        musicBtn.style.background = isPlaying ? '#4CAF50' : '#FF9800';
    });

    loadLevel(currentLevelIndex);
});