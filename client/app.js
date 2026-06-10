let gameState = 'playing'; // Initial state
// let gameState = 'gameOver';
// let gameState = 'won';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const COLORS = {
    permitted: '#4ecd74',
    forbidden: '#ff6b6b'
};

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 1. The Core Object
const core = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 30,
    color: '#00ffff', // A bright neon color
    angle: 0, // New property to track rotation
};


class Ring {
    constructor(radius, speed, sectors) {
        this.radius = radius;
        this.speed = speed;
        this.sectors = sectors; // Array of objects: { angle: 0, type: 'permitted' }
        this.rotation = 0;
    }

    update() {
        this.rotation += this.speed;
    }

    draw(ctx, coreX, coreY) {
        this.sectors.forEach(sector => {
            ctx.beginPath();
            // We add this.rotation to the start/end angles to make it spin
            ctx.arc(coreX, coreY, this.radius, 
                    sector.startAngle + this.rotation, 
                    sector.endAngle + this.rotation);
            
            // Pick color based on the type
            ctx.strokeStyle = (sector.type === 'forbidden') ? COLORS.forbidden : COLORS.permitted;
            ctx.lineWidth = 15; // Make the ring thick
            ctx.stroke();
            ctx.closePath();
        });
    }
    checkCollision(ballX, ballY, coreX, coreY) {
        const dx = ballX - coreX;
        const dy = ballY - coreY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Increase the buffer (e.g., to 20 or 25) to catch fast-moving objects
        if (distance <= this.radius + 20 && distance >= this.radius - 20) {
            let ballAngle = Math.atan2(dy, dx) - Math.PI / 2;
            let relativeAngle = (ballAngle - this.rotation) % (Math.PI * 2);
            if (relativeAngle < 0) relativeAngle += Math.PI * 2;

            return this.sectors.find(s => relativeAngle >= s.startAngle && relativeAngle < s.endAngle);
        }
        return null;
    }
}

// Define two rings
const rings = [
    // Ring with 2 sectors
    (() => {
        const slice = (Math.PI * 2) / 2;
        return new Ring(80, 0.01, [
            { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
            { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
        ]);
    })(),
    // Ring with 3 sectors
    (() => {
        const slice = (Math.PI * 2) / 3;
        return new Ring(120, -0.005, [
            { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
            { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
            { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
        ]);
    })(),
    // // Ring with 4 sectors
    // (() => {
    //     const slice = (Math.PI * 2) / 4;
    //     return new Ring(160, -0.01, [
    //         { startAngle: 0 * slice, endAngle: 1 * slice, type: 'permitted' },
    //         { startAngle: 1 * slice, endAngle: 2 * slice, type: 'forbidden' },
    //         { startAngle: 2 * slice, endAngle: 3 * slice, type: 'permitted' },
    //         { startAngle: 3 * slice, endAngle: 4 * slice, type: 'forbidden' },
    //     ]);
    // })(),
    // // Ring with 5 sectors
    // (() => {
    //     const slice = (Math.PI * 2) / 5;
    //     return new Ring(200, 0.015, [
    //         { startAngle: 0 * slice, endAngle: 1 * slice, type: 'forbidden' },
    //         { startAngle: 1 * slice, endAngle: 2 * slice, type: 'permitted' },
    //         { startAngle: 2 * slice, endAngle: 3 * slice, type: 'forbidden' },
    //         { startAngle: 3 * slice, endAngle: 4 * slice, type: 'permitted' },
    //         { startAngle: 4 * slice, endAngle: 5 * slice, type: 'permitted' },
    //     ]);
    // })()
];

class Projectile {
    constructor() {
        this.radius = 8;
        this.y = canvas.height - 50;
        this.x = canvas.width / 2;
        this.speed = 5;
        this.active = false;
    }

    launch() {
        this.active = true;
    }

    update(rings, coreX, coreY) {
        if (this.active) {
            const nextY = this.y - this.speed;

            // Use a flag to stop checking after the first collision
            let collisionDetected = false;

            for (let ring of rings) {
                const hitSector = ring.checkCollision(this.x, nextY, coreX, coreY);
                if (hitSector) {
                    this.handleCollision(hitSector, ring);
                    collisionDetected = true;
                    break; // Stop checking other rings once we hit one
                }
            }

            if (!collisionDetected) {
                this.y -= this.speed;
            }

            if (this.y < 0) {
                this.y = canvas.height - 50;
                this.active = false;
            }
        }
    }

    handleCollision(sector, ring) {
        if (sector.type === 'forbidden') {
            gameState = 'gameOver';
        } else {
            // CORRECTED: Access ring.sectors directly
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
    
    // Check if we are in a terminal state (gameOver or won) and press R
    if ((gameState === 'gameOver' || gameState === 'won') && e.code === 'KeyR') {
        resetGame();
    }
});
// 2. The Draw Function
function animate() {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'playing') {
        // Update rotation
        core.angle += 0.02;

        // Draw Core
        ctx.beginPath();
        ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
        ctx.fillStyle = core.color;
        ctx.fill();
        ctx.closePath();

        rings.forEach(ring => {
            ring.update();
            ring.draw(ctx, core.x, core.y);
        });

        // Draw and Update Projectile
        playerBall.update(rings, core.x, core.y); // Pass the rings and core coords
        playerBall.draw(ctx);
    } else if (gameState === 'gameOver') {
        // --- DISPLAY GAME OVER SCREEN ---
        ctx.fillStyle = 'white';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
    } else if (gameState === 'won') {
        ctx.fillStyle = '#c6ec6c'; // A victory green
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
    }
    requestAnimationFrame(animate);
}

function resetGame() {
    // Re-initialize your rings here or reset their sectors
    // For now, you could simply reload the page or re-assign the 'rings' array
    location.reload(); // The simplest way to reset everything for a beginner
}

function checkWinCondition() {
    // If every ring has an empty sectors array, the player won!
    return rings.every(ring => ring.sectors.length === 0);
}

// Start the loop
animate();