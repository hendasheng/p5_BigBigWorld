let pane;
let textBlocks = [];

// 示例文本
let demoTexts = [
  "微分音音乐（Microtonal music），或简称为微音音乐，微分音即比半音还要小的音程。古往以来也不乏作曲家和理论家\n对微分音的研究。",
  "在部分作品中，作曲家也曾少量使用微分音作为装饰，以在传统音高之中增加一些变化。他们大多各自使用自创的记谱法，来为传统的五线谱表示微分音。",
  "巴尔托克·贝拉曾直接在音符旁标注箭头，以上下指示微分音的升降。布洛赫则在音与音之间画上斜线，以表示微分音的升降。",
  "阿洛伊斯·哈巴和潘德列茨基则是\n从升降记号的变形创造新记号，作为微分音的升降记号。"
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  textStyle(BOLD);

  pane = new Tweakpane.Pane();
  let controlFolder = pane.addFolder({ title: "Control", expanded: true });

  // 创建每个 TextBlock 实例
  demoTexts.forEach((txt, i) => {
    let processedText = autoLineBreak(txt); // 自动换行处理
    let block = new TextBlock(processedText);
    textBlocks.push(block);

    // 每个实例都有自己的菜单
    let folder = controlFolder.addFolder({
      title: `TextBlock ${i + 1}`,
      expanded: true,
    });
    folder
      .addInput(block.params, "fontSize", { min: 12, max: 120, step: 1 })
      .on("change", (ev) => {
        block.setFontSize(ev.value);
      });
    folder
      .addInput(block.params, "totalDuration", { min: 500, max: 10000, step: 100 })
      .on("change", (ev) => {
        block.params.totalDuration = ev.value;
      });
  });
}

function draw() {
  background(30);
  blendMode(DIFFERENCE);
  fill(180);

  // 绘制并更新所有 TextBlock
  textBlocks.forEach((block) => block.update());
   blendMode(BLEND);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  textBlocks.forEach((block) => block.resetPosition());
}

function keyPressed() {
  if (key === "f" || key === "F") {
    fullscreen(!fullscreen());
  }
}

// ------------------- 工具函数 -------------------
function autoLineBreak(str) {
  // 在中文标点后自动加换行
  return str.replace(/([，。！？；：])/g, "$1\n");
}

// ------------------- TextBlock 类 -------------------
class TextBlock {
  constructor(txt) {
    this.text = txt;
    this.params = { fontSize: 20, totalDuration: 3000 };
    this.lineHeight = this.params.fontSize * 1.4;
    this.chars = [];
    this.animating = false;
    this.startTime = 0;
    this.pauseStart = 0;
    this.pauseDuration = 1000;
    this.safeMargin = 50;

    textSize(this.params.fontSize);
    textAlign(LEFT, CENTER);

    this.initChars(this.text);
    this.createNewTarget();
  }

  initChars(txt) {
    this.chars = [];
    let baseX = width / 4;
    let baseY = height / 4;

    let lines = txt.split("\n");
    for (let i = 0; i < lines.length; i++) {
      let xPos = baseX;
      for (let c of lines[i]) {
        this.chars.push({
          char: c,
          x: xPos,
          y: baseY + i * this.lineHeight,
          startX: xPos,
          startY: baseY + i * this.lineHeight,
          targetX: xPos,
          targetY: baseY + i * this.lineHeight,
        });
        xPos += textWidth(c);
      }
    }
  }

  setFontSize(size) {
    this.params.fontSize = size;
    this.lineHeight = size * 1.4;
    textSize(size);
    this.initChars(this.text);
    this.createNewTarget();
  }

  resetPosition() {
    this.initChars(this.text);
    this.createNewTarget();
  }

  createNewTarget() {
    let bounds = this.getBounds();
    let tw = bounds.w;
    let th = bounds.h;

    let targetX = random(this.safeMargin, width - this.safeMargin - tw);
    let targetY = random(this.safeMargin, height - this.safeMargin - th);

    for (let c of this.chars) {
      c.startX = c.x;
      c.startY = c.y;
      c.targetX = c.x + (targetX - bounds.x);
      c.targetY = c.y + (targetY - bounds.y);
    }
    this.startTime = millis();
    this.animating = true;
  }

update() {
    textSize(this.params.fontSize); // ← 每个 block 自己设置字号
    textAlign(LEFT, CENTER);

    if (this.animating) {
        let elapsed = millis() - this.startTime;
        let allDone = true;
        let n = this.chars.length;

        let offsetStep = this.params.totalDuration / (n + n * 0.2);
        let charDuration = this.params.totalDuration - (n - 1) * offsetStep;

        for (let i = 0; i < n; i++) {
            let c = this.chars[i];
            let offset = i * offsetStep;

            if (elapsed > offset) {
                let t = (elapsed - offset) / charDuration;
                t = constrain(t, 0, 1);
                t = this.easeInOutQuad(t);

                c.x = lerp(c.startX, c.targetX, t);
                c.y = lerp(c.startY, c.targetY, t);

                if (t < 1) allDone = false;
            } else {
                allDone = false;
            }
        }

        if (allDone) {
            this.animating = false;
            this.pauseStart = millis();
        }
    }

    if (!this.animating && this.pauseStart > 0) {
        if (millis() - this.pauseStart > this.pauseDuration) {
            this.createNewTarget();
            this.pauseStart = 0;
        }
    }

    // 绘制字符
    for (let c of this.chars) {
        text(c.char, c.x, c.y);
    }
}

  getBounds() {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;
    for (let c of this.chars) {
      minX = min(minX, c.x);
      maxX = max(maxX, c.x);
      minY = min(minY, c.y);
      maxY = max(maxY, c.y);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

    const {
      x,
      y
    } = points[i];

    const xOffset = map(noise(x, y), 0, 1, -10, 10);
    const yOffset = map(noise(x, y, 1), 0, 1, -10, 10);

    const x1 = x + xOffset * f;
    const y1 = y + yOffset * f;
