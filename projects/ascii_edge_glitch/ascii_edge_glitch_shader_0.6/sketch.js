/* global Tweakpane */

let videoSource = null;
let videoReady = false;
let haveSource = false;

let sourcePg = null;
let shaderPg = null;
let edgePg = null;
let glitchShader = null;
const MAX_SHADER_RECTS = 40;

const ui = {
  panel: null,
  paneWrap: null,
  hud: null,
  hudZone: null,
  paneZone: null,
  badgeDot: null,
  badgeText: null,
  dropVeil: null,
  hudHideTimer: 0,
  paneHideTimer: 0,
};

const metrics = {
  fps: 0,
};

const runtime = {
  lastFpsCap: -1,
  coverKey: "",
  cover: { dx: 0, dy: 0, dw: 0, dh: 0 },
  analysisKey: "",
  activeCells: [],
  blobRects: [],
  shaderRectCount: 0,
  shaderUniforms: new Array(MAX_SHADER_RECTS * 4).fill(0),
  shaderModes: new Array(MAX_SHADER_RECTS).fill(0),
  cellW: 1,
  cellH: 1,
};

const params = {
  cellSize: 7,
  edgeThreshold: 106,
  blur: 1,
  opacity: 0.86,
  jitterPx: 0.4,
  charVariety: 0.76,
  shaderAmount: 0.72,
  rgbShift: 0.7,
  damageMix: 0.72,
  rawMix: 0.34,
  invertMix: 0.18,
  blobPoints: 12,
  blobAlpha: 0.72,
  blobScale: 1.0,
  blobSpacing: 1.1,
  blobMaxSize: 1.8,
  blobTrailDensity: 0.78,
  blobTrailScatter: 1.0,
  showBlobOutlines: true,
  maxFps: 30,
  showVideo: true,
  showShaderBase: true,
  showAscii: true,
  tintEdges: false,
  asciiTintColor: "#7CFF5B",
};

const ASCII_DENSE =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\\\|()1{}[]?-_+~<>i!lI;:,\\\"^`'. ";
const ASCII_HORIZONTAL = "=-~_^<>[]{}";
const ASCII_VERTICAL = "|!Il1:;[]{}";
const ASCII_DIAG_A = "/7xYVvnr*+";
const ASCII_DIAG_B = "\\\\LJtyk#%";
const ASCII_SPARK = "+*#%&@$";
const ASCII_GLITCH = "<>[]{}()\\/|_-+=*#%!?:;";

function preload() {
  glitchShader = loadShader("shader.vert", "shader.frag");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  applyFpsCap();

  textFont("JetBrains Mono");
  textAlign(CENTER, CENTER);
  noStroke();

  sourcePg = createGraphics(width, height);
  sourcePg.pixelDensity(1);
  shaderPg = createGraphics(width, height, WEBGL);
  shaderPg.pixelDensity(1);
  shaderPg.noStroke();
  edgePg = createGraphics(64, 64);
  edgePg.pixelDensity(1);

  setupUI();
  setupDropHandlers();
  setStatus(false, "拖拽 mp4 到窗口开始");
}

