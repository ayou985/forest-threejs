import * as THREE from 'three';

export function setupLightsAndFog(scene, sunDir) {

  //  Lumière ambiante (douce)
  const ambient = new THREE.AmbientLight(0xc8d8f0, 0.32);
  scene.add(ambient);

  //  Soleil (lumière chaude, basse)
  const sunLight = new THREE.DirectionalLight(0xffd6a3, 0.7);

  sunLight.position.copy(sunDir).multiplyScalar(120);

  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);

  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 300;

  sunLight.shadow.camera.left = -120;
  sunLight.shadow.camera.right = 120;
  sunLight.shadow.camera.top = 120;
  sunLight.shadow.camera.bottom = -120;

  scene.add(sunLight);

  //  Fog (IMPORTANT pour ton rendu référence)
  // Fog légèrement bleu-gris → crée de la profondeur atmosphérique
  scene.fog = new THREE.Fog(0xded6c8, 220, 550);
}