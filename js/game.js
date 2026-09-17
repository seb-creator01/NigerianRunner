import * as THREE from 'three';

// ---------------------------------------------------------------
// 1. RENDERER — draws everything onto the screen
// ---------------------------------------------------------------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap for mobile perf
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// 2. SCENE — the 3D world
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // sky blue

// ---------------------------------------------------------------
// 3. CAMERA — our eyes in the world
// ---------------------------------------------------------------
const camera = new THREE.PerspectiveCamera(
  60,                                     // field of view
  window.innerWidth / window.innerHeight, // aspect ratio
  0.1,                                    // near clip
  200                                     // far clip
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 1, 0);

// ---------------------------------------------------------------
// 4. LIGHTING
// ---------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);

// ---------------------------------------------------------------
// 5. GROUND / ROAD — a long flat box
// ---------------------------------------------------------------
const roadGeometry = new THREE.BoxGeometry(6, 0.2, 200);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.position.set(0, 0, -50); // push it forward so we run "into" it
scene.add(road);

// ---------------------------------------------------------------
// 6. PLAYER PLACEHOLDER — a simple box for now
// ---------------------------------------------------------------
const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 1, 0);
scene.add(player);

// ---------------------------------------------------------------
// 7. GAME LOOP — runs many times per second
// ---------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // Move the player forward (negative Z is "into" the screen)
  player.position.z -= 8 * delta;

  // Camera follows the player from behind and above
  camera.position.z = player.position.z + 10;
  camera.position.x = player.position.x;
  camera.position.y = 5;
  camera.lookAt(player.position.x, 1.5, player.position.z - 5);

  renderer.render(scene, camera);
}

animate();

// ---------------------------------------------------------------
// 8. HANDLE SCREEN RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
