import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

// ---------------------------------------------------------------
// 1. RENDERER
// ---------------------------------------------------------------
const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '1';

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

container.appendChild(renderer.domElement);
renderer.shadowMap.enabled = false;

// ---------------------------------------------------------------
// 2. SCENE + FOG
// ---------------------------------------------------------------
const scene = new THREE.Scene();

const OPEN_FOG_NEAR = 35;
const OPEN_FOG_FAR = 70;
const TUNNEL_FOG_NEAR = 12;
const TUNNEL_FOG_FAR = 45;
const BEACH_FOG_NEAR = 40;
const BEACH_FOG_FAR = 80;

scene.background = new THREE.Color(0xf5c98a);
scene.fog = new THREE.Fog(0xf5c98a, OPEN_FOG_NEAR, OPEN_FOG_FAR);

// HDRI ENVIRONMENT LIGHTING
const HDRI_URL =
  'https://seb-creator01.github.io/NigerianRunner/venice_sunset_1k.hdr';

const hdriLoader = new RGBELoader();
hdriLoader.load(HDRI_URL, (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdrTexture;
  scene.background = hdrTexture;
  scene.environmentIntensity = 0.9;
  console.log('HDRI environment loaded');
}, undefined, (err) => {
  console.warn('HDRI failed to load — using flat color fallback:', err);
});

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
// 3b. POST-PROCESSING
// ---------------------------------------------------------------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.55,
  0.7,
  0.85
);
composer.addPass(bloomPass);

const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 1.0;
vignettePass.uniforms['darkness'].value = 0.5;
composer.addPass(vignettePass);

const fxaaPass = new ShaderPass(FXAAShader);
const pixelRatio = renderer.getPixelRatio();
fxaaPass.material.uniforms['resolution'].value.x =
  1 / (window.innerWidth * pixelRatio);
fxaaPass.material.uniforms['resolution'].value.y =
  1 / (window.innerHeight * pixelRatio);
composer.addPass(fxaaPass);

// ---------------------------------------------------------------
// 4. LIGHTING
// ---------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffe8c0, 0.15);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff1d0, 0.4);
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
const ROAD_LENGTH = 500;
const ROAD_WIDTH = 7;

const roadGeometry = new THREE.BoxGeometry(ROAD_WIDTH, 0.2, ROAD_LENGTH);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.position.set(0, 0, -ROAD_LENGTH / 2 + 20);
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

// Sidewalks
const sidewalkGeometry = new THREE.BoxGeometry(1.5, 0.15, ROAD_LENGTH);
const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c9a8 });
[-1, 1].forEach((side) => {
  const sidewalk = new THREE.Mesh(sidewalkGeometry, sidewalkMaterial);
  sidewalk.position.set(side * (ROAD_WIDTH / 2 + 0.75), 0.075, -ROAD_LENGTH / 2 + 20);
  scene.add(sidewalk);
});

// Barriers
const barrierHeight = 0.9;
const barrierThickness = 0.15;
const barrierX = ROAD_WIDTH / 2 + 1.7;

const barrierMat = new THREE.MeshStandardMaterial({
  color: 0xc9c4b8,
  roughness: 0.9,
  metalness: 0.0,
});

const barrierCapMat = new THREE.MeshStandardMaterial({
  color: 0x8a8578,
  roughness: 0.8,
});

[-1, 1].forEach((side) => {
  const bodyGeo = new THREE.BoxGeometry(
    barrierThickness,
    barrierHeight,
    ROAD_LENGTH
  );
  const body = new THREE.Mesh(bodyGeo, barrierMat);
  body.position.set(
    side * barrierX,
    barrierHeight / 2,
    -ROAD_LENGTH / 2 + 20
  );
  scene.add(body);

  const capGeo = new THREE.BoxGeometry(
    barrierThickness + 0.05,
    0.08,
    ROAD_LENGTH
  );
  const cap = new THREE.Mesh(capGeo, barrierCapMat);
  cap.position.set(
    side * barrierX,
    barrierHeight + 0.04,
    -ROAD_LENGTH / 2 + 20
  );
  scene.add(cap);

  const markerCount = Math.floor(ROAD_LENGTH / 12);
  for (let i = 0; i < markerCount; i++) {
    const markerGeo = new THREE.BoxGeometry(0.05, 0.12, 0.4);
    const markerMat = new THREE.MeshStandardMaterial({
      color: 0xffee88,
      emissive: 0xffcc44,
      emissiveIntensity: 1.2,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(
      side * (barrierX - barrierThickness / 2 - 0.03),
      barrierHeight * 0.7,
      20 - i * 12
    );
    scene.add(marker);
  }
});

// Water plane
const waterMat = new THREE.MeshStandardMaterial({
  color: 0x2a6fa8,
  transparent: true,
  opacity: 0.85,
  metalness: 0.3,
  roughness: 0.4,
});
const waterPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  waterMat
);
waterPlane.rotation.x = -Math.PI / 2;
waterPlane.position.set(0, -3.5, -20);
waterPlane.visible = false;
scene.add(waterPlane);

// ---------------------------------------------------------------
// 6b. CHARACTER ROSTER — 4 Nigerian runners
// ---------------------------------------------------------------
// Each character has a name, gender, body scale, skin tone,
// clothing colors, hair style, and a UI color for the selection screen.
const CHARACTERS = [
  {
    id: 'kairo',
    name: 'KAIRO',
    tagline: 'Fast & Fearless',
    gender: 'boy',
    scale: 1.10,
    skin: 0x8a5a3a,      // medium brown
    shirt: 0xff3b30,     // bright red
    trousers: 0x1a1a2a,  // dark navy
    hairColor: 0x1a0f08,
    hairStyle: 'shortafro',
    accessory: 'cap',    // red baseball cap
    accessoryColor: 0xff3b30,
    uiColor: '#ff3b30',
  },
  {
    id: 'zayen',
    name: 'ZAYEN',
    tagline: 'Steady & Strong',
    gender: 'boy',
    scale: 1.05,
    skin: 0x5a3010,      // very dark
    shirt: 0x00a86b,     // emerald green
    trousers: 0x3a2a1a,  // brown
    hairColor: 0x0f0a05,
    hairStyle: 'buzz',
    accessory: 'sunglasses',
    accessoryColor: 0x0a0a0a,
    uiColor: '#00a86b',
  },
  {
    id: 'naya',
    name: 'NAYA',
    tagline: 'Bright & Bold',
    gender: 'girl',
    scale: 0.98,
    skin: 0xa06030,      // light brown
    shirt: 0xff6b9d,     // bright pink
    trousers: 0x4a4a8a,  // blue-violet
    hairColor: 0x1a0f08,
    hairStyle: 'braids',
    accessory: 'headband',
    accessoryColor: 0xffd700,
    uiColor: '#ff6b9d',
  },
  {
    id: 'zuri',
    name: 'ZURI',
    tagline: 'Bold & Beautiful',
    gender: 'girl',
    scale: 0.95,
    skin: 0x6b3f1f,      // dark brown
    shirt: 0xffb300,     // golden yellow
    trousers: 0x2a1a3a,  // deep purple
    hairColor: 0x1a0f08,
    hairStyle: 'bigafro',
    accessory: 'flower',
    accessoryColor: 0xff5b8a,
    uiColor: '#ffb300',
  },
];

// ---------------------------------------------------------------
// 6b2. MISSIONS SYSTEM
// ---------------------------------------------------------------
// Mission types — each is a template the generator uses
const MISSION_TYPES = [
  {
    type: 'collectCoins',
    title: 'Collect {N} coins',
    desc: 'In one run',
    baseGoal: 50,
    stat: 'runCoins',
    reward: 100,
  },
  {
    type: 'runDistance',
    title: 'Run {N} meters',
    desc: 'In one run',
    baseGoal: 500,
    stat: 'runDistance',
    reward: 150,
  },
  {
    type: 'usePowerups',
    title: 'Collect {N} power-ups',
    desc: 'In one run',
    baseGoal: 3,
    stat: 'runPowerups',
    reward: 200,
  },
  {
    type: 'survive',
    title: 'Survive {N} seconds',
    desc: 'In one run',
    baseGoal: 45,
    stat: 'runTime',
    reward: 150,
  },
  {
    type: 'reachLevel',
    title: 'Reach Level {N}',
    desc: 'In one run',
    baseGoal: 4,
    stat: 'runLevel',
    reward: 200,
  },
  {
    type: 'collectTotal',
    title: 'Collect {N} coins total',
    desc: 'Across all runs',
    baseGoal: 500,
    stat: 'careerCoins',
    reward: 250,
  },
  {
    type: 'playRuns',
    title: 'Play {N} runs',
    desc: 'Across all sessions',
    baseGoal: 10,
    stat: 'careerRuns',
    reward: 200,
  },
];

// Active missions — always 3 at a time
let activeMissions = [];

// Storage keys
const MISSIONS_KEY = 'nigerianRunner.activeMissions';
const CAREER_KEY = 'nigerianRunner.careerStats';

// Career stats — accumulate over all runs
let careerStats = {
  totalCoins: 0,
  totalRuns: 0,
  totalDistance: 0,
  longestRun: 0,
};

// Load from localStorage on startup
try {
  const raw = localStorage.getItem(CAREER_KEY);
  if (raw) careerStats = Object.assign(careerStats, JSON.parse(raw));
} catch (e) {}

try {
  const raw = localStorage.getItem(MISSIONS_KEY);
  if (raw) activeMissions = JSON.parse(raw);
} catch (e) {}

// Save functions
function saveCareerStats() {
  try {
    localStorage.setItem(CAREER_KEY, JSON.stringify(careerStats));
  } catch (e) {}
}

function saveActiveMissions() {
  try {
    localStorage.setItem(MISSIONS_KEY, JSON.stringify(activeMissions));
  } catch (e) {}
}

// ---------------------------------------------------------------
// MISSION GENERATION
// ---------------------------------------------------------------
// Pick a random mission type and scale its goal to the player's level.
function generateMission(excludeTypes) {
  const playerBest = getBestScore();
  // Scale factor: 1.0 at start, grows as the player improves
  const scale = 1 + Math.min(playerBest / 2000, 3);

  // Filter out types the player already has active
  const candidates = MISSION_TYPES.filter(
    (t) => !excludeTypes || !excludeTypes.includes(t.type)
  );
  if (candidates.length === 0) candidates.push(MISSION_TYPES[0]);

  const template = candidates[Math.floor(Math.random() * candidates.length)];

  // Goal = base × scale × random variance
  const variance = 0.8 + Math.random() * 0.5;
  const goal = Math.max(1, Math.round(template.baseGoal * scale * variance));

  // Special-case reachLevel (small numbers, no decimals)
  const finalGoal = template.type === 'reachLevel'
    ? Math.min(goal, 30)
    : goal;

  return {
    id: template.type + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    type: template.type,
    title: template.title.replace('{N}', finalGoal),
    desc: template.desc,
    stat: template.stat,
    goal: finalGoal,
    reward: template.reward,
  };
}

// Build the initial 3 missions if none exist yet
function ensureActiveMissions() {
  if (activeMissions.length === 0) {
    activeMissions = [];
    const used = [];
    for (let i = 0; i < 3; i++) {
      const m = generateMission(used);
      used.push(m.type);
      activeMissions.push(m);
    }
    saveActiveMissions();
  }
}

// Call on startup
ensureActiveMissions();

// Complete a mission, remove it, generate a replacement
function completeMission(missionId) {
  const idx = activeMissions.findIndex((m) => m.id === missionId);
  if (idx === -1) return;

  const completed = activeMissions[idx];

  // Remove it
  activeMissions.splice(idx, 1);

  // Generate a new one — try to avoid the same type
  const usedTypes = activeMissions.map((m) => m.type);
  const newMission = generateMission(usedTypes);
  activeMissions.push(newMission);

  saveActiveMissions();

  // Give the reward
  score += completed.reward;
  scoreEl.textContent = 'Score: ' + Math.floor(score);

  // Popup + sound
  showMissionComplete(completed.title);
  playSound('powerup');
}

// ---------------------------------------------------------------
// MISSION STATS HELPER
// ---------------------------------------------------------------
// Get the current value for a given mission stat
function getMissionStat(stat) {
  if (stat === 'runCoins') return runCoins;
  if (stat === 'runDistance') return runDistance;
  if (stat === 'runPowerups') return runPowerups;
  if (stat === 'runTime') return runTime;
  if (stat === 'runLevel') return speedLevel;
  if (stat === 'careerCoins') return careerStats.totalCoins;
  if (stat === 'careerRuns') return careerStats.totalRuns;
  return 0;
}

// Check all active missions to see if any completed
function checkMissionCompletions() {
  for (const mission of activeMissions) {
    const current = getMissionStat(mission.stat);
    if (current >= mission.goal) {
      completeMission(mission.id);
      break; // one per frame is fine
    }
  }
}
// Default character (loads first every session unless user changes)
const DEFAULT_CHARACTER_ID = 'kairo';
const CHARACTER_STORAGE_KEY = 'nigerianRunner.selectedCharacter';

// Read the currently-selected character from localStorage
function getSelectedCharacterId() {
  try {
    const saved = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (saved && CHARACTERS.some((c) => c.id === saved)) return saved;
  } catch (e) {}
  return DEFAULT_CHARACTER_ID;
}

function getSelectedCharacter() {
  const id = getSelectedCharacterId();
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

function setSelectedCharacter(id) {
  try {
    localStorage.setItem(CHARACTER_STORAGE_KEY, id);
  } catch (e) {}
}

let activeCharacter = getSelectedCharacter();

// ---------------------------------------------------------------
// 6c. KEKE NAPEP — BEAUTIFUL COLORED VERSION
// ---------------------------------------------------------------
const KEKE_COLORS = [
  { body: 0xf2c419, roof: 0xf7d23c, name: 'yellow' },
  { body: 0x2b8d3a, roof: 0x3aa84a, name: 'green' },
  { body: 0x2b6bd9, roof: 0x3a86f0, name: 'blue' },
  { body: 0xd94f2b, roof: 0xe85a3a, name: 'red' },
  { body: 0xe87a1a, roof: 0xf08a2a, name: 'orange' },
  { body: 0x7a3aa8, roof: 0x8a4ab8, name: 'purple' },
  { body: 0xf2f2f2, roof: 0xffffff, name: 'white' },
];

const kekeGeometries = {
  body: new THREE.BoxGeometry(1.6, 1.5, 2.0),
  roof: new THREE.SphereGeometry(0.85, 12, 8),
  windshield: new THREE.BoxGeometry(1.36, 0.6, 0.05),
  frontWheel: new THREE.CylinderGeometry(0.28, 0.28, 0.15, 12),
  sideMirror: new THREE.BoxGeometry(0.15, 0.1, 0.05),
  headlight: new THREE.SphereGeometry(0.12, 8, 6),
  licensePlate: new THREE.BoxGeometry(0.4, 0.2, 0.03),
  bumper: new THREE.BoxGeometry(1.65, 0.15, 0.15),
  roofOrnament: new THREE.BoxGeometry(0.4, 0.06, 0.4),
};

const kekeMaterials = {
  glass: new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    metalness: 0.7,
    roughness: 0.15,
  }),
  wheel: new THREE.MeshStandardMaterial({ color: 0x111111 }),
  chrome: new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.9,
    roughness: 0.15,
  }),
  headlight: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffeeaa,
    emissiveIntensity: 2.5,
  }),
  licensePlate: new THREE.MeshStandardMaterial({
    color: 0xf2f2f2,
    emissive: 0x221100,
    emissiveIntensity: 0.2,
  }),
  bumper: new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.3,
    roughness: 0.6,
  }),
};

