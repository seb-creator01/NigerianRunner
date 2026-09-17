import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------------------------------------------------------------
// 1. RENDERER
// ---------------------------------------------------------------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';
container.appendChild(renderer.domElement);

renderer.shadowMap.enabled = false;

// ---------------------------------------------------------------
// 2. SCENE + FOG — warm Nigerian afternoon
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf5c98a);   // ⬅️ warm sandy sky
scene.fog = new THREE.Fog(0xf5c98a, 35, 70);    // ⬅️ matches sky

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
// 4. LIGHTING — warm sun
// ---------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffe8c0, 0.9));       // ⬅️ warm ambient
const sunLight = new THREE.DirectionalLight(0xfff1d0, 1.1); // ⬅️ warm sun
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
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
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
// 6b. ENVIRONMENT — Nigerian urban roadside
// ---------------------------------------------------------------
// Everything here scrolls with the world, wrapping when it passes the camera.
const environmentGroup = new THREE.Group();
scene.add(environmentGroup);

const ENV_LENGTH = 200;   // total length of the environment cycle
const ENV_START_Z = 10;   // where the cycle starts (near camera)
const ENV_END_Z = ENV_START_Z - ENV_LENGTH;

// Sidewalk strips (thin pale concrete bands along both sides)
const sidewalkGeometry = new THREE.BoxGeometry(1.5, 0.15, ROAD_LENGTH);
const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9a8 });
[-1, 1].forEach((side) => {
  const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
  sidewalk.position.set(side * (ROAD_WIDTH / 2 + 0.75), 0.075, -ROAD_LENGTH / 2 + 10);
  scene.add(sidewalk);
});

// ---- Building colors (Nigerian urban palette) ----
const BUILDING_COLORS = [
  0xc17a4a, // terracotta
  0xa8603a, // burnt orange
  0xd9a066, // sandy ochre
  0x8c5a3c, // cocoa brown
  0xe0c088, // sun-bleached yellow
  0x9c6a4c, // muddy brown
];

// A helper that builds a simple blocky "building"
function makeBuilding(width, height, depth, x, z, side) {
  const color =
    BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({ color });
  const building = new THREE.Mesh(geo, mat);
  building.position.set(x, height / 2, z);

  // Add a darker "roof" cap on top
  const roofGeo = new THREE.BoxGeometry(width + 0.15, 0.2, depth + 0.15);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = height / 2 + 0.1;
  building.add(roof);

  // Add a few "windows" — small dark boxes on the front face
  const windowCount = Math.max(1, Math.floor(height / 2));
  for (let i = 0; i < windowCount; i++) {
    const winGeo = new THREE.BoxGeometry(0.35, 0.5, 0.05);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x202840,
      emissive: 0x101520,
    });
    const win = new THREE.Mesh(winGeo, winMat);
    // Face toward the road: if side is -1 (left side), face +x; else face -x
    const faceX = (width / 2 + 0.03) * (side === -1 ? 1 : -1);
    win.position.set(faceX, -height / 2 + 1.2 + i * 1.6, 0);
    win.rotation.y = side === -1 ? 0 : Math.PI;
    building.add(win);
  }

  building.userData.isEnvironment = true;
  return building;
}

// Generate buildings along both sides
const BUILDING_INTERVAL = 8;   // spacing between buildings along Z
const ROAD_EDGE = ROAD_WIDTH / 2 + 2.5; // sidewalk outer edge

for (let side of [-1, 1]) {
  let z = ENV_START_Z - 3;
  while (z > ENV_END_Z) {
    // Randomize size a bit for variety
    const w = 3 + Math.random() * 2.5;
    const h = 3 + Math.random() * 4;
    const d = 4 + Math.random() * 3;
    const x = side * (ROAD_EDGE + d / 2 + Math.random() * 2);

    const building = makeBuilding(w, h, d, x, z, side);
    environmentGroup.add(building);

    // Occasionally add a small kiosk between buildings
    if (Math.random() < 0.4) {
      const kioskW = 1.2 + Math.random() * 0.6;
      const kioskH = 1.2 + Math.random() * 0.6;
      const kioskD = 1.2 + Math.random() * 0.6;
      const kioskX = side * (ROAD_EDGE + kioskD / 2);
      const kiosk = makeBuilding(kioskW, kioskH, kioskD, kioskX, z + 4, side);
      environmentGroup.add(kiosk);
    }

    z -= BUILDING_INTERVAL;
  }
}

