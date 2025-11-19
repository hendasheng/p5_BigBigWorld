
// 1) 如想用自己图片，把文件放到本目录后改写成：
//    let baseImg = 'myPhoto.jpg';
// 2) 或者使用下面任意免费测试图（无需跨域）
let baseImg = '../data/img/20251108秦昊5379.jpg';
// let baseImg = '../data/img/20251108秦昊5263 1.jpg';

let STEP = 80;            // 采样步长（像素）
let SIZE = STEP * 0.8;    // 形状大小（随步长联动）

// 交互配置（Tweakpane）
let pane;
const config = {
  selectedColor: '#ffffff', // 排除颜色：与此颜色相近的像素不绘制
  tolerance: 16,            // 颜色容差（0-64建议范围）
  step: STEP,               // 采样步长联动控制
  animateExclude: true,     // 自动在颜色区间游走排除色
  speed: 60,                // 游走速度（度/秒，用于 Hue）
  flowAmp: 8,               // 流动幅度（像素）
  flowSpeed: 1.2,           // 流动速度（系数）
  // 粒子系统
  particlesOn: true,        // 启用粒子
  emitterMode: 'bright',    // 发射端选择：bright/nearHue/random/wander
  emitterThresh: 65,        // 亮度阈值（bright模式）
  emitterStride: 5,         // 发射端采样步长（降低遍历量）
  emitProb: 0.15,           // 每发射端每帧发射概率（随帧率适配）
  maxParticles: 1400,       // 粒子上限
  pSize: 10,                // 粒子尺寸
  pAlpha: 160,              // 粒子透明度
  pSpeed: 80,               // 初速度（px/s，向下）
  pJitter: 20,              // 初速度抖动（角度或水平偏移）
  gravity: 60,              // 重力（px/s^2）
  particleBlend: 'add',     // 粒子合成：normal/add/lighten/screen
  // 游走发射参数
  wanderAxis: 'x',          // 游走轴：x/y
  wanderSpeed: 0.6,         // 游走速度（周期性，越大越快）
  wanderWidth: 140,         // 发射带半宽（像素）
};

// 运行时监控（FPS）
const runtime = { fps: 0 };

// 预计算并缓存的瓦片数据，减少每帧计算开销
let tiles = [];
let tilesReady = false;
// 发射端缓存与粒子池
let emitterTiles = [];
let particles = [];

// 基于图片的颜色区间与动画状态
let colorRange = null;      // { hueMin, hueMax, satAvg, briAvg }
let currentHue = 0;         // 动画游走的当前 Hue
let autoColor = null;       // 动画生成的排除颜色（p5 Color）

