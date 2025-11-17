// script.js

// --- 1. 设置画布和上下文 ---
const canvas = document.getElementById('tentacleCanvas');
const ctx = canvas.getContext('2d');

// 设置画布为全屏
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- 2. 鼠标跟踪 ---
const mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

// 监听鼠标移动事件，更新目标位置
window.addEventListener('mousemove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});

// 监听窗口大小变化
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // 可以在这里重新初始化触手，如果需要的话
});

// --- 3. 触手分段 (Segment) 类 ---
class Segment {
    constructor(x, y, length, color, width) {
        // 分段的“末端”位置
        this.x = x;
        this.y = y;
        this.length = length; // 分段的长度
        this.color = color;
        this.width = width;
    }

    /**
     * 跟随目标点 (tx, ty)
     * 这个方法是 IK 的核心：计算分段应该在哪里，
     * 才能使其“末端”保持在距离目标点 this.length 的地方。
     */
    follow(tx, ty) {
        // 1. 计算从当前位置到目标的向量
        const dx = tx - this.x;
        const dy = ty - this.y;
        
        // 2. 计算角度
        const angle = Math.atan2(dy, dx);

        // 3. 计算新的 x 和 y (从目标点反推)
        // 我们希望分段的“头部”(this.x, this.y) 在目标 (tx, ty) 的反方向上，
        // 距离为 this.length。
        this.x = tx - Math.cos(angle) * this.length;
        this.y = ty - Math.sin(angle) * this.length;
    }

    /**
     * 绘制分段
     * @param {CanvasRenderingContext2D} context - 画布上下文
     * @param {object} nextSegment - 链中的下一个分段（朝向尖端）
     */
    draw(context, nextSegment) {
        context.beginPath();
        context.moveTo(this.x, this.y); // 分段的“根部”
        context.lineTo(nextSegment.x, nextSegment.y); // 分段的“末端”
        context.strokeStyle = this.color;
        context.lineWidth = this.width;
        context.lineCap = 'round'; // 圆形末端，使连接更平滑
        context.stroke();
    }
}

// --- 4. 创建触手 ---
const tentacle = [];
const numSegments = 30; // 触手的分段数
const segmentLength = 20; // 每段的长度
const baseWidth = 25; // 触手根部的宽度

// 触手的“根部”或“基座”
const base = {
    x: canvas.width / 2,
    y: canvas.height, // 固定在屏幕底部中央
};

// 初始化所有分段
for (let i = 0; i < numSegments; i++) {
    // 动态计算颜色和宽度，营造渐变效果
    const lightness = 100 - (i / numSegments) * 50; // 从亮 (100) 到暗 (50)
    const color = `hsl(180, 100%, ${lightness}%)`; // 青色渐变
    const width = (1 - i / numSegments) * baseWidth + 1; // 从宽到窄

    tentacle.push(
        new Segment(
            base.x, 
            base.y - (i * segmentLength), // 初始时垂直向上
            segmentLength, 
            color,
            width
        )
    );
}

// --- 5. 动画循环 ---
function animate() {
    // 1. 清除画布
    // 使用带透明度的 fillRect 来创建“拖尾”效果
    ctx.fillStyle = 'rgba(17, 17, 17, 0.25)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. 更新触手（IK 计算）
    let targetX = mouse.x;
    let targetY = mouse.y;

    // 循环更新每一个分段
    // 第一个分段（尖端）跟随鼠标
    const tip = tentacle[0];
    tip.follow(targetX, targetY);

    // 其他分段跟随它前面的那个分段
    for (let i = 1; i < numSegments; i++) {
        const segment = tentacle[i];
        segment.follow(tentacle[i - 1].x, tentacle[i - 1].y);
    }

    // 3. 将“根部”固定回基座位置
    // 因为上面的跟随计算会移动整个链条，我们必须把链条的最后一个分段（根部）
    // 重新“钉”在基座上。
    
    // 我们需要更新基座位置（以防窗口大小改变）
    base.x = canvas.width / 2;
    base.y = canvas.height;
    
    const root = tentacle[numSegments - 1];
    root.x = base.x;
    root.y = base.y;

    // 4. 第二遍更新：从“根部”向“尖端”传播约束
    // 这一步确保了即使根部被移动，其他分段也会被正确地“拉”回来。
    for (let i = numSegments - 2; i >= 0; i--) {
        const segment = tentacle[i];
        segment.follow(tentacle[i + 1].x, tentacle[i + 1].y);
    }
    
    // 5. 绘制触手
    // 我们从根部开始画
    for (let i = numSegments - 2; i >= 0; i--) {
        tentacle[i].draw(ctx, tentacle[i + 1]);
    }
    // 单独绘制尖端（因为它没有 "nextSegment"）
    // (在我们的 draw 逻辑中，我们总是画 segment 到 nextSegment，所以第一个循环就够了)
    
    // 请求下一帧
    requestAnimationFrame(animate);
}

// 开始动画！
animate();
