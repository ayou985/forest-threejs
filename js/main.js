import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createTerrain } from "./terrain.js";
import { createSky } from "./sky.js";
import { createWater } from "./water.js";
import { createGrass } from "./grass.js";
import { createVegetation } from "./vegetation.js";
import { createTrees } from "./trees.js";
import { createPostProcessing } from "./postfx.js";
import { setupLightsAndFog } from "./lights.js";
import { createParticles } from "./particles.js";
// ─── Renderer ─────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// ─── Scene & Camera ───────────────────────────────────────────────────────────

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  1200,
);
// Caméra basse + légèrement sur le côté → lac visible en point focal
camera.position.set(-55, 10, 72);
camera.lookAt(18, 2, 20);

// ─── Controls ─────────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(18, 2, 20);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.48;
controls.minDistance = 4;
controls.maxDistance = 280;
controls.update();


const loadingEl = document.getElementById("loading");
const barEl = document.getElementById("loading-bar");
const steps = 9;
let step = 0;

function progress(label) {
  step++;
  if (barEl) {
    barEl.style.width = (step / steps) * 100 + "%";
  }
  console.log("[forest]", label);
}


async function buildScene() {
  await tick();
  progress("Sky…");
  const { sky, sun: sunDir } = createSky(scene, renderer);

  await tick();
  progress("Lights & fog…");
  const sunColor = new THREE.Color(1.0, 0.88, 0.55);
  setupLightsAndFog(scene, sunDir);

  await tick();
  progress("Terrain…");
  createTerrain(scene);

  await tick();
  progress("Water…");
  const water = createWater(scene, sunDir, sunColor);

  // Eau abaissée
  if (water?.mesh?.position) {
    water.mesh.position.y -= 2.5;
  } else if (water?.position) {
    water.position.y -= 2.5;
  }

  await tick();
  progress("Grass…");
  const grass = createGrass(scene);

  await tick();
  progress("Vegetation…");
  await createVegetation(scene);

  await tick();
  progress("Trees (LOD)…");
  const trees = await createTrees(scene);

  await tick();
  progress("Particles…");
  const particles = createParticles(scene);

  await tick();
  progress("Post-FX…");
  const composer = createPostProcessing(renderer, scene, camera);
  _composer = composer;

  if (loadingEl) {
    loadingEl.style.opacity = "0";
    setTimeout(() => {
      loadingEl.style.display = "none";
    }, 900);
  }

  const clock = new THREE.Clock();
  const fpsEl = document.getElementById("fps");
  const polyEl = document.getElementById("polys");

  renderer.info.autoReset = false;

  let frameCount = 0;
  let lastFPSTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    renderer.info.reset();

    const elapsed = clock.getElapsedTime();

    if (grass?.update) {
      grass.update(elapsed);
    }

    if (water?.update) {
      water.update(elapsed, camera);
    }

    if (particles?.update) {
      particles.update(elapsed);
    }

    if (Array.isArray(trees)) {
      for (const lod of trees) {
        if (lod?.update) lod.update(camera);
      }
    }

    controls.update();
    composer.render();

    frameCount++;
    const now = performance.now();

    if (now - lastFPSTime >= 1000) {
      if (fpsEl) fpsEl.textContent = frameCount;
      if (polyEl) {
        polyEl.textContent =
          renderer.info.render.triangles.toLocaleString("fr-FR");
      }
      frameCount = 0;
      lastFPSTime = now;
    }
  }

  animate();
}


let _composer = null;

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);

  if (_composer) {
    _composer.setSize(w, h);
    _composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
});


function tick() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}



buildScene().catch((error) => {
  console.error("[forest] Erreur buildScene :", error);
});