function draw() {
  applyFpsCap();
  metrics.fps = lerp(metrics.fps, frameRate(), 0.18);

  background(10, 12, 16);

  if (!videoSource || !haveSource) {
    drawIdle();
    return;
  }

  if (!videoReady) {
    drawIdle("视频加载中...");
    return;
  }

  const videoNode = videoSource.elt;
  const cover = getCachedCoverRect(videoNode);
  renderSourceFrame(videoNode, cover);

  const procW = Math.max(40, Math.floor(width / params.cellSize));
  const procH = Math.max(30, Math.floor(height / params.cellSize));
  refreshAnalysisIfNeeded(videoNode, procW, procH);

  const activeCells = runtime.activeCells;
  const blobRects = runtime.blobRects;
  const cellW = runtime.cellW;
  const cellH = runtime.cellH;

  if (params.showShaderBase) {
    renderShaderFrame(runtime.shaderUniforms, runtime.shaderModes, runtime.shaderRectCount);
  }

  if (!params.showVideo) {
    push();
    fill(8, 10, 14);
    rect(0, 0, width, height);
    pop();
    if (params.showShaderBase) image(shaderPg, 0, 0, width, height);
  } else if (params.showShaderBase) {
    image(shaderPg, 0, 0, width, height);
  } else {
    image(sourcePg, 0, 0, width, height);
  }

  if (params.showAscii) {
    push();
    blendMode(ADD);
    textSize(Math.max(6, Math.floor(Math.min(cellW, cellH) * 1.15)));

    let lastRow = -1;
    let rowShift = 0;
    for (let i = 0; i < activeCells.length; i++) {
      const cell = activeCells[i];
      if (cell.y !== lastRow) {
        lastRow = cell.y;
        rowShift = computeRowShift(cell.y, cellW);
      }

      const ch = pickAsciiChar(cell, cell.luma, cell.x, cell.y);
      const cx = (cell.x + 0.5) * cellW + rowShift + random(-params.jitterPx, params.jitterPx);
      const cy = (cell.y + 0.5) * cellH + random(-params.jitterPx, params.jitterPx);

      if (params.tintEdges) {
        fill(buildAsciiTint(Math.round(255 * params.opacity)));
        text(ch, cx, cy);
      } else {
        fill(240, 245, 255, Math.round(255 * params.opacity));
        text(ch, cx, cy);
      }
    }
    pop();
  }

  drawBlobRects(blobRects);
}

function renderSourceFrame(videoNode, cover) {
  sourcePg.clear();
  sourcePg.push();
  sourcePg.background(0);
  sourcePg.image(videoSource, cover.dx, cover.dy, cover.dw, cover.dh);
  sourcePg.pop();
}

function renderShaderFrame(rectUniforms, rectModes, rectCount) {
  const amount = pow(params.shaderAmount, 1.25) * 1.65;
  const rgbShift = pow(params.rgbShift, 1.1) * 1.85;
  const blockMix = pow(params.damageMix, 1.12) * 1.68;
  const scanMix = (0.24 + pow(params.damageMix, 0.95) * 0.9) * (0.72 + params.shaderAmount * 0.38);
  const noiseMix = (0.18 + pow(params.damageMix, 1.04) * 1.05) * (0.68 + params.shaderAmount * 0.32);
  const blobTrailDensity = pow(params.blobTrailDensity, 1.1) * 1.25;
  const blobTrailScatter = pow(params.blobTrailScatter, 1.08);
  shaderPg.shader(glitchShader);
  glitchShader.setUniform("uTex", sourcePg);
  glitchShader.setUniform("uResolution", [width, height]);
  glitchShader.setUniform("uTime", millis() * 0.001);
  glitchShader.setUniform("uAmount", amount);
  glitchShader.setUniform("uRgbShift", rgbShift);
  glitchShader.setUniform("uBlockMix", blockMix);
  glitchShader.setUniform("uScanMix", scanMix);
  glitchShader.setUniform("uNoiseMix", noiseMix);
  glitchShader.setUniform("uBlobTrailDensity", blobTrailDensity);
  glitchShader.setUniform("uBlobTrailScatter", blobTrailScatter);
  glitchShader.setUniform("uShowVideo", params.showVideo ? 1 : 0);
  glitchShader.setUniform("uRectCount", rectCount);
  glitchShader.setUniform("uRects", rectUniforms);
  glitchShader.setUniform("uRectModes", rectModes);
  shaderPg.rect(-width * 0.5, -height * 0.5, width, height);
}

function renderEdgeBuffer(videoNode) {
  edgePg.push();
  edgePg.background(0);
  edgePg.image(videoSource, ...computeCoverTo(edgePg.width, edgePg.height, videoNode.videoWidth, videoNode.videoHeight));
  if (params.blur > 0) edgePg.filter(BLUR, params.blur);
  edgePg.pop();
}

