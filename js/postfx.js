import * as THREE from 'three';
import { EffectComposer }   from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/addons/postprocessing/OutputPass.js';



export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
     0.28,
     0.4,
     0.95
  );
  composer.addPass(bloom);

  
  composer.addPass(new OutputPass());


  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);

  return composer;
}