function preload() {
    img = loadImage(baseImg, () => console.log('图片加载成功'), (e) => {
        console.error('图片加载失败:', e);
        // 备用方案：使用纯色占位图
        img = createImage(400, 400);
        img.loadPixels();
        for (let i = 0; i < img.width * img.height; i++) {
            img.pixels[i * 4] = 200;
            img.pixels[i * 4 + 1] = 200;
            img.pixels[i * 4 + 2] = 200;
            img.pixels[i * 4 + 3] = 255;
        }
        img.updatePixels();
    });
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    // 预计算颜色区间
    computeColorRange();

    // 初始化 Tweakpane 控件（index.html 已引入 tweakpane.min.js）
    if (typeof Tweakpane !== 'undefined' && Tweakpane?.Pane) {
        pane = new Tweakpane.Pane();
        pane.addInput(config, 'selectedColor', { label: '排除颜色' });
        pane.addInput(config, 'tolerance', { label: '容差', min: 0, max: 64, step: 1 });
        pane.addInput(config, 'step', { label: '采样步长', min: 10, max: 200, step: 5 });
        pane.addInput(config, 'animateExclude', { label: '自动游走排除色' });
        pane.addInput(config, 'speed', { label: '游走速度(Hue度/秒)', min: 5, max: 180, step: 5 });
        pane.addInput(config, 'flowAmp', { label: '流动幅度(px)', min: 0, max: 20, step: 1 });
        pane.addInput(config, 'flowSpeed', { label: '流动速度', min: 0, max: 5, step: 0.1 });
        // 粒子系统控件
        pane.addInput(config, 'particlesOn', { label: '粒子开' });
        pane.addInput(config, 'emitterMode', { label: '发射端', options: { '亮部': 'bright', '近排除色': 'nearHue', '随机': 'random', '游走': 'wander' } });
        pane.addInput(config, 'wanderAxis', { label: '游走轴', options: { '水平': 'x', '垂直': 'y' } });
        pane.addInput(config, 'wanderSpeed', { label: '游走速度', min: 0.2, max: 2.0, step: 0.1 });
        pane.addInput(config, 'wanderWidth', { label: '游走带宽', min: 20, max: 200, step: 5 });
        pane.addInput(config, 'emitterThresh', { label: '亮度阈值', min: 20, max: 90, step: 1 });
        pane.addInput(config, 'emitterStride', { label: '发射采样步长', min: 1, max: 15, step: 1 });
        pane.addInput(config, 'emitProb', { label: '发射概率', min: 0, max: 0.5, step: 0.01 });
        pane.addInput(config, 'maxParticles', { label: '粒子上限', min: 200, max: 2000, step: 50 });
        pane.addInput(config, 'pSize', { label: '粒子尺寸', min: 2, max: 16, step: 1 });
        pane.addInput(config, 'pAlpha', { label: '粒子透明', min: 20, max: 220, step: 5 });
        pane.addInput(config, 'pSpeed', { label: '初速度', min: 20, max: 160, step: 5 });
        pane.addInput(config, 'pJitter', { label: '速度抖动', min: 0, max: 60, step: 2 });
        pane.addInput(config, 'gravity', { label: '重力', min: 0, max: 120, step: 5 });
        pane.addInput(config, 'particleBlend', { label: '粒子合成', options: { '普通': 'normal', '相加': 'add', '变亮': 'lighten', '筛选': 'screen' } });
        pane.addMonitor(runtime, 'fps', { label: 'FPS', interval: 500, format: (v) => v.toFixed(1) });

        // 任意参数变化都触发重绘，并联动步长与形状大小
        pane.on('change', () => {
            STEP = config.step;
            SIZE = STEP * 0.8;
            // 步长变化时重新生成缓存瓦片
            computeTiles();
            if (config.animateExclude) {
                frameRate(30);
                loop();
            } else {
                noLoop();
                redraw();
            }
        });
    }
    // 根据动画开关决定是否循环绘制
    if (config.animateExclude) {
        frameRate(30);
        loop();
    } else {
        noLoop();
    }
    // 初始生成缓存瓦片
    computeTiles();
}

function draw() {
    background(255);
    // 更新FPS（指数平滑）
    runtime.fps = runtime.fps * 0.9 + (1000 / deltaTime) * 0.1;
    display();

}

function display() {
    // 响应式缩放：
    // 横屏（width >= height）：宽度占满，高度按比例
    // 竖屏（width < height）：高度占满，宽度按比例
    let scaleRatio;
    let offsetX = 0;
    let offsetY = 0;

    if (width >= height) {
        // 横屏：以宽度为基准填满
        scaleRatio = width / img.width;
        // 垂直方向居中
        offsetY = (height - img.height * scaleRatio) / 2;
    } else {
        // 竖屏：以高度为基准填满
        scaleRatio = height / img.height;
        // 水平方向居中
        offsetX = (width - img.width * scaleRatio) / 2;
    }

    image(img, offsetX, offsetY, img.width * scaleRatio, img.height * scaleRatio);

    push();
    // 应用缩放和居中
    translate(offsetX, offsetY);
    scale(scaleRatio);

    // 确保瓦片缓存已就绪
    if (!tilesReady) computeTiles();

    // 准备排除颜色：若启用动画，则在图片 Hue 区间内游走
    let excludeColor;
    if (config.animateExclude && colorRange) {
        const deltaHue = (config.speed || 60) * (deltaTime / 1000);
        currentHue += deltaHue;
        const span = Math.max(1, (colorRange.hueMax - colorRange.hueMin));
        let h = colorRange.hueMin + (currentHue % span);
        colorMode(HSB, 360, 100, 100);
        autoColor = color(h, colorRange.satAvg, colorRange.briAvg);
        colorMode(RGB, 255);
        excludeColor = autoColor;
    } else {
        excludeColor = color(config.selectedColor);
    }
    const tr = red(excludeColor);
    const tg = green(excludeColor);
    const tb = blue(excludeColor);
    // 使用缓存瓦片绘制，避免每帧重复像素与色彩计算
    const tol = config.tolerance;
    const tsec = millis() / 1000;
    const dt = deltaTime / 1000;
    for (let i = 0; i < tiles.length; i++) {
        const tile = tiles[i];
        const r = tile.r, g = tile.g, b = tile.b;
        // 颜色容差匹配：若与排除颜色相近，则跳过绘制
        const isExcluded = Math.abs(r - tr) <= tol && Math.abs(g - tg) <= tol && Math.abs(b - tb) <= tol;
        if (isExcluded) continue;

        // 轻微流动位移，增强画面动态感
        const fx = config.flowAmp * Math.sin((tile.x * 0.02) + tsec * config.flowSpeed);
        const fy = config.flowAmp * Math.cos((tile.y * 0.02) + tsec * config.flowSpeed);

        // 半透明以减轻视觉堆叠感
        fill(r, g, b, 220);

        push();
        translate(tile.x + fx, tile.y + fy);
        drawShape(tile.shapeType, SIZE);
        pop();
    }
    // 粒子发射与更新（向下）
    if (config.particlesOn) {
        spawnParticles(dt);
        updateParticles(dt);
    }
    pop();


}