const kekeColorMaterials = KEKE_COLORS.map((scheme) => ({
  body: new THREE.MeshStandardMaterial({ color: scheme.body }),
  roof: new THREE.MeshStandardMaterial({ color: scheme.roof }),
}));

function makeKekeNapep() {
  const group = new THREE.Group();

  const colorIndex = Math.floor(Math.random() * KEKE_COLORS.length);
  const colorMats = kekeColorMaterials[colorIndex];

  const body = new THREE.Mesh(kekeGeometries.body, colorMats.body);
  body.position.y = 0.9;
  group.add(body);

  const roof = new THREE.Mesh(kekeGeometries.roof, colorMats.roof);
  roof.scale.set(1, 0.5, 1.05);
  roof.position.y = 1.65;
  group.add(roof);

  const roofOrnament = new THREE.Mesh(
    kekeGeometries.roofOrnament,
    kekeMaterials.bumper
  );
  roofOrnament.position.y = 2.1;
  group.add(roofOrnament);

  const glass = new THREE.Mesh(kekeGeometries.windshield, kekeMaterials.glass);
  glass.position.set(0, 1.15, 1.0 - 0.02);
  group.add(glass);

  const glassBack = new THREE.Mesh(kekeGeometries.windshield, kekeMaterials.glass);
  glassBack.position.set(0, 1.15, -1.0 + 0.02);
  group.add(glassBack);

  const sideGlassGeo = new THREE.BoxGeometry(0.04, 0.5, 0.9);
  const sideGlassL = new THREE.Mesh(sideGlassGeo, kekeMaterials.glass);
  sideGlassL.position.set(-0.81, 1.15, 0);
  group.add(sideGlassL);

  const sideGlassR = new THREE.Mesh(sideGlassGeo, kekeMaterials.glass);
  sideGlassR.position.set(0.81, 1.15, 0);
  group.add(sideGlassR);

  const wf = new THREE.Mesh(kekeGeometries.frontWheel, kekeMaterials.wheel);
  wf.rotation.z = Math.PI / 2;
  wf.position.set(0, 0.28, 0.7);
  group.add(wf);

  const wl = new THREE.Mesh(kekeGeometries.frontWheel, kekeMaterials.wheel);
  wl.rotation.z = Math.PI / 2;
  wl.position.set(-0.7, 0.28, -0.7);
  group.add(wl);

  const wr = new THREE.Mesh(kekeGeometries.frontWheel, kekeMaterials.wheel);
  wr.rotation.z = Math.PI / 2;
  wr.position.set(0.7, 0.28, -0.7);
  group.add(wr);

  const mirrorL = new THREE.Mesh(kekeGeometries.sideMirror, kekeMaterials.chrome);
  mirrorL.position.set(-0.85, 1.35, 0.85);
  group.add(mirrorL);

  const mirrorR = new THREE.Mesh(kekeGeometries.sideMirror, kekeMaterials.chrome);
  mirrorR.position.set(0.85, 1.35, 0.85);
  group.add(mirrorR);

  const headlightGeo = kekeGeometries.headlight;
  const headlightL = new THREE.Mesh(headlightGeo, kekeMaterials.headlight);
  headlightL.position.set(-0.5, 0.65, 1.02);
  group.add(headlightL);

  const headlightR = new THREE.Mesh(headlightGeo, kekeMaterials.headlight);
  headlightR.position.set(0.5, 0.65, 1.02);
  group.add(headlightR);

  const plateGeo = kekeGeometries.licensePlate;
  const plate = new THREE.Mesh(plateGeo, kekeMaterials.licensePlate);
  plate.position.set(0, 0.45, 1.02);
  group.add(plate);

  const bumperGeo = kekeGeometries.bumper;
  const bumper = new THREE.Mesh(bumperGeo, kekeMaterials.bumper);
  bumper.position.set(0, 0.3, 1.0);
  group.add(bumper);

  const bumperBack = new THREE.Mesh(bumperGeo, kekeMaterials.bumper);
  bumperBack.position.set(0, 0.3, -1.0);
  group.add(bumperBack);

  return group;
}

// ---------------------------------------------------------------
// 6d. SECTION SYSTEM
// ---------------------------------------------------------------
const SECTION_LENGTH = 100;
const SECTION_COUNT = 3;

const sections = [];

const SECTION_TYPES = ['city', 'tunnel', 'bridge', 'railway', 'rural', 'beach'];
let currentSectionType = 'city';
let lastSectionType = 'city';

const SECTIONS_BETWEEN_FORKS = 3;
let sectionsSinceLastFork = 0;

let forkActive = false;
let forkResolved = false;
let forkChoice = null;
let forkPendingNextType = null;

const BUILDING_COLORS = [
  0xc17a4a, 0xa8603a, 0xd9a066, 0x8c5a3c, 0xe0c088, 0x9c6a4c,
];

const ROAD_EDGE = ROAD_WIDTH / 2 + 2.5;

function makeSignTexture(text, bgColor = '#e0b070', textColor = '#3a1a00') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

  ctx.fillStyle = textColor;
  ctx.font = 'bold 90px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 4;
  return tex;
}

function buildBuilding(width, height, depth, x, z, side) {
  const group = new THREE.Group();

  const color =
    BUILDING_COLORS[Math.floor(Math.random() * BUILDING_COLORS.length)];

  const geo = new THREE.BoxGeometry(width, height, depth);
  const mat = new THREE.MeshStandardMaterial({ color });
  const building = new THREE.Mesh(geo, mat);
  building.position.set(x, height / 2, z);
  group.add(building);

  const roofGeo = new THREE.BoxGeometry(width + 0.15, 0.2, depth + 0.15);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(x, height + 0.1, z);
  group.add(roof);

  const windowCount = Math.max(1, Math.floor(height / 2));
  for (let i = 0; i < windowCount; i++) {
    const winGeo = new THREE.BoxGeometry(0.35, 0.5, 0.05);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0x202840,
      emissive: 0x101520,
    });
    const win = new THREE.Mesh(winGeo, winMat);
    const faceX = x + (side === -1 ? width / 2 + 0.03 : -width / 2 - 0.03);
    win.position.set(faceX, 1.2 + i * 1.6, z);
    win.rotation.y = side === -1 ? 0 : Math.PI;
    group.add(win);
  }

  return group;
}

function buildSign(text, bgColor, textColor, x, z, side) {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a2a10 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x, 1.2, z);
  group.add(pole);

  const signGeo = new THREE.PlaneGeometry(1.2, 0.6);
  const signMat = new THREE.MeshStandardMaterial({
    map: makeSignTexture(text, bgColor, textColor),
    side: THREE.DoubleSide,
    emissive: 0x221100,
    emissiveIntensity: 0.3,
  });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(x, 2.2, z);
  sign.rotation.y = side === -1 ? -Math.PI / 2 : Math.PI / 2;
  group.add(sign);

  return group;
}

function buildPalm(x, z) {
  const group = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.1, 0.15, 2.5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(x, 1.25, z);
  group.add(trunk);

  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3a });
  for (let i = 0; i < 5; i++) {
    const tuftGeo = new THREE.SphereGeometry(0.5, 6, 4);
    const tuft = new THREE.Mesh(tuftGeo, tuftMat);
    const angle = (i / 5) * Math.PI * 2;
    tuft.position.set(x + Math.cos(angle) * 0.3, 2.6, z + Math.sin(angle) * 0.3);
    tuft.scale.set(1, 0.4, 1);
    group.add(tuft);
  }

  return group;
}

function buildLampPost(x, z) {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x, 1.75, z);
  group.add(pole);

  const armGeo = new THREE.BoxGeometry(0.6, 0.08, 0.08);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const arm = new THREE.Mesh(armGeo, armMat);
  arm.position.set(x + (x > 0 ? -0.3 : 0.3), 3.4, z);
  group.add(arm);

  const bulbGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff0c0,
    emissive: 0xffd080,
    emissiveIntensity: 1.5,
  });
  const bulb = new THREE.Mesh(bulbGeo, bulbMat);
  bulb.position.set(x + (x > 0 ? -0.6 : 0.6), 3.35, z);
  group.add(bulb);

  return group;
}

function buildGenerator(x, z) {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.5);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a3a1a });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(x, 0.25, z);
  group.add(body);

  const pipeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const pipe = new THREE.Mesh(pipeGeo, pipeMat);
  pipe.position.set(x + 0.25, 0.65, z);
  group.add(pipe);

  const handleGeo = new THREE.BoxGeometry(0.6, 0.04, 0.04);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.set(x, 0.55, z);
  group.add(handle);

  return group;
}

function buildUmbrella(x, z) {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x, 0.9, z);
  group.add(pole);

  const umbColors = [0xd94f2b, 0x2b8d3a, 0xf2c419, 0x2b6bd9];
  const umbColor = umbColors[Math.floor(Math.random() * umbColors.length)];
  const umbGeo = new THREE.ConeGeometry(0.7, 0.4, 8);
  const umbMat = new THREE.MeshStandardMaterial({ color: umbColor });
  const umb = new THREE.Mesh(umbGeo, umbMat);
  umb.position.set(x, 1.85, z);
  group.add(umb);

  return group;
}

function buildWaterTank(x, y, z) {
  const group = new THREE.Group();

  const tankGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12);
  const tankMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  const tank = new THREE.Mesh(tankGeo, tankMat);
  tank.position.set(x, y, z);
  group.add(tank);

  const capGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15, 8);
  const capMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(x, y + 0.55, z);
  group.add(cap);

  return group;
}

