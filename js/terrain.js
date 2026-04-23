import * as THREE from 'three';
import { getHeight } from './noise.js';
import {
  createGroundColorTexture,
  createGroundNormalTexture,
  createGroundRoughnessTexture,
} from './textures.js';

// ─── Terrain ──────────────────────────────────────────────────────────────────

const TERRAIN_SIZE = 200;
const TERRAIN_SEGMENTS = 256;


export function createTerrain(scene) {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE,
    TERRAIN_SIZE,
    TERRAIN_SEGMENTS,
    TERRAIN_SEGMENTS
  );

  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;

  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = getHeight(x, z);

    pos.setY(i, y);

    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();

 
  const lowColor  = new THREE.Color(0x8a7a50);  // levé : plus visible
  const midColor  = new THREE.Color(0xa89060);
  const highColor = new THREE.Color(0xd4bc88);
  const wetColor  = new THREE.Color(0x607840);  // berges humides

  const colors = [];

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const x = pos.getX(i);
    const z = pos.getZ(i);

    const h = (y - minY) / Math.max(0.0001, maxY - minY);

    let c;
    if (h < 0.45) {
      c = lowColor.clone().lerp(midColor, smoothstep(0.0, 0.45, h));
    } else {
      c = midColor.clone().lerp(highColor, smoothstep(0.45, 1.0, h));
    }

    const dx = x - 30, dz = z - 30;
    const distLake = Math.sqrt(dx * dx + dz * dz);
    const wetFactor = smoothstep(55, 38, distLake); // 1 près du lac, 0 loin
    if (wetFactor > 0) {
      c = c.clone().lerp(wetColor, wetFactor * 0.6);
    }

    const noiseTint = 0.94 + 0.06 * Math.sin(x * 0.08) * Math.cos(z * 0.08);
    c.multiplyScalar(noiseTint);

    colors.push(c.r, c.g, c.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const colorTex = createGroundColorTexture(512);
  const normalTex = createGroundNormalTexture(512);
  const roughnessTex = createGroundRoughnessTexture(256);

  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  roughnessTex.wrapS = roughnessTex.wrapT = THREE.RepeatWrapping;

  colorTex.repeat.set(8, 8);
  normalTex.repeat.set(8, 8);
  roughnessTex.repeat.set(8, 8);

  const mat = new THREE.MeshStandardMaterial({
    map: colorTex,
    normalMap: normalTex,
    roughnessMap: roughnessTex,
    roughness: 0.95,
    metalness: 0.0,
    vertexColors: true,
  });

  mat.color = new THREE.Color(0.6, 0.5, 0.35);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  scene.add(mesh);

  mesh.userData.getY = (x, z) => getHeight(x, z);

  return mesh;
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}