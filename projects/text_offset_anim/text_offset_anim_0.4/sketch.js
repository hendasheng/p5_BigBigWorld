let str_en = "Pallas's leaf warbler (Phylloscopus proregulus) or Pallas's warbler, is a bird that breeds in mountain forests from southern \n Siberia east to northern Mongolia and northeast China. It is named after the German zoologist Peter Simon Pallas, who first formally described it. This leaf warbler is strongly migratory, wintering mainly in south China and adjacent areas of southeast Asia, although in recent decades increasing numbers have been found in Europe in autumn.";
let str_cn = "黄腰柳莺是一种在西伯利亚南部至蒙古北部和中国东北的山林中繁殖的鸟类。它是以德国动物学家彼得·西蒙·帕拉斯的名字命名的，他是第一个正式描述它的人。这种叶莺是一种强烈的候鸟，主要在中国南部和邻近的东南亚地区越冬，尽管近几十年来秋天在欧洲发现的数量越来越多。";

// ============== 全局变量 ==============
let chars = [];
let animating = false;
let startTime = 0;
let direction = 1; // 1: 左→右, -1: 右→左

let totalDuration = 3000;
let safeMargin = 50;
let pauseStart = 0;
let pauseDuration = 1000;

let tSize = 20;
let lineHeight = tSize * 1.4;

let glitchChars = '¡™£¢∞§¶•ªº–≠œ∑´®†¥¨ˆøπ“‘åß∂ƒ©˙∆˚¬…æ≈ç√∫˜µ≤≥÷?!@#$%^&*()_+-=[]{}|;:"<>,.';

let pane;
let params = {
  totalDuration: 3000,
  fontSize: tSize,
  minScale: 0.5,
  enableGlitch: true,
  enableColor: true,
};

let currentLanguage = 'cn';
let textCN = '';
let textEN = '';
let longerText = "";

function checkStrLength() {
  textCN = formatText(str_cn);
  textEN = formatText(str_en);
  longerText = textEN.length > textCN.length ? textEN : textCN;
}

// ============== p5.js 核心 ==============
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 1);
  textSize(tSize);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);

  checkStrLength();
  initChars(longerText);  // 预热最长文本

  setTimeout(createNewTarget, 50);

  setupTweakpane();
}

function draw() {
  background(0, 0, 0.10);
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

        if (t < 1) {
          allDone = false;

          if (params.enableGlitch && random() < 0.5) {
            c.char = random(glitchChars.split(''));
          } else {
            c.char = t > 0.6 && c.targetChar ? c.targetChar : c.originalChar;
          }

          if (params.enableColor) {
            if (t < 0.2 || t > 0.8) {
              c.hue = 0; c.sat = 0; c.bri = 0.8;
            } else {
              c.hue = (sin((t + i * 0.02) * TWO_PI) * 0.5 + 0.5);
              c.sat = .6; c.bri = 1;
            }
          } else {
            c.hue = 0; c.sat = 0; c.bri = 0.8;
          }
        } else {
          c.char = c.targetChar || c.originalChar;
          c.hue = 0; c.sat = 0; c.bri = 0.8;
        }
      } else {
        c.currentScale = 1;
        c.char = c.originalChar;
        c.hue = 0; c.sat = 0; c.bri = 0.8;
        allDone = false;
      }
    }

    if (allDone) {
      animating = false;
      pauseStart = millis();

      currentLanguage = direction === 1 ? 'en' : 'cn';
      for (let c of chars) {
        if (c.targetChar) c.originalChar = c.targetChar;
        if (c.nextRelX !== undefined) c.relX = c.nextRelX;
        if (c.nextLineWidth !== undefined) c.lineWidth = c.nextLineWidth;
      }
    }
  } else {
    for (let c of chars) {
      c.currentScale = 1;
      c.hue = 0; c.sat = 0; c.bri = 0.8;
    }
  }

  if (!animating && pauseStart > 0 && millis() - pauseStart > pauseDuration) {
    direction *= -1;
    createNewTarget();
    pauseStart = 0;
  }

  // 绘制
  for (let c of chars) {
    push();
    textSize(tSize * c.currentScale);
    fill(c.hue, c.sat, c.bri);
    text(c.char, c.x, c.y);
    pop();
  }

  blendMode(BLEND);
}

// ============== 核心函数：完美对齐 ==============
function initChars(txt) {
  chars = [];
  let lines = txt.split("\n");
  // 垂直居中应以行中心为基准，而不是整段高度
  let baseY = height / 2 - (lines.length - 1) * lineHeight / 2;

  let lineMetrics = computeLineMetrics(txt);

  for (let i = 0; i < lines.length; i++) {
    let line = lineMetrics[i];
    let lineBaseX = direction === 1 ? safeMargin : width - safeMargin - line.width;

    for (let j = 0; j < line.chars.length; j++) {
      let ci = line.chars[j];
      let xPos = lineBaseX + ci.relX;
      let yPos = baseY + i * lineHeight;

      chars.push({
        originalChar: ci.char,
        char: ci.char,
        x: xPos,
        y: yPos,
        startX: xPos,
        startY: yPos,
        targetX: xPos,
        targetY: yPos,
        relX: ci.relX,
        lineWidth: line.width,
        lineIndex: i,
        indexInLine: j,
        currentScale: 1,
        hue: 0,
        sat: 0,
        bri: 0.8,
        targetChar: null,
        nextRelX: null,
        nextLineWidth: null,
      });
    }
  }
}