function buildPaintedWall(width, x, z) {
  const group = new THREE.Group();

  const wallGeo = new THREE.BoxGeometry(0.2, 1.2, width);
  const colors = [0xd94f2b, 0x2b8d3a, 0xf2c419, 0x2b6bd9, 0xc42b80];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const wallMat = new THREE.MeshStandardMaterial({ color });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(x, 0.6, z);
  group.add(wall);

  return group;
}

// ---------- People (roadside crowd) ----------
const PEOPLE_SKIN_COLORS = [
  0x8a5a3a, 0x6b3f1f, 0xa06030, 0x5a3010, 0x7a4a20,
];
const PEOPLE_SHIRT_COLORS = [
  0xd94f2b, 0x2b8d3a, 0xf2c419, 0x2b6bd9, 0xc42b80, 0xffffff, 0xe8a020,
];
const PEOPLE_TROUSER_COLORS = [
  0x2a2a4a, 0x4a2a10, 0x1a1a1a, 0x3a3a3a, 0x5a3a1a,
];

function buildPerson(x, z, side) {
  const group = new THREE.Group();

  const skin = PEOPLE_SKIN_COLORS[Math.floor(Math.random() * PEOPLE_SKIN_COLORS.length)];
  const shirt = PEOPLE_SHIRT_COLORS[Math.floor(Math.random() * PEOPLE_SHIRT_COLORS.length)];
  const trousers = PEOPLE_TROUSER_COLORS[Math.floor(Math.random() * PEOPLE_TROUSER_COLORS.length)];

  const heightScale = 0.85 + Math.random() * 0.3;

  const legGeo = new THREE.BoxGeometry(0.15, 0.6 * heightScale, 0.15);
  const legMat = new THREE.MeshStandardMaterial({ color: trousers });

  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.1, 0.3 * heightScale, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.1, 0.3 * heightScale, 0);
  group.add(rightLeg);

  const torsoGeo = new THREE.BoxGeometry(0.4, 0.55 * heightScale, 0.2);
  const torsoMat = new THREE.MeshStandardMaterial({ color: shirt });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.set(0, 0.875 * heightScale, 0);
  group.add(torso);

  const headGeo = new THREE.SphereGeometry(0.13 * heightScale, 8, 6);
  const headMat = new THREE.MeshStandardMaterial({ color: skin });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.set(0, 1.3 * heightScale, 0);
  group.add(head);

  const armGeo = new THREE.BoxGeometry(0.08, 0.5 * heightScale, 0.08);
  const armMat = new THREE.MeshStandardMaterial({ color: skin });

  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.24, 0.875 * heightScale, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.24, 0.875 * heightScale, 0);
  group.add(rightArm);

  group.position.set(x, 0, z);
  group.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
  group.userData.bobPhase = Math.random() * Math.PI * 2;
  group.userData.isPerson = true;

  return group;
}

// ---------- Trains ----------
function buildTrain() {
  const group = new THREE.Group();

  const trainLength = 12;
  const trainHeight = 2.2;
  const trainWidth = 1.6;

  const bodyGeo = new THREE.BoxGeometry(trainWidth, trainHeight, trainLength);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2a5a3a,
    metalness: 0.4,
    roughness: 0.6,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = trainHeight / 2 + 0.3;
  group.add(body);

  const roofGeo = new THREE.BoxGeometry(trainWidth + 0.15, 0.2, trainLength - 0.3);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = trainHeight + 0.4;
  group.add(roof);

  const windowCount = 6;
  for (let i = 0; i < windowCount; i++) {
    const winGeo = new THREE.BoxGeometry(0.05, 0.5, 1.0);
    const winMat = new THREE.MeshStandardMaterial({
      color: 0xfff0a0,
      emissive: 0xffd060,
      emissiveIntensity: 1.5,
    });
    const winLeft = new THREE.Mesh(winGeo, winMat);
    winLeft.position.set(-trainWidth / 2 - 0.03, trainHeight / 2 + 0.4,
                          -(trainLength / 2) + 1 + i * 1.8);
    group.add(winLeft);

    const winRight = new THREE.Mesh(winGeo, winMat);
    winRight.position.set(trainWidth / 2 + 0.03, trainHeight / 2 + 0.4,
                           -(trainLength / 2) + 1 + i * 1.8);
    group.add(winRight);
  }

  const lightGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffeeaa,
    emissiveIntensity: 3.0,
  });
  const frontLight = new THREE.Mesh(lightGeo, lightMat);
  frontLight.position.set(0, trainHeight / 2 + 0.4, trainLength / 2 + 0.05);
  group.add(frontLight);

  return group;
}

// ---------- Tunnel ----------
function buildTunnelWall(side, centerZ, length) {
  const group = new THREE.Group();
  const wallHeight = 4.5;
  const wallThickness = 0.5;
  const wallX = side * (ROAD_WIDTH / 2 + 1.5);

  const wallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, length);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.95 });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(wallX, wallHeight / 2, centerZ);
  group.add(wall);

  const panelCount = Math.max(3, Math.floor(length / 12));
  for (let i = 0; i < panelCount; i++) {
    const panelZ = centerZ + length / 2 - (i + 0.5) * (length / panelCount);
    const panelGeo = new THREE.BoxGeometry(0.05, wallHeight * 0.85, length / panelCount - 0.3);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x554d42, roughness: 0.9 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(
      side * (ROAD_WIDTH / 2 + 1.5 - wallThickness / 2 - 0.03),
      wallHeight / 2,
      panelZ
    );
    group.add(panel);
  }

  return group;
}

function buildTunnelRoof(centerZ, length) {
  const group = new THREE.Group();
  const radius = ROAD_WIDTH / 2 + 1.5;
  const roofGeo = new THREE.CylinderGeometry(
    radius, radius, length,
    16, 1, true,
    Math.PI * 0.15, Math.PI * 0.7
  );
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x4a4038, roughness: 0.95, side: THREE.DoubleSide,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.x = Math.PI / 2;
  roof.position.set(0, 3.5, centerZ);
  group.add(roof);
  return group;
}

function buildTunnelLights(side, centerZ, length) {
  const group = new THREE.Group();
  const lightCount = Math.max(4, Math.floor(length / 12));
  const wallX = side * (ROAD_WIDTH / 2 + 1.4);

  for (let i = 0; i < lightCount; i++) {
    const lightZ = centerZ + length / 2 - (i + 0.5) * (length / lightCount);
    const lightGeo = new THREE.BoxGeometry(0.15, 0.15, 0.5);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfff0a0, emissive: 0xffd060, emissiveIntensity: 3.0,
    });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(wallX, 3.0, lightZ);
    group.add(light);
  }

  return group;
}

// ---------- Bridge ----------
function buildBridgeRailing(side, centerZ) {
  const group = new THREE.Group();
  const railX = side * (ROAD_WIDTH / 2 + 1.4);

  const topRailGeo = new THREE.BoxGeometry(0.1, 0.1, SECTION_LENGTH);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.5, roughness: 0.4 });
  const topRail = new THREE.Mesh(topRailGeo, railMat);
  topRail.position.set(railX, 1.2, centerZ);
  group.add(topRail);

  const postCount = Math.floor(SECTION_LENGTH / 5);
  for (let i = 0; i < postCount; i++) {
    const postZ = centerZ + SECTION_LENGTH / 2 - (i + 0.5) * (SECTION_LENGTH / postCount);
    const postGeo = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.6, roughness: 0.4 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(railX, 0.6, postZ);
    group.add(post);
  }

  return group;
}

// ---------- Railway ----------
function buildTrainTracks(side, centerZ) {
  const group = new THREE.Group();
  const trackX = side * (ROAD_WIDTH / 2 + 3.0);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x6a6a6a, metalness: 0.8, roughness: 0.3 });
  const railOffset = 0.35;
  [-railOffset, railOffset].forEach((offset) => {
    const railGeo = new THREE.BoxGeometry(0.08, 0.06, SECTION_LENGTH);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(trackX + offset, 0.3, centerZ);
    group.add(rail);
  });

  const sleeperCount = Math.floor(SECTION_LENGTH / 1.5);
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.95 });
  for (let i = 0; i < sleeperCount; i++) {
    const sleeperZ = centerZ + SECTION_LENGTH / 2 - (i + 0.5) * (SECTION_LENGTH / sleeperCount);
    const sleeperGeo = new THREE.BoxGeometry(1.2, 0.1, 0.25);
    const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
    sleeper.position.set(trackX, 0.2, sleeperZ);
    group.add(sleeper);
  }

  return group;
}

function buildRailwaySign(x, z) {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(x, 1.75, z);
  group.add(pole);

  const lightGeo = new THREE.BoxGeometry(0.3, 0.3, 0.1);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 3.0,
  });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(x, 3.3, z);
  group.add(light);

  return group;
}

// ---------- Rural ----------
function buildDirtGround(width, x, z) {
  const group = new THREE.Group();
  const dirtGeo = new THREE.BoxGeometry(width, 0.1, SECTION_LENGTH);
  const dirtMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3a, roughness: 1.0 });
  const dirt = new THREE.Mesh(dirtGeo, dirtMat);
  dirt.position.set(x, 0.05, z);
  group.add(dirt);
  return group;
}

function buildBush(x, z) {
  const group = new THREE.Group();
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3a7a2a, roughness: 1.0 });
  for (let i = 0; i < 3; i++) {
    const bushGeo = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 5);
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(
      x + (Math.random() - 0.5) * 0.6,
      0.3 + Math.random() * 0.2,
      z + (Math.random() - 0.5) * 0.6
    );
    group.add(bush);
  }
  return group;
}

// ---------- Beach ----------
function buildSandPatch(width, x, z) {
  const group = new THREE.Group();
  const sandGeo = new THREE.BoxGeometry(width, 0.08, SECTION_LENGTH);
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xe8d29a, roughness: 1.0 });
  const sand = new THREE.Mesh(sandGeo, sandMat);
  sand.position.set(x, 0.04, z);
  group.add(sand);
  return group;
}

function buildBeachWater(x, z) {
  const group = new THREE.Group();
  const waterGeo = new THREE.BoxGeometry(30, 0.1, SECTION_LENGTH);
  const waterMatLocal = new THREE.MeshStandardMaterial({
    color: 0x3a86c9, transparent: true, opacity: 0.85, metalness: 0.3, roughness: 0.3,
  });
  const water = new THREE.Mesh(waterGeo, waterMatLocal);
  water.position.set(x, -0.3, z);
  group.add(water);
  return group;
}

// ---------- Fork ----------
function buildForkTunnelEntrance(centerZ) {
  const group = new THREE.Group();
  const radius = ROAD_WIDTH / 2 + 1.5;
  const archGeo = new THREE.TorusGeometry(radius * 0.8, 0.2, 8, 16, Math.PI);
  const archMat = new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.9 });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(-3, 1.0, centerZ);
  group.add(arch);

  const frameGeo = new THREE.BoxGeometry(3.5, 0.15, 0.15);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xffdd44, emissive: 0xffaa00, emissiveIntensity: 2.0,
  });
  const frameTop = new THREE.Mesh(frameGeo, frameMat);
  frameTop.position.set(-3, 3.6, centerZ);
  group.add(frameTop);

  return group;
}

function buildArrow(x, y, z, color, pointRight) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: color, emissive: color, emissiveIntensity: 1.5,
  });

  const shaftGeo = new THREE.BoxGeometry(0.9, 0.12, 0.12);
  const shaft = new THREE.Mesh(shaftGeo, mat);
  shaft.position.set(x, y, z);
  group.add(shaft);

  const headGeo = new THREE.BoxGeometry(0.3, 0.4, 0.12);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.set(x + (pointRight ? 0.6 : -0.6), y, z);
  head.rotation.z = pointRight ? -0.6 : 0.6;
  group.add(head);

  return group;
}

function buildDirectionSign(x, y, z, text, bgColor, fgColor) {
  const group = new THREE.Group();
  const signGeo = new THREE.PlaneGeometry(1.8, 0.7);
  const signMat = new THREE.MeshStandardMaterial({
    map: makeSignTexture(text, bgColor, fgColor),
    side: THREE.DoubleSide,
    emissive: 0x221100,
    emissiveIntensity: 0.4,
  });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(x, y, z);
  group.add(sign);
  return group;
}

