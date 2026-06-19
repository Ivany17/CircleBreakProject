let gameState = 'playing';
let score = 0;
let startTime = null;   // Час початку гри (коли кулька запущена)
let elapsedTime = 0;    // Час у секундах
let timerInterval = null; // Інтервал для оновлення таймера

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLORS = {
    permitted: '#4ecd74',
    forbidden: '#ff6b6b'
};

const breakSound = new Audio('break.mp3');       // Звук розбиття сектора
const gameOverSound = new Audio('gameover.mp3'); // Звук програшу
const gameWinSound = new Audio('gamewin.mp3');
gameWinSound.load(); // Примусове завантаження
gameWinSound.volume = 1.0;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const core = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 30,
    color: '#00ffff',
};

class Ring {
    constructor(radius, speed, sectors) {
        this.radius = radius;
        this.speed = speed;
        this.sectors = sectors;
        this.rotation = 0;
    }

    update() {
        this.rotation += this.speed;
    }

    draw(ctx, coreX, coreY) {
        this.sectors.forEach(sector => {
            ctx.beginPath();
            ctx.arc(coreX, coreY, this.radius,
                sector.startAngle + this.rotation,
                sector.endAngle + this.rotation);
            ctx.strokeStyle = (sector.type === 'forbidden') ? COLORS.forbidden : COLORS.permitted;
            ctx.lineWidth = 15;
            ctx.stroke();
            ctx.closePath();
        });
    }

    checkCollision(ballX, ballY, coreX, coreY) {
        const dx = ballX - coreX;
        const dy = ballY - coreY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.radius + 30 && distance >= this.radius - 30) {
            let ballAngle = Math.atan2(dy, dx);
            if (ballAngle < 0) ballAngle += Math.PI * 2;

            let relativeAngle = (ballAngle - this.rotation) % (Math.PI * 2);
            if (relativeAngle < 0) relativeAngle += Math.PI * 2;

            for (let sector of this.sectors) {
                let start = sector.startAngle;
                let end = sector.endAngle;

                if (start < end) {
                    if (relativeAngle >= start && relativeAngle < end) {
                        return sector;
                    }
                } else {
                    if (relativeAngle >= start || relativeAngle < end) {
                        return sector;
                    }
                }
            }
        }
        return null;
    }
}