// 根据颜色返回形状编号
function pickShape(r, g, b) {
    const h = hue(color(r, g, b));
    const s = saturation(color(r, g, b));
    const br = brightness(color(r, g, b));

    // 亮度极低 → 黑色区域 → 圆
    if (br < 30) return 0;
    // 高饱和度红色 → 三角形
    if (s > 60 && (h < 20 || h > 340)) return 1;
    // 绿色 → 矩形
    if (h > 80 && h < 160) return 2;
    // 蓝色 → 椭圆
    if (h > 200 && h < 260) return 3;
    // 其他 → 菱形
    return 4;
}

// 绘制对应形状
function drawShape(type, s) {
    switch (type) {
        case 0: circle(0, 0, s); break;
        case 1: triangle(-s / 2, s / 2, s / 2, s / 2, 0, -s / 2); break;
        case 2: rect(-s / 2, -s / 2, s, s); break;
        case 3: ellipse(0, 0, s * 1.5, s); break;
        case 4: quad(0, -s / 2, s / 2, 0, 0, s / 2, -s / 2, 0); break;
    }
}

// 鼠标点击重新生成
function mousePressed() {
    redraw();
}

// 窗口大小改变时响应
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    redraw();
}

// 扫描图片像素以估计颜色区间（Hue范围与平均饱和度/亮度）
function computeColorRange() {
    if (!img) return;
    img.loadPixels();
    let hueMin = 360, hueMax = 0;
    let satSum = 0, briSum = 0, count = 0;

    const sampleStep = Math.max(10, Math.floor(Math.min(img.width, img.height) / 50));
    for (let y = 0; y < img.height; y += sampleStep) {
        for (let x = 0; x < img.width; x += sampleStep) {
            const idx = (y * img.width + x) * 4;
            const r = img.pixels[idx];
            const g = img.pixels[idx + 1];
            const b = img.pixels[idx + 2];
            const c = color(r, g, b);
            colorMode(HSB, 360, 100, 100);
            const h = hue(c);
            const s = saturation(c);
            const br = brightness(c);
            colorMode(RGB, 255);
            hueMin = Math.min(hueMin, h);
            hueMax = Math.max(hueMax, h);
            satSum += s;
            briSum += br;
            count++;
        }
    }
    if (count > 0) {
        colorRange = {
            hueMin: Math.max(0, Math.floor(hueMin)),
            hueMax: Math.min(360, Math.ceil(hueMax)),
            satAvg: satSum / count,
            briAvg: briSum / count,
        };
        currentHue = colorRange.hueMin;
    }
}