const SIGN_DATA = [
  { text: 'SUYA',          bg: '#d94f2b', fg: '#fff5dd' },
  { text: 'BOLE',          bg: '#f2c419', fg: '#3a1a00' },
  { text: 'OKADA',         bg: '#2b8d3a', fg: '#fff5dd' },
  { text: 'PURE WATER',    bg: '#2b6bd9', fg: '#ffffff' },
  { text: 'PHONE REPAIR',  bg: '#c42b80', fg: '#fff5dd' },
  { text: 'CHOP LIFE',     bg: '#e8a020', fg: '#3a1a00' },
  { text: 'NAIJA PRIDE',   bg: '#2b8d3a', fg: '#ffffff' },
  { text: 'BARBING SALON', bg: '#333333', fg: '#f2c419' },
  { text: 'COLD DRINKS',   bg: '#2b6bd9', fg: '#f2c419' },
  { text: 'WELCOME',       bg: '#d94f2b', fg: '#fff5dd' },
];

// ---------------------------------------------------------------
// 6e. BACKGROUND TRAFFIC SYSTEM
// ---------------------------------------------------------------
const TRAFFIC_LANES_X = [
  -ROAD_WIDTH / 2 - 3.0,
   ROAD_WIDTH / 2 + 3.0,
];

const trafficGroup = new THREE.Group();
scene.add(trafficGroup);

const trafficKekes = [];
const TRAFFIC_MAX = 5;
const TRAFFIC_SPAWN_INTERVAL = 2.5;
let trafficSpawnTimer = 0;

function spawnTrafficKeke() {
  if (trafficKekes.length >= TRAFFIC_MAX) return;

  const laneIndex = Math.floor(Math.random() * TRAFFIC_LANES_X.length);
  const laneX = TRAFFIC_LANES_X[laneIndex];

  const direction = laneIndex === 0 ? -1 : 1;
  const baseSpeed = 8 + Math.random() * 10;
  const speed = baseSpeed * direction;

  const keke = makeKekeNapep();

  keke.rotation.y = direction > 0 ? Math.PI : 0;

  const startZ = direction > 0 ? -180 : 30;
  keke.position.set(laneX, 0, startZ);

  keke.userData.speed = speed;
  keke.userData.isTraffic = true;

  trafficGroup.add(keke);
  trafficKekes.push(keke);
}

function updateTraffic(delta) {
  trafficSpawnTimer += delta;
  if (trafficSpawnTimer >= TRAFFIC_SPAWN_INTERVAL) {
    trafficSpawnTimer = 0;
    spawnTrafficKeke();
  }

  for (let i = trafficKekes.length - 1; i >= 0; i--) {
    const keke = trafficKekes[i];
    keke.position.z += keke.userData.speed * delta;

    if (keke.position.z > 40 || keke.position.z < -220) {
      trafficGroup.remove(keke);
      trafficKekes.splice(i, 1);
    }
  }
}

function clearTraffic() {
  trafficKekes.forEach((k) => trafficGroup.remove(k));
  trafficKekes.length = 0;
  trafficSpawnTimer = 0;
}

function populateSection(sectionGroup, type, centerZ) {
  while (sectionGroup.children.length > 0) {
    sectionGroup.remove(sectionGroup.children[0]);
  }

  const half = SECTION_LENGTH / 2;

  if (type === 'city') {
    for (let side of [-1, 1]) {
      let z = centerZ + half - 3;
      const endZ = centerZ - half;
      while (z > endZ) {
        const w = 3 + Math.random() * 2.5;
        const h = 3 + Math.random() * 4;
        const d = 4 + Math.random() * 3;
        const x = side * (ROAD_EDGE + d / 2 + Math.random() * 2);

        sectionGroup.add(buildBuilding(w, h, d, x, z, side));

        if (Math.random() < 0.6) {
          sectionGroup.add(buildPaintedWall(d, side * (ROAD_EDGE + 0.2), z));
        }
        if (Math.random() < 0.35) {
          const tankX = x + (Math.random() - 0.5) * (w - 0.8);
          sectionGroup.add(buildWaterTank(tankX, h + 0.45, z));
        }
        z -= 8;
      }
    }
    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = centerZ + half - 5 - i * (SECTION_LENGTH / 3);
        const data = SIGN_DATA[Math.floor(Math.random() * SIGN_DATA.length)];
        const x = side * (ROAD_EDGE - 0.5);
        sectionGroup.add(buildSign(data.text, data.bg, data.fg, x, z, side));
      }
    }
    for (let i = 0; i < 4; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = side * (ROAD_EDGE + 1 + Math.random() * 2);
      sectionGroup.add(buildPalm(x, z));
    }
    for (let side of [-1, 1]) {
      sectionGroup.add(buildLampPost(side * (ROAD_EDGE - 0.3), centerZ));
    }
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
        const x = side * (ROAD_EDGE + 0.3);
        sectionGroup.add(buildGenerator(x, z));
      }
    }
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
        const x = side * (ROAD_EDGE + 0.5 + Math.random() * 0.5);
        sectionGroup.add(buildUmbrella(x, z));
      }
    }

    for (let side of [-1, 1]) {
      const peopleCount = 4 + Math.floor(Math.random() * 4);
      for (let i = 0; i < peopleCount; i++) {
        const z = centerZ + half - Math.random() * SECTION_LENGTH;
        const x = side * (ROAD_WIDTH / 2 + 1.1 + Math.random() * 0.4);
        sectionGroup.add(buildPerson(x, z, side));
      }
    }
  } else if (type === 'tunnel') {
    const tunnelFront = centerZ + half * 0.15;
    const tunnelBack = centerZ - half;
    const tunnelLength = tunnelFront - tunnelBack;
    const tunnelCenter = (tunnelFront + tunnelBack) / 2;

    sectionGroup.add(buildTunnelWall(-1, tunnelCenter, tunnelLength));
    sectionGroup.add(buildTunnelWall(1, tunnelCenter, tunnelLength));
    sectionGroup.add(buildTunnelRoof(tunnelCenter, tunnelLength));
    sectionGroup.add(buildTunnelLights(-1, tunnelCenter, tunnelLength));
    sectionGroup.add(buildTunnelLights(1, tunnelCenter, tunnelLength));
  } else if (type === 'bridge') {
    sectionGroup.add(buildBridgeRailing(-1, centerZ));
    sectionGroup.add(buildBridgeRailing(1, centerZ));

    const pillarCount = 4;
    for (let i = 0; i < pillarCount; i++) {
      const pillarZ = centerZ + half - (i + 0.5) * (SECTION_LENGTH / pillarCount);
      [-1, 1].forEach((side) => {
        const pillarGeo = new THREE.BoxGeometry(0.4, 3.0, 0.4);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8a7a6a, roughness: 0.9 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(side * 4, -1.5, pillarZ);
        sectionGroup.add(pillar);
      });
    }

    sectionGroup.add(buildPalm(-8, centerZ + 10));
    sectionGroup.add(buildPalm(8, centerZ - 10));

    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = centerZ + half - Math.random() * SECTION_LENGTH;
        const x = side * (ROAD_WIDTH / 2 + 1.05);
        sectionGroup.add(buildPerson(x, z, side));
      }
    }
  } else if (type === 'railway') {
    sectionGroup.add(buildTrainTracks(-1, centerZ));
    sectionGroup.add(buildTrainTracks(1, centerZ));

    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = centerZ + half - 15 - i * 30;
        sectionGroup.add(buildRailwaySign(side * (ROAD_EDGE - 0.5), z));
      }
    }

    for (let i = 0; i < 2; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      sectionGroup.add(buildBuilding(3, 3 + Math.random() * 2, 3, side * 9, z, side));
    }

    const train = buildTrain();
    const trainSide = Math.random() < 0.5 ? -1 : 1;
    const trainX = trainSide * (ROAD_WIDTH / 2 + 3.0);
    train.position.set(trainX, 0, centerZ + 20);
    train.userData.isTrain = true;
    train.userData.trainSpeed = 25 + Math.random() * 15;
    train.userData.trainSide = trainSide;
    sectionGroup.add(train);

    for (let side of [-1, 1]) {
      for (let i = 0; i < 2; i++) {
        const z = centerZ + half - Math.random() * SECTION_LENGTH;
        const x = side * (ROAD_WIDTH / 2 + 1.15);
        sectionGroup.add(buildPerson(x, z, side));
      }
    }
  } else if (type === 'rural') {
    sectionGroup.add(buildDirtGround(6, -7, centerZ));
    sectionGroup.add(buildDirtGround(6, 7, centerZ));

    for (let i = 0; i < 12; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = side * (ROAD_EDGE + 0.5 + Math.random() * 3);
      sectionGroup.add(buildBush(x, z));
    }
    for (let i = 0; i < 6; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = side * (ROAD_EDGE + 1 + Math.random() * 2);
      sectionGroup.add(buildPalm(x, z));
    }

    const side = Math.random() < 0.5 ? -1 : 1;
    sectionGroup.add(buildBuilding(2.5, 2.0, 2.5, side * 8, centerZ, side));

    for (let i = 0; i < 2; i++) {
      const pside = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = pside * (ROAD_WIDTH / 2 + 1.1);
      sectionGroup.add(buildPerson(x, z, pside));
    }
  } else if (type === 'beach') {
    sectionGroup.add(buildSandPatch(6, -7, centerZ));
    sectionGroup.add(buildSandPatch(6, 7, centerZ));

    sectionGroup.add(buildBeachWater(-14, centerZ));
    sectionGroup.add(buildBeachWater(14, centerZ));

    for (let i = 0; i < 8; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = side * (ROAD_EDGE + 0.5 + Math.random() * 2);
      sectionGroup.add(buildPalm(x, z));
    }

    for (let i = 0; i < 3; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const z = centerZ + (Math.random() - 0.5) * SECTION_LENGTH;
      const x = side * (ROAD_EDGE + 0.3);
      sectionGroup.add(buildUmbrella(x, z));
    }

    for (let side of [-1, 1]) {
      const peopleCount = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < peopleCount; i++) {
        const z = centerZ + half - Math.random() * SECTION_LENGTH;
        const x = side * (ROAD_WIDTH / 2 + 1 + Math.random() * 1.5);
        sectionGroup.add(buildPerson(x, z, side));
      }
    }
  } else if (type === 'fork') {
    sectionGroup.add(buildDirectionSign(-3.5, 3.0, centerZ, 'TUNNEL', '#2b2b2b', '#ffee88'));
    sectionGroup.add(buildDirectionSign(3.5, 3.0, centerZ, 'CITY', '#2b8d3a', '#ffffff'));
    sectionGroup.add(buildArrow(-3.5, 0.3, centerZ - 4, 0xffdd44, false));
    sectionGroup.add(buildArrow(3.5, 0.3, centerZ - 4, 0x55dd88, true));
    sectionGroup.add(buildForkTunnelEntrance(centerZ - 20));

    for (let i = 0; i < 3; i++) {
      const z = centerZ + half - 5 - i * 8;
      sectionGroup.add(buildBuilding(3 + Math.random() * 1.5, 3 + Math.random() * 2, 3, 7.5, z, 1));
    }

    sectionGroup.add(buildPalm(-7.5, centerZ + 5));
    sectionGroup.add(buildPalm(7.5, centerZ + 5));
  }
}

function createSection(centerZ, type) {
  const group = new THREE.Group();
  group.userData.type = type;
  group.userData.centerZ = centerZ;
  populateSection(group, type, centerZ);
  scene.add(group);
  sections.push(group);
  return group;
}

function initializeSections() {
  sections.forEach((s) => scene.remove(s));
  sections.length = 0;

  createSection(SECTION_LENGTH, 'city');
  createSection(0, 'city');
  createSection(-SECTION_LENGTH, 'city');

  forkActive = false;
  forkResolved = false;
  forkChoice = null;
  forkPendingNextType = null;
  sectionsSinceLastFork = 0;
  lastSectionType = 'city';

  applyFogForType('city');
  currentSectionType = 'city';
}

let targetFogNear = OPEN_FOG_NEAR;
let targetFogFar = OPEN_FOG_FAR;
let targetFogColor = 0xf5c98a;
let targetBgColor = 0xf5c98a;
let targetAmbient = 0.15;
let targetSun = 0.4;

function applyFogForType(type) {
  if (type === 'tunnel') {
    targetFogNear = TUNNEL_FOG_NEAR;
    targetFogFar = TUNNEL_FOG_FAR;
    targetFogColor = 0x1a1208;
    targetBgColor = 0x1a1208;
    targetAmbient = 0.1;
    targetSun = 0.05;
  } else if (type === 'beach') {
    targetFogNear = BEACH_FOG_NEAR;
    targetFogFar = BEACH_FOG_FAR;
    targetFogColor = 0x9fd0e8;
    targetBgColor = 0x9fd0e8;
    targetAmbient = 0.22;
    targetSun = 0.5;
  } else if (type === 'rural') {
    targetFogNear = 40;
    targetFogFar = 85;
    targetFogColor = 0xf0d8a0;
    targetBgColor = 0xf0d8a0;
    targetAmbient = 0.18;
    targetSun = 0.45;
  } else if (type === 'bridge') {
    targetFogNear = 40;
    targetFogFar = 80;
    targetFogColor = 0xc8dce8;
    targetBgColor = 0xc8dce8;
    targetAmbient = 0.15;
    targetSun = 0.42;
  } else {
    targetFogNear = OPEN_FOG_NEAR;
    targetFogFar = OPEN_FOG_FAR;
    targetFogColor = 0xf5c98a;
    targetBgColor = 0xf5c98a;
    targetAmbient = 0.15;
    targetSun = 0.4;
  }
}

