// p5.js — ASCII static horse (centered, responsive, no animation)

let fontPx = 14;
let fontReady = false;

// single frame cache for static display
let frameRows = [];
let frameW = 0;
let frameH = 0;



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
    buildSingleFrame();
  });
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(0);
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

  fill(235);
  textLeading(lineH);

  for (let y = 0; y < frameH; y++) {
    const row = frameRows[y] ?? "";
    text(row, x0, y0 + y * lineH);
  }
}

function buildSingleFrame() {
  const rows = rawFrames[0].split("\n");
  frameRows = rows;
  frameH = rows.length;
  frameW = Math.max(...rows.map((r) => r.length));
}

function measureFrame() {
  const ctx = drawingContext;
  let maxW = 0;
  let lineH = textAscent() + textDescent();

  for (let i = 0; i < frameRows.length; i++) {
    const row = frameRows[i];
    const m = ctx.measureText(row);
    if (m.width > maxW) maxW = m.width;
    if (m.actualBoundingBoxAscent !== undefined) {
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      if (h > lineH) lineH = h;
    }
  }

  return { maxW, lineH };
}
