let str = "Pallas's leaf warbler (Phylloscopus proregulus) or Pallas's warbler, is a bird that breeds in mountain forests from southern Siberia east to northern Mongolia and northeast China. It is named after the German zoologist Peter Simon Pallas, who first formally described it. This leaf warbler is strongly migratory, wintering mainly in south China and adjacent areas of southeast Asia, although in recent decades increasing numbers have been found in Europe in autumn.";

let chars = [];
let animating = false;
let startTime = 0;
let direction = 1;

let totalDuration = 3000;
let safeMargin = 50;
let pauseStart = 0;
let pauseDuration = 1000;

let tSize = 20;
let lineHeight = tSize * 1.4;

let glitchChars = '¡™£¢∞§¶•ªº–≠œ∑´®†¥¨ˆøπ“‘åß∂ƒ©˙∆˚¬…æ≈ç√∫˜µ≤≥÷?!@#$%^&*()_+-=[]{}|;:"<>,.';

let pane;
let params = {
  text: str,
  totalDuration: 3000,
  fontSize: tSize,
  minScale: 0.5,
  enableGlitch: true,
  enableColor: true,
};
let pendingText = null;


function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 1);
  textSize(tSize);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);

  fill(0);



  params.text = formatText(str);
  initChars(params.text);
  createNewTarget();

  pane = new Tweakpane.Pane();

  // pane.registerPlugin(TweakpaneTextareaPlugin);


  let controlFolder = pane.addFolder({ title: 'Control', expanded: true });

  let textFolder = controlFolder.addFolder({ title: 'Text', expanded: true });

  // 保存返回的 controller
  let textController = textFolder.addInput(params, 'text', { multiline: true })
    .on('change', (ev) => {
      pendingText = formatText(ev.value);
    });

  // 给这一项加上唯一 class（只影响这一个控件）
  textController.element.classList.add('my-text-input-item');

  // 其他控件（fontSize）照常添加，不会受到上面类的影响
  textFolder.addInput(params, 'fontSize', { min: 12, max: 120, step: 1 })
    .on('change', (ev) => {
      tSize = ev.value;
      lineHeight = tSize * 1.4;
      textSize(tSize);
      pendingText = formatText(params.text);
    });

  let animFolder = controlFolder.addFolder({ title: 'Animation', expanded: true });
  animFolder.addInput(params, 'totalDuration', { min: 500, max: 10000, step: 100 })
    .on('change', (ev) => totalDuration = ev.value);
  animFolder.addInput(params, 'minScale', { min: 0.1, max: 1.0, step: 0.1 });

  let effectFolder = controlFolder.addFolder({ title: 'Effects', expanded: true });
  effectFolder.addInput(params, 'enableGlitch');
  effectFolder.addInput(params, 'enableColor');
}