function updateFogTransition(delta) {
  const t = Math.min(1, delta * 4);

  scene.fog.near += (targetFogNear - scene.fog.near) * t;
  scene.fog.far += (targetFogFar - scene.fog.far) * t;

  scene.fog.color.lerp(new THREE.Color(targetFogColor), t);

  ambientLight.intensity += (targetAmbient - ambientLight.intensity) * t;
  sunLight.intensity += (targetSun - sunLight.intensity) * t;
}

function updateSections(effectiveSpeed, delta) {
  const moveAmount = effectiveSpeed * delta;

  for (let i = 0; i < sections.length; i++) {
    sections[i].position.z += moveAmount;
  }

  const time = performance.now() / 1000;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    for (let j = 0; j < section.children.length; j++) {
      const child = section.children[j];
      if (child.userData.isPerson) {
        const bob = Math.sin(time * 2 + child.userData.bobPhase) * 0.03;
        child.position.y = bob;
      }
      if (child.userData.isTrain) {
        child.position.z -= child.userData.trainSpeed * delta;
        if (child.position.z < -SECTION_LENGTH / 2 - 20) {
          child.position.z = SECTION_LENGTH / 2 + 20;
        }
      }
    }
  }

  const recycleThreshold = SECTION_LENGTH / 2 + SECTION_LENGTH;

  let nearestType = 'city';
  let nearestZ = Infinity;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];

    if (section.position.z > recycleThreshold) {
      let newType;

      if (forkPendingNextType) {
        newType = forkPendingNextType;
        forkPendingNextType = null;
        sectionsSinceLastFork = 0;
      } else {
        sectionsSinceLastFork++;
        if (sectionsSinceLastFork >= SECTIONS_BETWEEN_FORKS) {
          newType = 'fork';
        } else {
          newType = SECTION_TYPES[Math.floor(Math.random() * SECTION_TYPES.length)];
          if (SECTION_TYPES.length > 1 && newType === lastSectionType) {
            newType = SECTION_TYPES[Math.floor(Math.random() * SECTION_TYPES.length)];
          }
        }
      }
      lastSectionType = newType;

      let minCenter = Infinity;
      sections.forEach((s) => {
        if (s !== section) minCenter = Math.min(minCenter, s.position.z);
      });

      const newCenterZ = minCenter - SECTION_LENGTH;

      section.position.z = newCenterZ;
      section.userData.type = newType;
      populateSection(section, newType, newCenterZ);
    }

    const distToCamera = Math.abs(section.position.z);
    if (distToCamera < nearestZ) {
      nearestZ = distToCamera;
      nearestType = section.userData.type;
    }
  }

  const wasFork = forkActive;
  const isFork = nearestType === 'fork';
  forkActive = isFork;

  if (isFork && !wasFork) {
    forkResolved = false;
    forkChoice = null;
  }

  const nearestSection = sections.reduce((closest, s) => {
    return Math.abs(s.position.z) < Math.abs(closest.position.z) ? s : closest;
  }, sections[0]);
  const showWater = (nearestSection && (nearestSection.userData.type === 'bridge' || nearestSection.userData.type === 'beach'));
  waterPlane.visible = showWater;
  if (showWater) {
    waterPlane.position.z = nearestSection.position.z - 20;
  }

  const fogType = (nearestType === 'tunnel') ? 'tunnel' : nearestType;
  if (fogType !== currentSectionType) {
    currentSectionType = fogType;
    applyFogForType(fogType);
  }
}

initializeSections();

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
    opacity: 0.4,
    depthWrite: false,
  })
);
shadowDisc.rotation.x = -Math.PI / 2;
shadowDisc.position.y = 0.12;
scene.add(shadowDisc);

const shieldBubble = new THREE.Mesh(
  new THREE.SphereGeometry(1.2, 16, 12),
  new THREE.MeshBasicMaterial({
    color: 0x55bbff,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  })
);
shieldBubble.position.y = 1.1;
shieldBubble.visible = false;
player.add(shieldBubble);

const magnetRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.6, 0.06, 8, 24),
  new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.7,
  })
);
magnetRing.rotation.x = Math.PI / 2;
magnetRing.position.y = 0.6;
magnetRing.visible = false;
player.add(magnetRing);

let characterModel = null;
let mixer = null;
const actions = {};
let currentAction = null;

// ---------------------------------------------------------------
// 7a. DUST PARTICLES
// ---------------------------------------------------------------
const DUST_COUNT = 30;
const dustGeometry = new THREE.BufferGeometry();
const dustPositions = new Float32Array(DUST_COUNT * 3);
const dustLife = new Float32Array(DUST_COUNT);
for (let i = 0; i < DUST_COUNT; i++) {
  dustPositions[i * 3 + 0] = 0;
  dustPositions[i * 3 + 1] = 0;
  dustPositions[i * 3 + 2] = 0;
  dustLife[i] = 0;
}
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

const dustCanvas = document.createElement('canvas');
dustCanvas.width = 64;
dustCanvas.height = 64;
const dustCtx = dustCanvas.getContext('2d');
const dustGrad = dustCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
dustGrad.addColorStop(0.0, 'rgba(216, 176, 120, 1)');
dustGrad.addColorStop(0.4, 'rgba(216, 176, 120, 0.6)');
dustGrad.addColorStop(1.0, 'rgba(216, 176, 120, 0)');
dustCtx.fillStyle = dustGrad;
dustCtx.fillRect(0, 0, 64, 64);
const dustTexture = new THREE.CanvasTexture(dustCanvas);

const dustMaterial = new THREE.PointsMaterial({
  size: 0.55,
  map: dustTexture,
  transparent: true,
  opacity: 0.75,
  depthWrite: false,
  sizeAttenuation: true,
  blending: THREE.NormalBlending,
});
const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
scene.add(dustPoints);

let dustSpawnTimer = 0;

function spawnDustPuff(x, y, z) {
  for (let i = 0; i < DUST_COUNT; i++) {
    if (dustLife[i] <= 0) {
      dustPositions[i * 3 + 0] = x + (Math.random() - 0.5) * 0.4;
      dustPositions[i * 3 + 1] = y + Math.random() * 0.2;
      dustPositions[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
      dustLife[i] = 1.0;
      dustGeometry.attributes.position.needsUpdate = true;
      return;
    }
  }
}


// ---------------------------------------------------------------
// 7b. HAIR BUILDER (attaches to the model head)
// ---------------------------------------------------------------
// We don't have a head bone reference from the loaded model,
// so we attach hair to the player group as a separate mesh
// positioned at the top of the character.
function buildHair(style, color) {
  const group = new THREE.Group();
  group.name = '__hairGroup';

  const hairMat = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.8,
    metalness: 0.1,
  });

  if (style === 'shortafro') {
    const geo = new THREE.SphereGeometry(0.22, 12, 10);
    const hair = new THREE.Mesh(geo, hairMat);
    hair.scale.set(1, 0.85, 1);
    hair.position.set(0, 0.15, 0);
    group.add(hair);
  } else if (style === 'buzz') {
    const geo = new THREE.SphereGeometry(0.21, 12, 10);
    const hair = new THREE.Mesh(geo, hairMat);
    hair.scale.set(1, 0.55, 1);
    hair.position.set(0, 0.15, 0);
    group.add(hair);
  } else if (style === 'braids') {
    const capGeo = new THREE.SphereGeometry(0.22, 12, 10);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.scale.set(1, 0.9, 1);
    cap.position.set(0, 0.15, 0);
    group.add(cap);

    for (let i = 0; i < 6; i++) {
      const bGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.5, 6);
      const braid = new THREE.Mesh(bGeo, hairMat);
      const angle = (i / 6) * Math.PI * 1.2 - Math.PI * 0.6;
      braid.position.set(
        Math.sin(angle) * 0.18,
        -0.15,
        -0.1 - Math.cos(angle) * 0.15
      );
      braid.rotation.x = 0.2;
      group.add(braid);
    }
  } else if (style === 'bigafro') {
    const geo = new THREE.SphereGeometry(0.3, 14, 12);
    const hair = new THREE.Mesh(geo, hairMat);
    hair.scale.set(1, 0.95, 1);
    hair.position.set(0, 0.18, 0);
    group.add(hair);
  }

  return group;
}

function buildAccessory(accessory, color) {
  const group = new THREE.Group();
  group.name = '__accessoryGroup';

  if (!accessory) return group;

  if (accessory === 'cap') {
    // Baseball cap — dome + flat brim
    const domeGeo = new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.1,
    });
    const dome = new THREE.Mesh(domeGeo, capMat);
    dome.position.set(0, 0.18, 0);
    group.add(dome);

    const brimGeo = new THREE.BoxGeometry(0.32, 0.02, 0.18);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 0.18, 0.18);
    group.add(brim);
  } else if (accessory === 'sunglasses') {
    // Two dark lenses + bridge
    const lensGeo = new THREE.BoxGeometry(0.09, 0.05, 0.02);
    const lensMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.2,
      metalness: 0.7,
    });
    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.07, 0.08, 0.16);
    group.add(leftLens);

    const rightLens = new THREE.Mesh(lensGeo, lensMat);
    rightLens.position.set(0.07, 0.08, 0.16);
    group.add(rightLens);

    const bridgeGeo = new THREE.BoxGeometry(0.05, 0.015, 0.02);
    const bridge = new THREE.Mesh(bridgeGeo, lensMat);
    bridge.position.set(0, 0.08, 0.16);
    group.add(bridge);
  } else if (accessory === 'headband') {
    // Torus ring around forehead
    const bandGeo = new THREE.TorusGeometry(0.21, 0.025, 8, 24);
    const bandMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.2,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.16, 0);
    group.add(band);
  } else if (accessory === 'flower') {
    // Small flower on the side of the hair
    const petalGeo = new THREE.SphereGeometry(0.045, 8, 6);
    const petalMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.15,
    });
    // 5 petals arranged in a circle
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, petalMat);
      petal.position.set(
        0.22 + Math.cos(angle) * 0.05,
        0.22 + Math.sin(angle) * 0.05,
        0.05
      );
      group.add(petal);
    }
    // Center of flower
    const centerGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      emissive: 0xffeb3b,
      emissiveIntensity: 0.3,
    });
    const center = new THREE.Mesh(centerGeo, centerMat);
    center.position.set(0.22, 0.22, 0.05);
    group.add(center);
  }

  return group;
}