// 基于当前 STEP 生成缓存瓦片（颜色与形状预计算）
function computeTiles() {
    if (!img) return;
    img.loadPixels();
    tiles = [];
    emitterTiles = [];
    for (let y = 0; y < img.height; y += STEP) {
        for (let x = 0; x < img.width; x += STEP) {
            const idx = (y * img.width + x) * 4;
            const r = img.pixels[idx];
            const g = img.pixels[idx + 1];
            const b = img.pixels[idx + 2];
            const shapeType = pickShape(r, g, b);
            // 发射端选择
            let isEmitter = false;
            if (config.emitterMode === 'bright') {
                const c = color(r, g, b);
                colorMode(HSB, 360, 100, 100);
                const br = brightness(c);
                colorMode(RGB, 255);
                isEmitter = br > config.emitterThresh;
            } else if (config.emitterMode === 'random') {
                isEmitter = (x + y) % (STEP * 2) === 0;
            } else if (config.emitterMode === 'nearHue' && autoColor) {
                const tolHue = 20;
                colorMode(HSB, 360, 100, 100);
                const h1 = hue(color(r, g, b));
                const h2 = hue(autoColor);
                colorMode(RGB, 255);
                isEmitter = Math.abs(h1 - h2) < tolHue;
            } else if (config.emitterMode === 'wander') {
                // 游走模式：发射端不预标记，运行时按游走带选择
                isEmitter = false;
            }
            const tx = x + STEP / 2, ty = y + STEP / 2;
            const tileObj = { x: tx, y: ty, r, g, b, shapeType, isEmitter };
            tiles.push(tileObj);
            if (isEmitter) emitterTiles.push(tileObj);
        }
    }
    tilesReady = true;
}

function spawnParticles(dt) {
    const stride = Math.max(1, config.emitterStride);
    const prob = Math.max(0, Math.min(0.9, config.emitProb));
    const speed = config.pSpeed;
    const jitter = config.pJitter;

    if (config.emitterMode === 'wander') {
        // 动态游走带：中心随时间正弦游走
        const tsec = millis() / 1000;
        const axis = config.wanderAxis;
        const halfW = Math.max(10, config.wanderWidth);
        const amp = (axis === 'x' ? img.width : img.height) * 0.45;
        const center = (axis === 'x' ? img.width : img.height) * 0.5 + amp * Math.sin(tsec * config.wanderSpeed);
        for (let i = 0; i < tiles.length; i += stride) {
            if (particles.length >= config.maxParticles) break;
            const e = tiles[i];
            const pos = axis === 'x' ? e.x : e.y;
            if (Math.abs(pos - center) <= halfW && random() < prob) {
                const vx = random(-jitter, jitter) * 0.2;
                const vy = speed + random(-jitter, jitter) * 0.1;
                particles.push({ x: e.x, y: e.y, vx, vy, life: 0, maxLife: 3.5, r: e.r, g: e.g, b: e.b });
            }
        }
        return;
    }

    if (!emitterTiles.length) return;
    for (let i = 0; i < emitterTiles.length; i += stride) {
        if (particles.length >= config.maxParticles) break;
        if (random() < prob) {
            const e = emitterTiles[i];
            const vx = random(-jitter, jitter) * 0.2; // 水平抖动
            const vy = speed + random(-jitter, jitter) * 0.1; // 向下为主
            particles.push({ x: e.x, y: e.y, vx, vy, life: 0, maxLife: 3.5, r: e.r, g: e.g, b: e.b });
        }
    }
}

function updateParticles(dt) {
    // 为粒子设置独立的合成模式以增强可见性
    let bm = BLEND;
    if (config.particleBlend === 'add') bm = ADD;
    else if (config.particleBlend === 'screen') bm = SCREEN;
    else if (config.particleBlend === 'lighten') bm = LIGHTEST;
    push();
    blendMode(bm);
    noStroke();
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += config.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life += dt;
        const fade = 1 - (p.life / p.maxLife);
        const alpha = Math.max(0, Math.min(255, Math.floor(config.pAlpha * fade)));
        // 先绘制柔和的外层“光晕”，再绘制核心粒子，提高可见度
        const haloAlpha = Math.floor(alpha * 0.45);
        const haloSize = config.pSize * 1.8;
        fill(p.r, p.g, p.b, haloAlpha);
        circle(p.x, p.y, haloSize);

        fill(p.r, p.g, p.b, alpha);
        circle(p.x, p.y, config.pSize);
        if (p.life > p.maxLife || p.y > img.height + 20 || alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    pop();
}