// ---- Palm-ish trees (simple cylinders + sphere tufts) ----
function makePalm(x, z) {
  const group = new THREE.Group();

  // Trunk
  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 2.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.25;
  group.add(trunk);

  // Tuft — a few flattened spheres
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a });
  for (let i = 0; i < 5; i++) {
    const tuftGeo = new THREE.SphereGeometry(0.5, 6, 4);
    const tuft = new THREE.Mesh(tuftGeo, tuftMat);
    const angle = (i / 5) * Math.PI * 2;
    tuft.position.set(Math.cos(angle) * 0.3, 2.6, Math.sin(angle) * 0.3);
    tuft.scale.set(1, 0.4, 1);
    group.add(tuft);
  }

  group.position.set(x, 0, z);
  group.userData.isEnvironment = true;
  return group;
}

// Sprinkle some palms along both sides
for (let i = 0; i < 12; i++) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const z = ENV_START_Z - Math.random() * ENV_LENGTH;
  const x = side * (ROAD_EDGE + 1 + Math.random() * 2);
  environmentGroup.add(makePalm(x, z));
}

// ---- Lamp posts along the road edge ----
function makeLampPost(x, z) {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = 1.75;
  group.add(pole);

  const armGeo = new THREE.BoxGeometry(0.6, 0.08, 0.08);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(x > 0 ? -0.3 : 0.3, 3.4, 0);
  group.add(arm);

  const bulbGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c0,
    emissive: 0xffd080,
    emissiveIntensity: 0.6,
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(x > 0 ? -0.6 : 0.6, 3.35, 0);
  group.add(bulb);

  group.position.set(x, 0, z);
  group.userData.isEnvironment = true;
  return group;
}

// Lamp posts at regular intervals
for (let side of [-1, 1]) {
  for (let i = 0; i < 8; i++) {
    const z = ENV_START_Z - i * (ENV_LENGTH / 8);
    const x = side * (ROAD_EDGE - 0.3);
    environmentGroup.add(makeLampPost(x, z));
  }
}

// Store the initial Z of every environment object so we can wrap them
environmentGroup.children.forEach((obj) => {
  obj.userData.initialZ = obj.position.z;
});

// ---------------------------------------------------------------
// 7. PLAYER
// ---------------------------------------------------------------
const PLAYER_WIDTH = 1;
const PLAYER_HEIGHT = 2;
const PLAYER_DEPTH = 1;

const player = new THREE.Group();
player.position.set(LANE_X[STARTING_LANE], 0, 0);
scene.add(player);

const fallbackBox = new THREE.Mesh(
  new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH),
  new THREE.MeshStandardMaterial({ color: 0xff6600 })
);
fallbackBox.position.y = PLAYER_HEIGHT / 2;
player.add(fallbackBox);

const shadowDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.5, 24),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
);
shadowDisc.rotation.x = -Math.PI / 2;
shadowDisc.position.y = 0.12;
scene.add(shadowDisc);

let characterModel = null;
let mixer = null;
const actions = {};
let currentAction = null;

// ---------------------------------------------------------------
// 8. TUNING
// ---------------------------------------------------------------
const GROUND_Y = 0;
const GRAVITY = -32;
const JUMP_VELOCITY = 16;
const SLIDE_DURATION = 0.7;
const SLIDE_HEIGHT_SCALE = 0.5;
const LANE_SLIDE_SPEED = 14;

const START_WORLD_SPEED = 12;
const MAX_WORLD_SPEED = 24;
const SPEED_INCREASE_PER_SECOND = 0.3;

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
// 10. COIN CONSTANTS
// ---------------------------------------------------------------
const COIN_RADIUS = 0.35;
const COIN_VALUE = 10;
const COIN_ROW_SPACING = 1.5;
const COIN_Y_GROUND = 1.0;
const COIN_Y_AIR = 3.0;
const COIN_SPIN_SPEED = 4;

const coinGeometry = new THREE.CylinderGeometry(
  COIN_RADIUS, COIN_RADIUS, 0.12, 16
);
const coinMaterial = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  emissive: 0x664400,
  metalness: 0.7,
  roughness: 0.3,
});

// ---------------------------------------------------------------
// 11. GAME STATE
// ---------------------------------------------------------------
let currentLane;
let isJumping;
let velocityY;
let isSliding;
let slideTimer;
let spawnTimer;
let coinSpawnTimer;
let gameOverActive;
let score;
let obstacles;
let coins;
let coinSpin;

let worldSpeed;
let runTime;
let speedLevel;

let playerVisualY = 0;

// ---------------------------------------------------------------
// 12. HUD ELEMENTS
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
// 13. BEST SCORE
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
// 14. CHARACTER LOADING
// ---------------------------------------------------------------
const CHARACTER_URL = 'Soldier.glb';
const CHARACTER_SCALE = 1.0;
const CHARACTER_ROTATION_Y = 0;