// ---------------------------------------------------------------
// 7c. APPLY CHARACTER LOOK — tints the model
// ---------------------------------------------------------------
// This runs after the GLTF is loaded. It tries to tint different
// mesh parts based on their names, but if the rig is one single mesh
// it falls back to tinting the whole thing with the skin color.
function applyCharacterLook(character) {
  if (!characterModel) return;

     // Remove any existing hair + accessories — search the whole tree
  const toRemove = [];
  characterModel.traverse((child) => {
    if (child.name === '__hairGroup' || child.name === '__accessoryGroup') {
      toRemove.push(child);
    }
  });
  toRemove.forEach((h) => {
    if (h.parent) h.parent.remove(h);
  });

  // Update the base scale (for male/female size difference)
  characterModel.scale.set(character.scale, character.scale, character.scale);

  // Walk through all meshes and try to color them by name
  const meshes = [];
  characterModel.traverse((child) => {
    if (child.isMesh && child.material) {
      meshes.push(child);
    }
  });

  // Try to identify parts by name
  let bodyMesh = null;
  let headMesh = null;
  let legsMesh = null;
  let feetMesh = null;

  meshes.forEach((m) => {
    const n = m.name.toLowerCase();
    if (n.includes('head')) headMesh = m;
    else if (n.includes('body') || n.includes('torso') || n.includes('chest')) bodyMesh = m;
    else if (n.includes('leg')) legsMesh = m;
    else if (n.includes('feet') || n.includes('foot')) feetMesh = m;
  });

  // If we found at least body + head, we can do proper separate coloring
  if (bodyMesh || headMesh || legsMesh) {
    if (bodyMesh) {
      bodyMesh.material = new THREE.MeshStandardMaterial({
        color: character.shirt,
        roughness: 0.85,
        metalness: 0.05,
        skinning: true,
      });
    }
    if (headMesh) {
      headMesh.material = new THREE.MeshStandardMaterial({
        color: character.skin,
        roughness: 0.9,
        metalness: 0.0,
        skinning: true,
      });
    }
    if (legsMesh) {
      legsMesh.material = new THREE.MeshStandardMaterial({
        color: character.trousers,
        roughness: 0.9,
        metalness: 0.0,
        skinning: true,
      });
    }
    if (feetMesh) {
      feetMesh.material = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.7,
        metalness: 0.1,
        skinning: true,
      });
    }
  } else {
    // Fallback: the rig is one mesh. Tint the whole thing with skin tone.
    meshes.forEach((m) => {
      if (m.name.toLowerCase().includes('joint') ||
          m.name.toLowerCase().includes('marker') ||
          m.material.name?.toLowerCase().includes('joint')) {
        m.visible = false;
        return;
      }
      m.material = new THREE.MeshStandardMaterial({
        color: character.skin,
        roughness: 0.9,
        metalness: 0.05,
        skinning: true,
      });
    });
  }
  // Add hair + accessory on top — attach to head bone for natural movement
  const hair = buildHair(character.hairStyle, character.hairColor);
  hair.name = '__hairGroup';

  const accessory = buildAccessory(character.accessory, character.accessoryColor);
  accessory.name = '__accessoryGroup';

  let headBone = null;
  characterModel.traverse((child) => {
    if (child.isBone) {
      const n = child.name.toLowerCase();
      if (n.includes('head') && !n.includes('top')) {
        headBone = child;
      }
    }
  });

  if (headBone) {
    hair.position.set(0, 0.15, 0);
    headBone.add(hair);

    accessory.position.set(0, 0.15, 0);
    headBone.add(accessory);
  } else {
    characterModel.add(hair);
    characterModel.add(accessory);
  }

  // Store the character on the model for later reference
  characterModel.userData.characterId = character.id;
}
    
// ---------------------------------------------------------------
// 8. TUNING
// ---------------------------------------------------------------
const GROUND_Y = 0;
const GRAVITY = -32;
const JUMP_VELOCITY = 17;
const SLIDE_DURATION = 0.9;
const SLIDE_HEIGHT_SCALE = 0.4;
const LANE_SLIDE_SPEED = 22;

const START_WORLD_SPEED = 12;
const MAX_WORLD_SPEED = 24;
const SPEED_INCREASE_PER_SECOND = 0.3;

// ---------------------------------------------------------------
// 9. OBSTACLE CONSTANTS
// ---------------------------------------------------------------
const SPAWN_Z = -80;
const DESPAWN_Z = 15;
const SPAWN_INTERVAL = 1.3;

const TYRE_STACK_HEIGHT = 0.85;
const AWNING_BOTTOM = 1.4;
const AWNING_HEIGHT = 1.6;
const KEKE_WIDTH = 1.6;
const KEKE_DEPTH = 2.0;
const obstacleDepth = 1.4;

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
  emissive: 0xffaa00,
  emissiveIntensity: 0.9,
  metalness: 0.7,
  roughness: 0.3,
});

// ---------------------------------------------------------------
// 10b. POWER-UP CONSTANTS
// ---------------------------------------------------------------
const POWERUP_TYPES = ['magnet', 'shield', 'speed', 'double'];

const POWERUP_DURATIONS = {
  magnet: 8,
  shield: Infinity,
  speed: 3,
  double: 10,
};

const POWERUP_ICONS = {
  magnet: '🧲',
  shield: '🛡️',
  speed: '⚡',
  double: '💰',
};

const POWERUP_LABELS = {
  magnet: 'MAGNET',
  shield: 'SHIELD',
  speed: 'SPEED',
  double: '2× SCORE',
};

const POWERUP_SPAWN_INTERVAL = 10;
const POWERUP_SPAWN_Z = -80;

const POWERUP_COLORS = {
  magnet: 0xffcc00,
  shield: 0x55bbff,
  speed: 0xff5544,
  double: 0x55dd88,
};

const powerupGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);

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
let powerupSpawnTimer;
let score;
let obstacles;
let coins;
let powerups;
let coinSpin;

// Mission stat tracking (reset every run)
let runCoins = 0;
let runDistance = 0;
let runPowerups = 0;

let worldSpeed;
let runTime;
let speedLevel;

let playerVisualY = 0;

let gameState = 'loading';
const activePowerups = {
  magnet: 0,
  shield: 0,
  speed: 0,
  double: 0,
};

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

const powerupHud = document.getElementById('powerup-hud');

const scoreEl = document.getElementById('score');
const loadingScreenEl = document.getElementById('loading-screen');
const loadingBarFillEl = document.getElementById('loading-bar-fill');
const loadingTextEl = document.getElementById('loading-text');
const mainMenuEl = document.getElementById('main-menu');
const menuBestEl = document.getElementById('menu-best');
const settingsMenuEl = document.getElementById('settings-menu');
const pauseMenuEl = document.getElementById('pause-menu');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');
const characterSelectEl = document.getElementById('character-select');
const characterListEl = document.getElementById('character-list');
const characterSelectBtn = document.getElementById('character-select-btn');
const characterConfirmBtn = document.getElementById('character-confirm-btn');
const characterSelectBackBtn = document.getElementById('character-select-back');

const playBtn = document.getElementById('play-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsBackBtn = document.getElementById('settings-back');
const toggleSfxBtn = document.getElementById('toggle-sfx');
const toggleMusicBtn = document.getElementById('toggle-music');
const toggleGfxBtn = document.getElementById('toggle-gfx');
const toggleBloomBtn = document.getElementById('toggle-bloom');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const pauseQuitBtn = document.getElementById('pause-quit-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

function flashHud(text) {
  hud.textContent = text;
}

function showScreen(el) {
  [
    loadingScreenEl,
    mainMenuEl,
    settingsMenuEl,
    pauseMenuEl,
    gameOverEl,
    characterSelectEl,
    missionsMenuEl,
  ].forEach((o) => {
    if (o) o.classList.add('hidden');
  });
  if (el) el.classList.remove('hidden');
}

function updatePauseBtnVisibility() {
  if (gameState === 'playing') {
    pauseBtn.classList.remove('hidden');
  } else {
    pauseBtn.classList.add('hidden');
  }
}

// ---------------------------------------------------------------
// 12a. MISSIONS SCREEN UI
// ---------------------------------------------------------------
const missionsMenuEl = document.getElementById('missions-menu');
const missionsListEl = document.getElementById('missions-list');
const careerStatsEl = document.getElementById('career-stats');
const missionsBtn = document.getElementById('missions-btn');
const missionsBackBtn = document.getElementById('missions-back');

function buildMissionsScreen() {
  missionsListEl.innerHTML = '';

  activeMissions.forEach((mission) => {
    const card = document.createElement('div');
    card.className = 'mission-card';

    const current = getMissionStat(mission.stat);
    const pct = Math.min(100, (current / mission.goal) * 100);

    card.innerHTML =
      '<div class="mission-title">' + mission.title + '</div>' +
      '<div class="mission-desc">' + mission.desc + '</div>' +
      '<div class="mission-progress-bar">' +
        '<div class="mission-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>' +
      '<div class="mission-progress-text">' +
        Math.min(current, mission.goal) + ' / ' + mission.goal +
      '</div>';

    missionsListEl.appendChild(card);
  });

  careerStatsEl.innerHTML =
    '<div class="stat-row"><span>🪙 Total coins</span><span class="stat-value">' +
      careerStats.totalCoins + '</span></div>' +
    '<div class="stat-row"><span>🏃 Total runs</span><span class="stat-value">' +
      careerStats.totalRuns + '</span></div>' +
    '<div class="stat-row"><span>📏 Total distance</span><span class="stat-value">' +
      Math.floor(careerStats.totalDistance) + ' m</span></div>' +
    '<div class="stat-row"><span>🏆 Longest run</span><span class="stat-value">' +
      Math.floor(careerStats.longestRun) + ' m</span></div>' +
    '<div class="stat-row"><span>⭐ Best score</span><span class="stat-value">' +
      getBestScore() + '</span></div>';
}

function openMissionsScreen() {
  buildMissionsScreen();
  gameState = 'missions';
  showScreen(missionsMenuEl);
  updatePauseBtnVisibility();
}

function closeMissionsScreen() {
  gameState = 'menu';
  showScreen(mainMenuEl);
  updatePauseBtnVisibility();
}

// ---------------------------------------------------------------
// MISSION COMPLETE POPUP
// ---------------------------------------------------------------
let missionPopupEl = null;

function ensureMissionPopup() {
  if (missionPopupEl) return missionPopupEl;
  missionPopupEl = document.createElement('div');
  missionPopupEl.id = 'mission-popup';
  missionPopupEl.innerHTML =
    '<span class="popup-small">🎯 MISSION COMPLETE</span>' +
    '<span class="popup-big"></span>';
  document.body.appendChild(missionPopupEl);
  return missionPopupEl;
}

function showMissionComplete(title) {
  const el = ensureMissionPopup();
  el.querySelector('.popup-big').textContent = title;
  el.classList.add('show');

  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.classList.remove('show');
  }, 2500);
}

// ---------------------------------------------------------------
// 12b. CHARACTER SELECTION SCREEN
// ---------------------------------------------------------------
let pendingCharacter = activeCharacter; // what's currently highlighted

function buildCharacterCards() {
  characterListEl.innerHTML = '';

  CHARACTERS.forEach((char) => {
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.charId = char.id;

    if (char.id === pendingCharacter.id) {
      card.classList.add('selected');
    }

    const portrait = document.createElement('div');
    portrait.className = 'character-portrait';
    portrait.style.background =
      'radial-gradient(circle at 50% 30%, ' + char.uiColor + '55, ' + char.uiColor + '22)';
    portrait.textContent = char.gender === 'girl' ? '👧' : '👦';

    const name = document.createElement('div');
    name.className = 'character-name';
    name.textContent = char.name;

    const tagline = document.createElement('div');
    tagline.className = 'character-tagline';
    tagline.textContent = char.tagline;

    card.appendChild(portrait);
    card.appendChild(name);
    card.appendChild(tagline);

    card.addEventListener('click', () => {
      pendingCharacter = char;
      document.querySelectorAll('.character-card').forEach((c) => {
        c.classList.toggle('selected', c.dataset.charId === char.id);
      });
    });

    characterListEl.appendChild(card);
  });
}

function openCharacterSelect() {
  pendingCharacter = activeCharacter;
  buildCharacterCards();
  gameState = 'characterSelect';
  showScreen(characterSelectEl);
  updatePauseBtnVisibility();
}

function confirmCharacterSelect() {
  activeCharacter = pendingCharacter;
  setSelectedCharacter(activeCharacter.id);

  // Apply the new look
  if (characterModel) {
    applyCharacterLook(activeCharacter);
  }

  gameState = 'menu';
  showScreen(mainMenuEl);
  updatePauseBtnVisibility();
  flashHud('You are ' + activeCharacter.name + '!');
}

// ---------------------------------------------------------------
// 12c. POWER-UP HUD
// ---------------------------------------------------------------
const powerupHudItems = {};

function makePowerupHudItem(name) {
  const item = document.createElement('div');
  item.className = 'powerup-item ' + name;

  const icon = document.createElement('span');
  icon.className = 'powerup-icon';
  icon.textContent = POWERUP_ICONS[name];

  const bar = document.createElement('div');
  bar.className = 'powerup-bar-outer';
  const fill = document.createElement('div');
  fill.className = 'powerup-bar-fill';
  bar.appendChild(fill);

  item.appendChild(icon);
  item.appendChild(bar);

  powerupHud.appendChild(item);

  return { item, fill };
}

function updatePowerupHud() {
  for (const name of POWERUP_TYPES) {
    const remaining = activePowerups[name];
    const isActive = remaining > 0;
    const ref = powerupHudItems[name];
    if (!ref) continue;

    if (!isActive) {
      if (ref.item.parentNode) {
        ref.item.parentNode.removeChild(ref.item);
      }
    } else {
      if (!ref.item.parentNode) {
        powerupHud.appendChild(ref.item);
      }
      const max = POWERUP_DURATIONS[name];
      const pct = max === Infinity ? 100 : (remaining / max) * 100;
      ref.fill.style.width = pct + '%';
    }
  }
}

function activatePowerup(name) {
  if (name === 'shield') {
    activePowerups.shield = 1;
    shieldBubble.visible = true;
  } else {
    activePowerups[name] = POWERUP_DURATIONS[name];
    if (name === 'magnet') magnetRing.visible = true;
  }
  playSound('powerup');
  flashHud(POWERUP_ICONS[name] + ' ' + POWERUP_LABELS[name] + '!');
}