function buildLuma(buffer) {
  const luma = new Float32Array(buffer.width * buffer.height);
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const idx = 4 * (y * buffer.width + x);
      const r = buffer.pixels[idx + 0];
      const g = buffer.pixels[idx + 1];
      const b = buffer.pixels[idx + 2];
      luma[y * buffer.width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }
  return luma;
}

function refreshAnalysisIfNeeded(videoNode, procW, procH) {
  const nextKey = [
    Math.floor(videoNode.currentTime * 120),
    procW,
    procH,
    params.edgeThreshold,
    params.blur,
    params.blobPoints,
    params.blobScale,
    params.blobSpacing,
    params.blobMaxSize,
    Math.round(params.rawMix * 100),
    Math.round(params.invertMix * 100),
    Math.round(params.damageMix * 100),
  ].join("|");

  if (runtime.analysisKey === nextKey) return;
  runtime.analysisKey = nextKey;

  ensureEdgeBuffer(procW, procH);
  renderEdgeBuffer(videoNode);
  edgePg.loadPixels();

  const luma = buildLuma(edgePg);
  const analysis = buildActiveCells(luma, edgePg);
  runtime.activeCells = analysis.activeCells;
  runtime.cellW = width / edgePg.width;
  runtime.cellH = height / edgePg.height;
  runtime.blobRects = selectBlobRects(analysis.points);
  updateShaderRectData(runtime.blobRects);
}

function buildActiveCells(luma, buffer) {
  const activeCells = [];
  const points = [];
  const pixels = buffer.pixels;
  const w = buffer.width;
  const h = buffer.height;
  const cellW = width / w;
  const cellH = height / h;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const edge = sobelData(luma, w, x, y);
      if (edge.mag < params.edgeThreshold) continue;

      const idx = y * w + x;
      const pixIdx = idx * 4;
      const strength = constrain((edge.mag - params.edgeThreshold) / Math.max(1, 255 - params.edgeThreshold), 0, 1);
      const colorSample = {
        r: pixels[pixIdx + 0],
        g: pixels[pixIdx + 1],
        b: pixels[pixIdx + 2],
      };
      const cell = {
        x,
        y,
        gx: edge.gx,
        gy: edge.gy,
        mag: edge.mag,
        luma: luma[idx],
        strength,
        color: colorSample,
      };
      activeCells.push(cell);

      if (((x + y) & 1) === 0) {
        points.push({
          x: (x + 0.5) * cellW,
          y: (y + 0.5) * cellH,
          strength,
          color: colorSample,
        });
      }
    }
  }

  return { activeCells, points };
}

function selectBlobRects(points) {
  if (!points.length || params.blobPoints <= 0) return [];

  const sorted = points.slice().sort((a, b) => b.strength - a.strength);
  const selected = [];
  const spacingBase = Math.max(width, height) * 0.048;
  const minDistance = (spacingBase + params.blobSpacing * 62) * params.blobScale;
  const minDistSq = sq(minDistance);

  for (const point of sorted) {
    if (selected.length >= params.blobPoints) break;
    if (!isBlobFarEnough(point, selected, minDistSq)) continue;

    const strengthCurve = pow(point.strength, 1.85);
    const size = (22 + strengthCurve * (90 + params.blobMaxSize * 210)) * params.blobScale;
    const widthRatio = 1.02 + strengthCurve * 0.88;
    const heightRatio = 0.42 + strengthCurve * 0.82;
    selected.push({
      x: point.x,
      y: point.y,
      w: size * widthRatio,
      h: size * heightRatio,
      strength: point.strength,
      color: point.color,
      shaderEnabled: true,
      mode: assignBlobMode(point, selected.length),
    });
  }

  return selected.slice(0, params.blobPoints);
}

function isBlobFarEnough(point, selected, minDistSq) {
  for (const item of selected) {
    const dx = point.x - item.x;
    const dy = point.y - item.y;
    if (dx * dx + dy * dy < minDistSq) return false;
  }
  return true;
}

