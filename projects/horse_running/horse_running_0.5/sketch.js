// p5.js — ASCII horse run with distance-linked fill (stable, low flicker)

let fpsRun = 10;
let fontPx = 18;
let fontReady = false;
let pane = null;
const params = {
  changes: 1.2,
  space: 0.18,
};

const fillScale = 0.82;
const trailRadius = 12.0;
const fillRampGroups = [
  "      _",
  "-=~^",
  "<>[]{}()",
  "!il1",
  "+*#%&@$",
  "0135792468",
  "ACEFGHJKLNPQRTUVWXYZ",
  "MW8BHKX",
];
const fillRampChars = buildRampChars(fillRampGroups);
const fillClassPools = [
  "~!@#$%^&*()-_=+[]{}<>?/\\|;:.,`'",
  "0123456789",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
];

let framesRows = [];
let framesMask = [];
let framesDist = [];
let frameContact = [];
let animFrameCount = 0;
let frameW = 0;
let frameH = 0;

let fillState = [];
let fillIndex = [];
let fillCooldown = [];
let fillCols = 0;
let fillRows = 0;

const runMotionPath = [
  { x: 0, y: 0 },
  { x: 1, y: -1 },
  { x: 2, y: 0 },
  { x: 1, y: 1 },
];

const rawFrames = [
`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
         .-' __ _ .-'\\\`)/  '-'. . '. |  (i_O
    _ _./         \\       -'      '\\|
 .-'         .-'|       '.  (    \\\\
 /      :      '_  \\         '-\\'\\  /|/
  (  )  )\\_      '- )_________.-|_/^\\
   ((   _//_/|:  /          \`\\()   \`\\_\\
    )   \\()^_/)_/             )/      \\\\
         \\\\ \\(_)             //        )\\
         _o\\ \\\\\\            (o_       |__\\
         \\ /  \\\\\\__          )_\\
               ^)__\\
`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
         .-' __ _ .-'\\\`)/  '-'. . '. |  (i_O
    _ _./         \\       -'      '\\|
 .-'         .-'|       '.  (    \\\\
 /      :      '_  \\         '-\\'\\  /|/
  (  )  )\\_      '- )_________.-|_/^\\
   ((   _//_/|:  /          \`\\()   \`\\_\\
    )      ^  )_/             ^       ^
         \\\\  \\\\
`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
         .-' __ _ .-'\\\`)/  '-'. . '. |  (i_O
    _ _./         \\       -'      '\\|
 .-'         .-'|       '.  (    \\\\
 /      :      '_  \\         '-\\'\\  /|/
  (  )  )\\_      '- )_________.-|_/^\\
   ((   _//_/|:  /          \`\\()   \`\\_\\
    )   \\\\     )_/            \\\\       \\
         _o\\   \\\\\\             _o\\      \\
         \\ /    \\\\\\__          \\ /       \\__
               ^)__\\
`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
         .-' __ _ .-'\\\`)/  '-'. . '. |  (i_O
    _ _./         \\       -'      '\\|
 .-'         .-'|       '.  (    \\\\
 /      :      '_  \\         '-\\'\\  /|/
  (  )  )\\_      '- )_________.-|_/^\\
   ((   _//_/|:  /          \`\\()   \`\\_\\
    )   \\()^_/)_/             )/      \\\\
         \\\\ \\(_)             //        )\\
         _o\\                  _o\\
         \\ /                  \\ /
`
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textAlign(LEFT, TOP);
  noStroke();
  if (window.Tweakpane && !pane) {
    pane = new window.Tweakpane.Pane({ title: "ASCII" });
    pane.addInput(params, "changes", {
      label: "changes",
      min: 0,
      max: 10,
      step: 0.01,
    });
    pane.addInput(params, "space", {
      label: "space",
      min: 0,
      max: 1,
      step: 0.01,
    });
  }
  document.fonts.ready.then(() => {
    textFont("JetBrains Mono, monospace");
    fontReady = true;
    buildFrames();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fillCols = 0;
  fillRows = 0;
}

function draw() {
  background("#DE2A2A");
  // background(0);
  if (!fontReady || animFrameCount === 0) return;

  textSize(fontPx);
  textFont("JetBrains Mono, monospace");
  drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
  drawingContext.textBaseline = "top";

  let drawSize = fontPx;
  let metrics = measureFrame();
  let cellW = metrics.cellW;
  let lineH = metrics.lineH;
  let blockW = metrics.maxW;
  let blockH = frameH * lineH;

  if (blockW > width || blockH > height) {
    const fit = Math.min(width / blockW, height / blockH);
    drawSize = fontPx * fit;
    textSize(drawSize);
    textFont("JetBrains Mono, monospace");
    drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
    metrics = measureFrame();
    cellW = metrics.cellW;
    lineH = metrics.lineH;
    blockW = metrics.maxW;
    blockH = frameH * lineH;
  }

  const x0 = Math.floor(width * 0.5 - blockW * 0.5);
  const y0 = Math.floor(height * 0.5 - blockH * 0.5);
  textLeading(lineH);

  const t = millis() / 1000;
  const pos = t * fpsRun;
  const idx = Math.floor(pos) % animFrameCount;
  const nextAnimIdx = (idx + 1) % animFrameCount;
  const mix = pos - Math.floor(pos);
  const prevIdx = (idx - 1 + animFrameCount) % animFrameCount;
  const rows = framesRows[idx];
  const dist = framesDist[idx];
  const contactStrength = lerp(frameContact[idx] ?? 0, frameContact[nextAnimIdx] ?? 0, mix);

  const motionNow = sampleMotionAtPos(pos);
  const motionPrev = sampleMotionAtPos(pos - 0.20);
  const vx = motionNow.x - motionPrev.x;
  const vy = motionNow.y - motionPrev.y;
  const moveSpeed = Math.sqrt(vx * vx + vy * vy);
  const moveDirX = Math.abs(vx) > 1e-5 ? Math.sign(vx) : 1;

  textSize(drawSize * fillScale);
  textFont("JetBrains Mono, monospace");
  drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
  const fillCellW = drawingContext.measureText("M").width;
  const fillLineH = measureLineHeight();
  const bgCols = Math.ceil(width / fillCellW) + 1;
  const bgRows = Math.ceil(height / fillLineH) + 1;
  ensureFillState(bgCols, bgRows);
  const changeLevel = constrain(params.changes, 0, 4);
  const changeScale = lerp(0.08, 3.2, changeLevel / 4);
  const changesEnabled = changeLevel > 0.001;
  const spaceAmount = constrain(params.space, 0, 1);

  fill(0, 90);
  for (let gy = 0; gy < bgRows; gy++) {
    let fillRow = "";
    for (let gx = 0; gx < bgCols; gx++) {
      const si = gy * bgCols + gx;
      const px = gx * fillCellW;
      const py = gy * fillLineH;

      const dHorse = sampleHorseDistanceWorld(px, py, x0, y0, cellW, lineH, frameW, frameH, dist);
      const nDist = constrain(dHorse / (trailRadius * 3.2), 0, 1);
      const influence = 1.0 - nDist;

      const cx = x0 + blockW * 0.5;
      const cy = y0 + blockH * 0.5;
      const dx = (px - cx) / Math.max(1, cellW);
      const dy = (py - cy) / Math.max(1, lineH);
      const dir = (vx * dx + vy * dy) / Math.max(1, frameW + frameH);
      const wake = constrain(influence + dir * 1.1, 0, 1);
      const dxNorm = (px - cx) / Math.max(1, blockW * 0.5);
      const frontSigned = constrain(moveDirX * dxNorm, -1, 1);
      const backBias = constrain(-frontSigned, 0, 1);
      const frontBias = constrain(frontSigned, 0, 1);
      const motionGain = constrain(moveSpeed * 12.0, 0, 1);
      const frontBackGain = constrain(1.0 + motionGain * (2.8 * backBias - 1.2 * frontBias), 0.08, 4.2);
      const behindX = constrain(-moveDirX * dxNorm, 0, 1);
      const tailY = constrain(1.0 - Math.abs((py - cy) / Math.max(1, blockH * 0.45)), 0, 1);
      const tailCone = Math.pow(behindX, 1.35) * Math.pow(tailY, 1.1);

      const baseA = hash01(gx, gy, 3);
      const baseB = hash01(gx + 97, gy + 211, 9);
      const basePattern = 0.65 * baseA + 0.35 * baseB;
      const phase1 = 0.22 * gx + 0.17 * gy + t * (0.35 + 0.45 * influence);
      const phase2 = -0.11 * gx + 0.19 * gy + t * (0.22 + 0.35 * influence);
      const movingPattern = 0.5 + 0.5 * (0.65 * sin(phase1) + 0.35 * sin(phase2 + dir * 8.0));
      const gainForCell = frontBackGain;
      const targetMix = constrain(wake * gainForCell, 0, 1);
      const target = constrain(lerp(basePattern, movingPattern, targetMix), 0, 1);

      const contactGain = lerp(0.22, 1.0, contactStrength);
      // Leftward advection field: strongest in horse wake band, weak in front/far regions.
      const yBand = constrain(1.0 - Math.abs((py - cy) / Math.max(1, blockH * 0.55)), 0, 1);
      const flowLeft = constrain(
        0.004 +
        motionGain * (0.012 + 0.16 * tailCone + 0.06 * backBias) * influence * yBand * contactGain,
        0,
        0.22
      );
      const upstream = gx < bgCols - 1 ? fillState[si + 1] : fillState[si];
      fillState[si] = lerp(fillState[si], upstream, flowLeft);

      const alpha = lerp(0.002, 0.045, influence) * contactGain * (0.7 + 0.9 * backBias * motionGain);
      fillState[si] = lerp(fillState[si], target, alpha);

      let energy = fillState[si];
      const staticVar = hash01(gx, gy, 41);
      const slowVar = 0.5 + 0.5 * sin(0.031 * gx + 0.047 * gy + t * 0.12);
      energy = constrain(energy * 0.72 + staticVar * 0.20 + slowVar * 0.08, 0, 1);
      const targetIdx = energyToIndexExpanded(energy);

      const intervalBase = Math.floor(lerp(34, 10, influence));
      const interval = clampInt(Math.floor(intervalBase / (0.35 + changeScale)), 3, 48);
      const stagger = (gx * 13 + gy * 7) & 31;
      let curIdx = fillIndex[si];
      const margin = Math.max(3, Math.floor(fillRampChars.length * 0.08));

      const cd = fillCooldown[si] ?? 0;
      if (cd > 0) fillCooldown[si] = cd - 1;

      // Per-cell update chance removes scan-order bias (no top-of-screen favoritism).
      const changeChance =
        lerp(0.00025, 0.018, influence) *
        changeScale *
        contactGain *
        (0.55 + 1.7 * tailCone * motionGain + 0.5 * backBias * motionGain) *
        (0.75 + 0.8 * yBand);
      const allowByChance = hash01(gx, gy, window.frameCount * 17 + 23) < changeChance;
      if (
        changesEnabled &&
        influence > 0.12 &&
        ((window.frameCount + stagger) % interval) === 0 &&
        allowByChance &&
        (fillCooldown[si] ?? 0) <= 0
      ) {
        if (targetIdx > curIdx + margin) curIdx += 1;
        else if (targetIdx < curIdx - margin) curIdx -= 1;
        if (curIdx !== fillIndex[si]) {
          const cooldownBase = lerp(28, 10, influence);
          fillCooldown[si] = clampInt(Math.floor(cooldownBase / (0.45 + changeScale * 0.85)), 2, 28);
        }
      }
      fillIndex[si] = curIdx;

      const ri = clampInt(curIdx, 0, fillRampChars.length - 1);
      // Stable class assignment per cell: punctuation / digits / letters.
      const classIdx = (gx + ((gy * 5 + 7) % 3)) % 3;
      const pool = fillClassPools[classIdx];
      const riNorm = ri / Math.max(1, fillRampChars.length - 1);
      const basePick = hash01(gx, gy, classIdx + 733);
      const driftPick = Math.floor(t * (0.35 + 3.6 * tailCone * motionGain * contactGain));
      const slowPick = 0.5 + 0.5 * sin(0.12 * gx + 0.09 * gy + 0.5 * driftPick + classIdx * 1.9);
      const pick01 = constrain(riNorm * 0.66 + basePick * 0.18 + slowPick * 0.16, 0, 1);
      const pick = clampInt(Math.floor(pick01 * pool.length), 0, pool.length - 1);
      const spaceChance = constrain(spaceAmount * (0.25 + 0.75 * (1.0 - riNorm)), 0, 0.95);
      const spaceRoll = 0.68 * basePick + 0.32 * slowPick;
      const ch = spaceRoll < spaceChance ? " " : (pool[pick] ?? " ");
      fillRow += ch;
    }
    text(fillRow, 0, gy * fillLineH);
  }

  textSize(drawSize);
  textFont("JetBrains Mono, monospace");
  drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
  fill(255);
  for (let y = 0; y < frameH; y++) {
    const row = rows[y] ?? "";
    text(row, x0, y0 + y * lineH);
  }
}

function buildFrames() {
  const parsed = rawFrames.map((f) => f.split("\n"));
  animFrameCount = parsed.length;
  const baseH = Math.max(...parsed.map((rows) => rows.length));
  const baseW = Math.max(...parsed.map((rows) => Math.max(...rows.map((r) => r.length))));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < animFrameCount; i++) {
    const m = runMotionPath[i % runMotionPath.length];
    minX = Math.min(minX, m.x);
    minY = Math.min(minY, m.y);
    maxX = Math.max(maxX, m.x);
    maxY = Math.max(maxY, m.y);
  }

  const pad = 1;
  frameW = baseW + (maxX - minX) + pad * 2;
  frameH = baseH + (maxY - minY) + pad * 2;

  framesMask = [];
  framesDist = [];
  const contactRaw = [];
  framesRows = parsed.map((rows, i) => {
    const m = runMotionPath[i % runMotionPath.length];
    const offX = m.x - minX + pad;
    const offY = m.y - minY + pad;

    const canvas = Array.from({ length: frameH }, () =>
      Array.from({ length: frameW }, () => " ")
    );

    for (let y = 0; y < rows.length; y++) {
      const src = rows[y];
      const yy = y + offY;
      if (yy < 0 || yy >= frameH) continue;
      for (let x = 0; x < src.length; x++) {
        const ch = src[x];
        if (ch === " ") continue;
        const xx = x + offX;
        if (xx < 0 || xx >= frameW) continue;
        canvas[yy][xx] = ch;
      }
    }

    const rowStrings = canvas.map((r) => r.join(""));
    const mask = new Uint8Array(frameW * frameH);
    for (let y = 0; y < frameH; y++) {
      const off = y * frameW;
      for (let x = 0; x < frameW; x++) {
        mask[off + x] = canvas[y][x] === " " ? 0 : 1;
      }
    }

    framesMask.push(mask);
    framesDist.push(chamferDistance(mask, frameW, frameH));
    contactRaw.push(computeGroundContact(mask, frameW, frameH));
    return rowStrings;
  });

  const cMin = Math.min(...contactRaw);
  const cMax = Math.max(...contactRaw);
  const denom = Math.max(1e-6, cMax - cMin);
  frameContact = contactRaw.map((v) => Math.pow(constrain((v - cMin) / denom, 0, 1), 0.85));
}

function measureFrame() {
  const cellW = drawingContext.measureText("M").width;
  const lineH = measureLineHeight();
  return { cellW, maxW: frameW * cellW, lineH };
}

function measureLineHeight() {
  let lineH = textAscent() + textDescent();
  const m = drawingContext.measureText("M");
  if (m.actualBoundingBoxAscent !== undefined) {
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (h > lineH) lineH = h;
  }
  return lineH;
}

function chamferDistance(mask, w, h) {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? 0 : INF;

  const w1 = 1.0;
  const w2 = 1.4;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      let best = d[i];
      if (x > 0) best = Math.min(best, d[i - 1] + w1);
      if (y > 0) best = Math.min(best, d[i - w] + w1);
      if (x > 0 && y > 0) best = Math.min(best, d[i - w - 1] + w2);
      if (x < w - 1 && y > 0) best = Math.min(best, d[i - w + 1] + w2);
      d[i] = best;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    const row = y * w;
    for (let x = w - 1; x >= 0; x--) {
      const i = row + x;
      let best = d[i];
      if (x < w - 1) best = Math.min(best, d[i + 1] + w1);
      if (y < h - 1) best = Math.min(best, d[i + w] + w1);
      if (x < w - 1 && y < h - 1) best = Math.min(best, d[i + w + 1] + w2);
      if (x > 0 && y < h - 1) best = Math.min(best, d[i + w - 1] + w2);
      d[i] = best;
    }
  }
  return d;
}