function deactivatePowerup(name) {
  activePowerups[name] = 0;
  if (name === 'shield') shieldBubble.visible = false;
  if (name === 'magnet') magnetRing.visible = false;
}

// ---------------------------------------------------------------
// 13. SETTINGS
// ---------------------------------------------------------------
const BEST_KEY = 'nigerianRunner.bestScore';
const SETTINGS_KEY = 'nigerianRunner.settings';

let sfxEnabled = true;
let musicEnabled = true;
let gfxEnabled = true;
let bloomEnabled = false;

function getBestScore() {
  const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
  return isNaN(v) ? 0 : v;
}

function setBestScore(v) {
  localStorage.setItem(BEST_KEY, String(v));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.sfxEnabled === 'boolean') sfxEnabled = s.sfxEnabled;
    if (typeof s.musicEnabled === 'boolean') musicEnabled = s.musicEnabled;
    if (typeof s.gfxEnabled === 'boolean') gfxEnabled = s.gfxEnabled;
    if (typeof s.bloomEnabled === 'boolean') bloomEnabled = s.bloomEnabled;
  } catch (e) {}
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ sfxEnabled, musicEnabled, gfxEnabled, bloomEnabled })
  );
}

function updateSettingsUI() {
  toggleSfxBtn.textContent = sfxEnabled ? 'ON' : 'OFF';
  toggleSfxBtn.classList.toggle('off', !sfxEnabled);
  toggleMusicBtn.textContent = musicEnabled ? 'ON' : 'OFF';
  toggleMusicBtn.classList.toggle('off', !musicEnabled);
  toggleGfxBtn.textContent = gfxEnabled ? 'ON' : 'OFF';
  toggleGfxBtn.classList.toggle('off', !gfxEnabled);
  toggleBloomBtn.textContent = bloomEnabled ? 'ON' : 'OFF';
  toggleBloomBtn.classList.toggle('off', !bloomEnabled);

  vignettePass.enabled = gfxEnabled;
  fxaaPass.enabled = gfxEnabled;
  bloomPass.enabled = bloomEnabled;
}

// ---------------------------------------------------------------
// 14. CHARACTER LOADING
// ---------------------------------------------------------------
const CHARACTER_URL = 'https://seb-creator01.github.io/NigerianRunner/UAL1_Standard.glb';

const CHARACTER_ROTATION_Y = Math.PI;
const ANIM_RUN = 'Jog_Fwd_Loop';

const loader = new GLTFLoader();

let characterReady = false;

playBtn.disabled = true;

function setLoadingProgress(pct) {
  const clamped = Math.max(0, Math.min(100, pct));
  loadingBarFillEl.style.width = clamped + '%';
  loadingTextEl.textContent = 'Loading… ' + Math.floor(clamped) + '%';
}

function showLoadError(msg) {
  loadingTextEl.innerHTML =
    '⚠️ Could not load character.<br><small>' +
    (msg || 'Unknown error') +
    '</small>';
  loadingBarFillEl.style.background = '#cc2222';
  loadingBarFillEl.style.width = '100%';
}

function finishLoading() {
  characterReady = true;
  playBtn.disabled = false;
  gameState = 'menu';

  loadingScreenEl.classList.add('fade-out');
  setTimeout(() => {
    loadingScreenEl.classList.remove('fade-out');
    showScreen(mainMenuEl);
    updatePauseBtnVisibility();
  }, 450);
}

loader.load(
  CHARACTER_URL,
  (gltf) => {
    characterModel = gltf.scene;

    characterModel.position.y = 0;
    characterModel.rotation.y = CHARACTER_ROTATION_Y;
    characterModel.scale.set(
      activeCharacter.scale,
      activeCharacter.scale,
      activeCharacter.scale
    );

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

    // Apply the character's colors and hair
    applyCharacterLook(activeCharacter);

    setLoadingProgress(100);
    setTimeout(finishLoading, 250);
  },
  (progress) => {
    if (progress.total && progress.total > 0) {
      const rawPct = (progress.loaded / progress.total) * 100;
      setLoadingProgress(Math.min(rawPct, 99));
    }
  },
  (err) => {
    console.error('Failed to load character:', err);
    const msg = err && err.message ? err.message : String(err);
    showLoadError(msg);
    setTimeout(finishLoading, 2500);
  }
);

setTimeout(() => {
  if (!characterReady) {
    console.warn('Character load timed out');
    loadingTextEl.innerHTML =
      '⚠️ Loading is taking too long.<br>' +
      '<small>Check your connection. Reload to try again.</small>';
    loadingBarFillEl.style.background = '#cc2222';
  }
}, 15000);

// ---------------------------------------------------------------
// 15. OBSTACLE FACTORY
// ---------------------------------------------------------------
function makeTyreStack() {
  const group = new THREE.Group();

  const tyreGeo = new THREE.TorusGeometry(0.4, 0.16, 8, 16);
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });

  const count = 4;
  for (let i = 0; i < count; i++) {
    const tyre = new THREE.Mesh(tyreGeo, tyreMat);
    tyre.rotation.x = Math.PI / 2;
    tyre.rotation.z = (i * 0.7) % (Math.PI * 2);
    tyre.position.y = 0.16 + i * 0.18;
    tyre.rotation.y = (i - count / 2) * 0.08;
    group.add(tyre);
  }

  const ropeGeo = new THREE.BoxGeometry(0.9, 0.02, 0.02);
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8b6b3a });
  const rope = new THREE.Mesh(ropeGeo, ropeMat);
  rope.position.y = 0.9;
  group.add(rope);

  return group;
}

function makeAwning() {
  const group = new THREE.Group();

  const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, AWNING_BOTTOM + AWNING_HEIGHT, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
  const poleLeft = new THREE.Mesh(poleGeo, poleMat);
  poleLeft.position.set(-0.75, (AWNING_BOTTOM + AWNING_HEIGHT) / 2, 0);
  group.add(poleLeft);

  const poleRight = new THREE.Mesh(poleGeo, poleMat);
  poleRight.position.set(0.75, (AWNING_BOTTOM + AWNING_HEIGHT) / 2, 0);
  group.add(poleRight);

  const stripWidth = 1.7 / 6;
  for (let i = 0; i < 6; i++) {
    const stripGeo = new THREE.BoxGeometry(stripWidth, 0.1, 1.0);
    const stripMat = new THREE.MeshStandardMaterial({
      color: i % 2 === 0 ? 0x0b8c3a : 0xf5f5f5,
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.set(-0.85 + stripWidth / 2 + i * stripWidth,
                       AWNING_BOTTOM + AWNING_HEIGHT / 2, 0);
    group.add(strip);
  }

  const signGeo = new THREE.BoxGeometry(0.4, 0.3, 0.05);
  const signMat = new THREE.MeshStandardMaterial({ color: 0xe0b070 });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(-0.9, AWNING_BOTTOM + 0.3, 0.55);
  group.add(sign);

  return group;
}

function makeObstacleMesh(type) {
  let group;

  if (type === 'low') {
    group = makeTyreStack();
  } else if (type === 'high') {
    group = makeAwning();
  } else {
    group = makeKekeNapep();
  }

  group.userData.type = type;
  return group;
}

function spawnObstacleRow() {
  if (activePowerups.speed > 0) return;
  if (forkActive) return;

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
// 16b. POWER-UP SPAWNING
// ---------------------------------------------------------------
function makePowerupCrate(type) {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: POWERUP_COLORS[type],
    emissive: POWERUP_COLORS[type],
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.4,
  });
  const cube = new THREE.Mesh(powerupGeometry, mat);
  group.add(cube);

  const edges = new THREE.EdgesGeometry(powerupGeometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  group.add(line);

  group.userData.type = type;
  group.userData.baseY = 1.3;
  group.userData.spin = 0;

  return group;
}

function spawnPowerup() {
  const lane = Math.floor(Math.random() * 3);
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];

  const crate = makePowerupCrate(type);
  crate.position.x = LANE_X[lane];
  crate.position.y = crate.userData.baseY;
  crate.position.z = POWERUP_SPAWN_Z;

  scene.add(crate);
  powerups.push(crate);
}

// ---------------------------------------------------------------
// 17. ACTIONS
// ---------------------------------------------------------------
function tryJump() {
  if (gameState !== 'playing') return;
  if (isJumping) return;
  if (isSliding) return;
  isJumping = true;
  velocityY = JUMP_VELOCITY;
  flashHud('Jump 👆');
  playSound('jump');
}

function trySlide() {
  if (gameState !== 'playing') return;
  if (isSliding) return;
  if (isJumping) return;
  isSliding = true;
  slideTimer = SLIDE_DURATION;
  flashHud('Slide 👇');
  playSound('slide');
}

function moveLane(direction) {
  if (gameState !== 'playing') return;
  if (direction === 'left' && currentLane > 0) {
    currentLane -= 1;
    if (forkActive && !forkResolved && currentLane === 0) {
      resolveFork('left');
    }
    flashHud('Lane ' + (currentLane + 1) + ' 👈');
    playSound('whoosh');
  } else if (direction === 'right' && currentLane < 2) {
    currentLane += 1;
    if (forkActive && !forkResolved && currentLane === 2) {
      resolveFork('right');
    }
    flashHud('Lane ' + (currentLane + 1) + ' 👉');
    playSound('whoosh');
  }
}

function resolveFork(side) {
  forkResolved = true;
  forkChoice = side;
  if (side === 'left') {
    forkPendingNextType = 'tunnel';
    flashHud('🚇 To the TUNNEL!');
  } else {
    forkPendingNextType = 'city';
    flashHud('🏙️ Staying in the CITY!');
  }
  playSound('powerup');
}

// ---------------------------------------------------------------
// 18. SWIPE DETECTION
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 10;
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(clientX, clientY) {
  touchStartX = clientX;
  touchStartY = clientY;
}

function handleTouchEnd(clientX, clientY) {
  if (gameState !== 'playing') return;

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
  if (activePowerups.speed > 0) return;

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
      const top = TYRE_STACK_HEIGHT;
      if (playerBottom < top) hit = true;
    } else if (o.userData.type === 'high') {
      const bottom = AWNING_BOTTOM;
      if (playerTop > bottom) hit = true;
    } else {
      hit = true;
    }

    if (hit) {
      if (activePowerups.shield > 0) {
        deactivatePowerup('shield');
        scene.remove(o);
        obstacles.splice(i, 1);
        flashHud('🛡️ Shield broken!');
        playSound('crash');
        return;
      }
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
    const mult = activePowerups.double > 0 ? 2 : 1;
    score += COIN_VALUE * mult;
    flashHud('+' + (COIN_VALUE * mult) + ' 🪙');
    playSound('coin');
  }
}

function checkPowerupPickups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    const p = powerups[i];

    const dz = Math.abs(p.position.z - player.position.z);
    if (dz > 1.0) continue;

    const dx = Math.abs(p.position.x - player.position.x);
    if (dx > 0.9) continue;

    const type = p.userData.type;
    activatePowerup(type);

    scene.remove(p);
    powerups.splice(i, 1);
  }
}

// ---------------------------------------------------------------
// 20. GAME OVER
// ---------------------------------------------------------------
function gameOver() {
  if (gameState !== 'playing') return;
  gameState = 'gameover';
  updatePauseBtnVisibility();

  const finalScore = Math.floor(score);
  const bestScore = getBestScore();

  if (finalScore > bestScore) {
    setBestScore(finalScore);
    bestScoreEl.textContent = 'Best: ' + finalScore + ' (NEW!)';
  } else {
    bestScoreEl.textContent = 'Best: ' + bestScore;
  }

  finalScoreEl.textContent = 'Score: ' + finalScore;
  showScreen(gameOverEl);
  flashHud('💥 GAME OVER');
  playSound('crash');
}

