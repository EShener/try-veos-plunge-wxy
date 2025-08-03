// 调试辅助脚本 - 在控制台运行以下代码帮助调试

// 1. 查看所有输入框
function debugInputs() {
    console.log('=== 查找所有输入框 ===');
    const inputs = document.querySelectorAll('input');
    inputs.forEach((input, index) => {
        console.log(`输入框${index}:`, {
            type: input.type,
            placeholder: input.placeholder,
            name: input.name,
            id: input.id,
            visible: input.offsetWidth > 0 && input.offsetHeight > 0
        });
    });
}

// 2. 查找验证码按钮
function debugFindCodeButton() {
    console.log('=== 查找验证码按钮 ===');
    const allButtons = document.querySelectorAll('button, [role="button"], .btn, input[type="button"], a, div[onclick], span[onclick]');
    const possibleButtons = [];
    
    allButtons.forEach((btn, index) => {
        const text = (btn.textContent || btn.innerText || btn.value || '').trim();
        if (text) {
            const info = {
                index: index,
                text: text,
                tagName: btn.tagName,
                className: btn.className,
                visible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
                disabled: btn.disabled
            };
            
            // 检查是否可能是验证码按钮
            if (text.match(/验证|code|发送|获取|send|get/i)) {
                info.isPossibleCodeButton = true;
                possibleButtons.push(info);
            }
            
            console.log(`按钮${index}:`, info);
        }
    });
    
    console.log('可能的验证码按钮:', possibleButtons);
}

// 3. 模拟填充邮箱
function debugFillEmail(email) {
    console.log('=== 模拟填充邮箱 ===');
    const emailInputs = document.querySelectorAll('input[type="email"], input[placeholder*="邮箱"], input[name*="email"]');
    emailInputs.forEach((input, index) => {
        console.log(`尝试填充邮箱输入框${index}`);
        input.focus();
        input.value = email;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('填充结果:', input.value);
    });
}

// 4. 手动点击验证码按钮
function debugClickCodeButton() {
    console.log('=== 尝试点击验证码按钮 ===');
    // 尝试多种选择器
    const selectors = [
        'button:contains("验证码")',
        'button:contains("获取")',
        'button:contains("发送")',
        '[onclick*="code"]',
        '[onclick*="send"]'
    ];
    
    let found = false;
    
    // 使用文本内容查找
    const buttons = document.querySelectorAll('button, [role="button"], .btn');
    for (const btn of buttons) {
        const text = (btn.textContent || btn.innerText || '').toLowerCase();
        if ((text.includes('验证') || text.includes('code')) && 
            (text.includes('获取') || text.includes('发送'))) {
            console.log('找到按钮:', text);
            console.log('点击按钮...');
            btn.click();
            found = true;
            break;
        }
    }
    
    if (!found) {
        console.log('未找到验证码按钮，请手动指定');
    }
}

// 5. 监听页面变化
function debugWatchChanges() {
    console.log('=== 开始监听页面变化 ===');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.tagName) { // Element node
                        console.log('新增元素:', node.tagName, node.className || node.id || '');
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('监听已启动，页面变化将被记录');
    return observer;
}

// 使用说明
console.log(`
🔧 调试辅助工具已加载！

使用方法：
1. debugInputs()         - 查看所有输入框
2. debugFindCodeButton() - 查找验证码按钮
3. debugFillEmail('test@email.com') - 测试填充邮箱
4. debugClickCodeButton() - 尝试点击验证码按钮
5. debugWatchChanges()   - 监听页面变化

提示：先运行 debugInputs() 和 debugFindCodeButton() 了解页面结构
`); 