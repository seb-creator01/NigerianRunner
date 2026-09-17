import * as THREE from 'three';

// ---------------------------------------------------------------
// 1. RENDERER
// ---------------------------------------------------------------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';
container.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// 2. SCENE + FOG
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 40, 90);

// ---------------------------------------------------------------
// 3. CAMERA
// ---------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 1.5, -5);

// ---------------------------------------------------------------
// 4. LIGHTING
// ---------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);

// ---------------------------------------------------------------
// 5. LANES
// ---------------------------------------------------------------
const LANE_X = [-2, 0, 2];
const STARTING_LANE = 1;

// ---------------------------------------------------------------
// 6. ROAD
// ---------------------------------------------------------------
const ROAD_LENGTH = 200;
const ROAD_WIDTH = 7;

const roadGeometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_LENGTH);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.position.set(0, 0, -ROAD_LENGTH / 2 + 10);
scene.add(road);

const stripeGroup = new THREE.Group();
scene.add(stripeGroup);

const stripeGeometry = new THREE.BoxGeometry(0.08, 0.21, 2);
const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

const STRIPE_SPACING = 4;
const STRIPE_COUNT = 60;

[-1, 1].forEach((xPos) => {
  for (let i = 0; i < STRIPE_COUNT; i++) {
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(xPos, 0.11, 5 - i * STRIPE_SPACING);
    stripeGroup.add(stripe);
  }
});

// ---------------------------------------------------------------
// 7. PLAYER
// ---------------------------------------------------------------
const PLAYER_WIDTH = 1;
const PLAYER_HEIGHT = 2;
const PLAYER_DEPTH = 1;

const playerGeometry = new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(LANE_X[STARTING_LANE], PLAYER_HEIGHT / 2, 0);
scene.add(player);

// ---------------------------------------------------------------
// 8. TUNING CONSTANTS
// ---------------------------------------------------------------
const GROUND_Y = PLAYER_HEIGHT / 2;
const GRAVITY = -20;
const JUMP_VELOCITY = 15;
const SLIDE_DURATION = 0.8;
const SLIDE_HEIGHT_SCALE = 0.3;
const WORLD_SPEED = 12;
const LANE_SLIDE_SPEED = 8;

// ---------------------------------------------------------------
// 9. OBSTACLE CONSTANTS
// ---------------------------------------------------------------
const SPAWN_Z = -80;
const DESPAWN_Z = 15;
const SPAWN_INTERVAL = 1.3;
const LOW_HEIGHT = 0.8;
const HIGH_BOTTOM = 1.2;
const FULL_HEIGHT = 2.5;
const obstacleDepth = 1.2;

// ---------------------------------------------------------------
// 10. GAME STATE (all resettable)
// ---------------------------------------------------------------
let currentLane;
let isJumping;
let velocityY;
let isSliding;
let slideTimer;
let spawnTimer;
let gameOverActive;
let score;
let obstacles; // active obstacles

const obstaclePool = []; // recycled meshes

// ---------------------------------------------------------------
// 11. HUD ELEMENTS
// ---------------------------------------------------------------
const hud = document.createElement('div');
hud.id = 'hud';
hud.textContent = 'Swipe L/R · Up to jump · Down to slide';
document.body.appendChild(hud);

const debug = document.createElement('div');
debug.id = 'debug';
document.body.appendChild(debug);

const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const restartBtn = document.getElementById('restart-btn');

function flashHud(text) {
  hud.textContent = text;
}

// ---------------------------------------------------------------
// 12. BEST SCORE (localStorage)
// ---------------------------------------------------------------
const BEST_KEY = 'nigerianRunner.bestScore';

function getBestScore() {
  const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
  return isNaN(v) ? 0 : v;
}

function setBestScore(v) {
  localStorage.setItem(BEST_KEY, String(v));
}

// ---------------------------------------------------------------
// 13. OBSTACLE FACTORY
// ---------------------------------------------------------------
function makeObstacleMesh(type) {
  let mesh;

  if (type === 'low') {
    const geo = new THREE.BoxGeometry(1.6, LOW_HEIGHT, obstacleDepth);
    const mat = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = LOW_HEIGHT / 2;
  } else if (type === 'high') {
    const geo = new THREE.BoxGeometry(1.6, 1.8, obstacleDepth);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2266cc });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = HIGH_BOTTOM + 0.9;
  } else {
    const geo = new THREE.BoxGeometry(1.6, FULL_HEIGHT, obstacleDepth);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = FULL_HEIGHT / 2;
  }

  mesh.userData.type = type;
  return mesh;
}

