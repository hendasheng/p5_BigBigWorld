let strs = [
  [
    "黄腰柳莺是一种在西伯利亚南部至蒙古北部和中国东北的山林中繁殖的鸟类。它是以德国动物学家彼得·西蒙·帕拉斯的名字命名的，他是第一个正式描述它的人。这种叶莺是一种强烈的候鸟，主要在中国南部和邻近的东南亚地区越冬，尽管近几十年来秋天在欧洲发现的数量越来越多。",
    "Pallas's leaf warbler (Phylloscopus proregulus) or Pallas's warbler, is a bird that breeds in mountain forests from southern \n Siberia east to northern Mongolia and northeast China. It is named after the German zoologist Peter Simon Pallas, who first formally described it. This leaf warbler is strongly migratory, wintering mainly in south China and adjacent areas of southeast Asia, although in recent decades increasing \n numbers have been found in Europe in autumn."
  ],
  [
    "黄腰柳莺是古北界最小的柳莺之一，拥有相对较大的头部和短尾巴。它的上半身呈绿色，下半身为白色，并具有柠檬黄色的腰部、黄色的双翼条纹、眉线及头冠中央条纹。它的外观与几种其他亚洲柳莺相似，包括一些曾被认为是其亚种的物种，虽然其独特的鸣声声有助于识别。",
    "The Yellow-rumped Warbler is one of the smallest warblers in the Palearctic region, possessing a relatively large head and a short tail. Its upper body is green, its lower body white, and it features a lemon-yellow rump, yellow wing stripes, a supercilium, and a central stripe on its crest. Its appearance is similar to several other Asian warblers, including some species once thought to be subspecies, although its distinctive song aids in identification."
  ],
  [
    "雌鸟会在树上或灌木丛中筑碗状巢，并孵化四至六枚蛋，经过12至13天后，雏鸟孵化。幼鸟主要由雌鸟喂养，并在12至14天后离巢；之后双亲会继续喂养约一周。黄腰柳莺是食虫性的，主要以小型昆虫及蜘蛛的成虫、幼虫和蛹为食。它们会在灌木丛和树上觅食，从叶子上挑取猎物，或在短距飞行或悬停时捕捉猎物。黄腰柳莺的分布范围广泛，数量稳定，因此国际自然保护联盟（IUCN）将其评估为“无危”。",
    "The female builds a bowl-shaped nest in a tree or bush and incubates four to six eggs. The chicks hatch after 12 to 13 days. The young are primarily fed by the female and leave the nest after 12 to 14 days; the parents continue to feed them for about a week afterward. The Yellow-rumped Warbler is insectivorous, feeding mainly on small insects and adult, larval, and pupae of spiders. They forage in bushes and trees, picking prey from leaves or catching it during short flights or while hovering. The Yellow-rumped Warbler has a wide distribution and stable population, therefore the International Union for Conservation of \nNature (IUCN) classifies it as \"Least Concern\"."
  ]
];

// ============== 全局变量 ==============
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
let glitchArray = glitchChars.split('');

let pane;
let params = {
  totalDuration: 3000,
  fontSize: tSize,
  minScale: 0.5,
  enableGlitch: true,
  enableColor: false,
};

let currentLanguage = 'cn';
let str_cn = '', str_en = '';
let textCN = '', textEN = '';
let longerText = "";

let paragraphIndex = 0;
let languageIndex = 0;
let textPairs = [];
let originalPairs = [];

// Video
let video;
let gridSize = 20;
let matrix;

function updateVideo() {
  video = createVideo(
    "../data/videos/423_HuangYaoLiuYing_Cam1_0001-0120_1080x1080_compressed.mp4"
  );
  video.size(width, height);
  video.volume(0);
  video.loop();
  video.hide();
}

// ============== 文本管理 ==============
function preprocessAndPadTexts() {
  let formattedPairs = strs.map(pair => [formatText(pair[0]), formatText(pair[1])]);

  let maxLines = 0;
  formattedPairs.forEach(pair => {
    pair.forEach(text => {
      maxLines = Math.max(maxLines, text.split('\n').length);
    });
  });

  let maxLineLengths = new Array(maxLines).fill(0);
  formattedPairs.forEach(pair => {
    pair.forEach(text => {
      let lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        maxLineLengths[i] = Math.max(maxLineLengths[i], lines[i].length);
      }
    });
  });

  let paddedPairs = formattedPairs.map(pair => {
    return pair.map(text => {
      let lines = text.split('\n');
      let paddedLines = [];
      for (let i = 0; i < maxLines; i++) {
        let line = lines[i] || '';
        paddedLines.push(line.padEnd(maxLineLengths[i], ' '));
      }
      return paddedLines.join('\n');
    });
  });

  originalPairs = formattedPairs.flat();
  textPairs = paddedPairs.flat();
}

function initTextPairs() {
  preprocessAndPadTexts();
}

function setCurrentText(idx) {
  languageIndex = idx;
  paragraphIndex = Math.floor(idx / 2);
  let isCN = idx % 2 === 0;

  if (isCN) {
    textCN = textPairs[idx];
    textEN = textPairs[idx + 1] || textPairs[0];
    currentLanguage = 'cn';
  } else {
    textCN = textPairs[idx - 1];
    textEN = textPairs[idx];
    currentLanguage = 'en';
  }
}

function getLongestText() {
  return textPairs.reduce((a, b) => a.length > b.length ? a : b);
}

function checkStrLength() {
  longerText = textEN.length > textCN.length ? textEN : textCN;
}

