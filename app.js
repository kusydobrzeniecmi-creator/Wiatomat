import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const $ = id => document.getElementById(id);
const stage = $('stage');

if (!stage) {
  console.error('Brak elementu #stage w index.html');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2a21);

const initialW = Math.max(1, stage ? stage.clientWidth : 800);
const initialH = Math.max(1, stage ? stage.clientHeight : 480);

const camera = new THREE.PerspectiveCamera(42, initialW / initialH, 0.1, 300);
camera.position.set(12, 10, 13);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(initialW, initialH);

if (stage) {
  stage.appendChild(renderer.domElement);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xdcebdc, 0x354237, 2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(7, 12, 8);
sun.castShadow = true;
scene.add(sun);

const grid = new THREE.GridHelper(24, 24, 0x607767, 0x35483b);
grid.position.y = -0.02;
scene.add(grid);

const wood = new THREE.MeshStandardMaterial({ color: 0xb78653, roughness: 0.8 });
const darkwood = new THREE.MeshStandardMaterial({ color: 0x8b603a, roughness: 0.8 });
const roofmat = new THREE.MeshStandardMaterial({
  color: 0x667b83,
  metalness: 0.55,
  roughness: 0.4,
  side: THREE.DoubleSide
});

let parts = [];
let selected = null;
let explode = 0;
let exploding = false;
const project = {};

const meters = v => Number(v) / 100;
function val(id, fallback = 0) {
  const el = $(id);
  if (!el) return fallback;
  const n = Number(el.value);
  return Number.isFinite(n) && el.value !== '' ? n : fallback;
}

function addBox(name, type, x, y, z, sx, sy, sz, mat = wood, meta = {}) {
  const geo = new THREE.BoxGeometry(
    Math.max(0.01, sx),
    Math.max(0.01, sy),
    Math.max(0.01, sz)
  );
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { name, type, baseY: y, baseX: x, baseZ: z, ...meta };
  scene.add(mesh);
  parts.push(mesh);
  return mesh;
}

function clearModel() {
  for (const p of parts) {
    scene.remove(p);
    if (p.geometry && !p.userData.clonedGeo) {
      p.geometry.dispose();
    }
  }
  parts = [];
  selected = null;
  updateSelectionUI();
}

function build() {
  clearModel();

  const L = Math.max(0.5, meters(val('length', 400)));
  const W = Math.max(0.5, meters(val('width', 300)));
  const hi = Math.max(0.5, meters(val('high', 260)));
  const lo = Math.max(0.4, meters(val('low', 220)));

  const rows = Math.max(1, Math.min(10, Math.round(val('rows', 2))));
  const cols = Math.max(1, Math.min(20, Math.round(val('cols', 2))));

  const ps = Math.max(0.04, meters(val('postSize', 10)));
  const bs = Math.max(0.04, meters(val('beamSize', 12)));
  const rw = Math.max(0.03, meters(val('rafterW', 6)));
  const rh = Math.max(0.04, meters(val('rafterH', 14)));

  const xs = cols === 1 ? [0] : Array.from({ length: cols }, (_, i) => -L / 2 + (i * L) / (cols - 1));
  const zs = rows === 1 ? [0] : Array.from({ length: rows }, (_, i) => -W / 2 + (i * W) / (rows - 1));

  // Wysokość zmienia się po szerokości: wyższa krawędź przy -W/2, niższa przy +W/2
  const roofY = z => hi - (hi - lo) * ((z + W / 2) / W);

  // Słupy
  zs.forEach((z, ri) => {
    xs.forEach((x, ci) => {
      const h = Math.max(0.2, roofY(z) - bs);
      addBox(`Słup R${ri + 1}/S${ci + 1}`, 'Słup', x, h / 2, z, ps, h, ps, darkwood, { baseY: h / 2 });
    });
  });

  // Belki podłużne
  zs.forEach((z, ri) => {
    const h = roofY(z);
    addBox(`Belka podłużna ${ri + 1}`, 'Belka', 0, h - bs / 2, z, L, bs, bs, darkwood);
  });

  // Krokwie wzdłuż długości
  const step = Math.max(0.3, meters(val('rafterStep', 80)));
  const n = Math.max(1, Math.ceil(L / step));
  for (let i = 0; i <= n; i++) {
    const x = -L / 2 + (i * L) / n;
    const y1 = hi - bs / 2;
    const y2 = lo - bs / 2;
    const len = Math.hypot(W, y1 - y2);
    const angle = Math.atan2(y2 - y1, W);
    const m = addBox(`Krokiew ${i + 1}`, 'Krokiew', x, (y1 + y2) / 2, 0, rw, len, rh, wood);
    m.rotation.x = angle;
  }

  // Łaty w poprzek szerokości
  const bstep = Math.max(0.15, meters(val('battenStep', 35)));
  const bn = Math.max(1, Math.ceil(W / bstep));
  for (let i = 0; i <= bn; i++) {
    const z = -W / 2 + (i * W) / bn;
    const y = roofY(z) + 0.08;
    addBox(`Łata ${i + 1}`, 'Łata', 0, y, z, L, 0.045, 0.05, darkwood);
  }

  // Pokrycie dachu
  const roofGeo = new THREE.BoxGeometry(L, 0.035, Math.hypot(W, hi - lo));
  const roof = new THREE.Mesh(roofGeo, roofmat);
  roof.position.set(0, (hi + lo) / 2 + 0.12, 0);
  roof.rotation.x = Math.atan2(lo - hi, W);
  roof.userData = { name: 'Pokrycie dachu', type: 'Pokrycie', baseY: roof.position.y };
  roof.castShadow = true;
  scene.add(roof);
  parts.push(roof);

  camera.position.set(Math.max(8, L * 1.2), Math.max(6, W * 1.5), Math.max(8, L * 1.2));
  controls.target.set(0, (hi + lo) / 2, 0);
  controls.update();

  if ($('loading'))$('loading').style.display = 'none';
  applyVisibility();
  updateSummary();
}

function applyVisibility() {
  const map = {
    Słup: 'showPosts',
    Belka: 'showBeams',
    Krokiew: 'showRafters',
    