function spawnObstacleRow() {
  const lanes = [0, 1, 2];
  const blockedCount = Math.random() < 0.6 ? 1 : 2;

  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }

  const blockedLanes = lanes.slice(0, blockedCount);

  blockedLanes.forEach((lane) => {
    const r = Math.random();
    let type;
    if (r < 0.4) type = 'low';
    else if (r < 0.7) type = 'high';
    else type = 'full';

    const obstacle = makeObstacleMesh(type);
    obstacle.position.x = LANE_X[lane];
    obstacle.position.z = SPAWN_Z;
    obstacle.userData.lane = lane;
    scene.add(obstacle);
    obstacles.push(obstacle);
  });
}

// ---------------------------------------------------------------
// 14. ACTIONS
// ---------------------------------------------------------------
function tryJump() {
  if (gameOverActive) return;
  if (isJumping) return;
  if (isSliding) return;
  isJumping = true;
  velocityY = JUMP_VELOCITY;
  flashHud('Jump 👆');
}

function trySlide() {
  if (gameOverActive) return;
  if (isSliding) return;
  if (isJumping) return;
  isSliding = true;
  slideTimer = SLIDE_DURATION;
  player.scale.y = SLIDE_HEIGHT_SCALE;
  flashHud('Slide 👇');
}

function moveLane(direction) {
  if (gameOverActive) return;
  if (direction === 'left' && currentLane > 0) {
    currentLane -= 1;
    flashHud('Lane ' + (currentLane + 1) + ' 👈');
  } else if (direction === 'right' && currentLane < 2) {
    currentLane += 1;
    flashHud('Lane ' + (currentLane + 1) + ' 👉');
  }
}

// ---------------------------------------------------------------
// 15. SWIPE DETECTION
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 30;
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(clientX, clientY) {
  touchStartX = clientX;
  touchStartY = clientY;
}

function handleTouchEnd(clientX, clientY) {
  const dx = clientX - touchStartX;
  const dy = clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    moveLane(dx > 0 ? 'right' : 'left');
  } else {
    if (dy < 0) tryJump();
    else        trySlide();
  }
}

const touchLayer = document.getElementById('touch-layer');

touchLayer.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  handleTouchStart(t.clientX, t.clientY);
}, { passive: false });

touchLayer.addEventListener('touchend', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  handleTouchEnd(t.clientX, t.clientY);
}, { passive: false });

touchLayer.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, { passive: false });

touchLayer.addEventListener('mousedown', (e) => {
  handleTouchStart(e.clientX, e.clientY);
});
touchLayer.addEventListener('mouseup', (e) => {
  handleTouchEnd(e.clientX, e.clientY);
});

// ---------------------------------------------------------------
// 16. COLLISION DETECTION
// ---------------------------------------------------------------
const PLAYER_HALF_WIDTH = PLAYER_WIDTH / 2;
const PLAYER_HALF_DEPTH = PLAYER_DEPTH / 2;

function checkCollisions() {
  const playerTop = player.position.y + (PLAYER_HEIGHT * player.scale.y) / 2;
  const playerBottom = player.position.y - (PLAYER_HEIGHT * player.scale.y) / 2;

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];

    const dz = Math.abs(o.position.z - player.position.z);
    if (dz > obstacleDepth / 2 + PLAYER_HALF_DEPTH) continue;

    const dx = Math.abs(o.position.x - player.position.x);
    if (dx > 0.9 + PLAYER_HALF_WIDTH) continue;

    let hit = false;

    if (o.userData.type === 'low') {
      const top = o.position.y + LOW_HEIGHT / 2;
      if (playerBottom < top) hit = true;
    } else if (o.userData.type === 'high') {
      const bottom = o.position.y - 0.9;
      if (playerTop > bottom) hit = true;
    } else {
      hit = true;
    }

    if (hit) {
      gameOver();
      return;
    }
  }
}

