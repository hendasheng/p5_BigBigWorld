# p5_BigBigWorld

一个用于存放 p5.js 小项目和实验草图的仓库。项目以版本目录方式持续迭代，根目录首页用于汇总当前可直接访问的入口。

## 首页

- 入口文件：`index.html`
- 本地打开后可以直接进入各项目当前版本页面

## 项目简介

### ASCII Edge Glitch

- 目录：`projects/ascii_edge_glitch`
- 当前首页入口：`projects/ascii_edge_glitch/ascii_edge_glitch_shader_0.6/index.html`
- 这是一个基于视频边缘提取和 shader 视频处理的 ASCII glitch 实验。当前版本保留 p5.js 的字符与线框叠层，同时把视频本体的色偏、块状错位和扫描干扰交给 shader 完成，并把 Blob 轮廓拖尾改成更断裂、跳变的故障残影。

### Contour Detection OpenCV.js

- 目录：`projects/contour_detection_opencvjs`
- 当前首页入口：`projects/contour_detection_opencvjs/index.html`
- 这是一个基于 OpenCV.js 的轮廓检测实验。主要流程是灰度、模糊、阈值分割和轮廓提取，用来生成 contour、bounding box、连线和标签等可视化效果。

### Horse Running

- 目录：`projects/horse_running`
- 当前首页入口：`projects/horse_running/horse_running_0.3/index.html`
- 这是一个围绕马奔跑动态展开的动画实验项目。目录中保留了多个版本，用于持续调整动作、节奏和画面表现。

### Text Offset Anim

- 目录：`projects/text_offset_anim`
- 当前首页入口：`projects/text_offset_anim/text_offset_anim_0.4.3/index.html`
- 这是一个文字错位、偏移和动态排版方向的动画实验。重点在字符层的位移、层叠和时间节奏，适合继续做字体与运动设计探索。

### Yin Mo Lun

- 目录：`projects/yin_mo_lun`
- 当前首页入口：`projects/yin_mo_lun/yin_mo_lun_0.1/index.html`
- 这是一个独立视觉概念项目，目前版本较早，主要用于承载特定主题下的图形和动画实验。

## 目录说明

- `projects/`：各个项目及其版本目录
- `vendor/`：共享依赖资源，目前包含 `opencvjs`
- `index.html`：仓库首页入口
