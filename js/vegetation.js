import * as THREE from 'three';
import { getHeight } from './noise.js';



const BUSH_COUNT   = 700;
const PLANT_COUNT  = 500;
const SPREAD       = 90;
const LAKE_CENTER  = new THREE.Vector2(30, 30);
const LAKE_RADIUS  = 34;


function crossedPlanesGeo(width, height) {
  const planes = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.PlaneGeometry(width, height, 1, 1);
    p.translate(0, height / 2, 0);
    p.rotateY((i / 3) * Math.PI);
    planes.push(p);
  }
  return mergePlanes(planes);
}

function mergePlanes(geos) {
  let totalVerts = 0, totalIdx = 0;
  for (const g of geos) { totalVerts += g.attributes.position.count; totalIdx += g.index.count; }

  const positions = new Float32Array(totalVerts * 3);
  const normals   = new Float32Array(totalVerts * 3);
  const uvs       = new Float32Array(totalVerts * 2);
  const indices   = new Uint32Array(totalIdx);

  let vOff = 0, iOff = 0, vBase = 0;
  for (const g of geos) {
    const posArr = g.attributes.position.array;
    const nrmArr = g.attributes.normal.array;
    const uvArr  = g.attributes.uv.array;
    const idxArr = g.index.array;
    positions.set(posArr, vOff * 3);
    normals.set(nrmArr, vOff * 3);
    uvs.set(uvArr, vOff * 2);
    for (let i = 0; i < idxArr.length; i++) indices[iOff + i] = idxArr[i] + vBase;
    vBase += g.attributes.position.count;
    vOff  += g.attributes.position.count;
    iOff  += idxArr.length;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
  merged.setAttribute('uv',       new THREE.BufferAttribute(uvs,       2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}


function loadAtlasSprite(path, col, row, threshold = 215) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const sw = img.width  / 2;
      const sh = img.height / 2;
      const canvas = document.createElement('canvas');
      canvas.width  = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, col * sw, row * sh, sw, sh, 0, 0, sw, sh);
      const id = ctx.getImageData(0, 0, sw, sh);
      const d  = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const br = (d[i] + d[i + 1] + d[i + 2]) / 3;
        if (br > threshold) d[i + 3] = Math.round((255 - br) * (255 / (255 - threshold)));
      }
      ctx.putImageData(id, 0, 0);
      resolve(new THREE.CanvasTexture(canvas));
    };
    img.onerror = () => resolve(new THREE.CanvasTexture(document.createElement('canvas')));
    img.src = path;
  });
}


function placeInstances(scene, count, geo, mat, spread, rng) {
  const mesh  = new THREE.InstancedMesh(geo, mat, count);
  const dummy = new THREE.Object3D();
  let placed  = 0, tries = 0;
  while (placed < count && tries < count * 5) {
    tries++;
    const x = (rng() * 2 - 1) * spread;
    const z = (rng() * 2 - 1) * spread;
    const dx = x - LAKE_CENTER.x, dz = z - LAKE_CENTER.y;
    if (dx * dx + dz * dz < LAKE_RADIUS * LAKE_RADIUS) continue;
    dummy.position.set(x, getHeight(x, z), z);
    dummy.rotation.y = rng() * Math.PI * 2;
    dummy.scale.setScalar(0.5 + rng() * 1.1);
    dummy.updateMatrix();
    mesh.setMatrixAt(placed++, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow    = false;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}


export async function createVegetation(scene) {
  
  const [bushTex, plantTex] = await Promise.all([
    loadAtlasSprite('textures/plant_color.png', 1, 1), 
    loadAtlasSprite('textures/plant_color.png', 0, 0), 
  ]);

  const bushMat = new THREE.MeshStandardMaterial({
    map:       bushTex,
    alphaTest: 0.25,
    side:      THREE.DoubleSide,
    roughness: 0.95,
    depthWrite: true,
  });

  const plantMat = new THREE.MeshStandardMaterial({
    map:       plantTex,
    alphaTest: 0.25,
    side:      THREE.DoubleSide,
    roughness: 0.9,
    depthWrite: true,
  });

  const rng1 = seededRng(1234);
  const rng2 = seededRng(5678);

  const bushGeo  = crossedPlanesGeo(1.8, 1.6);
  const plantGeo = crossedPlanesGeo(0.7, 1.0);

  const bushMesh  = placeInstances(scene, BUSH_COUNT,  bushGeo,  bushMat,  SPREAD, rng1);
  const plantMesh = placeInstances(scene, PLANT_COUNT, plantGeo, plantMat, SPREAD, rng2);

  return { bushMesh, plantMesh };
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
