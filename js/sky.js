import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export function createSky(scene, renderer) {
  const sky = new Sky();
  sky.scale.setScalar(10000);
  scene.add(sky);

  const uniforms = sky.material.uniforms;

  uniforms['turbidity'].value = 5;
  uniforms['rayleigh'].value = 1.2;
  uniforms['mieCoefficient'].value = 0.008;
  uniforms['mieDirectionalG'].value = 0.85;

  const elevation = 6;
  const azimuth = 180;

  const phi = THREE.MathUtils.degToRad(90 - elevation);
  const theta = THREE.MathUtils.degToRad(azimuth);

  const sun = new THREE.Vector3();
  sun.setFromSphericalCoords(1, phi, theta);

  uniforms['sunPosition'].value.copy(sun);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = sky.clone();
  envScene.add(envSky);

  const envMap = pmrem.fromScene(envScene).texture;
  scene.environment = envMap;

  pmrem.dispose();

  return { sky, sun };
}