// ---------------------------------------------------------------
// 21. START / RESET / PAUSE / MENU
// ---------------------------------------------------------------
function startRun() {
  try {
    obstacles.forEach((o) => scene.remove(o));
    obstacles.length = 0;

    coins.forEach((c) => scene.remove(c));
    coins.length = 0;

    powerups.forEach((p) => scene.remove(p));
    powerups.length = 0;

    clearTraffic();

    for (const name of POWERUP_TYPES) deactivatePowerup(name);
    updatePowerupHud();

    currentLane = STARTING_LANE;
    player.position.set(LANE_X[STARTING_LANE], 0, 0);
    playerVisualY = 0;
    if (characterModel) {
      characterModel.scale.set(
        activeCharacter.scale,
        activeCharacter.scale,
        activeCharacter.scale
      );
    }

    isJumping = false;
    velocityY = 0;
    isSliding = false;
    slideTimer = 0;
    spawnTimer = 0;
    coinSpawnTimer = 0;
    powerupSpawnTimer = -4;
    score = 0;

    for (let i = 0; i < DUST_COUNT; i++) dustLife[i] = 0;
    dustGeometry.attributes.position.needsUpdate = true;

    worldSpeed = START_WORLD_SPEED;
    runTime = 0;
    speedLevel = 1;

    initializeSections();

    scoreEl.textContent = 'Score: 0';

    spawnTimer = -1.2;
    coinSpawnTimer = -0.6;

    gameState = 'playing';
    showScreen(null);
    updatePauseBtnVisibility();
    flashHud('Go, ' + activeCharacter.name + '! 🏃');
  } catch (err) {
    alert('startRun crashed: ' + err.message);
    console.error(err);
  }
}

function goToMainMenu() {
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;
  coins.forEach((c) => scene.remove(c));
  coins.length = 0;
  powerups.forEach((p) => scene.remove(p));
  powerups.length = 0;

  clearTraffic();

  for (const name of POWERUP_TYPES) deactivatePowerup(name);
  updatePowerupHud();

  player.position.set(LANE_X[STARTING_LANE], 0, 0);
  playerVisualY = 0;
  if (characterModel) {
    characterModel.scale.set(
      activeCharacter.scale,
      activeCharacter.scale,
      activeCharacter.scale
    );
  }

  isJumping = false;
  isSliding = false;
  velocityY = 0;
  slideTimer = 0;
  score = 0;
  worldSpeed = START_WORLD_SPEED;
  runTime = 0;
  speedLevel = 1;

  initializeSections();

  scoreEl.textContent = 'Score: 0';
  menuBestEl.textContent = 'Best Score: ' + getBestScore();

  gameState = 'menu';
  showScreen(mainMenuEl);
  updatePauseBtnVisibility();
  flashHud('Welcome 👋');
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  showScreen(pauseMenuEl);
  updatePauseBtnVisibility();
  flashHud('Paused ⏸');
}

function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  showScreen(null);
  updatePauseBtnVisibility();
  flashHud('Go! 🏃');
}

// ---------------------------------------------------------------
// 22. BUTTON WIRING
// ---------------------------------------------------------------
playBtn.addEventListener('click', () => {
  if (!characterReady) {
    alert('Character not ready yet');
    return;
  }
  try {
    initAudio();
    unlockAudio();
    startRun();
  } catch (err) {
    alert('PLAY crashed: ' + err.message);
    console.error('PLAY error:', err);
  }
});
settingsBtn.addEventListener('click', () => {
  updateSettingsUI();
  showScreen(settingsMenuEl);
});

settingsBackBtn.addEventListener('click', () => {
  showScreen(mainMenuEl);
});

if (missionsBtn) {
  missionsBtn.addEventListener('click', () => {
    openMissionsScreen();
  });
}

if (missionsBackBtn) {
  missionsBackBtn.addEventListener('click', () => {
    closeMissionsScreen();
  });
}

if (characterSelectBtn) {
  characterSelectBtn.addEventListener('click', () => {
    openCharacterSelect();
  });
}

if (characterConfirmBtn) {
  characterConfirmBtn.addEventListener('click', () => {
    confirmCharacterSelect();
  });
}

if (characterSelectBackBtn) {
  characterSelectBackBtn.addEventListener('click', () => {
    gameState = 'menu';
    showScreen(mainMenuEl);
    updatePauseBtnVisibility();
  });
}

toggleSfxBtn.addEventListener('click', () => {
  sfxEnabled = !sfxEnabled;
  saveSettings();
  updateSettingsUI();
});

toggleMusicBtn.addEventListener('click', () => {
  musicEnabled = !musicEnabled;
  saveSettings();
  updateSettingsUI();
});

toggleGfxBtn.addEventListener('click', () => {
  gfxEnabled = !gfxEnabled;
  saveSettings();
  updateSettingsUI();
});

toggleBloomBtn.addEventListener('click', () => {
  bloomEnabled = !bloomEnabled;
  saveSettings();
  updateSettingsUI();
});

pauseBtn.addEventListener('click', () => {
  pauseGame();
});

resumeBtn.addEventListener('click', () => {
  resumeGame();
});

pauseQuitBtn.addEventListener('click', () => {
  goToMainMenu();
});

restartBtn.addEventListener('click', () => {
  startRun();
});

menuBtn.addEventListener('click', () => {
  goToMainMenu();
});

// ---------------------------------------------------------------
// 23. INITIALIZE
// ---------------------------------------------------------------
obstacles = [];
coins = [];
powerups = [];
coinSpin = 0;

for (const name of POWERUP_TYPES) {
  powerupHudItems[name] = makePowerupHudItem(name);
}
updatePowerupHud();

loadSettings();
updateSettingsUI();
menuBestEl.textContent = 'Best Score: ' + getBestScore();
showScreen(loadingScreenEl);
updatePauseBtnVisibility();

// ---------------------------------------------------------------
// 24. SOUND SYSTEM
// ---------------------------------------------------------------
let audioCtx = null;

function initAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.warn('Web Audio not supported:', e);
  }
}

function unlockAudio() {
  initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

touchLayer.addEventListener('touchstart', unlockAudio, { passive: true });
touchLayer.addEventListener('mousedown', unlockAudio);

function playBeep(frequency, duration, type = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playNoise(duration, filterFreq, volume = 0.15, sweepTo = null) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const sampleCount = Math.floor(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, sampleCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterFreq, now);
  if (sweepTo !== null) {
    filter.frequency.exponentialRampToValueAtTime(sweepTo, now + duration);
  }
  filter.Q.value = 1.2;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  source.start(now);
  source.stop(now + duration);
}

function playSound(name) {
  if (!audioCtx) return;
  if (!sfxEnabled) return;

  switch (name) {
    case 'coin':
      playBeep(880, 0.08, 'triangle', 0.18);
      setTimeout(() => playBeep(1320, 0.12, 'triangle', 0.18), 60);
      break;

    case 'jump':
      playNoise(0.18, 400, 0.12, 1200);
      break;

    case 'slide':
      playNoise(0.25, 250, 0.12, 150);
      break;

    case 'whoosh':
      playNoise(0.12, 600, 0.08, 300);
      break;

    case 'crash':
      playBeep(120, 0.4, 'sawtooth', 0.25);
      playNoise(0.4, 200, 0.2, 80);
      break;

    case 'powerup':
      playBeep(660, 0.1, 'triangle', 0.22);
      setTimeout(() => playBeep(880, 0.1, 'triangle', 0.22), 80);
      setTimeout(() => playBeep(1320, 0.18, 'triangle', 0.22), 160);
      break;
  }
}

// ---------------------------------------------------------------
// 25. GAME LOOP
// ---------------------------------------------------------------
const clock = new THREE.Clock();
const SCORE_PER_SECOND = 10;

let footstepTimer = 0;
const FOOTSTEP_INTERVAL = 0.28;

let shieldPulseTimer = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (mixer) mixer.update(delta);

  if (gameState === 'playing') {
    let activeDirty = false;
    for (const name of ['magnet', 'speed', 'double']) {
      if (activePowerups[name] > 0) {
        activePowerups[name] -= delta;
        if (activePowerups[name] <= 0) {
          activePowerups[name] = 0;
          if (name === 'magnet') magnetRing.visible = false;
          activeDirty = true;
        }
      }
    }
    if (activeDirty) updatePowerupHud();

    if (activePowerups.shield > 0) {
      shieldPulseTimer += delta;
      shieldBubble.material.opacity = 0.18 + Math.sin(shieldPulseTimer * 5) * 0.08;
    }

    if (activePowerups.magnet > 0) {
      magnetRing.rotation.z += delta * 4;
    }

    const speedMultiplier = activePowerups.speed > 0 ? 2 : 1;
    const effectiveSpeed = worldSpeed * speedMultiplier;

    stripeGroup.children.forEach((stripe) => {
      stripe.position.z += effectiveSpeed * delta;
      if (stripe.position.z > 6) {
        stripe.position.z -= STRIPE_COUNT * STRIPE_SPACING;
      }
    });

    updateSections(effectiveSpeed, delta);
    updateFogTransition(delta);
    updateTraffic(delta);

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
        const baseScale = activeCharacter.scale;
        const targetScaleY = baseScale * SLIDE_HEIGHT_SCALE;
        characterModel.scale.y +=
          (targetScaleY - characterModel.scale.y) * 16 * delta;
      }
      if (slideTimer <= 0) {
        isSliding = false;
      }
    } else {
      if (characterModel) {
        const baseScale = activeCharacter.scale;
        characterModel.scale.y +=
          (baseScale - characterModel.scale.y) * 16 * delta;
      }
    }

    player.position.y = playerVisualY;

    shadowDisc.position.x = player.position.x;
    shadowDisc.position.z = player.position.z;
    const jumpHeight = playerVisualY - GROUND_Y;
    const fadeFactor = Math.max(0.05, 0.4 - jumpHeight * 0.06);
    shadowDisc.material.opacity = fadeFactor;
    const sizeFactor = Math.max(0.4, 1 - jumpHeight * 0.08);
    shadowDisc.scale.set(sizeFactor, sizeFactor, 1);

    dustSpawnTimer += delta;
    if (!isJumping && dustSpawnTimer > 0.10) {
      dustSpawnTimer = 0;
      spawnDustPuff(player.position.x, 0.2, player.position.z + 0.5);
    }
    for (let i = 0; i < DUST_COUNT; i++) {
      if (dustLife[i] > 0) {
        dustLife[i] -= delta * 2.2;
        dustPositions[i * 3 + 1] += delta * 0.3;
        dustPositions[i * 3 + 2] += delta * 1.6;
      }
    }
    dustGeometry.attributes.position.needsUpdate = true;

    if (!isJumping && audioCtx) {
      footstepTimer += delta;
      if (footstepTimer >= FOOTSTEP_INTERVAL) {
        footstepTimer = 0;
        playNoise(0.05, 200, 0.05, 100);
      }
    }

    let scoreGain = SCORE_PER_SECOND;
    if (activePowerups.double > 0) scoreGain *= 2;
    if (activePowerups.speed > 0) scoreGain += 50;
    score += scoreGain * delta;
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

    powerupSpawnTimer += delta;
    if (powerupSpawnTimer >= POWERUP_SPAWN_INTERVAL) {
      powerupSpawnTimer = 0;
      spawnPowerup();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.position.z += effectiveSpeed * delta;
      if (o.position.z > DESPAWN_Z) {
        scene.remove(o);
        obstacles.splice(i, 1);
      }
    }

    coinSpin += COIN_SPIN_SPEED * delta;
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.position.z += effectiveSpeed * delta;

      if (activePowerups.magnet > 0) {
        const dx = player.position.x - c.position.x;
        const dz = player.position.z - c.position.z;
        const dy = (playerVisualY + 1) - c.position.y;
        const dist = Math.sqrt(dx * dx + dz * dz + dy * dy);

        if (dist < 5) {
          c.position.x += (dx / dist) * 12 * delta;
          c.position.y += (dy / dist) * 12 * delta;
          c.position.z += (dz / dist) * 12 * delta;
        }
      }

      c.rotation.y = coinSpin;
      c.position.y += Math.sin(coinSpin * 2 + c.position.z) * 0.02;

      if (c.position.z > DESPAWN_Z) {
        scene.remove(c);
        coins.splice(i, 1);
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const p = powerups[i];
      p.position.z += effectiveSpeed * delta;
      p.userData.spin += delta * 3;
      p.rotation.y = p.userData.spin;
      p.rotation.x = Math.sin(p.userData.spin * 0.7) * 0.2;
      p.position.y = p.userData.baseY + Math.sin(p.userData.spin * 2) * 0.1;

      if (p.position.z > DESPAWN_Z) {
        scene.remove(p);
        powerups.splice(i, 1);
      }
    }

    checkObstacleCollisions();
    checkCoinCollisions();
    checkPowerupPickups();
  }

  debug.textContent =
    'state: ' + gameState +
    ' | L' + speedLevel +
    ' | ' + (characterModel ? 'model✓' : 'box') +
    ' | ' + activeCharacter.name;

  if (gfxEnabled || bloomEnabled) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}

animate();

// ---------------------------------------------------------------
// 26. RESIZE
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  const pr = renderer.getPixelRatio();
  fxaaPass.material.uniforms['resolution'].value.x =
    1 / (window.innerWidth * pr);
  fxaaPass.material.uniforms['resolution'].value.y =
    1 / (window.innerHeight * pr);
});
