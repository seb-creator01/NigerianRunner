import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
scene.background = new THREE.Color(0xf5c98a);
scene.fog = new THREE.Fog(0xf5c98a, 35, 70);

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
scene.add(new THREE.AmbientLight(0xffe8c0, 0.9));
const sunLight = new THREE.DirectionalLight(0xfff1d0, 1.1);
sunLight.position.set(5, 10, 5);
scene.add(sunLight);

// ---------------------------------------------------------------
// 5. LANES
// ---------------------------------------------------------------
const LANE_X = [-2, 0, 2];
const STARTING_LANE = 1;

// ---------------------------------------------------------------
// 6. ROAD — static and long
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

// ---------------------------------------------------------------
// 6b. SECTION SYSTEM
// ---------------------------------------------------------------
const SECTION_LENGTH = 60;
const SECTION_COUNT = 3;

const sections = [];

const SECTION_TYPES = ['city'];
let currentSectionType = 'city';

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

  for (let i = 0; i < SECTION_COUNT; i++) {
    const centerZ = SECTION_LENGTH - i * SECTION_LENGTH;
    const type = SECTION_TYPES[Math.floor(Math.random() * SECTION_TYPES.length)];
    createSection(centerZ, type);
  }
}

function updateSections(effectiveSpeed, delta) {
  const moveAmount = effectiveSpeed * delta;

  for (let i = 0; i < sections.length; i++) {
    sections[i].position.z += moveAmount;
  }

  const recycleThreshold = SECTION_LENGTH / 2 + SECTION_LENGTH;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (section.position.z > recycleThreshold) {
      const newType = SECTION_TYPES[Math.floor(Math.random() * SECTION_TYPES.length)];

      let minCenter = Infinity;
      sections.forEach((s) => {
        if (s !== section) minCenter = Math.min(minCenter, s.position.z);
      });

      const newCenterZ = minCenter - SECTION_LENGTH;

      section.position.z = newCenterZ;
      section.userData.type = newType;
      populateSection(section, newType, newCenterZ);
      currentSectionType = newType;
    }
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

let characterModel = null;
let mixer = null;
const actions = {};
let currentAction = null;

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
  ].forEach((o) => {
    o.classList.add('hidden');
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
// 12b. POWER-UP HUD
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
let bloomEnabled = true;

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
const CHARACTER_URL = 'https://seb-creator01.github.io/NigerianRunner/Soldier.glb';

const CHARACTER_SCALE = 1.15;
const CHARACTER_ROTATION_Y = 0;
const ANIM_RUN = 'Run';

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

    characterModel.scale.set(CHARACTER_SCALE, CHARACTER_SCALE, CHARACTER_SCALE);
    characterModel.position.y = 0;
    characterModel.rotation.y = CHARACTER_ROTATION_Y;

    characterModel.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.emissive) {
          child.material.emissive.setHex(0x442200);
          child.material.emissiveIntensity = 0.35;
        }
      }
    });

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

function makeKekeNapep() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(KEKE_WIDTH, 1.5, KEKE_DEPTH);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf2c419 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.9;
  group.add(body);

  const roofGeo = new THREE.SphereGeometry(0.85, 12, 8);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0xf7d23c });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.scale.set(1, 0.5, 1.05);
  roof.position.y = 1.65;
  group.add(roof);

  const glassGeo = new THREE.BoxGeometry(KEKE_WIDTH * 0.85, 0.6, 0.05);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a4a,
    metalness: 0.6,
    roughness: 0.2,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.set(0, 1.15, KEKE_DEPTH / 2 - 0.02);
  group.add(glass);

  const glassBack = new THREE.Mesh(glassGeo, glassMat);
  glassBack.position.set(0, 1.15, -KEKE_DEPTH / 2 + 0.02);
  group.add(glassBack);

  const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.15, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const wf = new THREE.Mesh(wheelGeo, wheelMat);
  wf.rotation.z = Math.PI / 2;
  wf.position.set(0, 0.28, KEKE_DEPTH / 2 - 0.3);
  group.add(wf);

  const wl = new THREE.Mesh(wheelGeo, wheelMat);
  wl.rotation.z = Math.PI / 2;
  wl.position.set(-KEKE_WIDTH / 2 + 0.1, 0.28, -KEKE_DEPTH / 2 + 0.3);
  group.add(wl);

  const wr = new THREE.Mesh(wheelGeo, wheelMat);
  wr.rotation.z = Math.PI / 2;
  wr.position.set(KEKE_WIDTH / 2 - 0.1, 0.28, -KEKE_DEPTH / 2 + 0.3);
  group.add(wr);

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
    flashHud('Lane ' + (currentLane + 1) + ' 👈');
    playSound('whoosh');
  } else if (direction === 'right' && currentLane < 2) {
    currentLane += 1;
    flashHud('Lane ' + (currentLane + 1) + ' 👉');
    playSound('whoosh');
  }
}

// ---------------------------------------------------------------
// 18. SWIPE DETECTION
// ---------------------------------------------------------------
const SWIPE_THRESHOLD = 15;
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
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;

  coins.forEach((c) => scene.remove(c));
  coins.length = 0;

  powerups.forEach((p) => scene.remove(p));
  powerups.length = 0;

  for (const name of POWERUP_TYPES) deactivatePowerup(name);
  updatePowerupHud();

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
  flashHud('Go! 🏃');
}

function goToMainMenu() {
  obstacles.forEach((o) => scene.remove(o));
  obstacles.length = 0;
  coins.forEach((c) => scene.remove(c));
  coins.length = 0;
  powerups.forEach((p) => scene.remove(p));
  powerups.length = 0;

  for (const name of POWERUP_TYPES) deactivatePowerup(name);
  updatePowerupHud();

  player.position.set(LANE_X[STARTING_LANE], 0, 0);
  playerVisualY = 0;
  if (characterModel) characterModel.scale.y = CHARACTER_SCALE;

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
  if (!characterReady) return;
  initAudio();
  unlockAudio();
  startRun();
});

settingsBtn.addEventListener('click', () => {
  updateSettingsUI();
  showScreen(settingsMenuEl);
});

settingsBackBtn.addEventListener('click', () => {
  showScreen(mainMenuEl);
});

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
          (targetScaleY - characterModel.scale.y) * 16 * delta;
      }
      if (slideTimer <= 0) {
        isSliding = false;
      }
    } else {
      if (characterModel) {
        characterModel.scale.y +=
          (CHARACTER_SCALE - characterModel.scale.y) * 16 * delta;
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
    ' | spd: ' + worldSpeed.toFixed(1) +
    ' | ' + currentSectionType +
    ' | ' + (characterModel ? 'model✓' : 'box');

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