// ---------------------------------------------------------------
// 17. GAME OVER + RESTART
// ---------------------------------------------------------------
function gameOver() {
  if (gameOverActive) return;
  gameOverActive = true;

  const finalScore = Math.floor(score);
  const bestScore = getBestScore();

  if (finalScore > bestScore) {
    setBestScore(finalScore);
    bestScoreEl.textContent = 'Best: ' + finalScore + ' (NEW!)';
  } else {
    bestScoreEl.textContent = 'Best: ' + bestScore;
  }

  finalScoreEl.textContent = 'Score: ' + finalScore;
  gameOverEl.classList.remove('hidden');
  flashHud('💥 GAME OVER');
}

function resetGame() {
  // Clear obstacles
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;

  // Reset player
  currentLane = STARTING_LANE;
  player.position.set(LANE_X[STARTING_LANE], PLAYER_HEIGHT / 2, 0);
  player.scale.y = 1;

  // Reset state
  isJumping = false;
  velocityY = 0;
  isSliding = false;
  slideTimer = 0;
  spawnTimer = 0;
  score = 0;
  gameOverActive = false;

  // Reset road position (in case it drifted)
  road.position.z = -ROAD_LENGTH / 2 + 10;

  // Reset UI
  scoreEl.textContent = 'Score: 0';
  gameOverEl.classList.add('hidden');
  flashHud('Go! 🏃');

  // Give the player a short grace period before the first spawn
  spawnTimer = -1.2;
}

restartBtn.addEventListener('click', () => {
  resetGame();
});

// ---------------------------------------------------------------
// 18. INITIALIZE STATE
// ---------------------------------------------------------------
obstacles = [];
resetGame();

// ---------------------------------------------------------------
// 19. GAME LOOP
// ---------------------------------------------------------------
const clock = new THREE.Clock();
const SCORE_PER_SECOND = 10;

function animate() {
  requestAnimationFrame(animate);

  // Clamp delta to avoid huge jumps after tab is backgrounded
  const delta = Math.min(clock.getDelta(), 0.1);

  // ---- World scroll ----
  road.position.z += WORLD_SPEED * delta;
  if (road.position.z > ROAD_LENGTH / 2 + 10) {
    road.position.z -= ROAD_LENGTH;
  }

  stripeGroup.children.forEach((stripe) => {
    stripe.position.z += WORLD_SPEED * delta;
    if (stripe.position.z > 6) {
      stripe.position.z -= STRIPE_COUNT * STRIPE_SPACING;
    }
  });

  if (!gameOverActive) {
    // ---- Lane slide ----
    const targetX = LANE_X[currentLane];
    player.position.x += (targetX - player.position.x) * LANE_SLIDE_SPEED * delta;
    if (Math.abs(targetX - player.position.x) < 0.001) {
      player.position.x = targetX;
    }

    // ---- Jump physics ----
    if (isJumping) {
      velocityY += GRAVITY * delta;
      player.position.y += velocityY * delta;
      if (player.position.y <= GROUND_Y) {
        player.position.y = GROUND_Y;
        velocityY = 0;
        isJumping = false;
      }
    }

    // ---- Slide timer ----
    if (isSliding) {
      slideTimer -= delta;
      if (slideTimer <= 0) {
        isSliding = false;
        player.scale.y = 1;
      }
    }

    const halfHeight = (PLAYER_HEIGHT * player.scale.y) / 2;
    if (!isJumping) {
      player.position.y = halfHeight;
    }

    // ---- Score ----
    score += SCORE_PER_SECOND * delta;
    scoreEl.textContent = 'Score: ' + Math.floor(score);

    // ---- Spawning ----
    spawnTimer += delta;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnTimer = 0;
      spawnObstacleRow();
    }

    // ---- Move obstacles ----
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += WORLD_SPEED * delta;

      if (o.position.z > DESPAWN_Z) {
        scene.remove(o);
        obstacles.splice(i, 1);
      }
    }

    // ---- Collisions ----
    checkCollisions();
  }

  // ---- Debug ----
  debug.textContent =
    'lane: ' + currentLane +
    ' | y: ' + player.position.y.toFixed(2) +
    ' | obstacles: ' + obstacles.length +
    ' | ' + (gameOverActive ? 'GAME OVER' : 'running');

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------
// 20. RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