function createNewTarget() {
  let nextLang = direction === 1 ? 'en' : 'cn';
  let nextText = nextLang === 'en' ? textEN : textCN;
  let nextMetrics = computeLineMetrics(nextText);

  // 1. 计算当前与目标每行最长字符数
  let srcLineLengths = {};
  for (let c of chars) {
    let li = c.lineIndex;
    srcLineLengths[li] = Math.max(srcLineLengths[li] || 0, c.indexInLine + 1);
  }

  let totalLines = Math.max(
    Object.keys(srcLineLengths).length,
    nextMetrics.length
  );
  // 目标布局垂直居中同样以行中心为基准
  let targetYBase = height / 2 - (totalLines - 1) * lineHeight / 2;
  let spaceW = textWidth(' ');

  // 2. 补齐目标行到最长长度
  let paddedNextMetrics = padLinesToMaxLength(nextMetrics, srcLineLengths, spaceW);

  for (let c of chars) {
    c.startX = c.x;
    c.startY = c.y;

    let li = c.lineIndex;
    let nextLine = paddedNextMetrics[li] || { width: 0, chars: [] };
    let maxLen = Math.max(srcLineLengths[li] || 0, nextLine.chars.length);

    let nextRelX, nextChar;
    if (c.indexInLine < nextLine.chars.length) {
      nextRelX = nextLine.chars[c.indexInLine].relX;
      nextChar = nextLine.chars[c.indexInLine].char;
    } else {
      nextRelX = nextLine.width + (c.indexInLine - nextLine.chars.length) * spaceW;
      nextChar = ' ';
    }

    let paddedWidth = nextLine.width + Math.max(0, maxLen - nextLine.chars.length) * spaceW;

    let targetX = direction === 1
      ? width - safeMargin - paddedWidth + nextRelX
      : safeMargin + nextRelX;

    c.targetX = targetX;
    c.targetY = targetYBase + li * lineHeight;
    c.targetChar = nextChar;
    c.nextRelX = nextRelX;
    c.nextLineWidth = paddedWidth;
  }

  startTime = millis();
  animating = true;
}

function computeLineMetrics(txt) {
  let lines = txt.split("\n");
  let metrics = [];
  for (let line of lines) {
    let lineWidth = 0;
    let chars = [];
    for (let ch of line) {
      let w = textWidth(ch);
      chars.push({ char: ch, width: w, relX: lineWidth });
      lineWidth += w;
    }
    metrics.push({ width: lineWidth, chars });
  }
  return metrics;
}

function padLinesToMaxLength(nextMetrics, srcLineLengths, spaceW) {
  let padded = [];
  let maxLines = Math.max(Object.keys(srcLineLengths).length, nextMetrics.length);

  for (let i = 0; i < maxLines; i++) {
    let srcLen = srcLineLengths[i] || 0;
    let nextLine = nextMetrics[i] || { width: 0, chars: [] };
    let tgtLen = nextLine.chars.length;
    let maxLen = Math.max(srcLen, tgtLen);

    let paddedChars = [...nextLine.chars];
    let paddedWidth = nextLine.width;

    for (let j = tgtLen; j < maxLen; j++) {
      paddedChars.push({ char: ' ', width: spaceW, relX: paddedWidth });
      paddedWidth += spaceW;
    }

    padded.push({ width: paddedWidth, chars: paddedChars });
  }
  return padded;
}

function getTextBounds(chars) {
  if (chars.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let c of chars) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x + textWidth(c.char));
    minY = Math.min(minY, c.y);
    maxY = Math.max(maxY, c.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY + lineHeight };
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function formatText(txt) {
  return txt.replace(/([，。？！.,?!])(?!\n)/g, "$1\n").replace(/(^|\n) /g, "$1");
}

function refreshTextLayout() {
  checkStrLength();
  initChars(longerText);
  createNewTarget();
}

function forceRefreshFontMetrics() {
  // 关键：改变 textSize 再改回来，强制 p5 刷新字体度量缓存
  const currentSize = textSize();
  textSize(currentSize + 0.001);
  textSize(currentSize);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
}

function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = !fullscreen();
    fullscreen(fs);

    // 等待全屏动画完成 + 强制刷新字体
    setTimeout(() => {
      resizeCanvas(windowWidth, windowHeight);
      forceRefreshFontMetrics();  // 关键！
      refreshTextLayout();
    }, 350); // 300ms 可能不够，350ms 更稳
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  forceRefreshFontMetrics();  // 关键！
  refreshTextLayout();
}

function setupTweakpane() {
  pane = new Tweakpane.Pane();
  let controlFolder = pane.addFolder({ title: 'Control', expanded: true });

  let textFolder = controlFolder.addFolder({ title: 'Text', expanded: true });
  textFolder.addInput(params, 'fontSize', { label: 'Font Size', min: 12, max: 120, step: 1 })
    .on('change', (ev) => {
      tSize = ev.value;
      lineHeight = tSize * 1.4;
      textSize(tSize);
      refreshTextLayout();
    });

  let animFolder = controlFolder.addFolder({ title: 'Animation', expanded: true });
  animFolder.addInput(params, 'totalDuration', { label: 'Duration', min: 500, max: 10000, step: 100 })
    .on('change', (ev) => totalDuration = ev.value);
  animFolder.addInput(params, 'minScale', { label: 'Min Scale', min: 0.1, max: 2.0, step: 0.1 });

  let effectFolder = controlFolder.addFolder({ title: 'Effects', expanded: true });
  effectFolder.addInput(params, 'enableGlitch', { label: 'Glitch' });
  effectFolder.addInput(params, 'enableColor', { label: 'Color' });
}