import * as THREE from 'three';

// ---------------------------------------------------------------
// 1. RENDERER
// ---------------------------------------------------------------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// 2. SCENE + FOG
// Fog hides the far end of the road so we don't need infinite geometry
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
// Three lanes at x = -2, 0, +2. The player stays at z = 0.
// ---------------------------------------------------------------
const LANE_X = [-2, 0, 2];
const STARTING_LANE = 1; // middle lane

// ---------------------------------------------------------------
// 6. ROAD — one long strip. We will scroll it backwards to fake motion.
// ---------------------------------------------------------------
const ROAD_LENGTH = 200;
const ROAD_WIDTH = 7;

const roadGeometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_LENGTH);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.position.set(0, 0, -ROAD_LENGTH / 2 + 10); // stretch away from camera
scene.add(road);

// Lane marker stripes — thin white boxes we will scroll with the road
const stripeGroup = new THREE.Group();
scene.add(stripeGroup);

const stripeGeometry = new THREE.BoxGeometry(0.08, 0.21, 2);
const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

const STRIPE_SPACING = 4; // distance between stripes along Z
const STRIPE_COUNT = 60;  // how many stripes per divider

// Two dividers: one between lane 0/1 (x=-1), one between lane 1/2 (x=+1)
[-1, 1].forEach((xPos) => {
  for (let i = 0; i < STRIPE_COUNT; i++) {
    const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
    stripe.position.set(xPos, 0.11, 5 - i * STRIPE_SPACING);
    stripeGroup.add(stripe);
  }
});

// ---------------------------------------------------------------
// 7. PLAYER — placeholder box. It stays at z = 0 forever.
// ---------------------------------------------------------------
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(LANE_X[STARTING_LANE], 1, 0);
scene.add(player);

// ---------------------------------------------------------------
// 8. WORLD SCROLL SPEED
// The world moves toward the player at this speed (units per second).
// Later, this will increase over time to make the game harder.
// ---------------------------------------------------------------
const WORLD_SPEED = 12;

// ---------------------------------------------------------------
// 9. SWIPE DETECTION (just logs for now — no lane movement yet)
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 30; // minimum pixels to count as a swipe
let touchStartX = 0;
let touchStartY = 0;

const hud = document.createElement('div');
hud.id = 'hud';
hud.textContent = 'Swipe anywhere on screen';
document.body.appendChild(hud);

function flashHud(text) {
  hud.textContent = text;
}

window.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
});

window.addEventListener('touchend', (e) => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) flashHud('Swipe RIGHT 👉');
    else        flashHud('Swipe LEFT 👈');
  } else {
    if (dy > 0) flashHud('Swipe DOWN 👇');
    else        flashHud('Swipe UP 👆');
  }
});

// ---------------------------------------------------------------
// 10. GAME LOOP
// The player never moves. We scroll the world toward the camera.
// ---------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Move the road backward (toward +Z), then wrap it when it's too far.
  road.position.z += WORLD_SPEED * delta;
  if (road.position.z > ROAD_LENGTH / 2 + 10) {
    road.position.z -= ROAD_LENGTH;
  }

  // Scroll each lane stripe, wrapping back when it passes the camera.
  stripeGroup.children.forEach((stripe) => {
    stripe.position.z += WORLD_SPEED * delta;
    if (stripe.position.z > 6) {
      stripe.position.z -= STRIPE_COUNT * STRIPE_SPACING;
    }
  });

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