function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function buildRampChars(groups) {
  let s = "";
  for (let i = 0; i < groups.length; i++) s += groups[i];
  return s;
}

function energyToIndexExpanded(energy) {
  const e = constrain((energy - 0.06) / 0.88, 0, 1);
  const shaped = Math.pow(e, 0.78);
  const n = fillRampChars.length;
  return clampInt(Math.floor(shaped * (n - 1)), 0, n - 1);
}

function indexToGroup(idx) {
  const n = fillRampChars.length;
  const g = fillRampGroups.length;
  const k = clampInt(idx, 0, n - 1);
  return clampInt(Math.floor((k / Math.max(1, n - 1)) * (g - 1)), 0, g - 1);
}

function ensureFillState(cols, rows) {
  if (cols === fillCols && rows === fillRows && fillState.length === cols * rows) return;

  const next = new Float32Array(cols * rows);
  const nextIdx = new Int16Array(cols * rows);
  const nextCd = new Int16Array(cols * rows);
  const copyCols = Math.min(cols, fillCols);
  const copyRows = Math.min(rows, fillRows);

  for (let y = 0; y < copyRows; y++) {
    const oldOff = y * fillCols;
    const newOff = y * cols;
    for (let x = 0; x < copyCols; x++) {
      next[newOff + x] = fillState[oldOff + x] ?? 0;
      nextIdx[newOff + x] = fillIndex[oldOff + x] ?? 0;
      nextCd[newOff + x] = fillCooldown[oldOff + x] ?? 0;
    }
  }

  for (let i = 0; i < next.length; i++) {
    if (next[i] === 0) {
      const seed = hash01(i % cols, Math.floor(i / cols), 5);
      next[i] = seed;
      nextIdx[i] = energyToIndexExpanded(seed);
      nextCd[i] = clampInt(Math.floor(hash01(i, i >> 1, 13) * 9), 0, 8);
    }
  }

  fillState = next;
  fillIndex = nextIdx;
  fillCooldown = nextCd;
  fillCols = cols;
  fillRows = rows;
}

