let gameState = 'playing';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLORS = {
    permitted: '#4ecd74',
    forbidden: '#ff6b6b'
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const core = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 30,
    color: '#00ffff',
    angle: 0,
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
            gameState = 'won';
            this.active = false;
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
            gameState = 'gameOver';
        } else {
            const index = ring.sectors.indexOf(sector);
            if (index > -1) {
                ring.sectors.splice(index, 1);
                console.log("Sector broken!");
                if (checkWinCondition()) {
                    gameState = 'won';
                }
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
        core.angle += 0.02;

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

    } else if (gameState === 'gameOver') {
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);

    } else if (gameState === 'won') {
        ctx.fillStyle = '#c6ec6c';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
    }

    requestAnimationFrame(animate);
}

function resetGame() {
    location.reload();
}

function checkWinCondition() {
    return rings.every(ring => ring.sectors.length === 0);
}

animate();