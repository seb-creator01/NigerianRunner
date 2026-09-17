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

// Lane state
let currentLane = STARTING_LANE;

// Jump state  (higher jump, gentler gravity = more airtime)
const GROUND_Y = PLAYER_HEIGHT / 2;
const GRAVITY = -20;
const JUMP_VELOCITY = 15;
let isJumping = false;
let velocityY = 0;

// Slide state  (much flatter + slightly longer)
const SLIDE_DURATION = 0.8;
const SLIDE_HEIGHT_SCALE = 0.3;
let isSliding = false;
let slideTimer = 0;

// ---------------------------------------------------------------
// 8. SPEEDS
// ---------------------------------------------------------------
const WORLD_SPEED = 12;
const LANE_SLIDE_SPEED = 8;

// ---------------------------------------------------------------
// 9. HUD + DEBUG
// ---------------------------------------------------------------
const hud = document.createElement('div');
hud.id = 'hud';
hud.textContent = 'Swipe L/R to move · Up to jump · Down to slide';
document.body.appendChild(hud);

const debug = document.createElement('div');
debug.id = 'debug';
document.body.appendChild(debug);

function flashHud(text) {
  hud.textContent = text;
}

// ---------------------------------------------------------------
// 10. ACTIONS
// ---------------------------------------------------------------
function tryJump() {
  if (isJumping) return;
  if (isSliding) return;
  isJumping = true;
  velocityY = JUMP_VELOCITY;
  flashHud('Jump 👆');
}

function trySlide() {
  if (isSliding) return;
  if (isJumping) return;
  isSliding = true;
  slideTimer = SLIDE_DURATION;
  player.scale.y = SLIDE_HEIGHT_SCALE;
  flashHud('Slide 👇');
}

function moveLane(direction) {
  if (direction === 'left' && currentLane > 0) {
    currentLane -= 1;
    flashHud('Lane ' + (currentLane + 1) + ' 👈');
  } else if (direction === 'right' && currentLane < 2) {
    currentLane += 1;
    flashHud('Lane ' + (currentLane + 1) + ' 👉');
  }
}

// ---------------------------------------------------------------
// 11. SWIPE DETECTION
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

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return;
  }

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

// Mouse fallback (desktop testing)
touchLayer.addEventListener('mousedown', (e) => {
  handleTouchStart(e.clientX, e.clientY);
});
touchLayer.addEventListener('mouseup', (e) => {
  handleTouchEnd(e.clientX, e.clientY);
});

// ---------------------------------------------------------------
// 12. GAME LOOP
// ---------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

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

  // ---- Lane slide (X) ----
  const targetX = LANE_X[currentLane];
  player.position.x += (targetX - player.position.x) * LANE_SLIDE_SPEED * delta;
  if (Math.abs(targetX - player.position.x) < 0.001) {
    player.position.x = targetX;
  }

  // ---- Jump physics (Y) ----
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

  // Keep sliding player's bottom glued to the road
  const halfHeight = (PLAYER_HEIGHT * player.scale.y) / 2;
  if (!isJumping) {
    player.position.y = halfHeight;
  }

  // ---- Debug text ----
  debug.textContent =
    'lane: ' + currentLane +
    ' | y: ' + player.position.y.toFixed(2) +
    ' | vy: ' + velocityY.toFixed(2) +
    ' | jump: ' + isJumping +
    ' | slide: ' + isSliding;

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------
// 13. RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