function updateShaderRectData(blobRects) {
  const uniforms = runtime.shaderUniforms;
  const modes = runtime.shaderModes;
  const invW = 1 / Math.max(1, width);
  const invH = 1 / Math.max(1, height);
  let count = 0;

  for (let i = 0; i < blobRects.length && count < MAX_SHADER_RECTS; i++) {
    const rect = blobRects[i];
    if (!rect.shaderEnabled) continue;

    const base = count * 4;
    uniforms[base + 0] = rect.x * invW;
    uniforms[base + 1] = rect.y * invH;
    uniforms[base + 2] = rect.w * 0.5 * invW;
    uniforms[base + 3] = rect.h * 0.5 * invH;
    modes[count] = rect.mode || 0;
    count++;
  }

  for (let i = count * 4; i < MAX_SHADER_RECTS * 4; i++) uniforms[i] = 0;
  for (let i = count; i < MAX_SHADER_RECTS; i++) modes[i] = 0;
  runtime.shaderRectCount = count;
}

function assignBlobMode(point, index) {
  const seed = noise(point.x * 0.01 + 10, point.y * 0.01 + 20, index * 0.17 + 30);
  const rawWeight = Math.max(0, params.rawMix);
  const invertWeight = Math.max(0, params.invertMix);
  const damageWeight = Math.max(0, params.damageMix);
  const weights = [
    rawWeight,
    invertWeight,
    damageWeight * 0.32,
    damageWeight * 0.26,
    damageWeight * 0.22,
    damageWeight * 0.2,
  ];
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0.0001) return 0;

  let threshold = seed * total;
  for (let i = 0; i < weights.length; i++) {
    threshold -= weights[i];
    if (threshold <= 0) return i;
  }
  return weights.length - 1;
}

function drawBlobRects(selected) {
  if (!selected.length || params.blobAlpha <= 0 || !params.showBlobOutlines) return;

  push();
  rectMode(CENTER);
  noFill();

  for (let i = 0; i < selected.length; i++) {
    const point = selected[i];
    const c = params.tintEdges ? buildAsciiTint(255) : color(240, 245, 255);

    stroke(c);
    strokeWeight(1 + point.strength * 1.3);
    rect(point.x, point.y, point.w, point.h);
  }

  pop();
}

