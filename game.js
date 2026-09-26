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
const touchButtons = document.querySelectorAll('.touch-button');
const pauseButton = document.querySelector('.pause-button');

const keys = new Set();
const state = { running: false, paused: false, crashing: false, crashTime: 0, score: 0, best: Number(localStorage.getItem('lane-drop-best') || 0), distance: 0, spawn: 0 };
const player = { x: 0, y: 0, width: 30, height: 52, steer: 0 };
const pointer = { x: 0, active: false };
const traffic = [];
const stars = [];
const debris = [];
let width = 0; let height = 0; let roadLeft = 0; let laneWidth = 0; let animationId;

bestEl.textContent = formatScore(state.best);
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function setKeyState(key, active) {
  if (active) keys.add(key);
  else keys.delete(key);
}
function bindTouchButton(button, key) {
  const activate = (event) => {
    event.preventDefault();
    setKeyState(key, true);
    button.classList.add('active');
  };
  const deactivate = (event) => {
    event.preventDefault();
    setKeyState(key, false);
    button.classList.remove('active');
  };
  button.addEventListener('pointerdown', activate);
  button.addEventListener('pointerup', deactivate);
  button.addEventListener('pointerleave', deactivate);
  button.addEventListener('pointercancel', deactivate);
}
for (const button of touchButtons) {
  if (button.dataset.key) bindTouchButton(button, button.dataset.key);
  else if (button.dataset.action === 'pause') {
    button.addEventListener('click', () => {
      if (state.running) {
        state.paused = !state.paused;
        button.textContent = state.paused ? '▶' : '⏸';
      }
    });
  }
}
window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  if (event.key === ' ') { if (state.running) state.paused = !state.paused; if (pauseButton) pauseButton.textContent = state.paused ? '▶' : '⏸'; return; }
  const key = event.key.toLowerCase();
  if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) pointer.active = false;
  keys.add(key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener('click', startGame);
function hasKeyboardSteering() {
  return keys.has('a') || keys.has('d') || keys.has('arrowleft') || keys.has('arrowright');
}
function updatePointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  pointer.active = true;
  pointer.x = clamp(x, roadLeft + player.width / 2 + 8, roadLeft + laneWidth * 3 - player.width / 2 - 8);
}
canvas.addEventListener('pointerenter', (event) => {
  if (hasKeyboardSteering()) return;
  pointer.active = true;
  updatePointerFromEvent(event);
});
canvas.addEventListener('pointermove', (event) => {
  if (hasKeyboardSteering()) return;
  if (state.running || pointer.active) updatePointerFromEvent(event);
});
canvas.addEventListener('pointerdown', (event) => {
  if (!state.running) {
    startGame();
    updatePointerFromEvent(event);
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const left = x < rect.width * 0.45;
  const right = x > rect.width * 0.55;
  const accelerate = y < rect.height * 0.55;
  setKeyState('a', left);
  setKeyState('d', right);
  if (accelerate) setKeyState('w', true);
  updatePointerFromEvent(event);
});
canvas.addEventListener('pointerup', () => {
  keys.delete('a'); keys.delete('d'); keys.delete('w');
  pointer.active = false;
});
canvas.addEventListener('pointerleave', () => {
  keys.delete('a'); keys.delete('d'); keys.delete('w');
  pointer.active = false;
});
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
  state.running = true; state.paused = false; state.crashing = false; state.crashTime = 0; state.score = 0; state.distance = 0; state.spawn = 0;
  traffic.length = 0; stars.length = 0; debris.length = 0; player.x = roadLeft + laneWidth * 1.5;
  overlay.classList.add('hidden'); lastTime = performance.now(); cancelAnimationFrame(animationId); animationId = requestAnimationFrame(loop);
}
function endGame() {
  state.running = false; state.crashing = false; state.best = Math.max(state.best, state.score); localStorage.setItem('lane-drop-best', state.best);
  overlayKicker.textContent = 'CRASHED'; overlayTitle.textContent = `Score ${formatScore(state.score)}`; overlayCopy.textContent = 'The lane got the best of you. Ready for another run?'; startButton.textContent = 'Try again'; overlay.classList.remove('hidden');
}
function beginCrash(explosive = false) {
  if (state.crashing) return;
  state.crashing = true; state.crashTime = 0; state.explosiveCrash = explosive;
  debris.length = 0;
  const debrisCount = explosive ? 34 : 18;
  for (let i = 0; i < debrisCount; i++) debris.push({ x: player.x, y: player.y, vx: (Math.random() - .5) * (explosive ? 360 : 220), vy: (Math.random() - .5) * (explosive ? 360 : 220), size: 2 + Math.random() * (explosive ? 8 : 5), color: explosive ? ['#ff9067', '#f1c84b', '#f5f7f2'][Math.floor(Math.random() * 3)] : (Math.random() > .5 ? '#ff9067' : '#d8fa6d') });
}
function spawnItem() {
  const lane = Math.floor(Math.random() * 3);
  const rogue = Math.random() < 0.1;
  const roll = Math.random();
  const type = roll < 0.12 ? 'bus' : roll < 0.25 ? 'truck' : roll < 0.33 ? 'tanker' : 'car';
  const dimensions = { bus: [38, 88], truck: [38, 72], tanker: [38, 88], car: [30, 52] }[type];
  const item = {
    x: roadLeft + laneWidth * (lane + .5),
    y: -65,
    width: dimensions[0],
    height: dimensions[1],
    color: type === 'bus' ? ['#e7b84f', '#e87552'][Math.floor(Math.random() * 2)] : type === 'truck' ? ['#b9c8c4', '#7194a3'][Math.floor(Math.random() * 2)] : type === 'tanker' ? '#d7d8ce' : ['#ff9067', '#7eb8ff', '#d8fa6d'][Math.floor(Math.random() * 3)],
    type,
    rogue,
    lane,
    weave: rogue && Math.random() > .25,
    phase: Math.random() * Math.PI * 2,
    sway: 0
  };
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
  if (state.crashing) {
    state.crashTime += dt;
    for (const bit of debris) { bit.x += bit.vx * dt; bit.y += bit.vy * dt; bit.vy += 180 * dt; }
    if (state.crashTime > 1.35) endGame();
    return;
  }
  const keyboardSteering = hasKeyboardSteering();
  const accelerating = keys.has('w') || keys.has('arrowup');
  const baseSpeed = 245 + Math.min(state.distance * 2.2, 220);
  const speed = baseSpeed * (accelerating ? 1.18 : .82);
  if (keyboardSteering) {
    pointer.active = false;
    const direction = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
    player.x += direction * 255 * dt;
    player.x = Math.max(roadLeft + player.width / 2 + 8, Math.min(roadLeft + laneWidth * 3 - player.width / 2 - 8, player.x));
  } else if (pointer.active) {
    const pointerTarget = clamp(pointer.x, roadLeft + player.width / 2 + 8, roadLeft + laneWidth * 3 - player.width / 2 - 8);
    player.x += (pointerTarget - player.x) * Math.min(1, dt * 12);
  }
  state.distance += speed * dt / 100;
  state.score += speed * dt / 10; scoreEl.textContent = formatScore(state.score); speedEl.textContent = `${(speed / 245).toFixed(1)}x`;
  state.spawn -= dt; if (state.spawn <= 0) { spawnItem(); state.spawn = Math.max(.5, .95 - state.distance / 180); }
  for (const item of traffic) {
    item.y += speed * dt * (item.type === 'bus' ? .92 : item.type === 'tanker' ? .86 : item.type === 'truck' ? .9 : 1);
    if (item.rogue && item.weave) {
      item.phase += dt * (2.3 + state.distance / 130);
      item.sway = Math.sin(item.phase) * laneWidth * .34;
      item.x = roadLeft + laneWidth * (item.lane + .5) + item.sway;
    }
  }
  for (const star of stars) { star.y += speed * dt; star.spin += dt * 5; }
  for (let i = traffic.length - 1; i >= 0; i--) {
    if (traffic[i].y > height + 80) traffic.splice(i, 1);
    else if (collides(player, traffic[i])) beginCrash(traffic[i].type === 'tanker');
  }
  for (let i = stars.length - 1; i >= 0; i--) {
    if (stars[i].y > height + 30) stars.splice(i, 1);
    else if (Math.abs(stars[i].x - player.x) < 24 && Math.abs(stars[i].y - player.y) < 35) { state.score += 120; stars.splice(i, 1); }
  }
}
function collides(a, b) { return Math.abs(a.x - b.x) < (a.width + b.width) / 2 - 4 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 - 5; }
function draw() {
  const shake = state.crashing ? Math.max(0, 1 - state.crashTime / 1.35) * 9 : 0;
  ctx.save(); ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
  ctx.clearRect(-10, -10, width + 20, height + 20); ctx.fillStyle = '#173428'; ctx.fillRect(-10, -10, width + 20, height + 20);
  ctx.fillStyle = '#202b2b'; ctx.fillRect(roadLeft, 0, laneWidth * 3, height);
  ctx.fillStyle = '#e3d9aa'; ctx.fillRect(roadLeft - 4, 0, 4, height); ctx.fillRect(roadLeft + laneWidth * 3, 0, 4, height);
  ctx.strokeStyle = '#71817a'; ctx.lineWidth = 2; ctx.setLineDash([30, 28]); ctx.lineDashOffset = -(state.distance * 20) % 58;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(roadLeft + laneWidth * i, 0); ctx.lineTo(roadLeft + laneWidth * i, height); ctx.stroke(); } ctx.setLineDash([]);
  stars.forEach(drawStar); traffic.forEach(drawCar); drawCar({ ...player, x: player.x, y: player.y, color: '#f5f0dc', player: true });
  if (state.crashing) {
    const impact = Math.min(state.crashTime / .18, 1);
    ctx.fillStyle = `rgba(255, 245, 205, ${Math.max(0, .9 - state.crashTime * .65)})`; ctx.fillRect(-10, -10, width + 20, height + 20);
    debris.forEach((bit) => { ctx.fillStyle = bit.color; ctx.fillRect(bit.x - bit.size / 2, bit.y - bit.size / 2, bit.size, bit.size); });
    ctx.fillStyle = state.explosiveCrash ? '#f1c84b' : '#ff9067'; ctx.font = '700 18px Space Grotesk'; ctx.textAlign = 'center'; ctx.globalAlpha = impact; ctx.fillText(state.explosiveCrash ? 'TANKER BLAST!' : 'IMPACT!', roadLeft + laneWidth * 1.5, height * .28); ctx.globalAlpha = 1;
    if (state.explosiveCrash) {
      const radius = 22 + Math.min(state.crashTime / .4, 1) * 35;
      ctx.fillStyle = `rgba(241, 200, 75, ${Math.max(0, .75 - state.crashTime * .5)})`; ctx.beginPath(); ctx.arc(player.x, player.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(197, 63, 53, ${Math.max(0, .65 - state.crashTime * .45)})`; ctx.beginPath(); ctx.arc(player.x, player.y, radius * .62, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (state.paused && state.running) { ctx.fillStyle = '#09110f99'; ctx.fillRect(roadLeft, 0, laneWidth * 3, height); ctx.fillStyle = '#d8fa6d'; ctx.font = '500 14px DM Mono'; ctx.textAlign = 'center'; ctx.fillText('PAUSED', roadLeft + laneWidth * 1.5, height / 2); }
  ctx.restore();
}
function drawCar(car) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.fillStyle = '#101818'; ctx.fillRect(-car.width / 2 - 3, -car.height / 2 + 5, 6, 13); ctx.fillRect(car.width / 2 - 3, -car.height / 2 + 5, 6, 13); ctx.fillRect(-car.width / 2 - 3, car.height / 2 - 18, 6, 13); ctx.fillRect(car.width / 2 - 3, car.height / 2 - 18, 6, 13);
  ctx.fillStyle = car.color; roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 7); ctx.fill(); ctx.fillStyle = car.player ? '#b8c9c0' : '#263d3a'; roundRect(-10, -13, 20, 20, 4); ctx.fill(); ctx.fillStyle = car.player ? '#ff9067' : '#d8fa6d'; ctx.fillRect(-9, car.height / 2 - 8, 6, 3); ctx.fillRect(3, car.height / 2 - 8, 6, 3);
  if (car.type === 'bus') {
    ctx.fillStyle = '#263d3a'; roundRect(-car.width / 2 + 4, -car.height / 2 + 7, car.width - 8, 46, 4); ctx.fill();
    ctx.fillStyle = '#b9d8d3'; for (let i = 0; i < 4; i++) { ctx.fillRect(-car.width / 2 + 7, -car.height / 2 + 12 + i * 9, 8, 6); ctx.fillRect(car.width / 2 - 15, -car.height / 2 + 12 + i * 9, 8, 6); }
    ctx.fillStyle = '#f5f7f2'; ctx.fillRect(-car.width / 2 + 5, car.height / 2 - 25, car.width - 10, 4);
    ctx.font = '700 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('CITY BUS', 0, car.height / 2 - 11);
  } else if (car.type === 'truck') {
    ctx.fillStyle = '#e6ece7'; roundRect(-car.width / 2 + 3, -car.height / 2 + 6, car.width - 6, 39, 3); ctx.fill();
    ctx.fillStyle = '#526762'; roundRect(-car.width / 2 + 5, -car.height / 2 + 9, car.width - 10, 17, 3); ctx.fill();
    ctx.fillStyle = '#b7d4d5'; ctx.fillRect(-car.width / 2 + 8, -car.height / 2 + 12, car.width - 16, 7);
    ctx.fillStyle = '#ff9067'; ctx.fillRect(-car.width / 2 + 3, car.height / 2 - 24, car.width - 6, 5);
    ctx.fillStyle = '#344844'; ctx.font = '700 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('CARGO', 0, 5);
  } else if (car.type === 'tanker') {
    ctx.fillStyle = '#a9b5af'; roundRect(-15, -car.height / 2 + 10, 30, car.height - 22, 14); ctx.fill();
    ctx.fillStyle = '#dfe5dc'; roundRect(-11, -car.height / 2 + 14, 22, car.height - 30, 10); ctx.fill();
    ctx.fillStyle = '#f1c84b'; ctx.fillRect(-11, -4, 22, 9);
    ctx.fillStyle = '#c53f35'; ctx.font = '700 8px Arial'; ctx.textAlign = 'center'; ctx.fillText('FUEL', 0, 2);
    ctx.fillStyle = '#263d3a'; ctx.fillRect(-4, -car.height / 2 + 5, 8, 5);
  }
  if (car.rogue) {
    ctx.save(); ctx.translate(0, 1);
    ctx.fillStyle = '#101818'; ctx.beginPath(); ctx.arc(0, 0, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff9067'; ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(1, -1); ctx.lineTo(1, -5); ctx.lineTo(7, 2); ctx.lineTo(1, 9); ctx.lineTo(1, 5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#f5f7f2'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f5f7f2'; ctx.font = '700 3px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('SWERVE', 0, -10);
    ctx.restore();
  }
  ctx.restore();
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function drawStar(star) { ctx.save(); ctx.translate(star.x, star.y); ctx.rotate(star.spin); ctx.fillStyle = '#d8fa6d'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const radius = i % 2 ? 3 : star.r; const angle = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); } ctx.closePath(); ctx.fill(); ctx.restore(); }
resize(); draw();
