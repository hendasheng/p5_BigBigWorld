let str = "微分音音乐（Microtonal music），\n或简称为微音音乐，\n微分音即比半音还要小的音程。\n\n微分音音乐亦曾在某些原始社会中出现过，\n古往以来也不乏作曲家和理论家\n对微分音的研究。";

let chars = [];
let animating = false;
let startTime = 0;
let animDuration = 1000; // 每个字符动画时长（毫秒）

function setup() {
  createCanvas(windowWidth, windowHeight);
  textSize(18);
  textAlign(LEFT, CENTER);
  fill(0);
  
  let baseX = width / 4;
  let baseY = height / 3;
  let lineHeight = 28;
  
  let textLines = str.split("\n");
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

function draw() {
  background(30);
  fill(180);
  
  if (animating) {
    let elapsed = millis() - startTime;
    let allDone = true;

    for (let i = 0; i < chars.length; i++) {
      let delay = i * 30; // 每个字符延迟 30ms
      if (elapsed > delay) {
        let t = (elapsed - delay) / animDuration;
        t = constrain(t, 0, 1);
        t = easeInOutQuad(t);
        chars[i].x = lerp(chars[i].startX, chars[i].targetX, t);
        chars[i].y = lerp(chars[i].startY, chars[i].targetY, t);

        if (t < 1) allDone = false;
      } else {
        allDone = false;
      }
    }

    // ✅ 检测动画是否完成
    if (allDone) {
      animating = false;
    }
  }
  
  for (let c of chars) {
    text(c.char, c.x, c.y);
  }
}

function mousePressed() {
  // 🚫 动画未结束时忽略点击
  if (animating) return;

  // 计算当前文字整体的左上角坐标
  let bounds = getTextBounds(chars);
  let dx = mouseX - bounds.x;
  let dy = mouseY - bounds.y;
  
  // 为每个字符记录起点，并设置目标位置（整体左上角对齐鼠标点）
  for (let c of chars) {
    c.startX = c.x;
    c.startY = c.y;
    c.targetX = c.x + dx;
    c.targetY = c.y + dy;
  }

  startTime = millis();
  animating = true;
}

// 计算整个段落的边界框
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

// 平滑缓动函数
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
