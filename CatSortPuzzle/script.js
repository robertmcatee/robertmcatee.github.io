document.addEventListener('DOMContentLoaded', () => {
    const cats = document.querySelectorAll('.cat');
    const houses = document.querySelectorAll('.house');
    const winScreen = document.getElementById('win-screen');
    const restartBtn = document.getElementById('restart-btn');

    let matchedCount = 0;
    const totalCats = cats.length;

    // --- Audio Context (Optional placeholders) ---
    // const popSound = new Audio('assets/pop.mp3');

    // --- Interaction Logic ---
    let activeCat = null;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    cats.forEach(cat => {
        // Mouse Events
        cat.addEventListener('mousedown', startDrag);

        // Touch Events
        cat.addEventListener('touchstart', startDrag, { passive: false });
    });

    function startDrag(e) {
        e.preventDefault();
        if (e.target.classList.contains('matched')) return;

        activeCat = e.target;
        const touch = e.type === 'touchstart' ? e.touches[0] : e;

        startX = touch.clientX;
        startY = touch.clientY;

        // Get initial position relative to viewport to handle absolute movement
        const rect = activeCat.getBoundingClientRect();

        // We set the cat to fixed positioning to move it freely
        activeCat.style.position = 'fixed';
        activeCat.style.left = rect.left + 'px';
        activeCat.style.top = rect.top + 'px';
        activeCat.style.zIndex = 1000;
        activeCat.style.width = rect.width + 'px'; // Maintain size
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

        // Check if dropped near correct house
        const catRect = activeCat.getBoundingClientRect();
        const catCenter = {
            x: catRect.left + catRect.width / 2,
            y: catRect.top + catRect.height / 2
        };

        activeCat.style.display = 'none'; // Temporarily hide to find element below
        let elementBelow = document.elementFromPoint(catCenter.x, catCenter.y);
        activeCat.style.display = 'block';

        const house = elementBelow ? elementBelow.closest('.house') : null;

        if (house && house.dataset.color === activeCat.dataset.color) {
            // MATCH!
            handleMatch(activeCat, house);
        } else {
            // NO MATCH - Return to start via animation
            resetCat();
        }

        // Cleanup
        activeCat = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', endDrag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', endDrag);
    }

    function handleMatch(cat, house) {
        matchedCount++;

        // Remove from main container to avoid layout shifts in original container
        cat.remove();

        // Reset styles but KEEP background image
        const bgImage = cat.style.backgroundImage;
        cat.removeAttribute('style');
        cat.style.backgroundImage = bgImage;

        // Style for inside the house
        cat.classList.add('matched');
        cat.style.position = 'absolute';
        cat.style.bottom = '15%';
        cat.style.left = '50%';
        cat.style.transform = 'translateX(-50%)';
        cat.style.width = '40%';
        cat.style.height = '40%';

        house.appendChild(cat);

        // Animation
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
        activeCat.style.width = '80px';
        activeCat.style.height = '80px';
        activeCat.style.zIndex = '';
    }

    function showWin() {
        winScreen.classList.remove('hidden');
        createConfetti();
    }

    restartBtn.addEventListener('click', () => {
        location.reload();
    });

    // Simple Confetti
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
                { transform: `translate3d(${Math.random() * 100 - 50}px, 100vh, 0) rotateX(${Math.random() * 360}deg) rotateY(${Math.random() * 360}deg)` }
            ], {
                duration: animationDuration * 1000,
                easing: 'linear',
                iterations: 1
            }).onfinish = () => confetti.remove();
        }
    }
});
