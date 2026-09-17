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

// Lane marker stripes
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
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(LANE_X[STARTING_LANE], 1, 0);
scene.add(player);

// Lane state — this is the heart of lane switching
let currentLane = STARTING_LANE;

// ---------------------------------------------------------------
// 8. WORLD SCROLL SPEED
// ---------------------------------------------------------------
const WORLD_SPEED = 12;

// How fast the player slides between lanes (higher = snappier)
const LANE_SLIDE_SPEED = 8;

// ---------------------------------------------------------------
// 9. SWIPE DETECTION + LANE MOVEMENT + HUD
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 30;
let touchStartX = 0;
let touchStartY = 0;

const hud = document.createElement('div');
hud.id = 'hud';
hud.textContent = 'Swipe left or right to change lanes';
document.body.appendChild(hud);

function flashHud(text) {
  hud.textContent = text;
}

function handleTouchStart(clientX, clientY) {
  touchStartX = clientX;
  touchStartY = clientY;
}

function handleTouchEnd(clientX, clientY) {
  const dx = clientX - touchStartX;
  const dy = clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) {
    return; // tap — ignore
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal swipe → lane change
    if (dx > 0) {
      if (currentLane < 2) {
        currentLane += 1;
        flashHud('Lane ' + (currentLane + 1) + ' 👉');
      }
    } else {
      if (currentLane > 0) {
        currentLane -= 1;
        flashHud('Lane ' + (currentLane + 1) + ' 👈');
      }
    }
  } else {
    // Vertical swipe → jump / slide (coming later)
    if (dy < 0) flashHud('Jump 👆 (coming soon)');
    else        flashHud('Slide 👇 (coming soon)');
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

// Mouse fallback for desktop testing
touchLayer.addEventListener('mousedown', (e) => {
  handleTouchStart(e.clientX, e.clientY);
});
touchLayer.addEventListener('mouseup', (e) => {
  handleTouchEnd(e.clientX, e.clientY);
});

// ---------------------------------------------------------------
// 10. GAME LOOP
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

  // ---- Player lane slide (smooth) ----
  const targetX = LANE_X[currentLane];
  player.position.x += (targetX - player.position.x) * LANE_SLIDE_SPEED * delta;

  // Snap if very close, to avoid tiny infinite drift
  if (Math.abs(targetX - player.position.x) < 0.001) {
    player.position.x = targetX;
  }

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------
// 11. HANDLE SCREEN RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
