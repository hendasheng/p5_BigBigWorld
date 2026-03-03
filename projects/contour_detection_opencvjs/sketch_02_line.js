let capture;
let w, h; // 实际视频尺寸
let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
let detectWidth = 0, detectHeight = 0;
let detectBuffer;

let params = {
  blurRadius: 0.5,
  threshold: 0.5,
  rectDisplay: true,
  contourDisplay: true,
  showThreshold: false,
  paneVisible: true,
  lineStep: 5,
  lineDisplay: true,
  textDisplay: true,
  fps: 0,
  detectLongEdge: 480,
  minArea: 40,
  contourStride: 2,

  textColor: "#ffffffff",
  textBgColor: "#00fc2a44",
  lineColor: "#ffffff",
  rectColor: "#ffffff",
  lineColor: "#ffffff"
};

let captureMat, gray, blurred, thresholded;
let contours, hierarchy;

let ready = false;
let captureReady = false;

function initTweakpane() {
  let pane = new Tweakpane.Pane();

  const menu = pane.addFolder({ title: "Menu" });
  menu.addInput(params, "blurRadius", { min: 0, max: 1, step: 0.1 });
  menu.addInput(params, "threshold", { min: 0, max: 1, step: 0.1 });
  menu.addInput(params, "detectLongEdge", { min: 240, max: 960, step: 10 });
  menu.addInput(params, "minArea", { min: 0, max: 400, step: 5 });
  menu.addInput(params, "contourStride", { min: 1, max: 8, step: 1 });

  // control 控件
  const control = pane.addFolder({ title: "control" })

  control.addInput(params, "lineStep", { min: 2, max: 10, step: 1 });
  control.addInput(params, "textColor", { label:"Text", picker: 'inline', expanded: false });
  control.addInput(params, "textBgColor", {label:"Bg", picker: 'inline', expanded: false });
  control.addInput(params, "rectColor", {label:"Rect", picker: 'inline', expanded: false });
  control.addInput(params, "lineColor", {label:"Line", picker: 'inline', expanded: false });

  // 显示控件
  const display = pane.addFolder({ title: "Display" });
  display.addInput(params, "rectDisplay", { label: "Rect" });
  display.addInput(params, "contourDisplay", { label: "Contour" });
  display.addInput(params, "lineDisplay", { label: "Line" });
  display.addInput(params, "textDisplay", { label: "Text" });
  // 分割线
  display.addBlade({
    view: 'separator',
  });
  display.addInput(params, "showThreshold", { label: "Threshold" });

  // 性能监控分组
  const systemFolder = pane.addFolder({ title: "System" });
  systemFolder.addMonitor(params, "fps", {
    view: "graph",
    label: "FPS",
    min: 0,
    max: 60,
  });
  systemFolder.addMonitor(params, "fps", { label: "FPS Value", view: "text" });
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(30);
  pixelDensity(1);

  detectBuffer = createGraphics(64, 64);
  detectBuffer.pixelDensity(1);

  capture = createCapture({
    audio: false,
    video: {
      facingMode: "user",
    }
  });
  capture.elt.setAttribute("playsinline", "");
  capture.hide();

  // 等待视频 metadata 加载完成
  capture.elt.onloadedmetadata = () => {
    w = capture.elt.videoWidth;
    h = capture.elt.videoHeight;
    captureReady = true;
    console.log("摄像头实际分辨率:", w, h);

    if (ready && captureReady) {
      initializeMats();
    }
  };

  capture.elt.setAttribute("playsinline", "");
  capture.hide();

  let checkCvInterval = setInterval(() => {
    if (window.Module && window.Module.loaded) {
      ready = true;
      clearInterval(checkCvInterval);
      console.log("OpenCV loaded");

      if (captureReady) {
        initializeMats();
        capture.hide();
      }
    }
  }, 100);

  initTweakpane();
}

function initializeMats() {
  updateDetectionSize();

  if (captureMat) captureMat.delete();
  if (gray) gray.delete();
  if (blurred) blurred.delete();
  if (thresholded) thresholded.delete();
  releaseContours();

  captureMat = new cv.Mat(detectHeight, detectWidth, cv.CV_8UC4);
  gray = new cv.Mat(detectHeight, detectWidth, cv.CV_8UC1);
  blurred = new cv.Mat(detectHeight, detectWidth, cv.CV_8UC1);
  thresholded = new cv.Mat(detectHeight, detectWidth, cv.CV_8UC1);
}

