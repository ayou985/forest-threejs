import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { getHeight } from './noise.js';



const TREE_COUNT = 160;
const SPREAD = 92;

const LAKE_CENTER = new THREE.Vector2(30, 30);
const LAKE_RADIUS = 38;

const FOCUS_CENTER = new THREE.Vector2(-22, 18);
const FOCUS_RADIUS = 35;

const CLEARING_CENTER = new THREE.Vector2(-5, 12);
const CLEARING_RADIUS = 20;


function buildMediumTree(variationTint = 1.0) {
  const group = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x4a2c0a).multiplyScalar(0.9 + Math.random() * 0.15),
    roughness: 0.98,
    metalness: 0.0,
  });

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 5, 0.6),
    trunkMat
  );
  trunk.position.y = 2.5;
  trunk.castShadow = true;
  group.add(trunk);

  const foliageBase = new THREE.Color(0x1a5210);
  foliageBase.multiplyScalar(variationTint);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: foliageBase,
    roughness: 1.0,
    metalness: 0.0,
  });

  const foliage = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 6, 5),
    foliageMat
  );
  foliage.position.y = 6.5;
  foliage.castShadow = true;
  group.add(foliage);

  return group;
}


function buildBillboard(tex, scale, tint = 1.0) {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    alphaTest: 0.25,
    transparent: true,
    color: new THREE.Color(0xffffff).multiplyScalar(tint),
  });

  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8 * scale, 11 * scale, 1);
  sprite.position.y = 5.5 * scale;
  return sprite;
}


function loadGLTF(path) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
  'https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);

  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

function loadRemoveBG(path, threshold = 230) {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = id.data;

      for (let i = 0; i < d.length; i += 4) {
        if (d[i] > threshold && d[i + 1] > threshold && d[i + 2] > threshold) {
          d[i + 3] = 0;
        }
      }

      ctx.putImageData(id, 0, 0);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;

      resolve(tex);
    };

    img.onerror = () => {
      resolve(new THREE.CanvasTexture(document.createElement('canvas')));
    };

    img.src = path;
  });
}



export async function createTrees(scene) {
  const tLoader = new THREE.TextureLoader();

  const baseColor = tLoader.load('textures/tree_basecolor.png');
  const normalMap = tLoader.load('textures/tree_normal.png');
  const ormMap = tLoader.load('textures/tree_orm.png');

  baseColor.colorSpace = THREE.SRGBColorSpace;

  const [gltf, imp1, imp2] = await Promise.all([
    loadGLTF('models/tree.glb'),
    loadRemoveBG('textures/impostor.png'),
    loadRemoveBG('textures/impostor2.png'),
  ]);

  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = false;

    if (child.material) {
      child.material = child.material.clone();

      child.material.map = baseColor;
      child.material.normalMap = normalMap;
      child.material.roughnessMap = null;
      child.material.metalnessMap = null;

      child.material.roughness = 1.0;
      child.material.metalness = 0.0;
      child.material.envMapIntensity = 0.2;

      child.material.color = new THREE.Color(0xffffff).multiplyScalar(0.78);

      child.material.emissive = new THREE.Color(0x061204);
      child.material.emissiveIntensity = 1.0;

      child.material.needsUpdate = true;
    }
  });

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const modelHeight = box.max.y - box.min.y || 1;
  const baseScale = 8.0 / modelHeight;

  const impostors = [imp1, imp2];
  const rng = seededRng(9999);
  const lods = [];

  for (let i = 0; i < TREE_COUNT; i++) {
    let x, z, tries = 0;

    do {
      x = (rng() * 2 - 1) * SPREAD;
      z = (rng() * 2 - 1) * SPREAD;

      if (rng() < 0.35) {
        x += (FOCUS_CENTER.x - x) * 0.35;
        z += (FOCUS_CENTER.y - z) * 0.35;
      }

      tries++;
    } while ((isInLake(x, z) || tooCloseToLakeEdge(x, z) || isInClearing(x, z)) && tries < 30);

    const y = getHeight(x, z);

    const variation = 0.8 + rng() * 0.65;

    const tint = 0.72 + rng() * 0.22;

    const lod = new THREE.LOD();

    const full = gltf.scene.clone(true);
    full.scale.setScalar(baseScale * variation);

    full.traverse((child) => {
      if (!child.isMesh || !child.material) return;

      child.material = child.material.clone();

      const hue = 0.295 + (rng() - 0.5) * 0.045; 
      const sat = 0.65 + rng() * 0.30;            
      const lit = 0.28 + rng() * 0.18;            
      child.material.color = new THREE.Color().setHSL(hue, sat, lit);
      child.material.color.multiplyScalar(0.8 + rng() * 0.2);

      child.material.roughness = 1.0;
      child.material.metalness = 0.0;
      child.material.envMapIntensity = 0.2;
      child.material.roughnessMap = null;
      child.material.metalnessMap = null;
    });

    lod.addLevel(full, 0);

    
    const med = buildMediumTree(tint);
    med.scale.setScalar(variation);
    lod.addLevel(med, 50);

    
    const billboardTint = 0.58 + rng() * 0.28;
    lod.addLevel(buildBillboard(impostors[i % 2], variation, billboardTint), 90);

    lod.position.set(x, y, z);
    lod.rotation.y = rng() * Math.PI * 2;

    scene.add(lod);
    lods.push(lod);
  }

  return lods;
}

function isInLake(x, z) {
  const dx = x - LAKE_CENTER.x;
  const dz = z - LAKE_CENTER.y;
  return dx * dx + dz * dz < LAKE_RADIUS * LAKE_RADIUS;
}

function tooCloseToLakeEdge(x, z) {
  const dx = x - LAKE_CENTER.x;
  const dz = z - LAKE_CENTER.y;
  const d2 = dx * dx + dz * dz;
  return d2 < (LAKE_RADIUS + 8) * (LAKE_RADIUS + 8);
}

function isInClearing(x, z) {
  const dx = x - CLEARING_CENTER.x;
  const dz = z - CLEARING_CENTER.y;
  return dx * dx + dz * dz < CLEARING_RADIUS * CLEARING_RADIUS;
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

