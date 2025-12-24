const childrenData = [
    "An Khang.jpg", "An Nhiên.jpg", "Anh Tú.jpg", "Bá Khánh.jpg", "Bảo Ngọc.jpg",
    "Bảo Vy.jpg", "Chin Anh.jpg", "Gia Khánh.jpg", "Hoài Phương.jpg", "Hà Vi.jpg",
    "Hải Nam.jpg", "Hải Yến.jpg", "Hồng Hạnh.jpg", "Khánh Hân.jpg", "Mỹ Duyên.jpg",
    "Ngọc Thương.jpg", "Ngọc Trâm.jpg", "Nhật Minh.jpg", "Quốc Trường.jpg", "Thuỳ Chi.jpg",
    "Thành Đạt.jpg", "Trâm Anh.jpg", "Tuệ Lâm.jpg", "Tố Như.jpg", "Văn Đức.jpg",
    "Yến Nhi 2.jpg", "Đình Hoàng.jpg", "Đăng Khoa.jpg", "Đức Minh.jpg", "Đức Toàn.jpg"
];

const IMAGE_FOLDER = "ẢNH CỦA TRẺ B4/";

// State
let available = [...childrenData];
let chosen = [];
let isSpinning = false;
let animationId = null;

// DOM
const ringInner = document.getElementById('ring-inner');
const ringOuter = document.getElementById('ring-outer');
const spinBtn = document.getElementById('spin-btn');
const overlay = document.getElementById('overlay');
const winnerImg = document.getElementById('winner-img');
const winnerName = document.getElementById('winner-name');
const chosenList = document.getElementById('chosen-list');
const countSpan = document.getElementById('count');

// Animation State
let innerRotation = 0;
let outerRotation = 0;
let innerItems = [];
let outerItems = [];

// Constants
const INNER_RADIUS = 250;
const OUTER_RADIUS = 425;
const FOCUS_ANGLE = 90; // Bottom center

function getName(filename) {
    return filename.replace(/\.(jpg|jpeg|png)$/i, '');
}

function renderOrbits() {
    ringInner.innerHTML = '';
    ringOuter.innerHTML = '';
    innerItems = [];
    outerItems = [];

    // Reset visual rotation
    innerRotation = 0;
    outerRotation = 0;
    ringInner.style.transform = `rotate(0deg)`;
    ringOuter.style.transform = `rotate(0deg)`;

    if (available.length === 0) return;

    let innerCount = Math.ceil(available.length / 3);
    if (available.length < 10) innerCount = available.length;

    const innerList = available.slice(0, innerCount);
    const outerList = available.slice(innerCount);

    placeItems(ringInner, innerList, INNER_RADIUS, innerItems);
    placeItems(ringOuter, outerList, OUTER_RADIUS, outerItems);
}

function placeItems(container, items, radius, storeArray) {
    const total = items.length;
    if (total === 0) return;
    const angleStep = 360 / total;

    items.forEach((filename, index) => {
        const theta = angleStep * index;

        const el = document.createElement('div');
        el.className = 'orbit-item';
        el.dataset.theta = theta;
        el.dataset.radius = radius;
        el.dataset.filename = filename; // Track filename

        updateItemTransform(el, theta, radius, 1);

        const img = document.createElement('img');
        img.src = IMAGE_FOLDER + filename;
        el.appendChild(img);

        container.appendChild(el);
        storeArray.push(el);
    });
}

function updateItemTransform(el, theta, radius, scale) {
    // Standard position
    el.style.transform = `rotate(${theta}deg) translate(${radius}px) rotate(-${theta}deg) scale(${scale})`;

    // Highlight styling
    if (scale > 1.3) {
        el.style.zIndex = 100;
        el.style.boxShadow = '0 15px 50px rgba(255, 77, 140, 1)';
        el.style.borderColor = '#FF4D8C';
        el.style.filter = 'brightness(1.1)';
    } else {
        el.style.zIndex = 1;
        el.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        el.style.borderColor = 'white';
        el.style.filter = 'none';
    }
}

// --- SPIN LOGIC ---
let spinState = 'IDLE'; // IDLE, ACCELERATING, CRUISING, LANDING
let spinStartTime = 0;
// Velocity
let vInner = 0; // degrees per frame
let vOuter = 0;
// Target
let targetInner = 0;
let targetOuter = 0;
let pendingWinnerFilename = null;
let landingStartTime = 0;
let startLandingRotationInner = 0;
let startLandingRotationOuter = 0;