function draw() {
  background(0);

  if (!ready || !captureReady) {
    fill(255);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("等待摄像头和OpenCV初始化...", width / 2, height / 2);
    return;
  }

  // 计算视频缩放和偏移
  let videoAspect = w / h;
  let canvasAspect = width / height;

  if (videoAspect > canvasAspect) {
    drawHeight = height;
    drawWidth = videoAspect * drawHeight;
    offsetX = -(drawWidth - width) / 2;
    offsetY = 0;
  } else {
    drawWidth = width;
    drawHeight = drawWidth / videoAspect;
    offsetX = 0;
    offsetY = -(drawHeight - height) / 2;
  }

  updateDetectionSize();
  if (captureMat && (captureMat.cols !== detectWidth || captureMat.rows !== detectHeight)) {
    initializeMats();
  }

  detectBuffer.push();
  detectBuffer.background(0);
  detectBuffer.image(capture, 0, 0, detectWidth, detectHeight);
  detectBuffer.pop();
  detectBuffer.loadPixels();

  if (detectBuffer.pixels.length > 0) {
    captureMat.data().set(detectBuffer.pixels);

    let blurRadius = map(params.blurRadius, 0, 1, 1, 10);
    let threshold = map(params.threshold, 0, 1, 0, 255);

    releaseContours();
    cv.cvtColor(captureMat, gray, cv.ColorConversionCodes.COLOR_RGBA2GRAY.value, 0);
    cv.blur(gray, blurred, [blurRadius, blurRadius], [-1, -1], cv.BORDER_DEFAULT);
    cv.threshold(blurred, thresholded, threshold, 255, cv.ThresholdTypes.THRESH_BINARY.value);

    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(thresholded, contours, hierarchy, 3, 2, [0, 0]);
  }

  // 显示视频（保持比例）
  image(capture, offsetX, offsetY, drawWidth, drawHeight);

  // 显示轮廓和 bounding box
  if (contours && !params.showThreshold) {
    noFill();
    stroke(255);
    strokeWeight(1);

    let centers = []; // 存储每个bounding box的中心点

    for (let i = 0; i < contours.size(); i++) {
      let contour = contours.get(i);
      let area = cv.contourArea(contour, false);
      if (area < params.minArea) {
        contour.delete();
        continue;
      }

      if (params.contourDisplay) {
        // 画轮廓
        beginShape();
        for (let j = 0; j < contour.total(); j += params.contourStride) {
          let k = j * 2;
          let x = contour.get_int_at(k);
          let y = contour.get_int_at(k + 1);
          let px = x * (drawWidth / detectWidth) + offsetX;
          let py = y * (drawHeight / detectHeight) + offsetY;
          vertex(px, py);
        }
        noFill();
        stroke(params.rectColor);
        strokeWeight(1);
        endShape(CLOSE);
      }

      // 画bounding box
      let box = cv.boundingRect(contour);
      let x1 = box.x * (drawWidth / detectWidth) + offsetX;
      let y1 = box.y * (drawHeight / detectHeight) + offsetY;
      let bw = box.width * (drawWidth / detectWidth);
      let bh = box.height * (drawHeight / detectHeight);

      // 画出矩形
      if (params.rectDisplay) {
        noFill();
        stroke(params.rectColor);
        strokeWeight(1);
        rect(x1, y1, bw, bh);
      }

      if (params.textDisplay) {
        // 只在较大的方块中显示文字
        if (bw > 20 && bh > 20) {
          let tSize = constrain(bh * 0.7, 8, 14);
          textSize(tSize);

          textAlign(LEFT, BOTTOM);
          let label = `${int(box.x)} × ${int(box.y)}`;

          // 获取文字的宽度和高度
          let tw = textWidth(label);
          let th = textAscent() + textDescent();

          // 设置背景框颜色和位置
          noStroke();
          fill(params.textBgColor); // 红色背景
          rect(x1, y1 - th * .8, tw, th * .8);

          // 文本
          noStroke();
          fill(params.textColor);
          text(label, x1, y1);
        }
      }

      // 计算中心点并存入数组
      let cx = x1 + bw / 2;
      let cy = y1 + bh / 2;
      centers.push([cx, cy]);
      contour.delete();
    }


    // 连接中心点 - 线
    stroke(params.lineColor);
    strokeWeight(1);
    noFill();

    if (params.lineDisplay) {
      beginShape();
      for (let i = 0; i < centers.length; i += params.lineStep) {
        let [cx, cy] = centers[i];
        vertex(cx, cy);
      }
      endShape();
    }

  }

  // 显示阈值图像（覆盖在原图上）
  if (params.showThreshold) {
    let src = thresholded.data();
    let dst = detectBuffer.pixels;
    let n = src.length;
    let j = 0;
    for (let i = 0; i < n; i++) {
      dst[j++] = src[i];
      dst[j++] = src[i];
      dst[j++] = src[i];
      dst[j++] = 255;
    }
    detectBuffer.updatePixels();
    image(detectBuffer, offsetX, offsetY, drawWidth, drawHeight);
  }
  params.fps = frameRate();
}

function updateDetectionSize() {
  if (!w || !h) return;
  const longEdge = Math.max(w, h);
  const scale = Math.min(1, params.detectLongEdge / Math.max(1, longEdge));
  const nextW = Math.max(32, Math.round(w * scale));
  const nextH = Math.max(32, Math.round(h * scale));

  if (nextW === detectWidth && nextH === detectHeight) return;

  detectWidth = nextW;
  detectHeight = nextH;
  if (detectBuffer) detectBuffer.resizeCanvas(detectWidth, detectHeight);
}

function releaseContours() {
  if (contours) contours.delete();
  if (hierarchy) hierarchy.delete();
  contours = null;
  hierarchy = null;
}

function keyPressed() {
  if (key === "m" || key === "M") {
    const paneElem = document.querySelector(".tp-dfwv");
    if (paneElem) {
      params.paneVisible = !params.paneVisible;
      paneElem.style.display = params.paneVisible ? "block" : "none";
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
