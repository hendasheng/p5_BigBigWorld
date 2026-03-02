/* global Tweakpane */

let videoSource = null;
let videoReady = false;
let haveSource = false;

let pg = null; // low-res processing buffer

const ui = {
  panel: null,
  hud: null,
  badgeDot: null,
  badgeText: null,
  dropVeil: null,
};

const metrics = {
  fps: 0,
};

const params = {
  cellSize: 8,
  edgeThreshold: 110,
  blur: 1,
  opacity: 0.85,
  jitterPx: 0.6,
  charVariety: 0.72,
  rowShift: 0.9,
  colorSplit: 0.7,
  maxFps: 30,
  showVideo: true,
  tintEdges: true,
};

const ASCII_DENSE =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\\\|()1{}[]?-_+~<>i!lI;:,\\\"^`'. ";
const ASCII_HORIZONTAL = "=-~_^<>[]{}";
const ASCII_VERTICAL = "|!Il1:;[]{}";
const ASCII_DIAG_A = "/7xYVvnr*+";
const ASCII_DIAG_B = "\\\\LJtyk#%";
const ASCII_SPARK = "+*#%&@$";
const ASCII_GLITCH = "<>[]{}()\\/|_-+=*#%!?:;";

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  frameRate(params.maxFps);

  textFont("JetBrains Mono");
  textAlign(CENTER, CENTER);
  noStroke();

  pg = createGraphics(64, 64);
  pg.pixelDensity(1);

  setupUI();
  setupDropHandlers();

  setStatus(false, "拖拽 mp4 到窗口开始");
}

