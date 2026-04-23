import * as THREE from 'three';
import { getHeight } from './noise.js';
import { createGrassTexture } from './textures.js';

// ─── Grass ────────────────────────────────────────────────────────────────────
// Herbe en InstancedMesh avec variation de taille, teinte et densité.
// Vent injecté dans le shader standard pour garder l'éclairage correct.

const GRASS_COUNT = 50_000;
const SPREAD = 95;

const LAKE_CENTER = new THREE.Vector2(30, 30);
const LAKE_RADIUS = 32;

// marge pour garder une rive plus lisible
const LAKE_MARGIN = 6;

// zone focus légèrement plus dense
const FOCUS_CENTER = new THREE.Vector2(8, 8);
const FOCUS_RADIUS = 26;

let grassShaderUniforms = null;

export function createGrass(scene) {
  const tex = createGrassTexture();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.3,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0.0,
    depthWrite: true,
    vertexColors: true,
    // Vert lumineux : remplace le beige qui assombrissait les brins
    color: new THREE.Color(0.35, 0.55, 0.25),
  });

  // Injecte vent + variation de teinte
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = { value: 0.0 };
    grassShaderUniforms = shader.uniforms;

    shader.vertexShader =
      `
      uniform float uWindTime;
      attribute vec3 instanceColor;
      varying vec3 vInstanceColor;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */`
      #include <begin_vertex>

      vInstanceColor = instanceColor;

      float windFactor = uv.y * uv.y;

      float phase = instanceMatrix[3][0] * 0.18 + instanceMatrix[3][2] * 0.14;

      float wind = sin(uWindTime * 2.2 + phase) * 0.18
                 + sin(uWindTime * 3.7 + phase * 1.3) * 0.06;

      transformed.x += wind * windFactor;
      transformed.z += wind * 0.4 * windFactor;
      `
    );

    shader.fragmentShader =
      `
      varying vec3 vInstanceColor;
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      /* glsl */`
      #include <map_fragment>
      diffuseColor.rgb *= vInstanceColor;
      `
    );
  };

  // Brin d’herbe : pivot à la base
  const geo = new THREE.PlaneGeometry(0.12, 0.55, 1, 4);
  geo.translate(0, 0.275, 0);

  const mesh = new THREE.InstancedMesh(geo, mat, GRASS_COUNT);
  mesh.receiveShadow = false;
  mesh.castShadow = false;

  const dummy = new THREE.Object3D();
  const rng = seededRng(7777);

  const colors = new Float32Array(GRASS_COUNT * 3);

  let placed = 0;
  let attempts = 0;

  while (placed < GRASS_COUNT && attempts < GRASS_COUNT * 5) {
    attempts++;

    let x = (rng() * 2 - 1) * SPREAD;
    let z = (rng() * 2 - 1) * SPREAD;

    // légère concentration dans une zone d'intérêt
    if (rng() < 0.28) {
      x += (FOCUS_CENTER.x - x) * 0.35;
      z += (FOCUS_CENTER.y - z) * 0.35;
    }

    const dxLake = x - LAKE_CENTER.x;
    const dzLake = z - LAKE_CENTER.y;
    const distLake = Math.sqrt(dxLake * dxLake + dzLake * dzLake);

    // éviter l’eau + garder une marge pour une rive plus propre
    if (distLake < LAKE_RADIUS + LAKE_MARGIN) continue;

    const y = getHeight(x, z);

    // densité un peu plus forte proche du lac, mais pas au bord direct
    let scale = 0.55 + rng() * 0.95;

    if (distLake < LAKE_RADIUS + 18) {
      scale *= 1.08;
    }

    // légère variation selon hauteur pour éviter l’uniformité
    if (y > 3.5) {
      scale *= 0.88;
    }

    const angle = rng() * Math.PI * 2;

    dummy.position.set(x, y, z);
    dummy.rotation.y = angle;

    // variation légère sur X/Z aussi pour casser le "copier-coller"
    dummy.scale.set(
      scale * (0.9 + rng() * 0.2),
      scale,
      scale * (0.9 + rng() * 0.2)
    );

    dummy.updateMatrix();
    mesh.setMatrixAt(placed, dummy.matrix);

    // variation de teinte par instance
    const tint = new THREE.Color();

    // Variation herbe : jaune-vert sec → vert profond humide
    const base = 0.78 + rng() * 0.22;
    const warmCool = (rng() - 0.5) * 0.12; // ±0.06 shift chaud/froid

    tint.setRGB(
      (0.62 + warmCool) * base,
      1.0 * base,
      (0.38 - warmCool) * base
    );

    // zones un peu plus humides proches du lac = légèrement plus vertes
    if (distLake < LAKE_RADIUS + 18) {
      tint.multiply(new THREE.Color(0.92, 1.03, 0.95));
    }

    // zones hautes un peu plus sèches
    if (y > 3.5) {
      tint.multiply(new THREE.Color(1.03, 0.98, 0.9));
    }

    colors[placed * 3] = tint.r;
    colors[placed * 3 + 1] = tint.g;
    colors[placed * 3 + 2] = tint.b;

    placed++;
  }

  mesh.count = placed;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute(
    'instanceColor',
    new THREE.InstancedBufferAttribute(colors, 3)
  );

  scene.add(mesh);

  return {
    mesh,
    update(elapsed) {
      if (grassShaderUniforms) {
        grassShaderUniforms.uWindTime.value = elapsed;
      }
    },
  };
}

function seededRng(seed) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}