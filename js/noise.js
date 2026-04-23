
function fract(n) { return n - Math.floor(n); }

function hash2(x, z) {
  return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123);
}

function smoothstep(t) { return t * t * (3.0 - 2.0 * t); }


export function noise2d(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = smoothstep(fx);
  const uz = smoothstep(fz);

  const a = hash2(ix,     iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix,     iz + 1);
  const d = hash2(ix + 1, iz + 1);

  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) - 0.5;
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} octaves
 * @param {number} scale  – spatial frequency multiplier
 */
export function fbm(x, z, octaves = 6, scale = 1.0) {
  let value     = 0.0;
  let amplitude = 1.0;
  let frequency = scale;
  let maxAmp    = 0.0;

  for (let i = 0; i < octaves; i++) {
    value    += noise2d(x * frequency, z * frequency) * amplitude;
    maxAmp   += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value / maxAmp; // normalised to [-0.5, 0.5]
}

/**
 * 
 */
export function getHeight(x, z) {
  const nx = x * 0.012;
  const nz = z * 0.012;

  const hills  = fbm(nx, nz, 6, 1.0) * 2.0 * 12.0;   // ± 12 u
  const detail = fbm(nx * 5.0 + 3.7, nz * 5.0 + 1.3, 4, 1.0) * 2.0 * 1.5;

  const dist = Math.sqrt(x * x + z * z) / 100.0;
  const bowl  = -dist * dist * 6.0;

  return hills + detail + bowl + 1.0;
}