function draw() {
  if (params.maxFps > 0) frameRate(params.maxFps);
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

  const canvasW = width;
  const canvasH = height;
  const videoNode = videoSource.elt;

  // Render base video (fit cover to canvas).
  const { dx, dy, dw, dh } = computeCoverRect(videoNode.videoWidth, videoNode.videoHeight, canvasW, canvasH);

  if (params.showVideo) {
    image(videoSource, dx, dy, dw, dh);
  } else {
    // Still draw a faint plate so edges have context when showVideo is off.
    push();
    fill(255, 18);
    rect(0, 0, width, height);
    pop();
  }

  const procW = Math.max(40, Math.floor(canvasW / params.cellSize));
  const procH = Math.max(30, Math.floor(canvasH / params.cellSize));
  ensureProcBuffer(procW, procH);

  // Downsample video to processing buffer.
  pg.push();
  pg.background(0);
  pg.image(videoSource, ...computeCoverTo(pg.width, pg.height, videoNode.videoWidth, videoNode.videoHeight));
  if (params.blur > 0) {
    // Blur at low-res helps keep "subject contour" vs texture edges.
    pg.filter(BLUR, params.blur);
  }
  pg.pop();

  pg.loadPixels();

  // Extract luma into a simple array for Sobel.
  const luma = new Float32Array(pg.width * pg.height);
  for (let y = 0; y < pg.height; y++) {
    for (let x = 0; x < pg.width; x++) {
      const idx = 4 * (y * pg.width + x);
      const r = pg.pixels[idx + 0];
      const g = pg.pixels[idx + 1];
      const b = pg.pixels[idx + 2];
      luma[y * pg.width + x] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
  }

  // Draw ASCII edges onto the main canvas.
  const cellW = canvasW / pg.width;
  const cellH = canvasH / pg.height;
  const edgeCutoff = params.edgeThreshold;
  const rowGlitchSeed = frameCount * 0.035;

  push();
  blendMode(ADD);
  fill(255, Math.round(255 * params.opacity));
  textSize(Math.max(6, Math.floor(Math.min(cellW, cellH) * 1.15)));

  for (let y = 1; y < pg.height - 1; y++) {
    const rowShiftPx = computeRowShift(y, cellW, rowGlitchSeed);

    for (let x = 1; x < pg.width - 1; x++) {
      const edge = sobelData(luma, pg.width, x, y);
      if (edge.mag < edgeCutoff) continue;

      const pixelIndex = y * pg.width + x;
      const lumaValue = luma[pixelIndex];
      const ch = pickAsciiChar(edge, lumaValue, x, y);

      const cx = (x + 0.5) * cellW + rowShiftPx;
      const cy = (y + 0.5) * cellH;

      const jx = params.jitterPx ? (random(-params.jitterPx, params.jitterPx)) : 0;
      const jy = params.jitterPx ? (random(-params.jitterPx, params.jitterPx)) : 0;
      const splitOffset = computeColorSplit(x, y, edge.mag);
      const edgeStrength = constrain((edge.mag - edgeCutoff) / Math.max(1, 255 - edgeCutoff), 0, 1);

      if (params.tintEdges) {
        const c = buildGlitchColor(getProcColor(x, y), edgeStrength, x, y);
        if (splitOffset > 0.01) {
          drawSplitCharacter(ch, cx + jx, cy + jy, c, splitOffset, edgeStrength);
          continue;
        }
        drawGlowCharacter(ch, cx + jx, cy + jy, c, edgeStrength);
        continue;
      } else {
        fill(240, 245, 255, Math.round(255 * params.opacity));
      }

      text(ch, cx + jx, cy + jy);
    }
  }
  pop();
}

function drawIdle(overrideText) {
  push();
  fill(233, 238, 247, 220);
  textAlign(CENTER, CENTER);
  textSize(Math.max(18, Math.floor(Math.min(width, height) * 0.03)));
  text(overrideText || "拖拽 mp4 到窗口", width * 0.5, height * 0.48);
  pop();
}

function setupUI() {
  ui.hud = document.createElement("div");
  ui.hud.className = "hud";
  ui.hud.innerHTML = `
    <h1>ASCII Edge Glitch</h1>
    <p>本地拖拽上传 mp4，自动提取主体轮廓边缘，并用 ASCII 点阵叠加到视频上。</p>
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

  const pane = new Tweakpane.Pane({ container: paneWrap, title: "Controls" });
  ui.panel = pane;

  pane.addMonitor(metrics, "fps", {
    label: "live fps",
    min: 0,
    max: 60,
    interval: 150,
  });
  pane.addInput(params, "cellSize", { min: 5, max: 18, step: 1, label: "cell" });
  pane.addInput(params, "edgeThreshold", { min: 20, max: 220, step: 1, label: "thresh" });
  pane.addInput(params, "blur", { min: 0, max: 3, step: 1, label: "blur" });
  pane.addInput(params, "opacity", { min: 0.05, max: 1.0, step: 0.01, label: "alpha" });
  pane.addInput(params, "jitterPx", { min: 0, max: 3, step: 0.1, label: "jitter" });
  pane.addInput(params, "charVariety", { min: 0, max: 1, step: 0.01, label: "variety" });
  pane.addInput(params, "rowShift", { min: 0, max: 3, step: 0.05, label: "rowshift" });
  pane.addInput(params, "colorSplit", { min: 0, max: 2, step: 0.05, label: "split" });
  pane.addInput(params, "maxFps", { min: 10, max: 60, step: 1, label: "fps" });
  pane.addInput(params, "showVideo", { label: "video" });
  pane.addInput(params, "tintEdges", { label: "tint" });
}

function setupDropHandlers() {
  // Prevent the browser from opening the file.
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    ui.dropVeil.classList.add("show");
  });

  window.addEventListener("dragleave", (e) => {
    // Only hide when leaving the window, not moving between children.
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

  // Clean up previous video to release memory.
  if (videoSource) {
    try {
      videoSource.stop();
      URL.revokeObjectURL(videoSource.elt.src);
    } catch (_) {
      // Best effort.
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
      // If autoplay is blocked, user can click the canvas to start.
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

  const videoNode = nextVideo.elt;
  videoNode.muted = true;
  videoNode.playsInline = true;
  videoNode.autoplay = true;
  videoNode.crossOrigin = "anonymous";

  videoSource = nextVideo;
}

function setStatus(ok, text) {
  if (!ui.badgeDot || !ui.badgeText) return;
  ui.badgeDot.classList.toggle("ok", !!ok);
  ui.badgeText.textContent = text;
}

function ensureProcBuffer(w, h) {
  if (pg.width === w && pg.height === h) return;
  pg.resizeCanvas(w, h);
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
  const glitch = noise(x * 0.22 + 140, y * 0.07 + 12, frameCount * 0.03);

  if (sparkle > 0.82 && edgeStrength > 0.45) {
    return ASCII_SPARK[Math.floor(sparkle * ASCII_SPARK.length) % ASCII_SPARK.length];
  }

  if (glitch > 0.78 && edgeStrength > 0.35) {
    return ASCII_GLITCH[Math.floor(glitch * ASCII_GLITCH.length) % ASCII_GLITCH.length];
  }

  return drift < params.charVariety ? directionalChar : baseChar;
}

function computeRowShift(y, cellW, timeSeed) {
  if (params.rowShift <= 0) return 0;

  const bandNoise = noise(y * 0.14, timeSeed);
  const pulseNoise = noise(y * 0.06 + 90, timeSeed * 1.8);
  if (bandNoise < 0.62) return 0;

  const direction = pulseNoise > 0.5 ? 1 : -1;
  const amplitude = map(bandNoise, 0.62, 1, 0, cellW * 1.75 * params.rowShift, true);
  return direction * amplitude;
}

function computeColorSplit(x, y, edgeMag) {
  if (params.colorSplit <= 0) return 0;

  const splitNoise = noise(x * 0.09 + 30, y * 0.09 + 70, frameCount * 0.03);
  if (splitNoise < 0.66) return 0;

  const edgeFactor = constrain(edgeMag / 255, 0, 1);
  return map(splitNoise, 0.66, 1, 0, (0.6 + edgeFactor * 1.6) * params.colorSplit, true);
}

function drawSplitCharacter(ch, x, y, c, splitOffset, edgeStrength) {
  const alpha = Math.round(255 * params.opacity);
  const lift = lerp(0.78, 1.08, edgeStrength);
  fill(red(c) * 1.08, green(c) * 0.38 * lift, blue(c) * 0.72 * lift, alpha * 0.7);
  text(ch, x - splitOffset, y);

  fill(red(c) * 0.45, green(c) * 0.98 * lift, blue(c) * 1.2, alpha * 0.6);
  text(ch, x, y);

  fill(red(c) * 0.82, green(c) * 0.54, min(255, blue(c) * 1.35), alpha * 0.76);
  text(ch, x + splitOffset, y);
}

function drawGlowCharacter(ch, x, y, c, edgeStrength) {
  const alpha = Math.round(255 * params.opacity);
  fill(red(c) * 0.35, green(c) * 0.95, blue(c) * 1.15, alpha * 0.34);
  text(ch, x + 0.7, y);

  fill(red(c), green(c), blue(c), alpha * lerp(0.62, 0.92, edgeStrength));
  text(ch, x, y);
}

function computeCoverRect(srcW, srcH, dstW, dstH) {
  const srcAR = srcW / Math.max(1, srcH);
  const dstAR = dstW / Math.max(1, dstH);

  let dw = dstW;
  let dh = dstH;
  let dx = 0;
  let dy = 0;

  if (srcAR > dstAR) {
    // Source wider: fit height, crop sides.
    dh = dstH;
    dw = dh * srcAR;
    dx = (dstW - dw) * 0.5;
  } else {
    // Source taller: fit width, crop top/bottom.
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

function getProcColor(x, y) {
  const sx = Math.floor(constrain(x, 0, pg.width - 1));
  const sy = Math.floor(constrain(y, 0, pg.height - 1));
  const idx = 4 * (sy * pg.width + sx);
  return color(
    pg.pixels[idx + 0],
    pg.pixels[idx + 1],
    pg.pixels[idx + 2]
  );
}

function buildGlitchColor(sourceColor, edgeStrength, x, y) {
  const luminance = (red(sourceColor) * 0.2126 + green(sourceColor) * 0.7152 + blue(sourceColor) * 0.0722) / 255;
  const bias = noise(x * 0.11 + 10, y * 0.11 + 20, frameCount * 0.02);
  const accentMix = constrain(0.22 + edgeStrength * 0.48 + bias * 0.18, 0, 0.95);

  const baseRed = lerp(36, red(sourceColor), 0.28);
  const baseGreen = lerp(120, green(sourceColor), 0.42);
  const baseBlue = lerp(160, blue(sourceColor), 0.46);

  const accentRed = lerp(baseRed, 255, accentMix * 0.82);
  const accentGreen = lerp(baseGreen, 235, accentMix * 0.58 + luminance * 0.12);
  const accentBlue = lerp(baseBlue, 255, accentMix);

  return color(
    constrain(accentRed, 48, 255),
    constrain(accentGreen, 90, 255),
    constrain(accentBlue, 120, 255)
  );
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  if (videoSource && videoReady) {
    videoSource.elt.play().catch(() => {});
  }
}
