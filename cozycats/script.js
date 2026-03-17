// --- Audio Feedback ---
class CuteFeedbackGenerator {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }

    playTone(freq, duration, type = 'sine', slideTo = null) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05); // Attack
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration - 0.05); // Decay/Release

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    playPositive() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // A cute ascending "bloop" (high C to high E)
        this.playTone(523.25, 0.15, 'sine', 659.25);
    }

    playNegative() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // A cute descending "womp" (low C to lower A)
        this.playTone(261.63, 0.25, 'triangle', 220.00);
    }

    playLevelComplete() {
        this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        // A celebratory arpeggio (C, E, G, high C)
        const now = this.ctx.currentTime;
        this.playTone(523.25, 0.15, 'sine');
        setTimeout(() => this.playTone(659.25, 0.15, 'sine'), 150);
        setTimeout(() => this.playTone(783.99, 0.15, 'sine'), 300);
        setTimeout(() => this.playTone(1046.50, 0.4, 'sine'), 450);
    }
}

// --- Audio Player ---
class MP3MusicPlayer {
    constructor() {
        this.audio = new Audio('assets/Kitten_s_Cozy_Caper.mp3');
        this.audio.loop = true;
        this.isPlaying = false;
    }

    toggle() {
        if (this.isPlaying) {
            this.audio.pause();
            this.isPlaying = false;
            return false;
        } else {
            this.audio.play().catch(e => console.error("Audio playback failed:", e));
            this.isPlaying = true;
            return true;
        }
    }
}

