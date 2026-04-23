import * as THREE from 'three';
import { noise2d, fbm } from './noise.js';


function lerp(a, b, t) { return a + (b - a) * t; }

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }


export function createGroundColorTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 12.0;
      const ny = y / size * 12.0;
      const n  = fbm(nx, ny, 5, 1.0) * 2.0; // -1 … 1

      
      const t  = clamp(n * 0.5 + 0.5, 0, 1);
      const t2 = clamp(fbm(nx * 2 + 7, ny * 2, 3, 1.0) + 0.5, 0, 1);

      
      const r = Math.floor(lerp(lerp(140, 115, t2), lerp(115, 145, t), t));
      const g = Math.floor(lerp(lerp(108, 145, t2), lerp(145, 175, t), t));
      const b = Math.floor(lerp(lerp(52,  60,  t2), lerp(60,  80,  t), t));

      const i = (y * size + x) * 4;
      data[i]   = r;
      data[i+1] = g;
      data[i+2] = b;
      data[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}


export function createGroundNormalTexture(size = 512) {
  const hf = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 10.0;
      const ny = y / size * 10.0;
      hf[y * size + x] = fbm(nx, ny, 5, 1.0) + fbm(nx * 3 + 7, ny * 3, 3, 1.0) * 0.3;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(size, size);
  const data = img.data;
  const str  = 6.0; 

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const hL = hf[y * size + Math.max(0, x - 1)];
      const hR = hf[y * size + Math.min(size - 1, x + 1)];
      const hU = hf[Math.max(0, y - 1) * size + x];
      const hD = hf[Math.min(size - 1, y + 1) * size + x];

      let nx = (hL - hR) * str;
      let ny = (hU - hD) * str;
      let nz = 1.0;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nx /= len; ny /= len; nz /= len;

      const i = (y * size + x) * 4;
      data[i]   = Math.floor((nx * 0.5 + 0.5) * 255);
      data[i+1] = Math.floor((ny * 0.5 + 0.5) * 255);
      data[i+2] = Math.floor((nz * 0.5 + 0.5) * 255);
      data[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}


export function createGroundRoughnessTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = x / size * 8.0;
      const ny = y / size * 8.0;
      const n  = fbm(nx + 20, ny + 20, 4, 1.0) * 2.0 * 0.5 + 0.5; // 0…1
      const v  = Math.floor(lerp(160, 230, clamp(n, 0, 1)));
      const i  = (y * size + x) * 4;
      data[i] = data[i+1] = data[i+2] = v;
      data[i+3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}


export function createGrassTexture() {
  const W = 64, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(W / 2, H, W / 2, 0);
  grad.addColorStop(0.0, '#2a5a12');
  grad.addColorStop(0.4, '#3c8a20');
  grad.addColorStop(0.8, '#5ab534');
  grad.addColorStop(1.0, '#7fcc4a');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(22, H);
  ctx.quadraticCurveTo(6,  H * 0.55, 18, H * 0.12);
  ctx.quadraticCurveTo(W / 2, 0, 46, H * 0.12);
  ctx.quadraticCurveTo(58, H * 0.55, 42, H);
  ctx.closePath();
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}


export function createBushTexture() {
  const S = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  const colors = ['#174d08','#1e6b0d','#27891a','#339c22','#3fb52c','#4dc733'];


  const rng = (() => { let s = 42; return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }; })();

  for (let i = 0; i < 22; i++) {
    const cx  = 14 + rng() * (S - 28);
    const cy  = 14 + rng() * (S - 28);
    const rx  = 8  + rng() * 22;
    const ry  = 6  + rng() * 18;
    const ang = rng() * Math.PI;
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, ang, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}


export function createTreeImpostorTexture() {
  const W = 128, H = 192;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const trunkGrad = ctx.createLinearGradient(W * 0.4, H * 0.5, W * 0.6, H);
  trunkGrad.addColorStop(0, '#3e1f05');
  trunkGrad.addColorStop(1, '#5a2f0a');
  ctx.fillStyle = trunkGrad;
  ctx.fillRect(W * 0.42, H * 0.52, W * 0.16, H * 0.48);

  const foliageColors = ['#1c5c0a', '#278014', '#32a01e', '#27901a'];
  const circles = [
    [W * 0.5,  H * 0.28, H * 0.27],
    [W * 0.35, H * 0.38, H * 0.20],
    [W * 0.65, H * 0.35, H * 0.19],
  ];
  circles.forEach(([cx, cy, r], i) => {
    const g = ctx.createRadialGradient(cx - r*0.2, cy - r*0.2, r*0.1, cx, cy, r);
    g.addColorStop(0, foliageColors[i % foliageColors.length]);
    g.addColorStop(1, foliageColors[(i + 2) % foliageColors.length]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}


export function createFireflyTexture() {
  const S = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, S, S);

  const grad = ctx.createRadialGradient(S/2, S/2, 0, S/2, S/2, S/2);
  grad.addColorStop(0.0, 'rgba(200,255,100,1)');
  grad.addColorStop(0.3, 'rgba(160,230,60,0.6)');
  grad.addColorStop(1.0, 'rgba(100,200,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  return new THREE.CanvasTexture(canvas);
}
