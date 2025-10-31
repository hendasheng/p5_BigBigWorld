class Matrix {
  /**
   * @param {p5.Video} video     p5 视频对象
   * @param {number} pgSize      PGraphics 正方形边长（如 width * 0.65）
   * @param {number} gridSize    格子大小（控制密度）
   */
  constructor(video, pgSize = 400, gridSize = 15) {
    this.video = video;
    this.pgSize = pgSize;        // PGraphics 尺寸
    this.gridSize = gridSize;

    this.pg = null;
    this.cols = 0;
    this.rows = 0;
    this.cellW = 0;
    this.cellH = 0;

    this.threshold = 40;
    this._lastFrameTime = -1;

    this._createPG(pgSize, pgSize);
    this._resizePG(pgSize, pgSize);
  }

  /** 创建 PGraphics */
  _createPG(w, h) {
    if (this.pg) this.pg.remove();
    this.pg = createGraphics(w, h);
    this.pg.noStroke();
  }

  /** 内部：根据 pgSize 重新计算行列和格子大小 */
  _resizePG(w, h) {
    this.cols = Math.floor(w / this.gridSize);
    this.rows = Math.floor(h / this.gridSize);
    this.cellW = w / this.cols;
    this.cellH = h / this.rows;
  }

  /** 公开：改变 PGraphics 尺寸 */
  resize(pgSize) {
    this.pgSize = pgSize;
    this._resizePG(pgSize, pgSize);
    this._createPG(pgSize, pgSize);
  }

  /** 每帧更新：只在新帧时重绘 PGraphics */
  update() {
    if (!this.video || !this.video.loadedmetadata) return;

    const curTime = this.video.time();
    if (curTime === this._lastFrameTime) return;
    this._lastFrameTime = curTime;

    this.video.loadPixels();
    if (!this.video.pixels?.length) return;

    this.pg.clear();  // 清空

    const sxFactor = this.video.width  / this.cols;
    const syFactor = this.video.height / this.rows;

    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        const sx = Math.floor(i * sxFactor);
        const sy = Math.floor(j * syFactor);
        const idx = (sx + sy * this.video.width) * 4;
        const r = this.video.pixels[idx];

        if (r > this.threshold) {
          const g = this.video.pixels[idx + 1];
          const b = this.video.pixels[idx + 2];

          this.pg.fill(r, g, b);
          this.pg.rect(i * this.cellW, j * this.cellH, this.cellW, this.cellH);
        }
      }
    }
  }

  // —— 公开 API —— //
  setThreshold(val) { this.threshold = val; }
  setGridSize(size) {
    this.gridSize = size;
    this._resizePG(this.pgSize, this.pgSize);
    this._createPG(this.pgSize, this.pgSize);
  }
  setPGSize(size) { this.resize(size); }

  getGraphics() { return this.pg; }

  /** 居中绘制到主画布 */
  drawCentered() {
    const x = width / 2 - this.pgSize / 2;
    const y = height / 2 - this.pgSize / 2;
    image(this.pg, x, y, this.pgSize, this.pgSize);
    // square(10, 10, 100);
  }

  /** 自定义位置绘制 */
  draw(x, y) {
    image(this.pg, x, y, this.pgSize, this.pgSize);
  }
}