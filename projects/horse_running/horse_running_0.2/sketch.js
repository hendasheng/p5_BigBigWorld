// p5.js — ASCII static horse (centered, responsive, no animation)

let fpsRun = 10;
let fontPx = 20;
let fontReady = false;

// frames cache for animation
let framesRows = [];
let frameCount = 0;
let frameW = 0;
let frameH = 0;
const runMotionPath = [
  { x: 0, y: 0 },
  { x: 1, y: -1 },
  { x: 2, y: 0 },
  { x: 1, y: 1 },
];



// --- Frames (add more for smoother gait later) ---
const rawFrames = [
`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
             __ _ .-'\\\`)/  '-'. . '. |  (i_O
         .-'      \\       -'      '\\|
    _ _./      .-'|       '.  (    \\\\
 .-'   :      '_  \\         '-\\'\\  /|/
 /      )\\_      '- )_________.-|_/^\\
(   .-'   )-._-:  /        \\(/\\'-._ \`.
 (   )  _//_/|:  /          \`\\()   \`\\_\\
  ( (   \\()^_/)_/             )/      \\\\
   )     \\\\ \\(_)             //        )\\
         _o\\ \\\\\\            (o_       |__\\
         \\ /  \\\\\\__          )_\\
               ^)__\\`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
             __ _ .-'\\\`)/  '-'. . '. |  (i_O
         .-'      \\       -'      '\\|
    _ _./      .-'|       '.  (    \\\\
 .-'   :      '_  \\         '-\\'\\  /|/
 /      )\\_      '- )_________.-|_/^\\
(   .-'   )-._-:  /        \\(/\\'-._ \`.
 (   )  _//_/|:  /          \`\\()   \`\\_\\
  ( (      ^  )_/             ^       ^
   )        \\\\  \\\\`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
             __ _ .-'\\\`)/  '-'. . '. |  (i_O
         .-'      \\       -'      '\\|
    _ _./      .-'|       '.  (    \\\\
 .-'   :      '_  \\         '-\\'\\  /|/
 /      )\\_      '- )_________.-|_/^\\
(   .-'   )-._-:  /        \\(/\\'-._ \`.
 (   )  _//_/|:  /          \`\\()   \`\\_\\
  ( (   \\\\     )_/            \\\\       \\
   )     _o\\   \\\\\\             _o\\      \\
         \\ /    \\\\\\__          \\ /       \\__
               ^)__\\`,

`                           ___________ _
                      __/   .::::.-'-(/-/)
                    _/:  .::::.-' .-'\\/\\_\`,
                   /:  .::::./   -._-.  d\\|
                    /: (""""/    '.  (__/||
                     \\::).-'  -._  \\/ \\\\/\\|
             __ _ .-'\\\`)/  '-'. . '. |  (i_O
         .-'      \\       -'      '\\|
    _ _./      .-'|       '.  (    \\\\
 .-'   :      '_  \\         '-\\'\\  /|/
 /      )\\_      '- )_________.-|_/^\\
(   .-'   )-._-:  /        \\(/\\'-._ \`.
 (   )  _//_/|:  /          \`\\()   \`\\_\\
  ( (   \\()^_/)_/             )/      \\\\
   )     \\\\ \\(_)             //        )\\
         _o\\                  _o\\
         \\ /                  \\ /`
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textAlign(LEFT, TOP);
  noStroke();
  document.fonts.ready.then(() => {
    textFont("JetBrains Mono, monospace");
    fontReady = true;
    buildFrames();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
  // fill(0, 10);
  // rect(0, 0, width, height);

  if (!fontReady) return;

  textSize(fontPx);
  textFont("JetBrains Mono, monospace");
  drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
  drawingContext.textBaseline = "top";

  let metrics = measureFrame();
  let lineH = metrics.lineH;
  let blockW = metrics.maxW;
  let blockH = frameH * lineH;

  if (blockW > width || blockH > height) {
    const fit = Math.min(width / blockW, height / blockH);
    textSize(fontPx * fit);
    textFont("JetBrains Mono, monospace");
    drawingContext.font = `${textSize()}px "JetBrains Mono", monospace`;
    metrics = measureFrame();
    lineH = metrics.lineH;
    blockW = metrics.maxW;
    blockH = frameH * lineH;
  }

  const x0 = Math.floor(width * 0.5 - blockW * 0.5);
  const y0 = Math.floor(height * 0.5 - blockH * 0.5);

  textLeading(lineH);

  const t = millis() / 1000;
  const idx = Math.floor(t * fpsRun) % frameCount;
  const rows = framesRows[idx];

  fill(235);
  for (let y = 0; y < frameH; y++) {
    const row = rows[y] ?? "";
    text(row, x0, y0 + y * lineH);
  }
}

function buildFrames() {
  const parsed = rawFrames.map((f) => f.split("\n"));
  frameCount = parsed.length;
  const baseH = Math.max(...parsed.map((rows) => rows.length));
  const baseW = Math.max(...parsed.map((rows) => Math.max(...rows.map((r) => r.length))));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < frameCount; i++) {
    const m = runMotionPath[i % runMotionPath.length];
    minX = Math.min(minX, m.x);
    minY = Math.min(minY, m.y);
    maxX = Math.max(maxX, m.x);
    maxY = Math.max(maxY, m.y);
  }

  const pad = 1;
  frameW = baseW + (maxX - minX) + pad * 2;
  frameH = baseH + (maxY - minY) + pad * 2;

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

    return canvas.map((r) => r.join(""));
  });
}

function measureFrame() {
  const cellW = drawingContext.measureText("M").width;
  let lineH = textAscent() + textDescent();
  const m = drawingContext.measureText("M");
  if (m.actualBoundingBoxAscent !== undefined) {
    const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (h > lineH) lineH = h;
  }

  const maxW = frameW * cellW;
  return { maxW, lineH };
}