const ANIM_RUN = 'Run';

const loader = new GLTFLoader();

loader.load(
  CHARACTER_URL,
  (gltf) => {
    characterModel = gltf.scene;

    characterModel.scale.set(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);
    characterModel.position.y = 0;
    characterModel.rotation.y = CHARACTER_ROTATION_Y;

    player.add(characterModel);
    fallbackBox.visible = false;

    mixer = new THREE.AnimationMixer(characterModel);

    gltf.animations.forEach((clip) => {
      actions[clip.name] = mixer.clipAction(clip);
    });

    console.log('Loaded animations:', Object.keys(actions));

    if (actions[ANIM_RUN]) {
      currentAction = actions[ANIM_RUN];
      currentAction.play();
    }
  },
  undefined,
  (err) => {
    console.error('Failed to load character:', err);
    flashHud('Character failed — using box');
  }
);

// ---------------------------------------------------------------
// 15. OBSTACLE FACTORY
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
// 16. COIN SPAWNING
// ---------------------------------------------------------------
function makeCoin() {
  const coin = new THREE.Mesh(coinGeometry, coinMaterial);
  coin.rotation.x = Math.PI / 2;
  return coin;
}

function spawnCoinLine(lane, zStart, count, yLevel) {
  for (let i = 0; i < count; i++) {
    const coin = makeCoin();
    coin.position.x = LANE_X[lane];
    coin.position.z = zStart - i * COIN_ROW_SPACING;
    coin.position.y = yLevel;
    coin.userData.baseY = yLevel;
    scene.add(coin);
    coins.push(coin);
  }
}

function spawnCoins() {
  const lanes = [0, 1, 2];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }

  const coinLaneCount = Math.random() < 0.5 ? 1 : 2;
  const chosenLanes = lanes.slice(0, coinLaneCount);

  chosenLanes.forEach((lane) => {
    const count = 3 + Math.floor(Math.random() * 3);
    const heightChoice = Math.random();
    let yLevel;
    if (heightChoice < 0.6) yLevel = COIN_Y_GROUND;
    else                    yLevel = COIN_Y_AIR;

    spawnCoinLine(lane, SPAWN_Z - 5, count, yLevel);
  });
}

// ---------------------------------------------------------------
// 17. ACTIONS
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
// 18. SWIPE DETECTION
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 20;
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
// 19. COLLISION DETECTION
// ---------------------------------------------------------------
const PLAYER_HALF_WIDTH = PLAYER_WIDTH / 2;
const PLAYER_HALF_DEPTH = PLAYER_DEPTH / 2;

function checkObstacleCollisions() {
  const heightScale = isSliding ? SLIDE_HEIGHT_SCALE : 1;
  const playerTop = playerVisualY + (PLAYER_HEIGHT * heightScale) / 2;
  const playerBottom = playerVisualY - (PLAYER_HEIGHT * heightScale) / 2;

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

function checkCoinCollisions() {
  const heightScale = isSliding ? SLIDE_HEIGHT_SCALE : 1;
  const playerCenterY = playerVisualY + (PLAYER_HEIGHT * heightScale) / 2;

  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];

    const dz = Math.abs(c.position.z - player.position.z);
    if (dz > 0.7) continue;

    const dx = Math.abs(c.position.x - player.position.x);
    if (dx > 0.7) continue;

    const dy = Math.abs(c.position.y - playerCenterY);
    const verticalReach = (PLAYER_HEIGHT * heightScale) / 2 + COIN_RADIUS;
    if (dy > verticalReach) continue;

    scene.remove(c);
    coins.splice(i, 1);
    score += COIN_VALUE;
    flashHud('+' + COIN_VALUE + ' 🪙');
  }
}

// ---------------------------------------------------------------
// 20. GAME OVER + RESTART
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
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;

  coins.forEach((c) => scene.remove(c));
  coins.length = 0;

  currentLane = STARTING_LANE;
  player.position.set(LANE_X[STARTING_LANE], 0, 0);
  playerVisualY = 0;
  if (characterModel) {
    characterModel.scale.y = CHARACTER_SCALE;
  }

  isJumping = false;
  velocityY = 0;
  isSliding = false;
  slideTimer = 0;
  spawnTimer = 0;
  coinSpawnTimer = 0;
  score = 0;
  gameOverActive = false;

  worldSpeed = START_WORLD_SPEED;
  runTime = 0;
  speedLevel = 1;

  road.position.z = -ROAD_LENGTH / 2 + 10;

  // Reset environment positions
  environmentGroup.children.forEach((obj) => {
    obj.position.z = obj.userData.initialZ;
  });

  scoreEl.textContent = 'Score: 0';
  gameOverEl.classList.add('hidden');
  flashHud('Go! 🏃');

  spawnTimer = -1.2;
  coinSpawnTimer = -0.6;
}

