const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayKicker = document.getElementById('overlay-kicker');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const startButton = document.getElementById('start-button');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const speedEl = document.getElementById('speed');

const keys = new Set();
const state = { running: false, paused: false, score: 0, best: Number(localStorage.getItem('lane-drop-best') || 0), distance: 0, spawn: 0 };
const player = { x: 0, y: 0, width: 30, height: 52, steer: 0 };
const traffic = [];
const stars = [];
let width = 0; let height = 0; let roadLeft = 0; let laneWidth = 0; let animationId;

bestEl.textContent = formatScore(state.best);
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.key === ' ') { if (state.running) state.paused = !state.paused; return; }
  keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener('click', startGame);
window.addEventListener('resize', resize);

function formatScore(value) { return String(Math.floor(value)).padStart(5, '0'); }
function resize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio; canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  width = rect.width; height = rect.height;
  roadLeft = width * .18; laneWidth = width * .16;
  player.y = height * .78;
  if (!state.running) player.x = roadLeft + laneWidth * 1.5;
}
function startGame() {
  state.running = true; state.paused = false; state.score = 0; state.distance = 0; state.spawn = 0;
  traffic.length = 0; stars.length = 0; player.x = roadLeft + laneWidth * 1.5;
  overlay.classList.add('hidden'); lastTime = performance.now(); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(loop);
}
function endGame() {
  state.running = false; state.best = Math.max(state.best, state.score); localStorage.setItem('lane-drop-best', state.best);
  overlayKicker.textContent = 'CRASHED'; overlayTitle.textContent = `Score ${formatScore(state.score)}`; overlayCopy.textContent = 'The lane got the best of you. Ready for another run?'; startButton.textContent = 'Try again'; overlay.classList.remove('hidden');
}
function spawnItem() {
  const lane = Math.floor(Math.random() * 3);
  const item = { x: roadLeft + laneWidth * (lane + .5), y: -65, width: 30, height: 52, color: ['#ff9067', '#7eb8ff', '#d8fa6d'][Math.floor(Math.random() * 3)] };
  traffic.push(item);
  if (Math.random() > .35) stars.push({ x: roadLeft + laneWidth * (Math.floor(Math.random() * 3) + .5), y: -180, r: 7, spin: 0 });
}
function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, .04); lastTime = time;
  if (!state.paused) update(dt);
  draw();
  if (state.running) animationId = requestAnimationFrame(loop);
}
let lastTime = 0;
function update(dt) {
  const accelerating = keys.has('w') || keys.has('arrowup');
  const baseSpeed = 245 + Math.min(state.distance * 2.2, 220);
  const speed = baseSpeed * (accelerating ? 1.18 : .82);
  const direction = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
  player.x += direction * 255 * dt;
  player.x = Math.max(roadLeft + player.width / 2 + 8, Math.min(roadLeft + laneWidth * 3 - player.width / 2 - 8, player.x));
  state.distance += speed * dt / 100;
  state.score += speed * dt / 10; scoreEl.textContent = formatScore(state.score); speedEl.textContent = `${(speed / 245).toFixed(1)}x`;
  state.spawn -= dt; if (state.spawn <= 0) { spawnItem(); state.spawn = Math.max(.5, .95 - state.distance / 180); }
  for (const item of traffic) item.y += speed * dt;
  for (const star of stars) { star.y += speed * dt; star.spin += dt * 5; }
  for (let i = traffic.length - 1; i >= 0; i--) {
    if (traffic[i].y > height + 80) traffic.splice(i, 1);
    else if (collides(player, traffic[i])) endGame();
  }
  for (let i = stars.length - 1; i >= 0; i--) {
    if (stars[i].y > height + 30) stars.splice(i, 1);
    else if (Math.abs(stars[i].x - player.x) < 24 && Math.abs(stars[i].y - player.y) < 35) { state.score += 120; stars.splice(i, 1); }
  }
}
function collides(a, b) { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 4 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 5; }
function draw() {
  ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#173428'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#202b2b'; ctx.fillRect(roadLeft, 0, laneWidth * 3, height);
  ctx.fillStyle = '#e3d9aa'; ctx.fillRect(roadLeft - 4, 0, 4, height); ctx.fillRect(roadLeft + laneWidth * 3, 0, 4, height);
  ctx.strokeStyle = '#71817a'; ctx.lineWidth = 2; ctx.setLineDash([30, 28]); ctx.lineDashOffset = -(state.distance * 20) % 58;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(roadLeft + laneWidth * i, 0); ctx.lineTo(roadLeft + laneWidth * i, height); ctx.stroke(); } ctx.setLineDash([]);
  stars.forEach(drawStar); traffic.forEach(drawCar); drawCar({ ...player, x: player.x, y: player.y, color: '#f5f0dc', player: true });
  if (state.paused && state.running) { ctx.fillStyle = '#09110f99'; ctx.fillRect(roadLeft, 0, laneWidth * 3, height); ctx.fillStyle = '#d8fa6d'; ctx.font = '500 14px DM Mono'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', roadLeft + laneWidth * 1.5, height / 2); }
}
function drawCar(car) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.fillStyle = '#101818'; ctx.fillRect(-car.width / 2 - 3, -car.height / 2 + 5, 6, 13); ctx.fillRect(car.width / 2 - 3, -car.height / 2 + 5, 6, 13); ctx.fillRect(-car.width / 2 - 3, car.height / 2 - 18, 6, 13); ctx.fillRect(car.width / 2 - 3, car.height / 2 - 18, 6, 13);
  ctx.fillStyle = car.color; roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 7); ctx.fill(); ctx.fillStyle = car.player ? '#b8c9c0' : '#263d3a'; roundRect(-10, -13, 20, 20, 4); ctx.fill(); ctx.fillStyle = car.player ? '#ff9067' : '#d8fa6d'; ctx.fillRect(-9, car.height / 2 - 8, 6, 3); ctx.fillRect(3, car.height / 2 - 8, 6, 3); ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function drawStar(star) { ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(star.spin); ctx.fillStyle = '#d8fa6d'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const radius = i % 2 ? 3 : star.r; const angle = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } ctx.closePath(); ctx.fill(); ctx.restore(); }
resize(); draw();
