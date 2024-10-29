class ImageAnalyzer {
    constructor() {
        this.initElements();
        this.initVariables();
        this.bindEvents();
        this.initKeyboardEvents(); // 添加这一行
        this.colorTolerance = 20; // 默认容差值
    }

    initElements() {
        this.imageCanvas = document.getElementById('imageCanvas');
        this.drawingCanvas = document.getElementById('drawingCanvas');
        this.thumbnailView = document.getElementById('thumbnailView');
        this.colorPicks = document.getElementById('colorPicks');
        this.fileInput = document.getElementById('fileInput');
        
        this.imageCtx = this.imageCanvas.getContext('2d');
        this.drawingCtx = this.drawingCanvas.getContext('2d');
        this.thumbnailCtx = this.thumbnailView.getContext('2d');
    }

    initVariables() {
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.selectedColors = [];
        this.currentPoints = [];
        this.areas = [];
        this.excludeAreas = [];
        this.currentTool = null;
        this.isDragging = false;
    }

    bindEvents() {
        // 文件上传
        document.getElementById('uploadBtn').onclick = () => {
            this.fileInput.click();
            // 移除所有按钮的高亮
            document.querySelectorAll('.tool-button').forEach(btn => {
                btn.classList.remove('active');
            });
        };
        this.fileInput.onchange = (e) => this.handleImageUpload(e);

        // 工具按钮
        document.getElementById('drawAreaBtn').onclick = () => this.setTool('draw');
        document.getElementById('excludeAreaBtn').onclick = () => this.setTool('exclude');
        document.getElementById('dropperBtn').onclick = () => this.setTool('dropper');
        document.getElementById('settingsBtn').onclick = () => {
            this.showToleranceSettings();
            // 移除所有按钮的高亮
            document.querySelectorAll('.tool-button').forEach(btn => {
                btn.classList.remove('active');
            });
        };
        document.getElementById('analyzeBtn').onclick = () => {
            this.analyze();
            // 移除所有按钮的高亮
            document.querySelectorAll('.tool-button').forEach(btn => {
                btn.classList.remove('active');
            });
        };

        // 画布事件
        this.drawingCanvas.onmousedown = (e) => this.handleMouseDown(e);
        this.drawingCanvas.onmousemove = (e) => this.handleMouseMove(e);
        this.drawingCanvas.onmouseup = (e) => this.handleMouseUp(e);
        this.drawingCanvas.onwheel = (e) => this.handleWheel(e);
        this.drawingCanvas.oncontextmenu = (e) => {
            e.preventDefault();
            if (this.currentPoints.length > 2) {
                this.closeCurrentPath();
            }
        };

        // 分布图点击事件
        const distributionMap = document.getElementById('distributionMap');
        if (distributionMap) {
            distributionMap.onclick = () => this.showLargePreview();
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    this.setupCanvases(img);
                    this.drawImage();
                    this.updateThumbnail();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    setupCanvases(img) {
        this.image = img;
        
        // 计算初始缩放比例，使图像适应视窗
        const containerWidth = this.imageCanvas.parentElement.clientWidth;
        const containerHeight = this.imageCanvas.parentElement.clientHeight;
        const scaleX = containerWidth / img.width;
        const scaleY = containerHeight / img.height;
        this.scale = Math.min(scaleX, scaleY);

        // 设置画布大小为容器大小
        this.imageCanvas.width = containerWidth;
        this.imageCanvas.height = containerHeight;
        this.drawingCanvas.width = containerWidth;
        this.drawingCanvas.height = containerHeight;

        // 计算初始偏移，使图像居中
        this.offset.x = (containerWidth - img.width * this.scale) / 2;
        this.offset.y = (containerHeight - img.height * this.scale) / 2;
    }

    drawImage() {
        // 清除整个画布
        this.imageCtx.clearRect(0, 0, this.imageCanvas.width, this.imageCanvas.height);
        
        // 保存当前状态
        this.imageCtx.save();
        
        // 应用变
        this.imageCtx.translate(this.offset.x, this.offset.y);
        this.imageCtx.scale(this.scale, this.scale);
        
        // 绘制图像
        this.imageCtx.drawImage(this.image, 0, 0);
        
        // 恢复状态
        this.imageCtx.restore();
        
        // 重绘选区
        this.redrawAreas();
    }

    handleWheel(e) {
        e.preventDefault();
        
        if (e.buttons === 2) { // 鼠标中键
            // 平移处理
            this.offset.x += e.deltaX;
            this.offset.y += e.deltaY;
        } else {
            // 缩放处理
            const rect = this.imageCanvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 计算鼠标位置相对于当前变换的坐标
            const pointX = (mouseX - this.offset.x) / this.scale;
            const pointY = (mouseY - this.offset.y) / this.scale;

            // 缩放因子
            const factor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = this.scale * factor;
            
            // 限最小缩放比例
            const minScale = Math.min(
                this.imageCanvas.width / this.image.width,
                this.imageCanvas.height / this.image.height
            ) * 0.5;
            
            if (newScale >= minScale) {
                this.scale = newScale;
                // 调整偏移以保持鼠标位置不变
                this.offset.x = mouseX - pointX * this.scale;
                this.offset.y = mouseY - pointY * this.scale;
            }
        }

        // 重绘
        this.drawImage();
        this.updateThumbnail();
    }

    updateThumbnail() {
        if (!this.image) return;

        const thumbCanvas = this.thumbnailView;
        const maxWidth = thumbCanvas.width;
        const maxHeight = thumbCanvas.height;
        
        // 计算缩略图的缩放比例
        const ratio = Math.min(maxWidth / this.image.width, maxHeight / this.image.height);
        const thumbWidth = this.image.width * ratio;
        const thumbHeight = this.image.height * ratio;
        
        // 计算居中位置
        const offsetX = (maxWidth - thumbWidth) / 2;
        const offsetY = (maxHeight - thumbHeight) / 2;
        
        // 清除缩略图
        this.thumbnailCtx.clearRect(0, 0, maxWidth, maxHeight);
        
        // 绘制缩略图背景
        this.thumbnailCtx.fillStyle = '#f0f0f0';
        this.thumbnailCtx.fillRect(0, 0, maxWidth, maxHeight);
        
        // 绘制图像
        this.thumbnailCtx.drawImage(
            this.image,
            0, 0, this.image.width, this.image.height,
            offsetX, offsetY, thumbWidth, thumbHeight
        );
        
        // 计算当前视图在缩略图中的位置
        const viewportRect = {
            x: (-this.offset.x / this.scale) * ratio + offsetX,
            y: (-this.offset.y / this.scale) * ratio + offsetY,
            width: (this.imageCanvas.width / this.scale) * ratio,
            height: (this.imageCanvas.height / this.scale) * ratio
        };
        
        // 绘制视图框
        this.thumbnailCtx.strokeStyle = 'red';
        this.thumbnailCtx.lineWidth = 2;
        this.thumbnailCtx.strokeRect(
            viewportRect.x,
            viewportRect.y,
            viewportRect.width,
            viewportRect.height
        );
    }

    getMousePos(e) {
        const rect = this.drawingCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.offset.x) / this.scale,
            y: (e.clientY - rect.top - this.offset.y) / this.scale
        };
    }

    handleMouseDown(e) {
        if (e.buttons === 4) { // 鼠标中键平移
            this.isDragging = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            return;
        }

        if (e.button === 0) { // 左键
            const pos = this.getMousePos(e);
            
            if (this.currentTool === 'draw' || this.currentTool === 'exclude') {
                this.currentPoints.push(pos);
                this.redrawAreas();
            } else if (this.currentTool === 'dropper') {
                this.handleDropper(e);
            }
        }
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMousePos.x;
            const deltaY = e.clientY - this.lastMousePos.y;
            
            this.offset.x += deltaX;
            this.offset.y += deltaY;
            
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            
            this.drawImage();
            this.updateThumbnail();
            return;
        }

        if (this.currentTool === 'draw' || this.currentTool === 'exclude') {
            if (this.currentPoints.length > 0) {
                const pos = this.getMousePos(e);
                this.redrawAreas(pos);
            }
        } else if (this.currentTool === 'dropper') {
            const pos = this.getMousePos(e);
            const imageData = this.imageCtx.getImageData(
                this.offset.x + pos.x * this.scale,
                this.offset.y + pos.y * this.scale,
                1, 1
            ).data;
            
            // 更新鼠标样式为自定义吸管样式，显示当前颜色
            const color = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
            this.drawingCanvas.title = color;
            this.drawingCanvas.style.cursor = `crosshair`;
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
    }

    setTool(tool) {
        this.currentTool = tool;
        this.currentPoints = [];
        
        // 移除所有按钮的高亮
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 根据工具设置高亮和鼠标样式
        switch(tool) {
            case 'draw':
                document.getElementById('drawAreaBtn').classList.add('active');
                this.drawingCanvas.style.cursor = 'crosshair';
                break;
            case 'exclude':
                document.getElementById('excludeAreaBtn').classList.add('active');
                this.drawingCanvas.style.cursor = 'crosshair';
                break;
            case 'dropper':
                document.getElementById('dropperBtn').classList.add('active');
                this.drawingCanvas.style.cursor = 'pointer';
                break;
            default:
                this.drawingCanvas.style.cursor = 'default';
        }
    }

    closeCurrentPath() {
        if (this.currentPoints.length < 3) return;

        const area = {
            points: [...this.currentPoints],
            type: this.currentTool
        };

        if (this.currentTool === 'draw') {
            this.areas.push(area);
        } else if (this.currentTool === 'exclude') {
            this.excludeAreas.push(area);
        }

        this.currentPoints = [];
        this.redrawAreas();
    }

    redrawAreas(currentMousePos = null) {
        // 清除绘图画布
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        // 保存当前状态
        this.drawingCtx.save();
        
        // 应用与图像相同的变换
        this.drawingCtx.translate(this.offset.x, this.offset.y);
        this.drawingCtx.scale(this.scale, this.scale);

        // 绘制已完成的选区
        this.drawPolygons(this.areas, 'red');
        this.drawPolygons(this.excludeAreas, 'blue');

        // 绘制当前正在绘制的区
        if (this.currentPoints.length > 0) {
            this.drawingCtx.beginPath();
            this.drawingCtx.moveTo(this.currentPoints[0].x, this.currentPoints[0].y);
            
            for (let i = 1; i < this.currentPoints.length; i++) {
                this.drawingCtx.lineTo(this.currentPoints[i].x, this.currentPoints[i].y);
            }

            // 如果有当标位置，绘制预览线
            if (currentMousePos) {
                this.drawingCtx.lineTo(currentMousePos.x, currentMousePos.y);
            }

            // 设置样式
            this.drawingCtx.strokeStyle = this.currentTool === 'draw' ? 'red' : 'blue';
            this.drawingCtx.lineWidth = 2;
            this.drawingCtx.stroke();

            // 绘制点
            this.currentPoints.forEach(point => {
                this.drawingCtx.beginPath();
                this.drawingCtx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                this.drawingCtx.fillStyle = this.currentTool === 'draw' ? 'red' : 'blue';
                this.drawingCtx.fill();
            });
        }

        // 恢复状态
        this.drawingCtx.restore();
    }

    drawPolygons(polygons, color) {
        polygons.forEach(area => {
            const points = area.points;
            if (points.length < 3) return;

            this.drawingCtx.beginPath();
            this.drawingCtx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                this.drawingCtx.lineTo(points[i].x, points[i].y);
            }
            
            this.drawingCtx.closePath();
            
            // 添加半透明填充以显示内部区域
            this.drawingCtx.fillStyle = color === 'red' ? 
                'rgba(255, 0, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
            this.drawingCtx.fill();
            
            // 绘制边界
            this.drawingCtx.strokeStyle = color;
            this.drawingCtx.lineWidth = 2;
            this.drawingCtx.stroke();
        });
    }

    initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && this.currentPoints.length > 0) {
                e.preventDefault();
                this.currentPoints.pop();
                this.redrawAreas();
            }
        });
    }

    handleDropper(e) {
        const pos = this.getMousePos(e);
        
        // 获取图像数据
        const imageData = this.imageCtx.getImageData(
            this.offset.x + pos.x * this.scale,
            this.offset.y + pos.y * this.scale,
            1, 1
        ).data;
        
        // 创建颜色字符串
        const color = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
        
        // 检查颜色是否已经被选择
        if (!this.selectedColors.some(c => c === color)) {
            this.selectedColors.push(color);
            this.addColorToPanel(color);
            this.updateDistributionPreview();
        }
    }

    addColorToPanel(color) {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item-container';
        
        // 创建颜色块
        const colorBlock = document.createElement('div');
        colorBlock.className = 'color-block';
        colorBlock.style.backgroundColor = color;
        colorBlock.title = color;
        
        // 创建删除按钮
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        
        // 添加删除功能
        deleteBtn.onclick = (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            this.selectedColors = this.selectedColors.filter(c => c !== color);
            colorItem.remove();
            this.updateDistributionPreview();
        };
        
        // 组装元素
        colorItem.appendChild(colorBlock);
        colorItem.appendChild(deleteBtn);
        this.colorPicks.appendChild(colorItem);
    }

    updateDistributionPreview() {
        if (!this.image || this.selectedColors.length === 0) return;

        // 创建离屏 canvas 用于分析
        const offscreen = document.createElement('canvas');
        offscreen.width = this.image.width;
        offscreen.height = this.image.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(this.image, 0, 0);

        // 取图像数
        const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        const data = imageData.data;

        // 创建结果图像数据
        const resultData = new Uint8ClampedArray(data.length);
        
        // 首先将所有像素设置为透明
        for (let i = 0; i < data.length; i += 4) {
            resultData[i] = 0;     // R
            resultData[i + 1] = 0; // G
            resultData[i + 2] = 0; // B
            resultData[i + 3] = 0; // A (透明)
        }

        // 检查每个像素
        for (let y = 0; y < offscreen.height; y++) {
            for (let x = 0; x < offscreen.width; x++) {
                const i = (y * offscreen.width + x) * 4;
                const point = {x, y};
                
                // 检查点是否在选区内
                if (this.isPointInSelectedArea(point)) {
                    const pixelColor = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                    
                    if (this.isColorMatch(pixelColor)) {
                        // 选中的颜色显示为白色
                        resultData[i] = 255;     // R
                        resultData[i + 1] = 255; // G
                        resultData[i + 2] = 255; // B
                        resultData[i + 3] = 255; // A
                    } else {
                        // 选区非中颜色显示为黑色
                        resultData[i] = 0;       // R
                        resultData[i + 1] = 0;   // G
                        resultData[i + 2] = 0;   // B
                        resultData[i + 3] = 255; // A
                    }
                }
            }
        }

        // 创建预览画布
        const distributionMap = document.getElementById('distributionMap');
        const distributionCanvas = document.createElement('canvas');
        distributionCanvas.width = 300;
        distributionCanvas.height = 200;
        const distCtx = distributionCanvas.getContext('2d');

        // 清除之前的内容
        distributionMap.innerHTML = '';
        distributionMap.appendChild(distributionCanvas);

        // 设置背景
        distCtx.fillStyle = '#f0f0f0';
        distCtx.fillRect(0, 0, distributionCanvas.width, distributionCanvas.height);

        // 计算缩放和位置
        const scale = Math.min(
            distributionCanvas.width / this.image.width,
            distributionCanvas.height / this.image.height
        );
        const width = this.image.width * scale;
        const height = this.image.height * scale;
        const x = (distributionCanvas.width - width) / 2;
        const y = (distributionCanvas.height - height) / 2;

        // 绘制结图像
        const resultImageData = new ImageData(resultData, offscreen.width, offscreen.height);
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = offscreen.width;
        resultCanvas.height = offscreen.height;
        resultCanvas.getContext('2d').putImageData(resultImageData, 0, 0);
        distCtx.drawImage(resultCanvas, x, y, width, height);

        // 绘制选区边界
        distCtx.save();
        distCtx.translate(x, y);
        distCtx.scale(scale, scale);

        // 绘制主选区边界（红色）
        this.areas.forEach(area => {
            const points = area.points;
            if (points.length < 3) return;

            distCtx.beginPath();
            distCtx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                distCtx.lineTo(points[i].x, points[i].y);
            }
            distCtx.closePath();
            distCtx.strokeStyle = 'red';
            distCtx.lineWidth = 2;
            distCtx.stroke();
        });

        // 绘制扣除区域边界（蓝色）
        this.excludeAreas.forEach(area => {
            const points = area.points;
            if (points.length < 3) return;

            distCtx.beginPath();
            distCtx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                distCtx.lineTo(points[i].x, points[i].y);
            }
            distCtx.closePath();
            distCtx.strokeStyle = 'blue';
            distCtx.lineWidth = 2;
            distCtx.stroke();
        });

        distCtx.restore();
    }

    isColorMatch(color1) {
        return this.selectedColors.some(color2 => {
            const rgb1 = this.parseRGB(color1);
            const rgb2 = this.parseRGB(color2);
            
            return Math.abs(rgb1.r - rgb2.r) <= this.colorTolerance &&
                   Math.abs(rgb1.g - rgb2.g) <= this.colorTolerance &&
                   Math.abs(rgb1.b - rgb2.b) <= this.colorTolerance;
        });
    }

    parseRGB(color) {
        const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        return {
            r: parseInt(match[1]),
            g: parseInt(match[2]),
            b: parseInt(match[3])
        };
    }

    // 添加判断点是否在选区内的方法
    isPointInSelectedArea(point) {
        // 检查点是否在任何选区内
        const isInMainArea = this.areas.some(area => this.isPointInPolygon(point, area.points));
        
        // 如果不在主选区内，直接返回false
        if (!isInMainArea) return false;
        
        // 检查点是否在任何扣除区域内
        const isInExcludeArea = this.excludeAreas.some(area => 
            this.isPointInPolygon(point, area.points)
        );
        
        // 在主选区内且不在扣除区域内
        return !isInExcludeArea;
    }

    // 添加判断点是否在多边形内的方法
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            // 使用射线法判断点是否在多边形内部
            // 点在边上的情况也被视为在内部
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x <= (xj - xi) * (point.y - yi) / (yj - yi) + xi);
                
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // 在 ImageAnalyzer 类中添加分析相关的方法

    analyze() {
        if (!this.image || this.selectedColors.length === 0 || this.areas.length === 0) {
            alert('请先上传图片、绘制选区并选择颜色');
            return;
        }

        // 创建离屏 canvas 用于分析
        const offscreen = document.createElement('canvas');
        offscreen.width = this.image.width;
        offscreen.height = this.image.height;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(this.image, 0, 0);

        const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
        const data = imageData.data;

        // 统计像素
        let totalPixels = 0;    // 选区内总像素数
        let matchedPixels = 0;  // 匹配颜色的像素数

        // 遍历每个像素
        for (let y = 0; y < offscreen.height; y++) {
            for (let x = 0; x < offscreen.width; x++) {
                const point = {x, y};
                
                // 检查点是否在选区内
                if (this.isPointInSelectedArea(point)) {
                    totalPixels++;
                    
                    const i = (y * offscreen.width + x) * 4;
                    const pixelColor = `rgb(${data[i]}, ${data[i + 1]}, ${data[i + 2]})`;
                    
                    if (this.isColorMatch(pixelColor)) {
                        matchedPixels++;
                    }
                }
            }
        }

        // 计算占比
        const percentage = (matchedPixels / totalPixels * 100).toFixed(2);

        // 创建分析报告弹窗
        this.showAnalysisReport({
            totalPixels,
            matchedPixels,
            percentage,
            selectedColors: this.selectedColors
        });
    }

    showAnalysisReport(data) {
        // 创建弹窗容器
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            width: 80%;
            max-width: 800px;
            max-height: 90vh;
            overflow-y: auto;
        `;

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
        `;

        // 生成报告内容
        const content = `
            <h2 style="margin-bottom: 20px;">分析报告</h2>
            <div style="margin-bottom: 20px;">
                <p>选区总像素数：${data.totalPixels.toLocaleString()} 像素</p>
                <p>匹配颜色像素数：${data.matchedPixels.toLocaleString()} 像素</p>
                <p>占比：${data.percentage}%</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h3>选中的颜色：</h3>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    ${data.selectedColors.map(color => `
                        <div style="
                            width: 30px;
                            height: 30px;
                            background-color: ${color};
                            border: 1px solid black;
                            border-radius: 4px;
                            title="${color}"
                        "></div>
                    `).join('')}
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <h3>分布图：</h3>
                <canvas id="reportDistributionMap" width="700" height="400"></canvas>
            </div>
            <div style="text-align: right;">
                <button id="exportReportBtn" style="
                    padding: 8px 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 10px;
                ">导出PDF</button>
                <button id="closeReportBtn" style="
                    padding: 8px 16px;
                    background: #f0f0f0;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">关闭</button>
            </div>
        `;

        modal.innerHTML = content;

        // 添加到文档
        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // 绘制分布图
        const canvas = modal.querySelector('#reportDistributionMap');
        const ctx = canvas.getContext('2d');
        
        // 计算缩放比例
        const scale = Math.min(
            canvas.width / this.image.width,
            canvas.height / this.image.height
        );
        const width = this.image.width * scale;
        const height = this.image.height * scale;
        const x = (canvas.width - width) / 2;
        const y = (canvas.height - height) / 2;

        // 绘制分布图
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 获取当前分布预览的内容
        const distributionCanvas = document.querySelector('#distributionMap canvas');
        if (distributionCanvas) {
            ctx.drawImage(distributionCanvas, x, y, width, height);
        }

        // 绑定事件
        modal.querySelector('#closeReportBtn').onclick = () => {
            document.body.removeChild(modal);
            document.body.removeChild(overlay);
        };

        modal.querySelector('#exportReportBtn').onclick = () => {
            try {
                const canvas = modal.querySelector('#reportDistributionMap');
                if (canvas) {
                    this.exportReportToPDF(data, canvas);
                } else {
                    alert('无法获取分布图，请重试');
                }
            } catch (e) {
                console.error('Error in export:', e);
                alert('导出失败，请重试');
            }
        };
    }

    exportReportToPDF(data, distributionCanvas) {
        // 创建PDF文档
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        try {
            // 设置基本字体大小
            doc.setFontSize(16);
            doc.setFont('courier', 'normal');

            // 添加标题
            doc.text('Analysis Report', 105, 20, { align: 'center' });
            
            // 添加基本信息
            doc.setFontSize(12);
            const textLines = [
                `Total Pixels: ${data.totalPixels.toLocaleString()}`,
                `Matched Pixels: ${data.matchedPixels.toLocaleString()}`,
                `Percentage: ${data.percentage}%`
            ];

            // 分行添加文本
            let y = 40;
            textLines.forEach(line => {
                doc.text(line, 20, y);
                y += 10;
            });

            // 创建原图选区canvas
            const originalCanvas = document.createElement('canvas');
            originalCanvas.width = this.image.width;
            originalCanvas.height = this.image.height;
            const originalCtx = originalCanvas.getContext('2d');

            // 绘制原图
            originalCtx.drawImage(this.image, 0, 0);

            // 绘制选区
            originalCtx.save();
            this.areas.forEach(area => {
                const points = area.points;
                if (points.length < 3) return;

                originalCtx.beginPath();
                originalCtx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    originalCtx.lineTo(points[i].x, points[i].y);
                }
                originalCtx.closePath();
                originalCtx.strokeStyle = 'red';
                originalCtx.lineWidth = 2;
                originalCtx.stroke();
            });

            this.excludeAreas.forEach(area => {
                const points = area.points;
                if (points.length < 3) return;

                originalCtx.beginPath();
                originalCtx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    originalCtx.lineTo(points[i].x, points[i].y);
                }
                originalCtx.closePath();
                originalCtx.strokeStyle = 'blue';
                originalCtx.lineWidth = 2;
                originalCtx.stroke();
            });
            originalCtx.restore();

            // 添加原图
            const originalImgData = originalCanvas.toDataURL('image/jpeg', 1.0);
            doc.addImage(originalImgData, 'JPEG', 20, y, 170, 100);
            y += 110;

            // 添加分布图
            const distributionImgData = distributionCanvas.toDataURL('image/jpeg', 1.0);
            doc.addImage(distributionImgData, 'JPEG', 20, y, 170, 100);
            y += 110;

            // 创建饼图
            const pieCanvas = document.createElement('canvas');
            pieCanvas.width = 400;
            pieCanvas.height = 300;
            const pieChart = echarts.init(pieCanvas);

            const pieOption = {
                series: [{
                    type: 'pie',
                    radius: '70%',
                    data: [
                        { 
                            value: data.matchedPixels, 
                            name: 'Selected Colors',
                            itemStyle: { color: '#91cc75' }
                        },
                        { 
                            value: data.totalPixels - data.matchedPixels, 
                            name: 'Other Colors',
                            itemStyle: { color: '#999' }
                        }
                    ],
                    label: {
                        formatter: '{b}: {d}%'
                    }
                }]
            };

            pieChart.setOption(pieOption);

            // 等待饼图渲染完成
            setTimeout(() => {
                const pieImgData = pieCanvas.toDataURL('image/jpeg', 1.0);
                doc.addImage(pieImgData, 'JPEG', 60, y, 90, 70);
                
                // 保存PDF
                doc.save(`analysis_report_${new Date().getTime()}.pdf`);
                
                // 销毁图表实例
                pieChart.dispose();
            }, 100);

        } catch (e) {
            console.error('Error generating PDF:', e);
            alert('PDF生成失败，请重试');
        }
    }

    showToleranceSettings() {
        const modal = document.createElement('div');
        modal.className = 'settings-modal';
        modal.innerHTML = `
            <div class="settings-content">
                <h3>颜色容差设置</h3>
                <div class="tolerance-control">
                    <input type="range" id="toleranceSlider" 
                        min="1" max="50" value="${this.colorTolerance}"
                        style="width: 200px;">
                    <span id="toleranceValue">${this.colorTolerance}</span>
                </div>
                <div class="settings-buttons">
                    <button id="saveSettings">确定</button>
                    <button id="cancelSettings">取消</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const slider = modal.querySelector('#toleranceSlider');
        const valueDisplay = modal.querySelector('#toleranceValue');
        
        slider.oninput = () => {
            valueDisplay.textContent = slider.value;
        };

        modal.querySelector('#saveSettings').onclick = () => {
            this.colorTolerance = parseInt(slider.value);
            this.updateDistributionPreview();
            document.body.removeChild(modal);
        };

        modal.querySelector('#cancelSettings').onclick = () => {
            document.body.removeChild(modal);
        };
    }

    showLargePreview() {
        const modal = document.createElement('div');
        modal.className = 'preview-modal';
        
        const canvas = document.querySelector('#distributionMap canvas');
        if (!canvas) return;

        const largeCanvas = document.createElement('canvas');
        largeCanvas.width = Math.min(window.innerWidth * 0.8, 1200);
        largeCanvas.height = Math.min(window.innerHeight * 0.8, 800);
        
        const ctx = largeCanvas.getContext('2d');
        
        // 设置背景
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, largeCanvas.width, largeCanvas.height);

        // 计算缩放比例
        const scale = Math.min(
            largeCanvas.width / this.image.width,
            largeCanvas.height / this.image.height
        );
        const width = this.image.width * scale;
        const height = this.image.height * scale;
        const x = (largeCanvas.width - width) / 2;
        const y = (largeCanvas.height - height) / 2;

        // 绘制预览图
        ctx.drawImage(canvas, x, y, width, height);

        modal.innerHTML = `
            <div class="preview-content">
                <div class="preview-header">
                    <span>选色示意图</span>
                    <span class="close-preview">×</span>
                </div>
                <div class="preview-body"></div>
            </div>
        `;
        
        modal.querySelector('.preview-body').appendChild(largeCanvas);
        document.body.appendChild(modal);

        modal.querySelector('.close-preview').onclick = () => {
            document.body.removeChild(modal);
        };
    }
}

// 初始化应用
const analyzer = new ImageAnalyzer();
