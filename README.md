# ZJJK视觉占比分析系统使用说明

## 目录
1. [系统简介](#系统简介)
2. [基本操作](#基本操作)
3. [详细功能说明](#详细功能说明)
4. [操作流程](#操作流程)
5. [注意事项](#注意事项)
6. [快捷键说明](#快捷键说明)

## 系统简介
ZJJK视觉占比分析系统是一个用于分析图像中特定颜色占比的工具。您可以通过该系统上传图片，选择特定区域和颜色，系统将自动计算所选颜色在指定区域中的占比。

## 基本操作

### 工具栏按钮说明
- **上传图片**：上传需要分析的图片文件
- **绘制选区**：绘制要分析的区域（红色边框）
- **扣除选区**：绘制要排除的区域（蓝色边框）
- **颜色吸管**：从图片中选取要分析的颜色
- **容差设置**：调整颜色匹配的容差值
- **分析**：开始分析并生成报告

### 界面组成
- **主视图**：显示上传的图片和绘制的选区
- **缩略图**：显示整体图片和当前视图范围
- **选色图例**：显示已选择的颜色列表
- **选色示意图**：显示颜色分布预览

## 详细功��说明

### 1. 图片操作
- **缩放**：使用鼠标滚轮进行缩放
- **平移**：按住鼠标中键拖动或使用鼠标滚轮+右键拖动
- **视图定位**：通过缩略图查看当前视图位置

### 2. 选区绘制
1. 点击"绘制选区"按钮
2. 在图片上点击确定多边形顶点
3. 右键点击完成当前选区绘制
4. 使用退格键（Backspace）可删除最后一个点

### 3. 扣除区域
1. 点击"扣除选区"按钮
2. 在主选区内绘制要排除的区域
3. 操作方式与绘制选区相同

### 4. 颜色选择
1. 点击"颜色吸管"按钮
2. 在图片上点击要分析的颜色
3. 选中的颜色会显示在右侧选色图例中
4. 可以选择多个颜色
5. 点击颜色块右上角的 × 可删除该颜色

### 5. 容差设置
1. 点击"容差设置"按钮
2. 通过滑块调整容差值（1-50）
3. 容差值越大，匹配的颜色范围越广

### 6. 分析功能
1. 完成选区绘制和颜色选择后
2. 点击"分析"按钮
3. 系统将生成分析报告，包含：
   - 选区总像素数
   - 匹配颜色像素数
   - 占比百分比
   - 分布图
   - 选中的颜色列表

### 7. 报告导出
- 在分析报告界面点击"导出PDF"
- PDF报告包含：
  - 基本统计数据
  - 原图及选区标注
  - 颜色分布图
  - 占比饼图

## 操作流程
1. 上传图片
2. 绘制主选区（红色）
3. 绘制扣除区域（蓝色，可选）
4. 使用颜色吸管选择要分析的颜色
5. 调整颜色容差（可选）
6. 点击分析按钮生成报告
7. 导出PDF报告（可选）

## 注意事项
1. 图片上传支持常见图片格式（jpg、png等）
2. 选区至少需要3个点才能形成有效区域
3. 扣除区域必须在主选区内才有效
4. 颜色选择数量不限
5. 容差值会影响颜色匹配的精确度
6. 大图片处理可能需要较长时间

## 快捷键说明
- **退格键（Backspace）**：删除选区最后一个点
- **鼠标右键**：完成当前选区绘制
- **鼠标滚轮**：缩放图片
- **鼠标中键拖动**：平移图片

## 技术支持
如有问题请联系技术支持团队：
- 邮箱：[support@example.com]
- 电话：[400-xxx-xxxx] 