const childrenData = [
    "An Khang.jpg", "An Nhiên.jpg", "Anh Tú.jpg", "Bá Khánh.jpg", "Bảo Ngọc.jpg",
    "Bảo Vy.jpg", "Chin Anh.jpg", "Gia Khánh.jpg", "Hoài Phương.jpg", "Hà Vi.jpg",
    "Hải Nam.jpg", "Hải Yến.jpg", "Hồng Hạnh.jpg", "Khánh Hân.jpg", "Mỹ Duyên.jpg",
    "Ngọc Thương.jpg", "Ngọc Trâm.jpg", "Nhật Minh.jpg", "Quốc Trường.jpg", "Thuỳ Chi.jpg",
    "Thành Đạt.jpg", "Trâm Anh.jpg", "Tuệ Lâm.jpg", "Tố Như.jpg", "Văn Đức.jpg",
    "Yến Nhi 2.jpg", "Đình Hoàng.jpg", "Đăng Khoa.jpg", "Đức Minh.jpg", "Đức Toàn.jpg"
];

const IMAGE_FOLDER = "/";

// Colors for slices
const COLORS = [
    '#FF4D8C', '#FFD166', '#06D6A0', '#118AB2', '#EF476F',
    '#9D4EDD', '#FF9F1C', '#2EC4B6', '#E71D36'
];

// State
let available = [...childrenData];
let chosen = [];
let isSpinning = false;
let currentRotation = 0; // Cumulative rotation for CSS

// DOM
const canvas = document.getElementById('wheel-canvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-btn');
const wheelContainer = document.getElementById('wheel-container');
const overlay = document.getElementById('overlay');
const winnerImg = document.getElementById('winner-img');
const winnerName = document.getElementById('winner-name');
const chosenList = document.getElementById('chosen-list');
const countSpan = document.getElementById('count');

function getName(filename) {
    return filename.replace(/\.(jpg|jpeg|png)$/i, '');
}

// ---------------------------
// WHEEL LOGIC
// ---------------------------

const loadedImages = {};

function drawWheel() {
    const total = available.length;
    if (total === 0) return;

    const arc = (2 * Math.PI) / total;
    // Canvas is 900x900. Radius max is 450.
    // We want images OUTSIDE the colored wheel.
    const wheelRadius = 315; // Increased colored area

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    available.forEach((filename, i) => {
        const angle = i * arc; // Start angle

        ctx.beginPath();
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, wheelRadius, angle, angle + arc);
        ctx.lineTo(centerX, centerY);
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle + arc / 2);

        // --- DRAW IMAGE (Outside the wheel) ---
        if (!loadedImages[filename]) {
            const img = new Image();
            img.src = IMAGE_FOLDER + filename;
            img.onload = () => {
                loadedImages[filename] = img;
                drawWheel();
            };
            loadedImages[filename] = "loading";
        }

        const imgObj = loadedImages[filename];
        if (imgObj && imgObj !== "loading") {
            const imgSize = 75; // Slightly smaller (was 90)
            const dist = 380; // Further out

            ctx.save();
            ctx.translate(dist, 0);
            ctx.rotate(Math.PI / 2);

            ctx.beginPath();
            ctx.arc(0, 0, imgSize / 2, 0, Math.PI * 2);
            ctx.clip();
            // Border
            ctx.strokeStyle = "white";
            ctx.lineWidth = 3;
            ctx.stroke();

            ctx.drawImage(imgObj, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
            ctx.restore();
        }

        // --- DRAW TEXT (Inside the wheel) ---
        ctx.textAlign = "right"; // Right aligned, near the edge of the colored slice
        ctx.textBaseline = "middle";
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial"; // Larger font
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;

        ctx.fillText(getName(filename), wheelRadius - 15, 0);

        ctx.restore();
    });
}

function spin() {
    if (isSpinning) return;
    if (available.length === 0) {
        alert("Hết danh sách");
        return;
    }

    isSpinning = true;
    spinBtn.disabled = true;
    spinBtn.classList.add('hidden'); // Hide button

    // Calculate rotation
    const minSpins = 60; // Super fast spin (blurry)
    const extraDegrees = Math.random() * 360;
    const totalDegrees = 360 * minSpins + extraDegrees;

    currentRotation += totalDegrees;

    // Force 3D transform to keep GPU active
    wheelContainer.style.transform = `translateZ(0) rotate(${currentRotation}deg)`;

    setTimeout(() => {
        finishSpin();
    }, 10000); // 10s match CSS transition
}

function finishSpin() {
    isSpinning = false;
    spinBtn.disabled = false;

    // Calculate Winner
    const sliceDeg = 360 / available.length;
    const actualRotation = currentRotation % 360;

    // (Angle + Rotation) % 360 = 270
    // Angle = (270 - Rotation) % 360.
    let targetAngle = (270 - actualRotation) % 360;
    if (targetAngle < 0) targetAngle += 360;

    const winnerIndex = Math.floor(targetAngle / sliceDeg);

    const winnerFilename = available[winnerIndex];
    if (!winnerFilename) {
        console.error("Math error", winnerIndex, targetAngle);
        return;
    }

    showWinnerPopup(winnerFilename);

    // Remove winner
    available.splice(winnerIndex, 1);
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

    addHistory(filename);
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
    available.sort(); // Keep sorted?
    drawWheel(); // Redraw immediately
}

overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    // Important: Redraw wheel to remove the gap or shift slices?
    drawWheel();

    // Show button again
    spinBtn.disabled = false;
    spinBtn.classList.remove('hidden');
});

// Init
spinBtn.addEventListener('click', spin);
window.onload = () => {
    drawWheel();
    // Pre-warm the transform so the first click interpolates from a known 3D state
    wheelContainer.style.transform = "translateZ(0) rotate(0deg)";
};
