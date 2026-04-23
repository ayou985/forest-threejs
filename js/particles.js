import * as THREE from 'three';
import { createFireflyTexture } from './textures.js';

// ─── Firefly particles ────────────────────────────────────────────────────────
// Lucioles discrètes autour du lac et des zones végétales proches.

const COUNT = 80;

const CENTER = new THREE.Vector3(20, 2.0, 18);
const SPREAD_X = 18;
const SPREAD_Z = 16;
const SPREAD_Y = 1.5;

const VERT = /* glsl */`
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aScale;
  uniform float uTime;
  uniform float uSize;

  void main() {
    vec3 pos = position;

    pos.x += sin(uTime * aSpeed * 0.55 + aPhase)       * 1.2;
    pos.y += sin(uTime * aSpeed * 0.9 + aPhase * 1.3)  * 0.45
           + cos(uTime * aSpeed * 0.45 + aPhase * 0.8) * 0.25;
    pos.z += cos(uTime * aSpeed * 0.7 + aPhase * 1.7)  * 1.1;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float pulse = 0.8 + 0.2 * sin(uTime * aSpeed * 1.8 + aPhase * 2.5);
    gl_PointSize = uSize * aScale * pulse * (180.0 / -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = /* glsl */`
  uniform sampler2D uTex;

  void main() {
    vec4 texColor = texture2D(uTex, gl_PointCoord);
    if (texColor.a < 0.05) discard;

    vec3 col = texColor.rgb * vec3(0.95, 1.0, 0.65);

    gl_FragColor = vec4(col, texColor.a * 0.72);
  }
`;

export function createParticles(scene) {
  const rng = seededRng(3141);

  const positions = new Float32Array(COUNT * 3);
  const phases = new Float32Array(COUNT);
  const speeds = new Float32Array(COUNT);
  const scales = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = CENTER.x + (rng() * 2 - 1) * SPREAD_X;
    positions[i * 3 + 1] = CENTER.y + (rng() * 2 - 1) * SPREAD_Y;
    positions[i * 3 + 2] = CENTER.z + (rng() * 2 - 1) * SPREAD_Z;

    phases[i] = rng() * Math.PI * 2;
    speeds[i] = 0.45 + rng() * 0.75;
    scales[i] = 0.65 + rng() * 0.7;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

  const tex = createFireflyTexture();

  const uniforms = {
    uTime: { value: 0 },
    uSize: { value: 6 },
    uTex: { value: tex },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    update(elapsed) {
      uniforms.uTime.value = elapsed;
    },
  };
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