function setupUI() {
  ui.hud = document.createElement("div");
  ui.hud.className = "hud";
  ui.hud.innerHTML = `
    <h1>ASCII Edge Glitch Shader</h1>
    <p>拖拽本地 mp4，用 p5.js 编排 ASCII / 线框层，并让 shader 负责视频本体的 glitch 与色偏处理。</p>
    <div class="badge"><span class="dot"></span><span class="txt">未加载视频</span></div>
  `;
  document.body.appendChild(ui.hud);

  ui.badgeDot = ui.hud.querySelector(".dot");
  ui.badgeText = ui.hud.querySelector(".txt");

  ui.dropVeil = document.createElement("div");
  ui.dropVeil.className = "dropveil";
  ui.dropVeil.innerHTML = `
    <div class="msg">
      <p class="big">松手上传</p>
      <p class="small">仅支持本地 mp4。不会上传到服务器。</p>
    </div>
  `;
  document.body.appendChild(ui.dropVeil);

  const paneWrap = document.createElement("div");
  paneWrap.className = "pane";
  document.body.appendChild(paneWrap);
  ui.paneWrap = paneWrap;

  const pane = new Tweakpane.Pane({ container: paneWrap, title: "Controls" });
  ui.panel = pane;

  const sourceFolder = pane.addFolder({ title: "Source", expanded: true });
  const shaderFolder = pane.addFolder({ title: "Local Glitch", expanded: true });
  const asciiFolder = pane.addFolder({ title: "ASCII", expanded: true });
  const blobFolder = pane.addFolder({ title: "Blob", expanded: true });

  sourceFolder.addMonitor(metrics, "fps", {
    label: "live fps",
    min: 0,
    max: 60,
    interval: 150,
  });
  sourceFolder.addInput(params, "showVideo", { label: "video" });
  sourceFolder.addInput(params, "showAscii", { label: "ascii" });
  sourceFolder.addInput(params, "maxFps", { min: 10, max: 60, step: 1, label: "fps cap" });

  shaderFolder.addInput(params, "showShaderBase", { label: "show" });
  shaderFolder.addInput(params, "shaderAmount", { min: 0, max: 1.2, step: 0.01, label: "amount" });
  shaderFolder.addInput(params, "rgbShift", { min: 0, max: 1.5, step: 0.01, label: "rgb" });
  shaderFolder.addInput(params, "damageMix", { min: 0, max: 1.5, step: 0.01, label: "damage" });
  shaderFolder.addInput(params, "rawMix", { min: 0, max: 1, step: 0.01, label: "raw" });
  shaderFolder.addInput(params, "invertMix", { min: 0, max: 1, step: 0.01, label: "invert" });

  asciiFolder.addInput(params, "cellSize", { min: 5, max: 18, step: 1, label: "cell" });
  asciiFolder.addInput(params, "edgeThreshold", { min: 20, max: 220, step: 1, label: "edge" });
  asciiFolder.addInput(params, "blur", { min: 0, max: 3, step: 1, label: "blur" });
  asciiFolder.addInput(params, "opacity", { min: 0.05, max: 1, step: 0.01, label: "alpha" });
  asciiFolder.addInput(params, "jitterPx", { min: 0, max: 3, step: 0.05, label: "jitter" });
  asciiFolder.addInput(params, "charVariety", { min: 0, max: 1, step: 0.01, label: "variety" });
  const tintToggle = asciiFolder.addInput(params, "tintEdges", { label: "tint" });
  const tintColorInput = asciiFolder.addInput(params, "asciiTintColor", { label: "color" });
  tintColorInput.hidden = !params.tintEdges;
  tintToggle.on("change", (event) => {
    tintColorInput.hidden = !event.value;
  });

  blobFolder.addInput(params, "showBlobOutlines", { label: "outline" });
  blobFolder.addInput(params, "blobPoints", { min: 0, max: 40, step: 1, label: "count" });
  blobFolder.addInput(params, "blobAlpha", { min: 0, max: 1, step: 0.01, label: "alpha" });
  blobFolder.addInput(params, "blobScale", { min: 0.4, max: 2, step: 0.05, label: "scale" });
  blobFolder.addInput(params, "blobSpacing", { min: 0.4, max: 2.4, step: 0.05, label: "spacing" });
  blobFolder.addInput(params, "blobMaxSize", { min: 0.6, max: 2.8, step: 0.05, label: "max size" });
  blobFolder.addInput(params, "blobTrailDensity", { min: 0, max: 1.4, step: 0.01, label: "trail" });
  blobFolder.addInput(params, "blobTrailScatter", { min: 0.4, max: 1.8, step: 0.01, label: "scatter" });

  setupHoverUI();
}

function setupHoverUI() {
  ui.hudZone = document.createElement("div");
  ui.hudZone.className = "hoverzone hudzone";
  document.body.appendChild(ui.hudZone);

  ui.paneZone = document.createElement("div");
  ui.paneZone.className = "hoverzone panezone";
  document.body.appendChild(ui.paneZone);

  bindHoverVisibility(ui.hudZone, ui.hud, "hudHideTimer");
  bindHoverVisibility(ui.paneZone, ui.paneWrap, "paneHideTimer");
}

function bindHoverVisibility(triggerEl, targetEl, timerKey) {
  const show = () => showFloatingUI(targetEl, timerKey);
  const hide = () => hideFloatingUIDelayed(targetEl, timerKey);
  triggerEl.addEventListener("mouseenter", show);
  triggerEl.addEventListener("mouseleave", hide);
  targetEl.addEventListener("mouseenter", show);
  targetEl.addEventListener("mouseleave", hide);
}

function showFloatingUI(targetEl, timerKey) {
  window.clearTimeout(ui[timerKey]);
  targetEl.classList.add("show");
}

function hideFloatingUIDelayed(targetEl, timerKey) {
  window.clearTimeout(ui[timerKey]);
  ui[timerKey] = window.setTimeout(() => {
    targetEl.classList.remove("show");
  }, 140);
}

