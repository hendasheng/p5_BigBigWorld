precision mediump float;

uniform sampler2D uTex;
uniform vec2 uResolution;
uniform float uTime;
uniform float uAmount;
uniform float uRgbShift;
uniform float uBlockMix;
uniform float uScanMix;
uniform float uNoiseMix;
uniform float uBlobTrailDensity;
uniform float uBlobTrailScatter;
uniform float uShowVideo;
uniform int uRectCount;
uniform vec4 uRects[40];
uniform float uRectModes[40];

varying vec2 vTexCoord;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 posterize(vec3 c, float steps) {
  return floor(clamp(c, 0.0, 1.0) * steps) / steps;
}

float rectInfluence(vec2 uv, vec4 rect) {
  float insideX = step(abs(uv.x - rect.x), rect.z);
  float insideY = step(abs(uv.y - rect.y), rect.w);
  return insideX * insideY;
}

vec3 sampleGhostTrail(vec2 uv, vec2 sampleUv, vec2 blockCell, float phase, float mask) {
  float direction = hash(blockCell + phase + 101.0) > 0.5 ? 1.0 : -1.0;
  float sliceGate = step(0.42, hash(vec2(floor(uv.y * 96.0), floor(phase * 0.7) + 17.0)));
  float jumpGate = step(0.36, hash(vec2(floor(uv.x * 44.0), floor(phase) + 29.0)));
  vec3 ghost = vec3(0.0);
  float weight = 0.0;

  for (int j = 0; j < 3; j++) {
    float fj = float(j) + 1.0;
    float jitter = hash(blockCell + phase + 140.0 + fj * 11.0);
    float offsetX = direction * (0.012 + fj * 0.018 + jitter * 0.026) * uBlobTrailScatter;
    float offsetY = (jitter - 0.5) * 0.03 * uBlobTrailScatter * jumpGate;
    vec2 ghostUv = clamp(sampleUv - vec2(offsetX, offsetY), 0.0, 1.0);
    vec3 sampleColor = texture2D(uTex, ghostUv).rgb;
    float gate = step(0.28 + fj * 0.12, hash(blockCell + phase + 200.0 + fj * 7.0)) * sliceGate;
    float contribution = gate * (0.55 - 0.12 * fj) * (0.5 + uBlobTrailDensity * 0.6) * mask;
    ghost += sampleColor * contribution;
    weight += contribution;
  }

  if (weight <= 0.0001) return texture2D(uTex, sampleUv).rgb;
  return mix(texture2D(uTex, sampleUv).rgb, ghost / weight, min(1.0, 0.45 + uBlobTrailDensity * 0.42));
}

void main() {
  vec2 uv = vTexCoord;
  uv.y = 1.0 - uv.y;

  float mask = 0.0;
  float effectMode = 0.0;
  for (int i = 0; i < 40; i++) {
    if (i >= uRectCount) break;
    float influence = rectInfluence(uv, uRects[i]);
    if (influence > mask) {
      mask = influence;
      effectMode = uRectModes[i];
    }
  }

  vec3 rawColor = texture2D(uTex, uv).rgb;
  vec3 baseColor = rawColor * uShowVideo;
  if (mask <= 0.001) {
    gl_FragColor = vec4(baseColor, 1.0);
    return;
  }

  if (effectMode < 0.5) {
    gl_FragColor = vec4(mix(baseColor, rawColor, mask), 1.0);
    return;
  }

  if (effectMode < 1.5) {
    vec3 inverted = posterize(1.0 - rawColor, 8.0);
    gl_FragColor = vec4(mix(baseColor, inverted, mask), 1.0);
    return;
  }

  float phase = floor(uTime * 5.0);
  float rowMask = step(0.68, hash(vec2(floor(uv.y * 132.0), phase)));
  float rowShift = rowMask * (hash(vec2(floor(uv.y * 280.0), phase + 2.0)) - 0.5) * 0.18 * uAmount * mask;

  vec2 blockCell = floor(uv * vec2(28.0, 16.0));
  float blockGate = step(0.78 - uBlockMix * 0.34, hash(blockCell + phase));
  vec2 blockOffset = (vec2(hash(blockCell + phase + 7.0), hash(blockCell + phase + 19.0)) - 0.5) * 0.2 * uAmount * uBlockMix * blockGate * mask;
  float freezeGate = step(0.8 - uBlockMix * 0.3, hash(blockCell + phase + 31.0));
  vec2 frozenUv = (blockCell + 0.5) / vec2(28.0, 16.0);

  vec2 sampleUv = clamp(uv + vec2(rowShift, 0.0) + blockOffset, 0.0, 1.0);
  float split = (0.006 + hash(vec2(floor(uv.y * 90.0), phase + 5.0)) * 0.024) * uRgbShift * uAmount * mask;

  if (freezeGate > 0.5) {
    sampleUv = mix(sampleUv, frozenUv, 0.92 * mask);
  }

  if (effectMode < 2.5) {
    sampleUv = mix(sampleUv, frozenUv, 0.45 * mask);
    split *= 0.55;
  } else if (effectMode < 3.5) {
    sampleUv.x = floor(sampleUv.x * 22.0) / 22.0;
    sampleUv.y += (hash(vec2(floor(uv.x * 34.0), phase + 11.0)) - 0.5) * 0.06 * uAmount * mask;
  } else {
    sampleUv = floor(sampleUv * vec2(18.0, 12.0)) / vec2(18.0, 12.0);
    split *= 1.4;
  }

  vec3 color;
  color.r = texture2D(uTex, clamp(sampleUv + vec2(split, 0.0), 0.0, 1.0)).r;
  color.g = texture2D(uTex, sampleUv).g;
  color.b = texture2D(uTex, clamp(sampleUv - vec2(split, 0.0), 0.0, 1.0)).b;
  vec3 ghostColor = sampleGhostTrail(uv, sampleUv, blockCell, phase, mask);
  color = mix(color, ghostColor, min(1.0, 0.24 + uBlobTrailDensity * 0.46) * mask);
  color = posterize(color, max(4.0, 12.0 - uAmount * 7.0));

  float line = sin(uv.y * uResolution.y * 1.15) * 0.5 + 0.5;
  color *= 1.0 - line * uScanMix * 0.32 * mask;

  float digitalNoise = step(0.93 - uNoiseMix * 0.18, hash(floor(uv * uResolution * 0.35) + phase * 17.0)) * mask;
  float grain = (hash(floor(uv * uResolution * 0.5) + uTime * 120.0) - 0.5) * uNoiseMix * 0.08 * mask;
  color += grain;
  if (effectMode < 2.5) {
    color = mix(color, vec3(dot(color, vec3(0.3333))), 0.42);
    color = mix(color, vec3(hash(blockCell + phase + 61.0)), digitalNoise * 0.55);
  } else if (effectMode < 3.5) {
    color.gb = color.bg;
    color = mix(color, vec3(hash(blockCell + phase + 73.0)), digitalNoise * 0.72);
  } else {
    vec3 alt = vec3(color.b, color.r, color.g);
    color = mix(color, alt, 0.58);
    color = mix(color, vec3(hash(blockCell + phase + 87.0)), digitalNoise * 0.96);
  }
  color = max(color - vec3(0.14 * uAmount * mask), 0.0);
  color = posterize(color, 8.0);

  gl_FragColor = vec4(mix(baseColor, color, mask), 1.0);
}