const rings = [
    (() => {
        const slice = (Math.PI * 2) / 2;
        return new Ring(80, 0.01, [
            { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
            { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
        ]);
    })(),
    (() => {
        const slice = (Math.PI * 2) / 3;
        return new Ring(120, -0.005, [
            { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
            { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
            { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
        ]);
    })(),
    //     (() => {
    //     const slice = (Math.PI * 2) / 4;
    //     return new Ring(160, 0.01, [
    //         { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
    //         { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
    //         { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
    //         { startAngle: 3 * slice, endAngle: 4 * slice, type: 'forbidden' },
    //     ]);
    // })(),
    // (() => {
    //     const slice = (Math.PI * 2) / 5;
    //     return new Ring(200, -0.005, [
    //         { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
    //         { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
    //         { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
    //         { startAngle: 3 * slice, endAngle: 4 * slice, type: 'permitted' },
    //         { startAngle: 4 * slice, endAngle: 5 * slice, type: 'forbidden' },
    //     ]);
    // })(),
    // (() => {
    //     const slice = (Math.PI * 2) / 6;
    //     return new Ring(250, -0.005, [
    //         { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
    //         { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
    //         { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
    //         { startAngle: 3 * slice, endAngle: 4 * slice, type: 'forbidden' },
    //         { startAngle: 4 * slice, endAngle: 5 * slice, type: 'permitted' },
    //         { startAngle: 5 * slice, endAngle: 6 * slice, type: 'forbidden' },
    //     ]);
    // })(),
];

class Projectile {
    constructor() {
        this.radius = 8;
        this.y = canvas.height - 50;
        this.x = canvas.width / 2;
        this.speed = 5;
        this.active = false;
        this.hasPassedRing = false;
    }

    launch() {
        this.active = true;
        this.hasPassedRing = false;
        this.y = canvas.height - 50;

        // ===== ЗАПУСКАЄМО ТАЙМЕР =====
        if (startTime === null) {
            startTime = Date.now();
            // Оновлюємо час кожні 100 мс (для плавності)
            timerInterval = setInterval(() => {
                elapsedTime = (Date.now() - startTime) / 1000; // Секунди
            }, 100);
        }
    }

    update(rings, coreX, coreY, coreRadius) {
        if (!this.active) return;

        const nextY = this.y - this.speed;
        const nextX = this.x;

        // ===== ПЕРЕВІРКА ЗІТКНЕННЯ З ЯДРОМ =====
        const dxToCore = nextX - coreX;
        const dyToCore = nextY - coreY;
        const distToCore = Math.sqrt(dxToCore * dxToCore + dyToCore * dyToCore);

        if (distToCore < coreRadius + this.radius) {
            gameWinSound.play(); // <-- ДОДАЄМО ЗВУК ПЕРЕМОГИ ТУТ
            gameState = 'won';
            this.active = false;
            stopTimer();
            return;
        }

        // ===== ПЕРЕВІРКА КІЛЕЦЬ =====
        for (let ring of rings) {
            const dx = nextX - coreX;
            const dy = nextY - coreY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ring.radius - 20 && this.hasPassedRing) {
                continue;
            }

            if (distance <= ring.radius + 30 && distance >= ring.radius - 30) {
                const hitSector = ring.checkCollision(nextX, nextY, coreX, coreY);
                if (hitSector) {
                    this.handleCollision(hitSector, ring);
                    return;
                }
            }
        }

        this.y = nextY;

        if (this.y < coreY) {
            this.hasPassedRing = true;
        }

        if (this.y < 0) {
            this.y = canvas.height - 50;
            this.active = false;
            this.hasPassedRing = false;
        }
    }

    handleCollision(sector, ring) {
        if (sector.type === 'forbidden') {
            gameOverSound.play();
            gameState = 'gameOver';
            stopTimer();
        } else {
            const index = ring.sectors.indexOf(sector);
            if (index > -1) {
                ring.sectors.splice(index, 1);
                breakSound.play();
                score++;
            }
        }
        this.active = false;
        this.y = canvas.height - 50;
        this.hasPassedRing = false;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#c6ec6c';
        ctx.fill();
        ctx.closePath();
    }
}

const playerBall = new Projectile();

window.addEventListener('keydown', (e) => {
    if (gameState === 'playing' && (e.code === 'Space' || e.code === 'ArrowUp')) {
        playerBall.launch();
    }
    if ((gameState === 'gameOver' || gameState === 'won') && e.code === 'KeyR') {
        resetGame();
    }
});

function animate() {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
        ctx.fillStyle = core.color;
        ctx.fill();
        ctx.closePath();

        rings.forEach(ring => {
            ring.update();
            ring.draw(ctx, core.x, core.y);
        });

        playerBall.update(rings, core.x, core.y, core.radius);
        playerBall.draw(ctx);

        // ===== ВІДОБРАЖЕННЯ ОЧОК =====
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Score: ' + score, 20, 40);

        // ===== ВІДОБРАЖЕННЯ ЧАСУ =====
        const seconds = Math.floor(elapsedTime);
        const timeString = seconds + 's';
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('Time: ' + timeString, canvas.width - 20, 40);

    } else if (gameState === 'gameOver') {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);

        // Показуємо фінальний рахунок
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 100);

    } else if (gameState === 'won') {
        ctx.fillStyle = '#c6ec6c';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);

        // Показуємо фінальний рахунок
        ctx.fillStyle = '#c6ec6c';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 100);
    }

    requestAnimationFrame(animate);
}

function resetGame() {
    location.reload();
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

animate();