function draw() {
  background(0, 0, .15);
  blendMode(DIFFERENCE);

  if (animating) {
    let elapsed = millis() - startTime;
    let allDone = true;
    let n = chars.length;
    let charOffsetStep = totalDuration / (n + n * 0.2);
    let charDuration = totalDuration - (n - 1) * charOffsetStep;

    for (let i = 0; i < n; i++) {
      let c = chars[i];
      let charOffset = i * charOffsetStep;

      if (elapsed > charOffset) {
        let t = (elapsed - charOffset) / charDuration;
        t = constrain(t, 0, 1);
        let scaleT = sin(t * PI);
        c.currentScale = 1 - scaleT * (1 - params.minScale);
        t = easeInOutQuad(t);

        c.x = lerp(c.startX, c.targetX, t);
        c.y = lerp(c.startY, c.targetY, t);

        // 乱码
        if (t < 1) {
          allDone = false;
          if (params.enableGlitch && random() < 0.5) {
            c.char = random(glitchChars.split(''));
          } else {
            c.char = c.originalChar;
          }

          // 色相变化（中间阶段有色）
          if (params.enableColor) {
            if (t < 0.2 || t > 0.8) {
              c.hue = 0; // 黑灰色阶段
              c.sat = 0;
              c.bri = 0.8;
            } else {
              c.hue = (sin((t + i * 0.02) * TWO_PI) * 0.5 + 0.5);
              c.sat = 1;
              c.bri = 1;
            }
          } else {
            c.hue = 0;
            c.sat = 0;
            c.bri = 0.8;
          }
        } else {
          c.char = c.originalChar;
          c.hue = 0;
          c.sat = 0;
          c.bri = 0.8;
        }
      } else {
        c.currentScale = 1;
        c.char = c.originalChar;
        c.hue = 0;
        c.sat = 0;
        c.bri = 0.8;
        allDone = false;
      }
    }

    if (allDone) {
      animating = false;
      pauseStart = millis();
    }
  } else {
    for (let c of chars) {
      c.currentScale = 1;
      c.hue = 0;
      c.sat = 0;
      c.bri = 0.8;
    }
  }

  if (!animating && pauseStart > 0) {
    if (millis() - pauseStart > pauseDuration) {
      if (pendingText !== null) {
        initChars(pendingText);
        pendingText = null;
      }
      direction *= -1;
      createNewTarget();
      pauseStart = 0;
    }
  }

  // 绘制文字
  for (let c of chars) {
    push();
    textSize(tSize * c.currentScale);
    fill(c.hue, c.sat, c.bri);
    text(c.char, c.x, c.y);
    pop();
  }

  blendMode(BLEND);
}

// --- 其他函数保持不变 ---
function initChars(txt) {
  chars = [];
  let textLines = txt.split("\n");
  let textHeight = textLines.length * lineHeight;
  let baseY = height / 2 - textHeight / 2;
  let lineMetrics = [];

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

  for (let i = 0; i < lineMetrics.length; i++) {
    let line = lineMetrics[i];
    let lineBaseX =
      direction === 1 ? safeMargin : width - safeMargin - line.width;

    for (let j = 0; j < line.chars.length; j++) {
      let charInfo = line.chars[j];
      let xPos = lineBaseX + charInfo.relX;
      let yPos = baseY + i * lineHeight;
      chars.push({
        char: charInfo.char,
        originalChar: charInfo.char,
        x: xPos,
        y: yPos,
        targetX: xPos,
        targetY: yPos,
        startX: xPos,
        startY: yPos,
        relX: charInfo.relX,
        lineWidth: line.width,
        lineIndex: i,
        currentScale: 1,
        hue: 0,
      });
    }
  }
}

function createNewTarget() {
  let bounds = getTextBounds(chars);
  let targetY = height / 2 - bounds.h / 2;

  for (let c of chars) {
    c.startX = c.x;
    c.startY = c.y;

    let targetX =
      direction === 1
        ? width - safeMargin - c.lineWidth + c.relX
        : safeMargin + c.relX;

    c.targetX = targetX;
    c.targetY = c.y + (targetY - bounds.y);
  }

  startTime = millis();
  animating = true;
}

function getTextBounds(chars) {
  if (chars.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
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
  let formatted = txt.replace(/([，。？！.,?!])(?!\n)/g, "$1\n");
  return formatted.replace(/(^|\n) /g, "$1");
}

function refreshTextLayout() {
  // ⚡ 强制刷新字体度量表
  textFont('sans-serif');
  textSize(tSize + 0.01);
  textSize(tSize);
  textAlign(LEFT, CENTER);

  // ⚡ 重新格式化文本（确保分行生效）
  params.text = formatText(params.text);

  // ⚡ 重新初始化文本与动画
  initChars(params.text);
  createNewTarget();
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = !fullscreen();
    fullscreen(fs);

    // ⚡ 等待全屏切换完成再刷新文字布局
    setTimeout(() => {
      refreshTextLayout();
    }, 300);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  refreshTextLayout();
}