// ============== p5.js 核心 ==============
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 1);
  textSize(tSize);
  textAlign(LEFT, TOP);
  textStyle(BOLD);

  initTextPairs();
  setCurrentText(0);
  initChars(textCN);
  setTimeout(createNewTarget, 50);

  updateVideo();
  matrix = new Matrix(video, width * .9, 15);

  setupTweakpane();
}

function draw() {
  background(0, 0, 0.10);

  matrix.update();
  matrix.drawCentered();

  // let img = video.get();
  // image(img, 100, 100);

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
            c.char = random(glitchArray);
          } else {
            c.char = t > 0.6 && c.targetChar ? c.targetChar : c.originalChar;
          }
          if (params.enableColor) {
            if (t < 0.2 || t > 0.8) { c.hue = 0; c.sat = 0; c.bri = 0.8; }
            else { c.hue = (sin((t + i * 0.02) * TWO_PI) * 0.5 + 0.5); c.sat = 0.6; c.bri = 1; }
          } else { c.hue = 0; c.sat = 0; c.bri = 0.8; }
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
      currentLanguage = (currentLanguage === 'cn') ? 'en' : 'cn';
      for (let c of chars) {
        if (c.targetChar) c.originalChar = c.targetChar;
      }
    }
  } else {
    for (let c of chars) { c.currentScale = 1; c.hue = 0; c.sat = 0; c.bri = 0.8; }
  }

  // 动画结束后切换文本
  if (!animating && pauseStart > 0 && millis() - pauseStart > pauseDuration) {
    let nextIndex = (languageIndex + 1) % textPairs.length;
    setCurrentText(nextIndex);
    createNewTarget();
    pauseStart = 0;
  }

  // 绘制
  for (let c of chars) {
    push();
    translate(c.x, c.y);
    scale(c.currentScale);
    textSize(tSize);
    fill(c.hue, c.sat, c.bri);
    text(c.char, 0, 0);
    pop();
  }

  blendMode(BLEND);

  // 显示 fps
  push();
  fill(1, 0.5, 1);
  textSize(14);
  textAlign(RIGHT, BOTTOM);
  text(frameRate().toFixed(2), width - 20, height - 20);
  pop();
}

// ============== 核心函数 ==============
function initChars(txt) {
  chars = [];
  let originalTxt = originalPairs[languageIndex];
  let textHeight = originalTxt.split("\n").length * lineHeight;
  let lines = txt.split("\n");
  let baseY = height / 2 - textHeight / 2;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineBaseX;
    if (currentLanguage === 'cn') {
      lineBaseX = safeMargin;
    } else { // 'en'
      // Cache actual content width once per line to avoid repeated computations
      const content = line.trimEnd();
      const contentWidth = textWidth(content);
      lineBaseX = width - safeMargin - contentWidth;
    }
    let yPos = baseY + i * lineHeight;

    let xCursor = lineBaseX;
    for (let j = 0; j < line.length; j++) {
      let char = line[j];
      let xPos = xCursor;
      chars.push({
        originalChar: char, char: char,
        x: xPos, y: yPos, startX: xPos, startY: yPos, targetX: xPos, targetY: yPos,
        currentScale: 1, hue: 0, sat: 0, bri: 0.8,
        targetChar: null,
      });
      xCursor += textWidth(char);
    }
  }
}

function createNewTarget() {
  let nextLang = (currentLanguage === 'cn') ? 'en' : 'cn';
  let nextText = nextLang === 'en' ? textEN : textCN;
  let nextIndexWithinPair = (currentLanguage === 'cn') ? languageIndex + 1 : languageIndex - 1;
  let originalTxt = originalPairs[nextIndexWithinPair];
  let textHeight = originalTxt.split('\n').length * lineHeight;
  let lines = nextText.split('\n');
  let targetYBase = height / 2 - textHeight / 2;

  let charIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let targetXBase;
    if (nextLang === 'cn') {
      targetXBase = safeMargin;
    } else { // 'en'
      const content = line.trimEnd();
      const contentWidth = textWidth(content);
      targetXBase = width - safeMargin - contentWidth;
    }
    let yPos = targetYBase + i * lineHeight;
    let xCursor = targetXBase;
    for (let j = 0; j < line.length; j++) {
      if (charIndex < chars.length) {
        let c = chars[charIndex];
        c.startX = c.x;
        c.startY = c.y;
        c.targetX = xCursor;
        c.targetY = yPos;
        c.targetChar = line[j];
      }
      xCursor += textWidth(line[j]);
      charIndex++;
    }
  }

  startTime = millis();
  animating = true;
}

function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function formatText(txt) { return txt.replace(/([，。？！.,?!;])(?!\n)/g, "$1\n").replace(/(^|\n) /g, "$1"); }

// ============== 刷新布局 ==============
function refreshTextLayout() {
  forceRefreshFontMetrics();
  setCurrentText(languageIndex);
  initChars(currentLanguage === 'en' ? textEN : textCN);
  setTimeout(createNewTarget, 50);
}

function forceRefreshFontMetrics() {
  const s = textSize();
  textSize(s + 0.001);
  textSize(s);
  textAlign(LEFT, CENTER);
  textStyle(BOLD);
}

// ============== 事件 ==============
function keyPressed() {
  if (key === 'f' || key === 'F') {
    let fs = !fullscreen();
    fullscreen(fs);
    setTimeout(() => {
      resizeCanvas(windowWidth, windowHeight);
      refreshTextLayout();
    }, 400);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  refreshTextLayout();
}

// ============== Tweakpane ==============
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
  effectFolder.addInput(params, 'enableGlitch', { label: 'Glitch' },);
  effectFolder.addInput(params, 'enableColor', { label: 'Color' });
}