function spin() {
    if (isSpinning) return;
    if (available.length === 0) {
        alert("Đã quay hết danh sách!");
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.style.opacity = '0.5';
    spinBtn.textContent = "...";

    // Phase 1: Accelerate
    spinState = 'ACCELERATING';
    vInner = 0;
    vOuter = 0;

    // Pick winner immediately
    const winnerIndex = Math.floor(Math.random() * available.length);
    pendingWinnerFilename = available[winnerIndex];

    spinStartTime = performance.now();
    animationId = requestAnimationFrame(animateLoop);

    // Switch to landing after random time
    const cruiseTime = 2500 + Math.random() * 1000;
    setTimeout(() => {
        calculateLandingPositions();
        spinState = 'LANDING';
        landingStartTime = performance.now();
    }, cruiseTime);
}

function calculateLandingPositions() {
    // 1. Where is the winner?
    let winnerEl = innerItems.find(el => el.dataset.filename === pendingWinnerFilename);
    let isInner = true;

    if (!winnerEl) {
        winnerEl = outerItems.find(el => el.dataset.filename === pendingWinnerFilename);
        isInner = false;
    }

    if (!winnerEl) {
        console.error("Winner not found in DOM");
        return; // Fallback?
    }

    const theta = parseFloat(winnerEl.dataset.theta);

    // 2. Calculate target rotation relative to element
    // We want (theta + RingRot) % 360 = 90
    let targetBase = (FOCUS_ANGLE - theta) % 360;
    if (targetBase < 0) targetBase += 360;

    // 3. Add extra spins
    startLandingRotationInner = innerRotation;
    startLandingRotationOuter = outerRotation;

    const minSpins = 3 * 360;

    if (isInner) {
        let target = innerRotation + minSpins;
        const remainder = target % 360;
        const diff = (targetBase - remainder + 360) % 360;
        targetInner = target + diff;

        let targetOut = outerRotation - minSpins;
        targetOuter = targetOut - (targetOut % 360); // Stop at 0
    } else {
        let desiredMod = (90 - theta) % 360;
        if (desiredMod < 0) desiredMod += 360;

        let current = outerRotation;
        let stopMin = current - minSpins;

        let smMod = stopMin % 360;
        if (smMod < 0) smMod += 360;

        let diff = smMod - desiredMod;
        if (diff < 0) diff += 360;
        targetOuter = stopMin - diff;

        let targetIn = innerRotation + minSpins;
        targetInner = targetIn + (360 - (targetIn % 360));
    }
}

function animateLoop(time) {
    if (!isSpinning) return;

    if (spinState === 'ACCELERATING') {
        if (vInner < 15) vInner += 0.5;
        if (vOuter > -15) vOuter -= 0.5;

        innerRotation += vInner;
        outerRotation += vOuter;

    } else if (spinState === 'LANDING') {
        const duration = 7000; // 7 seconds landing
        const elapsed = time - landingStartTime;
        const progress = Math.min(elapsed / duration, 1);

        // easeOutQuint
        const ease = 1 - Math.pow(1 - progress, 5);

        // Interpolate
        innerRotation = startLandingRotationInner + (targetInner - startLandingRotationInner) * ease;
        outerRotation = startLandingRotationOuter + (targetOuter - startLandingRotationOuter) * ease;

        if (progress >= 1) {
            finishSpin();
            return;
        }
    }

    // Apply
    ringInner.style.transform = `rotate(${innerRotation}deg)`;
    ringOuter.style.transform = `rotate(${outerRotation}deg)`;

    // Scale Effect
    updateItemsScale(innerItems, innerRotation, FOCUS_ANGLE);
    updateItemsScale(outerItems, outerRotation, FOCUS_ANGLE);

    requestAnimationFrame(animateLoop);
}

function updateItemsScale(items, rngRot, focusAngle) {
    items.forEach(el => {
        const itemTheta = parseFloat(el.dataset.theta);
        const radius = parseFloat(el.dataset.radius);

        // Abs Angle
        let absAngle = (itemTheta + rngRot) % 360;
        if (absAngle < 0) absAngle += 360;

        // Dist to Focus
        let diff = Math.abs(absAngle - focusAngle);
        if (diff > 180) diff = 360 - diff;

        let scale = 1;
        if (diff < 30) {
            const factor = 1 - (diff / 30);
            scale = 1 + factor * 0.8; // Max 1.8
        }

        updateItemTransform(el, itemTheta, radius, scale);
    });
}

function finishSpin() {
    isSpinning = false;
    cancelAnimationFrame(animationId);

    showWinnerPopup(pendingWinnerFilename);

    // Update Data
    const idx = available.indexOf(pendingWinnerFilename);
    if (idx > -1) available.splice(idx, 1);

    addHistory(pendingWinnerFilename);
}

function showWinnerPopup(filename) {
    confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
    });

    winnerImg.src = IMAGE_FOLDER + filename;
    winnerName.textContent = getName(filename);
    overlay.classList.add('active');
}

function addHistory(filename) {
    const div = document.createElement('div');
    div.className = 'mini-card';
    div.innerHTML = `
        <img src="${IMAGE_FOLDER + filename}" alt="${getName(filename)}">
        <span>${getName(filename)}</span>
        <div class="delete-btn" title="Xóa và trả về danh sách">✕</div>
    `;

    div.querySelector('.delete-btn').addEventListener('click', () => {
        returnToPool(filename, div);
    });

    chosenList.appendChild(div);
    countSpan.textContent = chosenList.children.length;
}

function returnToPool(filename, element) {
    element.remove();
    countSpan.textContent = chosenList.children.length;
    available.push(filename);
    available.sort();
    renderOrbits(); // Calls renderOrbits correctly!
}

overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    spinBtn.disabled = false;
    spinBtn.textContent = "QUAY";
    spinBtn.style.opacity = '1';
    renderOrbits();
});

spinBtn.addEventListener('click', spin);
window.onload = renderOrbits;
