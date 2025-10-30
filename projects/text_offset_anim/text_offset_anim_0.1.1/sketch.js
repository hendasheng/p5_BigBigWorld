let str = "微分音音乐（Microtonal music），\n或简称为微音音乐，\n微分音即比半音还要小的音程。\n\n微分音音乐亦曾在某些原始社会中出现过，\n古往以来也不乏作曲家和理论家\n对微分音的研究。";

let chars = [];
let animating = false;
let startTime = 0;

let totalDuration = 3000; // 整段动画总时长
let safeMargin = 50;      // 文本离屏幕边缘的安全距离
let pauseStart = 0;
let pauseDuration = 1000; // 动画结束后的停顿时间（毫秒）

let tSize = 20;
let lineHeight = tSize * 1.4;

let pane;
let params = { text: str, totalDuration: 3000, fontSize: tSize };
let pendingText = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(tSize);
  textAlign(LEFT, CENTER);
  fill(0);

  initChars(str);
  createNewTarget();

  // 父级菜单
  pane = new Tweakpane.Pane();
  let controlFolder = pane.addFolder({ title: 'Control', expanded: true });

  // Text 子菜单
  let textFolder = controlFolder.addFolder({ title: 'Text', expanded: true });
  textFolder.addInput(params, 'text', { multiline: true, lineCount: 5, height: 200 })
    .on('change', (ev) => {
      pendingText = ev.value.replace(/\\n/g, '\n');
    });
  textFolder.addInput(params, 'fontSize', { min: 12, max: 120, step: 1 })
    .on('change', (ev) => {
      tSize = ev.value;
      lineHeight = tSize * 1.4;
      textSize(tSize);
      pendingText = params.text; // 字号改变时也重新初始化文本
    });

  // Animation 子菜单
  let animFolder = controlFolder.addFolder({ title: 'Animation', expanded: true });
  animFolder.addInput(params, 'totalDuration', { min: 500, max: 10000, step: 100 })
    .on('change', (ev) => {
      totalDuration = ev.value;
    });
}

function draw() {
  background(30);
  // console.log(frameRate());
  fill(180);

  if (animating) {
    let elapsed = millis() - startTime;
    let allDone = true;
    let n = chars.length;

    let charOffsetStep = totalDuration / (n + n * 0.2); // 每个字符顺序偏移
    let charDuration = totalDuration - (n - 1) * charOffsetStep; // 动画时长

    for (let i = 0; i < n; i++) {
      let c = chars[i];
      let charOffset = i * charOffsetStep;

      if (elapsed > charOffset) {
        let t = (elapsed - charOffset) / charDuration;
        t = constrain(t, 0, 1);
        t = easeInOutQuad(t);

        c.x = lerp(c.startX, c.targetX, t);
        c.y = lerp(c.startY, c.targetY, t);

        if (t < 1) allDone = false;
      } else {
        allDone = false;
      }
    }

    if (allDone) {
      animating = false;
      pauseStart = millis(); // 开始停顿
    }
  }

  // 动画结束后的停顿逻辑
  if (!animating && pauseStart > 0) {
    if (millis() - pauseStart > pauseDuration) {
      // 如果有待更新的文本，先更新
      if (pendingText !== null) {
        initChars(pendingText);
        pendingText = null;
      }
      createNewTarget();
      pauseStart = 0; // 重置计时器
    }
  }

  // 绘制文字
  for (let c of chars) {
    text(c.char, c.x, c.y);
  }
}

// 初始化字符数组
function initChars(txt) {
  chars = [];
  let baseX = width / 4;
  let baseY = height / 3;

  let textLines = txt.split("\n");
  for (let i = 0; i < textLines.length; i++) {
    let currentLine = textLines[i];
    let xPos = baseX;
    for (let c of currentLine) {
      chars.push({
        char: c,
        x: xPos,
        y: baseY + i * lineHeight,
        targetX: xPos,
        targetY: baseY + i * lineHeight,
        startX: xPos,
        startY: baseY + i * lineHeight
      });
      xPos += textWidth(c);
    }
  }
}

// 自动生成新的目标位置
function createNewTarget() {
  let bounds = getTextBounds(chars);
  let textWidthTotal = bounds.w;
  let textHeightTotal = bounds.h;

  let targetX = random(safeMargin, width - safeMargin - textWidthTotal);
  let targetY = random(safeMargin, height - safeMargin - textHeightTotal);

  for (let c of chars) {
    c.startX = c.x;
    c.startY = c.y;
    c.targetX = c.x + (targetX - bounds.x);
    c.targetY = c.y + (targetY - bounds.y);
  }

  startTime = millis();
  animating = true;
}

function getTextBounds(chars) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (let c of chars) {
    minX = min(minX, c.x);
    maxX = max(maxX, c.x);
    minY = min(minY, c.y);
    maxY = max(maxY, c.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// 全屏切换
function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = !fullscreen();
    fullscreen(fs);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