function setupDropHandlers() {
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    ui.dropVeil.classList.add("show");
  });

  window.addEventListener("dragleave", (e) => {
    if (e.relatedTarget === null) ui.dropVeil.classList.remove("show");
  });

  window.addEventListener("drop", (e) => {
    e.preventDefault();
    ui.dropVeil.classList.remove("show");

    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!isMp4(file)) {
      setStatus(false, "仅支持 mp4");
      return;
    }
    loadVideoFile(file);
  });
}

function isMp4(file) {
  const nameOk = (file.name || "").toLowerCase().endsWith(".mp4");
  const typeOk = (file.type || "").toLowerCase() === "video/mp4";
  return nameOk || typeOk;
}

function loadVideoFile(file) {
  setStatus(false, "加载视频...");
  haveSource = true;
  videoReady = false;
  runtime.analysisKey = "";
  runtime.coverKey = "";
  runtime.activeCells = [];
  runtime.blobRects = [];
  runtime.shaderRectCount = 0;

  if (videoSource) {
    try {
      videoSource.stop();
      URL.revokeObjectURL(videoSource.elt.src);
    } catch (_) {
    }
    videoSource.remove();
    videoSource = null;
  }

  const url = URL.createObjectURL(file);
  const nextVideo = createVideo([url], () => {
    const videoNode = nextVideo.elt;
    videoReady = true;
    setStatus(true, `已加载：${file.name}`);
    videoNode.play().catch(() => {
      setStatus(true, `已加载：${file.name}（点击播放）`);
    });
  });

  nextVideo.elt.addEventListener("error", () => {
    videoReady = false;
    setStatus(false, "视频加载失败");
  });

  nextVideo.volume(0);
  nextVideo.loop();
  nextVideo.hide();
  nextVideo.elt.muted = true;
  nextVideo.elt.playsInline = true;
  nextVideo.elt.autoplay = true;
  nextVideo.elt.crossOrigin = "anonymous";

  videoSource = nextVideo;
}

function setStatus(ok, text) {
  if (!ui.badgeDot || !ui.badgeText) return;
  ui.badgeDot.classList.toggle("ok", !!ok);
  ui.badgeText.textContent = text;
}

function ensureEdgeBuffer(w, h) {
  if (edgePg.width === w && edgePg.height === h) return;
  edgePg.resizeCanvas(w, h);
}

function sobelData(luma, w, x, y) {
  const i = y * w + x;
  const tl = luma[i - w - 1];
  const tc = luma[i - w];
  const tr = luma[i - w + 1];
  const ml = luma[i - 1];
  const mr = luma[i + 1];
  const bl = luma[i + w - 1];
  const bc = luma[i + w];
  const br = luma[i + w + 1];

  const gx = (-1 * tl) + (1 * tr) + (-2 * ml) + (2 * mr) + (-1 * bl) + (1 * br);
  const gy = (-1 * tl) + (-2 * tc) + (-1 * tr) + (1 * bl) + (2 * bc) + (1 * br);

  return {
    gx,
    gy,
    mag: Math.min(255, Math.abs(gx) + Math.abs(gy)) * 0.5,
  };
}