function hash01(x, y, s) {
  let n = x * 374761393 + y * 668265263 + s * 1442695041;
  n = (n ^ (n >>> 13)) >>> 0;
  n = (n * 1274126177) >>> 0;
  return (n & 0xffffffff) / 4294967295;
}

function sampleHorseDistanceWorld(px, py, x0, y0, cellW, lineH, w, h, distField) {
  const gx = (px - x0) / Math.max(1e-6, cellW);
  const gy = (py - y0) / Math.max(1e-6, lineH);
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);

  if (ix >= 0 && ix < w && iy >= 0 && iy < h) {
    const d = distField[iy * w + ix];
    return isFinite(d) ? d : 1e3;
  }

  const ox = (ix < 0) ? -ix : (ix >= w ? ix - (w - 1) : 0);
  const oy = (iy < 0) ? -iy : (iy >= h ? iy - (h - 1) : 0);
  return Math.sqrt(ox * ox + oy * oy);
}

function computeGroundContact(mask, w, h) {
  const band = Math.min(5, h);
  const y0 = h - band;
  let score = 0;
  for (let y = y0; y < h; y++) {
    const weight = (y - y0 + 1);
    const off = y * w;
    for (let x = 0; x < w; x++) {
      if (mask[off + x] === 1) score += weight;
    }
  }
  return score;
}

function sampleMotionAtPos(p) {
  const n = runMotionPath.length;
  const base = ((p % n) + n) % n;
  const i0 = Math.floor(base) % n;
  const i1 = (i0 + 1) % n;
  const u = base - Math.floor(base);
  const a = runMotionPath[i0];
  const b = runMotionPath[i1];
  return {
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
  };
}

function keyPressed() {
  if (key === "f" || key === "F") {
    const next = !fullscreen();
    fullscreen(next);
  }
}
