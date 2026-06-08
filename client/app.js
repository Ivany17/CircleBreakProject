const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

const ring = {
    radius: 80, // Distance from the center
    color: '#ff00ff'
};

// 2. The Draw Function
function animate() {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update rotation
    core.angle += 0.02;

    // Draw Core
    ctx.beginPath();
    ctx.arc(core.x, core.y, core.radius, 0, Math.PI * 2);
    ctx.fillStyle = core.color;
    ctx.fill();
    ctx.closePath();

    // Draw Ring (a small dot orbiting the core)
    const dotX = core.x + Math.cos(core.angle) * ring.radius;
    const dotY = core.y + Math.sin(core.angle) * ring.radius;

    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fillStyle = ring.color;
    ctx.fill();
    ctx.closePath();

    requestAnimationFrame(animate);
}

// Start the loop
animate();