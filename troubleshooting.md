# 智能注册助手 - 故障排除指南

## 常见错误及解决方案

### 1. 插件面板不显示

**可能原因：**
- Tampermonkey未启用
- 网站URL不匹配
- 页面加载未完成

**解决方法：**
```javascript
// 检查Tampermonkey是否启用
// 查看控制台是否有"智能注册助手启动中..."消息

// 手动触发面板创建（在控制台执行）
document.getElementById('smart-register-panel')?.remove();
createControlPanel();
```

### 2. API请求失败

**错误信息：**
- "API请求失败"
- "API响应解析失败"

**解决方法：**
1. 检查临时邮箱服务是否正常运行
2. 确认用户ID是否正确
3. 检查网络连接
4. 查看控制台的详细错误信息

### 3. 表单填充失败

**可能原因：**
- 页面结构变化
- 输入框选择器不匹配
- React/Vue等框架的特殊处理

**调试代码：**
```javascript
// 在控制台执行，查看能否找到输入框
console.log('邮箱输入框:', document.querySelector('input[type="email"]'));
console.log('密码输入框:', document.querySelector('input[type="password"]'));
console.log('所有输入框:', document.querySelectorAll('input'));
```

### 4. 验证码提取失败

**增强验证码提取：**
```javascript
// 手动测试验证码提取（在控制台执行）
function testExtractCode(text) {
    const patterns = [
        /验证码[：:：]\s*(\d{4,6})/,
        /verification code[：:：]\s*(\d{4,6})/i,
        /\b(\d{6})\b/,
        /\b(\d{4})\b/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            console.log('找到验证码:', match[1]);
            return match[1];
        }
    }
    console.log('未找到验证码');
    return null;
}

// 测试
testExtractCode('您的验证码是：123456');
```

### 5. CORS跨域错误

**错误信息：**
- "Cross-Origin Request Blocked"
- "CORS policy"

**解决方法：**
1. 确保使用 `GM_xmlhttpRequest` 而不是普通的 `fetch`
2. 检查 `@connect` 规则是否正确
3. 临时解决：在Tampermonkey设置中启用"允许跨域请求"

### 6. 面板样式异常

**症状：**
- 按钮显示不正常
- 文字重叠
- 位置错误

**快速修复：**
```javascript
// 重置面板样式（在控制台执行）
const panel = document.getElementById('smart-register-panel');
if (panel) {
    panel.style.cssText = `
        position: fixed !important;
        top: 60px !important;
        left: 20px !important;
        z-index: 999999 !important;
        background: white !important;
        padding: 20px !important;
        border-radius: 10px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    `;
}
```

## 高级调试技巧

### 1. 启用详细日志
在脚本开头添加：
```javascript
const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log('[智能注册助手]', ...args);
}
```

### 2. 监控网络请求
```javascript
// 查看所有API请求
const originalXHR = GM_xmlhttpRequest;
GM_xmlhttpRequest = function(details) {
    console.log('API请求:', details.url);
    const originalOnload = details.onload;
    details.onload = function(response) {
        console.log('API响应:', response);
        originalOnload(response);
    };
    return originalXHR(details);
};
```

### 3. 表单变化监听
```javascript
// 监听表单变化
const observer = new MutationObserver((mutations) => {
    console.log('页面发生变化:', mutations);
});
observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
});
```

## 快速测试代码片段

### 测试API连接
```javascript
// 直接测试API（在控制台执行）
fetch('http://159.75.188.43/tempmail/api/health')
    .then(r => r.json())
    .then(data => console.log('API状态:', data))
    .catch(err => console.error('API错误:', err));
```

### 模拟填充
```javascript
// 测试填充功能
function testFill() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach((input, index) => {
        console.log(`输入框${index}:`, input.placeholder || input.name || input.type);
    });
}
testFill();
```

## 联系支持

如果以上方法都无法解决问题：

1. 收集以下信息：
   - 浏览器版本
   - Tampermonkey版本
   - 控制台完整错误信息
   - 网页URL

2. 尝试：
   - 清除浏览器缓存
   - 禁用其他插件
   - 使用隐身模式测试

3. 临时方案：
   - 手动复制生成的信息
   - 分步骤操作而不是一键填充 