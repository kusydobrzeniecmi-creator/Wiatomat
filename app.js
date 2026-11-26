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

  if ($('loading')) $('loading').style.display = 'none';
  applyVisibility();
  updateSummary();
}

function applyVisibility() {
  const map = {
    Słup: 'showPosts',
    Belka: 'showBeams',
    Krokiew: 'showRafters',
    Łata: 'showBattens'
  };
  parts.forEach(p => {
    const id = map[p.userData.type];
    const el = id ? $(id) : null;
    p.visible = el ? Boolean(el.checked) : true;
  });
}

function choose(obj) {
  if (selected && selected.material && selected.material.emissive) {
    selected.material.emissive.setHex(0x000000);
  }
  selected = obj;
  if (selected && selected.material && selected.material.emissive) {
    selected.material.emissive.setHex(0x443311);
  }
  updateSelectionUI();
}

function updateSelectionUI() {
  const yes = Boolean(selected);
  if ($('noSelection')) $('noSelection').hidden = yes;
  if ($('elementEditor')) $('elementEditor').hidden = !yes;
  if ($('selectedLabel')) {
    $('selectedLabel').textContent = yes ? selected.userData.name : 'Nie wybrano elementu';
  }
  if (yes) {
    if ($('elementName')) $('elementName').textContent = selected.userData.name;
    if ($('posX')) $('posX').value = (selected.position.x * 100).toFixed(1);
    if ($('posY')) $('posY').value = (selected.position.y * 100).toFixed(1);
    if ($('posZ')) $('posZ').value = (selected.position.z * 100).toFixed(1);
    if ($('offsetZ')) $('offsetZ').value = 0;
  }
}

const ray = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;

renderer.domElement.addEventListener('pointerdown', e => {
  down = [e.clientX, e.clientY];
});

renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const r = renderer.domElement.getBoundingClientRect();
  if (!r.width || !r.height) return;
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(pointer, camera);
  const hit = ray.intersectObjects(parts.filter(p => p.visible));
  if (hit.length) {
    choose(hit[0].object);
  }
});

if ($('applyMove')) {
  $('applyMove').onclick = () => {
    if (!selected) return;
    selected.position.set(
      val('posX') / 100,
      val('posY') / 100 + val('offsetZ') / 100,
      val('posZ') / 100
    );
    selected.userData.baseY = selected.position.y;
    updateSelectionUI();
  };
}

if ($('duplicateBtn')) {
  $('duplicateBtn').onclick = () => {
    if (!selected) return;
    const c = selected.clone();
    c.geometry = selected.geometry.clone();
    c.position.x += 0.35;
    c.userData = { ...selected.userData, name: `${selected.userData.name} — kopia`, clonedGeo: true };
    scene.add(c);
    parts.push(c);
    choose(c);
  };
}

if ($('buildBtn')) $('buildBtn').onclick = build;

['showPosts', 'showBeams', 'showRafters', 'showBattens'].forEach(id => {
  if ($(id)) $(id).onchange = applyVisibility;
});

document.querySelectorAll('.tab').forEach(b => {
  b.onclick = () => {
    document.querySelectorAll('.tab,.panel').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const panel = $(b.dataset.tab || '');
    if (panel) panel.classList.add('active');
  };
});

if ($('resetView')) {
  $('resetView').onclick = () => {
    camera.position.set(12, 10, 13);
    controls.target.set(0, 1, 0);
    controls.update();
  };
}

if ($('explodeBtn')) {
  $('explodeBtn').onclick = () => {
    exploding = !exploding;
    $('explodeBtn').textContent = exploding ? 'Zatrzymaj animację' : 'Animacja montażu';
  };
}