function pickAsciiChar(edge, lumaValue, x, y) {
  const edgeStrength = constrain((edge.mag - params.edgeThreshold) / Math.max(1, 255 - params.edgeThreshold), 0, 1);
  const brightness = constrain(lumaValue / 255, 0, 1);
  const angle = Math.atan2(edge.gy, edge.gx);
  const angleNorm = (angle + Math.PI) / TWO_PI;
  const orientationBucket = Math.floor(angleNorm * 4) % 4;

  let pool = ASCII_DENSE;
  if (orientationBucket === 0) pool = ASCII_HORIZONTAL + ASCII_GLITCH + ASCII_DENSE.slice(0, 18);
  if (orientationBucket === 1) pool = ASCII_DIAG_A + ASCII_GLITCH + ASCII_DENSE.slice(10, 28);
  if (orientationBucket === 2) pool = ASCII_VERTICAL + ASCII_GLITCH + ASCII_DENSE.slice(18, 40);
  if (orientationBucket === 3) pool = ASCII_DIAG_B + ASCII_GLITCH + ASCII_DENSE.slice(26, 48);

  const denseIndex = Math.floor((1 - edgeStrength) * (ASCII_DENSE.length - 1));
  const baseChar = ASCII_DENSE[constrain(denseIndex, 0, ASCII_DENSE.length - 1)];
  const poolIndex = Math.floor(constrain((1 - brightness * 0.6 - edgeStrength * 0.4), 0, 1) * (pool.length - 1));
  const directionalChar = pool[constrain(poolIndex, 0, pool.length - 1)];
  const drift = noise(x * 0.085, y * 0.085, frameCount * 0.025);
  const sparkle = noise(x * 0.16 + 50, y * 0.16 + 10, frameCount * 0.04);

  if (sparkle > 0.82 && edgeStrength > 0.45) {
    return ASCII_SPARK[Math.floor(sparkle * ASCII_SPARK.length) % ASCII_SPARK.length];
  }

  return drift < params.charVariety ? directionalChar : baseChar;
}

function computeRowShift(y, cellW) {
  const bandNoise = noise(y * 0.14, frameCount * 0.03);
  if (bandNoise < 0.56) return 0;
  const direction = noise(y * 0.08 + 90, frameCount * 0.02) > 0.5 ? 1 : -1;
  return direction * map(bandNoise, 0.56, 1, 0, cellW * 2.6 * params.shaderAmount, true);
}

function getFrameColor(pixels, frameWidth, frameHeight, x, y) {
  const sx = Math.floor(constrain(x, 0, frameWidth - 1));
  const sy = Math.floor(constrain(y, 0, frameHeight - 1));
  const idx = 4 * (sy * frameWidth + sx);
  return color(pixels[idx + 0], pixels[idx + 1], pixels[idx + 2]);
}

function buildAsciiTint(alpha) {
  const c = color(params.asciiTintColor);
  c.setAlpha(constrain(alpha, 0, 255));
  return c;
}

function drawIdle(overrideText) {
  push();
  fill(233, 238, 247, 220);
  textAlign(CENTER, CENTER);
  textSize(Math.max(18, Math.floor(Math.min(width, height) * 0.03)));
  text(overrideText || "拖拽 mp4 到窗口", width * 0.5, height * 0.48);
  pop();
}

function computeCoverRect(srcW, srcH, dstW, dstH) {
  const srcAR = srcW / Math.max(1, srcH);
  const dstAR = dstW / Math.max(1, dstH);

  let dw = dstW;
  let dh = dstH;
  let dx = 0;
  let dy = 0;

  if (srcAR > dstAR) {
    dh = dstH;
    dw = dh * srcAR;
    dx = (dstW - dw) * 0.5;
  } else {
    dw = dstW;
    dh = dw / srcAR;
    dy = (dstH - dh) * 0.5;
  }

  return { dx, dy, dw, dh };
}

function computeCoverTo(dstW, dstH, srcW, srcH) {
  const { dx, dy, dw, dh } = computeCoverRect(srcW, srcH, dstW, dstH);
  return [dx, dy, dw, dh];
}

function getCachedCoverRect(videoNode) {
  const nextKey = [videoNode.videoWidth, videoNode.videoHeight, width, height].join("|");
  if (runtime.coverKey !== nextKey) {
    runtime.coverKey = nextKey;
    runtime.cover = computeCoverRect(videoNode.videoWidth, videoNode.videoHeight, width, height);
  }
  return runtime.cover;
}

function applyFpsCap() {
  if (runtime.lastFpsCap === params.maxFps) return;
  runtime.lastFpsCap = params.maxFps;
  if (params.maxFps > 0) frameRate(params.maxFps);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  sourcePg.resizeCanvas(width, height);
  shaderPg.resizeCanvas(width, height);
  runtime.coverKey = "";
  runtime.analysisKey = "";
}

function mousePressed() {
  if (videoSource && videoReady) {
    videoSource.elt.play().catch(() => {});
  }
}
