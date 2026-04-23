import * as THREE from 'three';


const VERT = /* glsl */`
  uniform float uTime;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vUv = uv;

    vec3 pos = position;

    float waveA =
        sin(pos.x * 0.18 + uTime * 0.9) * 0.10 +
        sin(pos.z * 0.22 + uTime * 0.75) * 0.08;

    float waveB =
        sin(pos.x * 0.55 + uTime * 1.7) * 0.025 +
        cos(pos.z * 0.50 + uTime * 1.45) * 0.025;

    pos.y += waveA + waveB;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vWorldPos = world.xyz;
    vNormal = normalize(normalMatrix * normal);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */`
  uniform float uTime;
  uniform vec3 uCameraPos;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  vec3 rippleNormal(vec2 uv, float t) {
    float r1 = sin(uv.x * 10.0 + t * 1.2) * 0.35;
    float r2 = cos(uv.y * 9.0 + t * 1.0) * 0.35;
    float r3 = sin((uv.x + uv.y) * 7.0 + t * 0.8) * 0.2;
    return normalize(vec3(r1 + r3, 1.8, r2 + r3));
  }

  // masque organique du lac
  float lakeMask(vec2 uv) {
    vec2 p = uv * 2.0 - 1.0;

    float a = length(p * vec2(1.15, 0.82));
    float wobble =
        sin(p.x * 4.0) * 0.08 +
        cos(p.y * 5.0) * 0.06 +
        sin((p.x + p.y) * 6.0) * 0.04;

    float shape = 1.0 - smoothstep(0.78 + wobble, 0.9 + wobble, a);

    // étranglement du lac pour casser l’ellipse
    float cut =
        smoothstep(-0.15, 0.25, p.x) *
        smoothstep(0.55, 0.05, p.y);

    shape *= mix(1.0, 0.72, cut);

    return clamp(shape, 0.0, 1.0);
  }

  void main() {
    float mask = lakeMask(vUv);
    if (mask < 0.03) discard;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 ripple = rippleNormal(vUv * 5.0, uTime);
    vec3 normal = normalize(vNormal + ripple * 0.28);

    float cosTheta = max(dot(normal, viewDir), 0.0);
    float fresnel = 0.03 + 0.75 * pow(1.0 - cosTheta, 3.5);

    vec3 shallowCol = vec3(0.10, 0.32, 0.34);
    vec3 midCol     = vec3(0.07, 0.22, 0.28);
    vec3 deepCol    = vec3(0.03, 0.09, 0.18);

    float depthT = clamp(1.0 - cosTheta, 0.0, 1.0);
    vec3 waterCol = mix(shallowCol, midCol, depthT * 0.55);
    waterCol = mix(waterCol, deepCol, depthT * 0.85);

    vec3 skyReflect = vec3(0.48, 0.62, 0.72);

    vec3 halfDir = normalize(uSunDirection + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 120.0);
    vec3 specular = uSunColor * spec * 1.2;

    vec3 color = mix(waterCol, skyReflect, fresnel * 0.35);
    color += specular * 0.35;

    float foam = smoothstep(0.78, 0.92, ripple.y);
    color = mix(color, vec3(0.72, 0.80, 0.84), foam * 0.08);

    // fondu doux sur les bords
    float edgeFade = smoothstep(0.03, 0.18, mask);
    float alpha = 0.84 * edgeFade;

    gl_FragColor = vec4(color, alpha);
  }
`;

export function createWater(scene, sunDirection, sunColor) {
  const geo = new THREE.PlaneGeometry(60, 60, 64, 64);
  geo.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime:         { value: 0 },
    uCameraPos:    { value: new THREE.Vector3() },
    uSunDirection: { value: sunDirection.clone().normalize() },
    uSunColor:     { value: sunColor.clone() },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(30, -1.2, 30);

  scene.add(mesh);

  return {
    mesh,
    update(elapsed, camera) {
      uniforms.uTime.value = elapsed;
      uniforms.uCameraPos.value.copy(camera.position);
    },
  };
}