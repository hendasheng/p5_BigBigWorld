let str = "微分音音乐（Microtonal music），或简称为微音音乐，微分音即比半音还要小的音程。微分音音乐亦曾在某些原始社会中出现过，古往以来也不乏作曲家和理论家对微分音的研究。";

let chars = [];
let animating = false;
let startTime = 0;
let direction = 1; // 1 for left-to-right, -1 for right-to-left

let totalDuration = 3000; // 整段动画总时长
let safeMargin = 50;      // 文本离屏幕边缘的安全距离
let pauseStart = 0;
let pauseDuration = 1000; // 动画结束后的停顿时间（毫秒）

let tSize = 20;
let lineHeight = tSize * 1.4;

let pane;
let params = { text: str, totalDuration: 3000, fontSize: tSize, minScale: 0.5 };
let pendingText = null;

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(tSize);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);

  fill(0);

  params.text = formatText(str); // Format initial text
  initChars(params.text);
  createNewTarget();

  // 父级菜单
  pane = new Tweakpane.Pane();
  let controlFolder = pane.addFolder({ title: 'Control', expanded: true });

  // Text 子菜单
  let textFolder = controlFolder.addFolder({ title: 'Text', expanded: true });
  textFolder.addInput(params, 'text', { multiline: true, lineCount: 5, height: 200 })
    .on('change', (ev) => {
      pendingText = formatText(ev.value);
    });
  textFolder.addInput(params, 'fontSize', { min: 12, max: 120, step: 1 })
    .on('change', (ev) => {
      tSize = ev.value;
      lineHeight = tSize * 1.4;
      textSize(tSize);
      pendingText = formatText(params.text); // 字号改变时也重新格式化并初始化文本
    });

  // Animation 子菜单
  let animFolder = controlFolder.addFolder({ title: 'Animation', expanded: true });
  animFolder.addInput(params, 'totalDuration', { min: 500, max: 10000, step: 100 })
    .on('change', (ev) => {
      totalDuration = ev.value;
    });
  animFolder.addInput(params, 'minScale', { min: 0.1, max: 1.0, step: 0.1 });
}

function draw() {
  background(30);
  blendMode(DIFFERENCE);

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

        // Size animation
        let scaleT = sin(t * PI); // 0 -> 1 -> 0
        c.currentScale = 1 - scaleT * (1 - params.minScale);

        t = easeInOutQuad(t); // Positional easing

        c.x = lerp(c.startX, c.targetX, t);
        c.y = lerp(c.startY, c.targetY, t);

        if (t < 1) allDone = false;
      } else {
        c.currentScale = 1;
        allDone = false;
      }
    }

    if (allDone) {
      animating = false;
      pauseStart = millis(); // 开始停顿
    }
  } else {
    // If not animating, reset all scales to 1
    for (let c of chars) {
      c.currentScale = 1;
    }
  }

  // 动画结束后的停顿逻辑
  if (!animating && pauseStart > 0) {
    if (millis() - pauseStart > pauseDuration) {
      if (pendingText !== null) {
        initChars(pendingText);
        pendingText = null;
      }
      direction *= -1; // Reverse direction
      createNewTarget();
      pauseStart = 0; // 重置计时器
    }
  }

  // 绘制文字
  for (let c of chars) {
    push();
    textSize(tSize * c.currentScale);
    text(c.char, c.x, c.y);
    pop();
  }
  blendMode(BLEND);

}

// 初始化字符数组
function initChars(txt) {
  chars = [];
  let textLines = txt.split("\n");
  let textHeight = (textLines.length) * lineHeight;
  let baseY = height / 2 - textHeight / 2;

  let lineMetrics = []; // 存储每行的宽度和字符

  // 第一次遍历：计算每行宽度并收集字符
  for (let i = 0; i < textLines.length; i++) {
    let currentLine = textLines[i];
    let lineWidth = 0;
    let lineChars = [];
    for (let c of currentLine) {
      let charWidth = textWidth(c);
      lineChars.push({ char: c, width: charWidth, relX: lineWidth });
      lineWidth += charWidth;
    }
    lineMetrics.push({ width: lineWidth, chars: lineChars });
  }

  // 第二次遍历：创建最终的字符对象
  let initialX;
  if (direction === 1) { // Start left-aligned
    initialX = safeMargin;
  } else { // Start right-aligned
    let maxW = 0;
    lineMetrics.forEach(lm => maxW = max(maxW, lm.width));
    initialX = width - safeMargin - maxW;
  }


  for (let i = 0; i < lineMetrics.length; i++) {
    let line = lineMetrics[i];
    let lineBaseX;

    if (direction === 1) { // Start left-aligned
        lineBaseX = safeMargin;
    } else { // Start right-aligned
        lineBaseX = width - safeMargin - line.width;
    }

    for (let j = 0; j < line.chars.length; j++) {
      let charInfo = line.chars[j];
      let xPos = lineBaseX + charInfo.relX;
      let yPos = baseY + i * lineHeight;
      chars.push({
        char: charInfo.char,
        x: xPos,
        y: yPos,
        targetX: xPos,
        targetY: yPos,
        startX: xPos,
        startY: yPos,
        relX: charInfo.relX, // 相对行首的X
        lineWidth: line.width, // 所在行的总宽度
        lineIndex: i,
        currentScale: 1
      });
    }
  }
}

// 自动生成新的目标位置
function createNewTarget() {
  let bounds = getTextBounds(chars);
  let textHeightTotal = bounds.h;
  let targetY = height / 2 - textHeightTotal / 2;

  for (let c of chars) {
    c.startX = c.x;
    c.startY = c.y;

    let targetX;
    if (direction === 1) { // move to right -> right-aligned
      targetX = (width - safeMargin - c.lineWidth) + c.relX;
    } else { // move to left -> left-aligned
      targetX = safeMargin + c.relX;
    }
    
    c.targetX = targetX;
    c.targetY = c.y + (targetY - bounds.y); // Keep vertical centering
  }

  startTime = millis();
  animating = true;
}

function getTextBounds(chars) {
    if (chars.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (let c of chars) {
        minX = min(minX, c.x);
        maxX = max(maxX, c.x + textWidth(c.char));
        minY = min(minY, c.y);
        maxY = max(maxY, c.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY + lineHeight };
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function formatText(txt) {
  // 在中英文标点符号后添加换行符
  let formatted = txt.replace(/([，。？！.,?!])(?!\n)/g, '$1\n');
  // 移除每行开头的空格
  return formatted.replace(/(^|\n) /g, '$1');
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
  initChars(params.text);
  createNewTarget();
}