// --- Game Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const housesContainer = document.getElementById('houses-container');
    const catsContainer = document.getElementById('cats-container');
    const winScreen = document.getElementById('win-screen');
    const nextLevelBtn = document.getElementById('next-level-btn');
    const levelDisplay = document.getElementById('level-display');
    const musicBtn = document.getElementById('music-btn');
    const winTitle = winScreen.querySelector('h2');
    const winMsg = document.getElementById('level-complete-msg');

    let currentLevelIndex = 0;
    let matchedCount = 0;
    let totalCats = 0;
    let activeCat = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const musicPlayer = new MP3MusicPlayer();
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
        { catCount: 1, colors: ['orange'] },
        { catCount: 2, colors: ['orange', 'blue'] },
        { catCount: 3, colors: ['orange', 'blue', 'green'] },
        { catCount: 4, colors: ['orange', 'blue', 'green', 'purple'] },
        { catCount: 5, colors: ['orange', 'blue', 'green', 'purple', 'red'] },
        { catCount: 6, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow'] },
        { catCount: 7, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow', 'pink'] },
        { catCount: 8, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow', 'pink', 'cyan'] },
        { catCount: 9, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow', 'pink', 'cyan', 'lime'] },
        { catCount: 10, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow', 'pink', 'cyan', 'lime', 'brown'] },
        { catCount: 10, colors: ['orange', 'blue', 'green', 'purple', 'red', 'yellow', 'pink', 'cyan', 'lime', 'brown'], randomize: true } 
    ];

    function loadLevel(levelIdx) {
        matchedCount = 0;
        housesContainer.innerHTML = '';
        catsContainer.innerHTML = '';
        winScreen.classList.add('hidden');
        
        const config = LEVELS[Math.min(levelIdx, LEVELS.length - 1)];
        levelDisplay.textContent = `Level: ${levelIdx + 1}`;
        
        let levelColors = [...config.colors];
        if (config.randomize) {
            levelColors.sort(() => Math.random() - 0.5);
        }

        totalCats = config.catCount;

        levelColors.forEach(colorName => {
            const colorDef = AVAILABLE_COLORS.find(c => c.name === colorName);
            const house = document.createElement('div');
            house.className = `house ${colorName}`;
            house.dataset.color = colorName;
            house.style.width = Math.max(18, 90 / totalCats) + '%';
            house.style.filter = colorDef.houseFilter;
            housesContainer.appendChild(house);
        });

        let catArray = [];
        levelColors.forEach(colorName => {
            const colorDef = AVAILABLE_COLORS.find(c => c.name === colorName);
            const cat = document.createElement('div');
            cat.className = 'cat';
            cat.draggable = true;
            cat.dataset.color = colorName;
            cat.style.backgroundImage = `url('${colorDef.img}')`;
            cat.style.filter = colorDef.filter;
            
            cat.addEventListener('mousedown', startDrag);
            cat.addEventListener('touchstart', startDrag, { passive: false });
            
            catArray.push(cat);
        });

        catArray.sort(() => Math.random() - 0.5).forEach(cat => catsContainer.appendChild(cat));
    }

    function startDrag(e) {
        e.preventDefault(); 
        if (e.target.classList.contains('matched')) return;

        activeCat = e.target;
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        
        startX = touch.clientX;
        startY = touch.clientY;

        const rect = activeCat.getBoundingClientRect();
        
        activeCat.style.position = 'fixed';
        activeCat.style.left = rect.left + 'px';
        activeCat.style.top = rect.top + 'px';
        activeCat.style.zIndex = 1000;
        activeCat.style.width = rect.width + 'px'; 
        activeCat.style.height = rect.height + 'px';

        initialLeft = rect.left;
        initialTop = rect.top;

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);
    }

    function drag(e) {
        if (!activeCat) return;
        e.preventDefault();
        
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        activeCat.style.left = (initialLeft + dx) + 'px';
        activeCat.style.top = (initialTop + dy) + 'px';
    }

    function endDrag(e) {
        if (!activeCat) return;

        const catRect = activeCat.getBoundingClientRect();
        const catCenter = {
            x: catRect.left + catRect.width / 2,
            y: catRect.top + catRect.height / 2
        };

        activeCat.style.display = 'none'; 
        let elementBelow = document.elementFromPoint(catCenter.x, catCenter.y);
        activeCat.style.display = 'block';

        const house = elementBelow ? elementBelow.closest('.house') : null;

        if (house && house.dataset.color === activeCat.dataset.color) {
            feedbackPlayer.playPositive();
            handleMatch(activeCat, house);
        } else {
            feedbackPlayer.playNegative();
            resetCat();
        }

        activeCat = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', endDrag);
    }

    function handleMatch(cat, house) {
        matchedCount++;
        
        cat.remove();
        
        const bgImage = cat.style.backgroundImage;
        cat.removeAttribute('style');
        cat.style.backgroundImage = bgImage;
        
        cat.classList.add('matched');
        cat.style.position = 'absolute';
        cat.style.bottom = '15%';
        cat.style.left = '50%';
        cat.style.transform = 'translateX(-50%)';
        cat.style.width = '50%';
        cat.style.height = '50%';
        
        house.style.position = 'relative'; 
        house.appendChild(cat);

        house.style.transform = 'scale(1.2)';
        setTimeout(() => house.style.transform = 'scale(1)', 200);

        if (matchedCount === totalCats) {
            setTimeout(showWin, 500);
        }
    }

    function resetCat() {
        if (!activeCat) return;
        activeCat.style.position = 'relative';
        activeCat.style.left = 'auto';
        activeCat.style.top = 'auto';
        activeCat.style.width = ''; 
        activeCat.style.height = '';
        activeCat.style.zIndex = '';
    }

    function showWin() {
        winScreen.classList.remove('hidden');
        createConfetti();
        feedbackPlayer.playLevelComplete();
        if(currentLevelIndex >= LEVELS.length - 2) {
            winTitle.textContent = "Amazing Champion! 🏆";
            winMsg.textContent = "You can keep playing forever!";
        } else {
            winTitle.textContent = "Good Job! 🎉";
            winMsg.textContent = "Onto the next level!";
        }
    }

    nextLevelBtn.addEventListener('click', () => {
        currentLevelIndex++;
        loadLevel(currentLevelIndex);
    });

    musicBtn.addEventListener('click', () => {
        const isPlaying = musicPlayer.toggle();
        if(isPlaying) {
            musicBtn.textContent = '⏸️ Pause';
            musicBtn.style.background = '#4CAF50';
            musicBtn.style.boxShadow = '0 4px #2E7D32';
        } else {
            musicBtn.textContent = '🎵 Play';
            musicBtn.style.background = '#FF9800';
            musicBtn.style.boxShadow = '0 4px #E65100';
        }
    });

    function createConfetti() {
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = -10 + 'px';
            confetti.style.zIndex = 2000;
            document.body.appendChild(confetti);

            const animationDuration = Math.random() * 3 + 2;
            
            confetti.animate([
                { transform: `translate3d(0,0,0) rotateX(0) rotateY(0)` },
                { transform: `translate3d(${Math.random()*100 - 50}px, 100vh, 0) rotateX(${Math.random()*360}deg) rotateY(${Math.random()*360}deg)` }
            ], {
                duration: animationDuration * 1000,
                easing: 'linear',
                iterations: 1
            }).onfinish = () => confetti.remove();
        }
    }

    loadLevel(0);
});