restartBtn.addEventListener('click', () => {
  resetGame();
});

// ---------------------------------------------------------------
// 21. INITIALIZE
// ---------------------------------------------------------------
obstacles = [];
coins = [];
coinSpin = 0;
resetGame();

// ---------------------------------------------------------------
// 22. GAME LOOP
// ---------------------------------------------------------------
const clock = new THREE.Clock();
const SCORE_PER_SECOND = 10;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (mixer) mixer.update(delta);

  // Road scroll
  road.position.z += worldSpeed * delta;
  if (road.position.z > ROAD_LENGTH / 2 + 10) {
    road.position.z -= ROAD_LENGTH;
  }

  // Stripes
  stripeGroup.children.forEach((stripe) => {
    stripe.position.z += worldSpeed * delta;
    if (stripe.position.z > 6) {
      stripe.position.z -= STRIPE_COUNT * STRIPE_SPACING;
    }
  });

  // Environment scroll (all buildings, palms, lamps)
  environmentGroup.children.forEach((obj) => {
    obj.position.z += worldSpeed * delta;
    if (obj.position.z > ENV_START_Z) {
      obj.position.z -= ENV_LENGTH;
    }
  });

  if (!gameOverActive) {
    runTime += delta;
    worldSpeed = Math.min(
      START_WORLD_SPEED + runTime * SPEED_INCREASE_PER_SECOND,
      MAX_WORLD_SPEED
    );
    speedLevel = 1 + Math.floor(runTime / 5);

    const targetX = LANE_X[currentLane];
    player.position.x += (targetX - player.position.x) * LANE_SLIDE_SPEED * delta;
    if (Math.abs(targetX - player.position.x) < 0.001) {
      player.position.x = targetX;
    }

    if (isJumping) {
      velocityY += GRAVITY * delta;
      playerVisualY += velocityY * delta;
      if (playerVisualY <= GROUND_Y) {
        playerVisualY = GROUND_Y;
        velocityY = 0;
        isJumping = false;
      }
    }

    if (isSliding) {
      slideTimer -= delta;
      if (characterModel) {
        const targetScaleY = CHARACTER_SCALE * SLIDE_HEIGHT_SCALE;
        characterModel.scale.y +=
          (targetScaleY - characterModel.scale.y) * 12 * delta;
      }
      if (slideTimer <= 0) {
        isSliding = false;
      }
    } else {
      if (characterModel) {
        characterModel.scale.y +=
          (CHARACTER_SCALE - characterModel.scale.y) * 12 * delta;
      }
    }

    player.position.y = playerVisualY;

    shadowDisc.position.x = player.position.x;
    shadowDisc.position.z = player.position.z;
    const jumpHeight = playerVisualY - GROUND_Y;
    const fadeFactor = Math.max(0.05, 0.35 - jumpHeight * 0.06);
    shadowDisc.material.opacity = fadeFactor;
    const sizeFactor = Math.max(0.4, 1 - jumpHeight * 0.08);
    shadowDisc.scale.set(sizeFactor, sizeFactor, 1);

    score += SCORE_PER_SECOND * delta;
    scoreEl.textContent = 'Score: ' + Math.floor(score);

    spawnTimer += delta;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnTimer = 0;
      spawnObstacleRow();
    }

    coinSpawnTimer += delta;
    if (coinSpawnTimer >= SPAWN_INTERVAL) {
      coinSpawnTimer = 0;
      spawnCoins();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += worldSpeed * delta;
      if (o.position.z > DESPAWN_Z) {
        scene.remove(o);
        obstacles.splice(i, 1);
      }
    }

    coinSpin += COIN_SPIN_SPEED * delta;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.position.z += worldSpeed * delta;
      c.rotation.y = coinSpin;
      c.position.y = c.userData.baseY + Math.sin(coinSpin * 2 + c.position.z) * 0.08;

      if (c.position.z > DESPAWN_Z) {
        scene.remove(c);
        coins.splice(i, 1);
      }
    }

    checkObstacleCollisions();
    checkCoinCollisions();
  }

  debug.textContent =
    'L' + speedLevel +
    ' | spd: ' + worldSpeed.toFixed(1) +
    ' | ' + (characterModel ? 'model✓' : 'box') +
    ' | ' + (gameOverActive ? 'GAME OVER' : 'running');

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------
// 23. RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