function animate() {
  requestAnimationFrame(animate);
  if (exploding) {
    explode = Math.min(1, explode + 0.008);
    parts.forEach(p => {
      const t = p.userData.type;
      p.position.y =
        p.userData.baseY + (t === 'Pokrycie' ? explode * 2 : t === 'Łata' ? explode * 1.5 : t === 'Krokiew' ? explode : 0);
    });
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

function resize() {
  if (!stage) return;
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

if (stage && typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(resize).observe(stage);
}
window.addEventListener('resize', resize);
resize();

function updateSummary() {
  const L = Math.max(0.5, meters(val('length', 400)));
  const W = Math.max(0.5, meters(val('width', 300)));
  const hi = Math.max(0.5, meters(val('high', 260)));
  const lo = Math.max(0.4, meters(val('low', 220)));
  const rows = Math.max(1, val('rows', 2));
  const cols = Math.max(1, val('cols', 2));

  const postN = rows * cols;
  const postVol = postN * meters(val('postSize', 10)) ** 2 * ((hi + lo) / 2);
  const beamVol = rows * L * meters(val('beamSize', 12)) ** 2;
  const rN = Math.ceil(L / Math.max(0.3, meters(val('rafterStep', 80)))) + 1;
  const rl = Math.hypot(W, hi - lo);
  const rVol = rN * meters(val('rafterW', 6)) * meters(val('rafterH', 14)) * rl;
  const roofArea = L * rl;
  const batN = Math.ceil(W / Math.max(0.15, meters(val('battenStep', 35)))) + 1;
  const batVol = batN * L * 0.045 * 0.05;

  const vol = postVol + beamVol + rVol + batVol;
  const woodCost = vol * (1 + val('waste', 10) / 100) * val('woodPrice', 0);
  const roofCost = roofArea * val('roofPrice', 0);

  project.summary = {
    postN,
    vol,
    roofArea,
    woodCost,
    roofCost,
    total: woodCost + roofCost,
    rN,
    batN
  };

  if ($('summary')) {
    $('summary').innerHTML = [
      ['Słupy', `${postN} szt.`],
      ['Krokwie', `${rN} szt. (orientacyjnie)`],
      ['Łaty', `${batN} rzędów`],
      ['Objętość drewna', `${vol.toFixed(3)} m³`],
      ['Powierzchnia dachu', `${roofArea.toFixed(1)} m²`]
    ]
      .map(([a, b]) => `<div class="sumrow"><span>${a}</span><b>${b}</b></div>`)
      .join('');
  }

  if ($('costTotal')) {
    $('costTotal').textContent = `Szacunkowo: ${(woodCost + roofCost).toFixed(0)} zł`;
  }
}

['woodPrice', 'waste', 'roofPrice'].forEach(id => {
  if ($(id)) $(id).addEventListener('input', updateSummary);
});

function getProject() {
  const data = { app: 'WIATOMAT', version: 1, created: new Date().toISOString(), settings: {} };
  [
    'length',
    'width',
    'high',
    'low',
    'rows',
    'cols',
    'postSize',
    'beamSize',
    'rafterW',
    'rafterH',
    'rafterStep',
    'battenStep',
    'woodPrice',
    'waste',
    'roofPrice'
  ].forEach(id => {
    data.settings[id] = val(id);
  });
  return data;
}

function applyProject(data) {
  if (!data || !data.settings) throw new Error('Nieprawidłowy plik projektu');
  Object.entries(data.settings).forEach(([k, v]) => {
    if ($(k)) $(k).value = v;
  });
  build();
  if ($('status')) $('status').textContent = 'Wczytano projekt.';
}

function download(name, content, type) {
  const a = document.createElement('a');
  const url = URL.createObjectURL(new Blob([content], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

if ($('saveBtn')) {
  $('saveBtn').onclick = () => {
    localStorage.setItem('wiatomat-project', JSON.stringify(getProject()));
    if ($('status')) $('status').textContent = 'Zapisano projekt na tym urządzeniu.';
  };
}

if ($('exportBtn')) {
  $('exportBtn').onclick = () =>
    download('wiatomat-projekt.json', JSON.stringify(getProject(), null, 2), 'application/json');
}

if ($('importBtn')) {
  $('importBtn').onclick = () => {
    if ($('fileInput')) $('fileInput').click();
  };
}

if ($('fileInput')) {
  $('fileInput').onchange = async e => {
    try {
      applyProject(JSON.parse(await e.target.files[0].text()));
    } catch {
      if ($('status')) $('status').textContent = 'Nie udało się wczytać pliku.';
    }
  };
}

if ($('csvBtn')) {
  $('csvBtn').onclick = () => {
    const s = project.summary || { postN: 0, vol: 0, roofArea: 0, woodCost: 0, roofCost: 0, total: 0 };
    const csv =
      'Pozycja;Wartość\n' +
      `Słupy;${s.postN} szt.\n` +
      `Drewno;${s.vol.toFixed(3)} m3\n` +
      `Dach;${s.roofArea.toFixed(1)} m2\n` +
      `Koszt drewna;${s.woodCost.toFixed(2)} zł\n` +
      `Koszt pokrycia;${s.roofCost.toFixed(2)} zł\n` +
      `Razem;${s.total.toFixed(2)} zł`;
    download('wiatomat-zestawienie.csv', `\ufeff${csv}`, 'text/csv;charset=utf-8');
  };
}

const saved = localStorage.getItem('wiatomat-project');
if (saved) {
  try {
    applyProject(JSON.parse(saved));
  } catch {}
}

build();

let installPrompt;
if ($('installBtn')) {
  $('installBtn').hidden = true;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    $('installBtn').hidden = false;
  });
  $('installBtn').onclick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
    }
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
