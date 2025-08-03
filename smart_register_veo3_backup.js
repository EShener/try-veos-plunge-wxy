// ==UserScript==
// @name         智能注册助手 - 通用版
// @namespace    http://tampermonkey.net/
// @version      5.1
// @description  智能注册助手，支持多网站，集成临时邮箱系统
// @author       AI Assistant
// @match        https://*/*
// @match        http://*/*
// @match        https://*.veo3.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      159.75.188.43
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    function init() {
        console.log('智能注册助手启动中...');
        
        // 配置
        const CONFIG = {
            TEMPMAIL_API: 'http://159.75.188.43/tempmail/api',
            ALLOWED_USER: '', // 将由用户输入
            CHECK_INTERVAL: 2000, // 检查邮件间隔（毫秒）
            MAX_WAIT_TIME: 60000, // 最大等待时间（毫秒）
        };

        // 添加样式
        GM_addStyle(`
            #smart-register-panel {
                position: fixed;
                top: 60px;
                left: 20px;
                z-index: 999999;
                background: white;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 20px;
                width: 300px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
            }
            #smart-register-panel * {
                box-sizing: border-box;
            }
            #smart-register-panel h3 {
                margin: 0 0 15px 0;
                color: #333;
                font-size: 16px;
                font-weight: 600;
            }
            .register-info {
                margin: 8px 0;
                padding: 8px;
                background: #f5f5f5;
                border-radius: 5px;
                font-size: 13px;
            }
            .register-info label {
                font-weight: bold;
                color: #666;
                display: inline-block;
                width: 70px;
                font-size: 12px;
            }
            .register-info span {
                color: #333;
                word-break: break-all;
                font-size: 12px;
            }
            .register-info input {
                width: 100%;
                padding: 6px;
                margin-top: 4px;
                border: 1px solid #ddd;
                border-radius: 3px;
                font-size: 13px;
            }
            .register-button {
                width: 100%;
                padding: 10px;
                margin: 8px 0;
                border: none;
                border-radius: 5px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
            }
            .register-button:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .register-button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            .btn-generate {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .btn-fill {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
            }
            .btn-get-code {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                color: white;
            }
            .status-message {
                padding: 8px;
                margin: 8px 0;
                border-radius: 5px;
                font-size: 12px;
                text-align: center;
            }
            .status-success {
                background: #d4edda;
                color: #155724;
            }
            .status-error {
                background: #f8d7da;
                color: #721c24;
            }
            .status-info {
                background: #d1ecf1;
                color: #0c5460;
            }
            .loading {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid #f3f3f3;
                border-top: 2px solid #3498db;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                vertical-align: middle;
                margin-left: 8px;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .panel-close {
                position: absolute;
                top: 10px;
                right: 10px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                color: #999;
                font-size: 18px;
                line-height: 20px;
                text-align: center;
            }
            .panel-close:hover {
                color: #333;
            }
            .panel-minimize {
                position: absolute;
                top: 10px;
                right: 35px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                color: #999;
                font-size: 18px;
                line-height: 20px;
                text-align: center;
            }
            .panel-minimize:hover {
                color: #333;
            }
            #smart-register-panel.minimized {
                height: auto;
                width: auto;
                padding: 10px 15px;
            }
            #smart-register-panel.minimized .panel-content {
                display: none;
            }
            #smart-register-panel.minimized h3 {
                margin: 0;
                font-size: 14px;
                cursor: pointer;
            }
            .panel-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 15px;
            }
            #smart-register-panel.minimized .panel-header {
                margin-bottom: 0;
            }
        `);

        // 工具函数
        function generateRandomString(length = 8, options = {}) {
            const { useNumbers = true, useUpperCase = true, useLowerCase = true, useSpecial = false } = options;
            let chars = '';
            if (useLowerCase) chars += 'abcdefghijklmnopqrstuvwxyz';
            if (useUpperCase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            if (useNumbers) chars += '0123456789';
            if (useSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
            
            let result = '';
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }

        // API调用函数
        function callAPI(endpoint, method = 'GET', data = null) {
            return new Promise((resolve, reject) => {
                const userId = document.getElementById('user-id-input')?.value?.trim() || CONFIG.ALLOWED_USER;
                
                const requestConfig = {
                    method: method,
                    url: `${CONFIG.TEMPMAIL_API}${endpoint}`,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': userId
                    },
                    onload: function(response) {
                        try {
                            console.log('API响应状态:', response.status);
                            console.log('API响应内容:', response.responseText);
                            
                            // 检查响应状态
                            if (response.status !== 200 && response.status !== 201) {
                                throw new Error(`API返回错误状态: ${response.status}`);
                            }
                            
                            const result = JSON.parse(response.responseText);
                            resolve(result);
                        } catch (e) {
                            console.error('API响应解析失败:', e);
                            console.error('原始响应:', response);
                            reject(new Error('API响应解析失败: ' + e.message));
                        }
                    },
                    onerror: function(error) {
                        console.error('API请求失败:', error);
                        reject(new Error('API请求失败'));
                    }
                };
                
                // 只有在有数据时才添加data字段，避免发送"null"字符串
                if (data) {
                    requestConfig.data = JSON.stringify(data);
                } else if (method === 'POST') {
                    // POST请求需要发送空对象而不是null
                    requestConfig.data = '{}';
                }
                
                GM_xmlhttpRequest(requestConfig);
            });
        }

        // 获取新邮箱
        async function getNewEmail() {
            try {
                // 获取用户ID作为userName
                const userId = document.getElementById('user-id-input')?.value?.trim();
                if (!userId) {
                    throw new Error('请先输入用户ID');
                }
                
                // 准备请求数据
                const requestData = {
                    prefix: '',  // 留空，让服务器自动生成
                    domain: '', // 留空，使用默认域名
                    clientPrefix: userId, // 使用用户ID作为客户端前缀
                    userName: userId // 使用用户ID作为用户名
                };
                
                console.log('发送邮箱生成请求:', requestData);
                
                const result = await callAPI('/email/generate', 'POST', requestData);
                
                // API返回的邮箱在data对象中
                if (result.success && result.data && result.data.email) {
                    console.log('邮箱生成成功:', result.data.email);
                    return result.data.email;
                }
                // 兼容旧格式
                else if (result.success && result.email) {
                    return result.email;
                }
                
                throw new Error(result.message || result.error || '获取邮箱失败');
            } catch (error) {
                console.error('获取邮箱失败:', error);
                throw error;
            }
        }

        // 获取邮件列表
        async function getEmails(email) {
            try {
                const result = await callAPI(`/emails/${email}`);
                
                // 兼容两种API返回格式
                let emails = [];
                if (result.success) {
                    emails = result.emails || result.data || [];
                }
                
                if (emails.length > 0) {
                    console.log(`[${new Date().toLocaleTimeString()}] 获取到 ${emails.length} 封邮件`);
                    
                    // 打印每封邮件的基本信息
                    emails.forEach((mail, index) => {
                        console.log(`邮件${index + 1}: 主题="${mail.subject || '无主题'}", 发件人="${mail.from || '未知'}", 时间="${mail.timestamp || mail.createdAt || '未知'}"`);
                    });
                }
                
                return emails;
            } catch (error) {
                console.error('获取邮件失败:', error);
                return [];
            }
        }

        // 提取验证码 - 增强版
        function extractVerificationCode(emailContent) {
            console.log('开始提取验证码，内容长度:', emailContent.length);
            
            // 常见验证码模式（中英文）
            const patterns = [
                // 中文模式
                /验证码[：:：\s]*(\d{4,6})/,
                /您的验证码是[：:：\s]*(\d{4,6})/,
                /动态验证码[：:：\s]*(\d{4,6})/,
                /校验码[：:：\s]*(\d{4,6})/,
                
                // 英文模式
                /verification code[：:：\s]*(\d{4,6})/i,
                /your code is[：:：\s]*(\d{4,6})/i,
                /code[：:：\s]*(\d{4,6})/i,
                /OTP[：:：\s]*(\d{4,6})/i,
                /PIN[：:：\s]*(\d{4,6})/i,
                
                // 更宽松的模式
                /code\s*is\s*(\d{4,6})/i,
                /is[：:：\s]*(\d{4,6})/i,
                /为[：:：\s]*(\d{4,6})/,
                
                // 独立数字（作为最后手段）
                /\b(\d{6})\b/, // 独立的6位数字
                /\b(\d{4})\b/   // 独立的4位数字
            ];
            
            // 尝试每个模式
            for (const pattern of patterns) {
                const match = emailContent.match(pattern);
                if (match) {
                    console.log('匹配成功，使用模式:', pattern);
                    console.log('提取到的验证码:', match[1]);
                    return match[1];
                }
            }
            
            // 如果没找到，尝试查找所有4-6位数字
            const allNumbers = emailContent.match(/\d{4,6}/g);
            if (allNumbers && allNumbers.length > 0) {
                console.log('使用备用方案，找到的所有数字:', allNumbers);
                // 优先返回6位数字
                const sixDigits = allNumbers.filter(n => n.length === 6);
                if (sixDigits.length > 0) {
                    console.log('返回6位数字:', sixDigits[0]);
                    return sixDigits[0];
                }
                // 否则返回第一个数字
                console.log('返回第一个数字:', allNumbers[0]);
                return allNumbers[0];
            }
            
            console.log('未能提取验证码');
            return null;
        }

        // 等待验证码邮件
        async function waitForVerificationCode(email, maxWaitTime = CONFIG.MAX_WAIT_TIME) {
            const startTime = Date.now();
            let lastEmailCount = 0;
            
            while (Date.now() - startTime < maxWaitTime) {
                const emails = await getEmails(email);
                
                if (emails.length > lastEmailCount) {
                    // 有新邮件
                    const newEmails = emails.slice(lastEmailCount);
                    for (const emailItem of newEmails) {
                        // 跳过欢迎邮件
                        if (emailItem.subject && emailItem.subject.includes('欢迎使用临时邮箱')) {
                            console.log('跳过欢迎邮件');
                            continue;
                        }
                        
                        // 打印邮件详情以便调试
                        console.log('=== 收到新邮件 ===');
                        console.log('主题:', emailItem.subject || '无主题');
                        console.log('发件人:', emailItem.from || '未知');
                        
                        // 处理内容（可能是字符串或数组）
                        let content = emailItem.content || emailItem.textContent || '';
                        if (Array.isArray(content)) {
                            content = content.join(' ');
                        }
                        
                        console.log('内容长度:', content.length);
                        console.log('完整内容:', content);
                        console.log('=================');
                        
                        // 尝试从邮件主题和内容中提取验证码
                        const code = extractVerificationCode(content) || 
                                   extractVerificationCode(emailItem.subject || '');
                        if (code) {
                            console.log('成功提取验证码:', code);
                            return code;
                        } else {
                            console.log('未能从此邮件提取验证码');
                        }
                    }
                    lastEmailCount = emails.length;
                }
                
                await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
            }
            
            throw new Error('等待验证码超时');
        }

        // 查找表单元素 - 针对Veo3优化
        function findFormElements() {
            // 查找所有可见的输入框
            const inputs = Array.from(document.querySelectorAll('input')).filter(input => {
                const rect = input.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && window.getComputedStyle(input).display !== 'none';
            });
            
            console.log(`找到 ${inputs.length} 个可见输入框`);
            
            const elements = {};
            
            // 根据placeholder和类型识别输入框
            inputs.forEach((input, index) => {
                const placeholder = input.placeholder || '';
                const type = input.type || 'text';
                const name = input.name || '';
                
                console.log(`输入框${index}: placeholder="${placeholder}", type="${type}", name="${name}"`);
                
                // 邮箱输入框
                if (placeholder.includes('邮箱') || placeholder.includes('邮件') || 
                    type === 'email' || name.includes('email')) {
                    elements.email = input;
                    console.log('识别为邮箱输入框');
                }
                // 验证码输入框
                else if (placeholder.includes('验证码') || placeholder.includes('验证') || 
                         name.includes('code') || name.includes('captcha')) {
                    elements.verificationCode = input;
                    console.log('识别为验证码输入框');
                }
                // 用户名输入框
                else if (placeholder.includes('用户名') || placeholder.includes('用户ID') || 
                         placeholder.includes('用户') || name.includes('username')) {
                    elements.userId = input;
                    console.log('识别为用户名输入框');
                }
                // 密码输入框
                else if (type === 'password') {
                    if (placeholder.includes('确认') || placeholder.includes('再次') || 
                        name.includes('confirm') || name.includes('password2')) {
                        elements.confirmPassword = input;
                        console.log('识别为确认密码输入框');
                    } else {
                        elements.password = input;
                        console.log('识别为密码输入框');
                    }
                }
            });
            
            console.log('识别结果:', Object.keys(elements));
            return elements;
        }

        // 填充表单 - 增强版
        function fillForm(element, value) {
            if (!element || !value) return false;
            
            try {
                // 聚焦元素
                element.focus();
                element.click();
                
                // 延迟执行填充，确保输入框准备就绪
                setTimeout(() => {
                    // 清空原有内容
                    element.value = '';
                    
                    // 对于React等框架的特殊处理
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    nativeInputValueSetter.call(element, value);
                    
                    // 触发各种事件确保更新
                    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
                    element.dispatchEvent(inputEvent);
                    
                    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    element.dispatchEvent(changeEvent);
                    
                    // 再次设置值，确保填充成功
                    element.value = value;
                    
                    // 触发键盘事件
                    const keyupEvent = new KeyboardEvent('keyup', { bubbles: true });
                    element.dispatchEvent(keyupEvent);
                    
                    console.log(`成功填充 [${element.placeholder || element.name}]: ${value}`);
                }, 100);
                
                return true;
            } catch (error) {
                console.error('填充失败:', error);
                return false;
            }
        }

        // 创建控制面板
        function createControlPanel() {
            // 检查是否已存在
            if (document.getElementById('smart-register-panel')) {
                return;
            }
            
            const panel = document.createElement('div');
            panel.id = 'smart-register-panel';
            panel.innerHTML = `
                <span class="panel-close" title="关闭">×</span>
                <span class="panel-minimize" title="最小化">—</span>
                <div class="panel-header">
                    <h3>🤖 智能注册助手</h3>
                </div>
                <div class="panel-content">
                    <div id="status-message"></div>
                    <div class="register-info" style="background: #fff3cd; border: 1px solid #ffeaa7;">
                        <label>用户ID:</label>
                        <input type="text" id="user-id-input" placeholder="请输入有效用户ID" value="">
                    </div>
                    <div class="register-info">
                        <label>邮箱:</label>
                        <span id="email-display">未生成</span>
                    </div>
                    <div class="register-info">
                        <label>用户名:</label>
                        <span id="username-display">未生成</span>
                    </div>
                    <div class="register-info">
                        <label>密码:</label>
                        <span id="password-display">未生成</span>
                    </div>
                    <div class="register-info">
                        <label>验证码:</label>
                        <span id="code-display">未获取</span>
                    </div>
                    <button class="register-button btn-generate" id="btn-generate">生成注册信息</button>
                    <button class="register-button btn-fill" id="btn-fill" style="display:none;">一键填充表单</button>
                </div>
            `;
            document.body.appendChild(panel);

            // 关闭按钮
            panel.querySelector('.panel-close').addEventListener('click', () => {
                panel.remove();
            });
            
            // 最小化/展开功能
            let isMinimized = false;
            const minimizeBtn = panel.querySelector('.panel-minimize');
            const panelHeader = panel.querySelector('.panel-header h3');
            
            function toggleMinimize() {
                isMinimized = !isMinimized;
                if (isMinimized) {
                    panel.classList.add('minimized');
                    minimizeBtn.textContent = '+';
                    minimizeBtn.title = '展开';
                } else {
                    panel.classList.remove('minimized');
                    minimizeBtn.textContent = '—';
                    minimizeBtn.title = '最小化';
                }
            }
            
            minimizeBtn.addEventListener('click', toggleMinimize);
            
            // 点击标题也可以展开/收起
            panelHeader.addEventListener('click', (e) => {
                if (panel.classList.contains('minimized')) {
                    toggleMinimize();
                }
            });
            
            // 自动最小化函数
            function autoMinimize() {
                if (!isMinimized) {
                    toggleMinimize();
                }
            }

            // 注册信息对象
            let registerInfo = {
                email: '',
                username: '',
                password: '',
                verificationCode: ''
            };

            // 状态显示
            function showStatus(message, type = 'info') {
                const statusDiv = document.getElementById('status-message');
                statusDiv.className = `status-message status-${type}`;
                statusDiv.innerHTML = message;
            }

            // 生成注册信息
            document.getElementById('btn-generate').addEventListener('click', async function() {
                // 检查用户ID
                const userId = document.getElementById('user-id-input').value.trim();
                if (!userId) {
                    showStatus('请先输入有效用户ID', 'error');
                    return;
                }
                
                this.disabled = true;
                showStatus('正在生成注册信息... <span class="loading"></span>', 'info');
                
                try {
                    // 生成邮箱
                    registerInfo.email = await getNewEmail();
                    document.getElementById('email-display').textContent = registerInfo.email;
                    
                    // 生成用户名和密码
                    registerInfo.username = generateRandomString(8, { useSpecial: false });
                    registerInfo.password = generateRandomString(12, { useSpecial: true });
                    
                    document.getElementById('username-display').textContent = registerInfo.username;
                    document.getElementById('password-display').textContent = registerInfo.password;
                    
                    showStatus('注册信息生成成功！', 'success');
                    document.getElementById('btn-fill').style.display = 'block';
                } catch (error) {
                    showStatus('生成失败: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });

            // 自动监测发送验证码按钮
            function findSendCodeButton() {
                // 查找所有可能的按钮元素
                const buttons = Array.from(document.querySelectorAll('button, [role="button"], .btn, input[type="button"], a[href="#"], div[onclick], span[onclick]'));
                
                // 关键词匹配
                const keywords = ['发送', '获取', 'send', 'get'];
                const codeWords = ['验证码', '验证', 'code', 'verification', '邮件'];
                
                for (const btn of buttons) {
                    const text = (btn.textContent || btn.innerText || btn.value || '').toLowerCase();
                    
                    // 检查是否包含关键词
                    const hasKeyword = keywords.some(keyword => text.includes(keyword.toLowerCase()));
                    const hasCodeWord = codeWords.some(word => text.includes(word.toLowerCase()));
                    
                    if (hasKeyword && hasCodeWord) {
                        // 检查按钮是否可见且可点击
                        const rect = btn.getBoundingClientRect();
                        const isVisible = rect.width > 0 && rect.height > 0 && 
                                        window.getComputedStyle(btn).display !== 'none' &&
                                        window.getComputedStyle(btn).visibility !== 'hidden';
                        
                        if (isVisible && !btn.disabled) {
                            console.log('找到发送验证码按钮:', text.trim());
                            return btn;
                        }
                    }
                }
                
                console.log('未找到发送验证码按钮');
                return null;
            }
            
            // 自动获取验证码流程
            async function autoGetVerificationCode(email) {
                try {
                    // 查找并点击发送验证码按钮
                    const sendBtn = findSendCodeButton();
                    if (sendBtn) {
                        console.log('自动点击发送验证码按钮');
                        sendBtn.click();
                        
                        // 等待邮件发送
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                    
                    // 开始监听邮件
                    showStatus('正在等待验证码邮件... <span class="loading"></span>', 'info');
                    const code = await waitForVerificationCode(email);
                    
                    if (code) {
                        registerInfo.verificationCode = code;
                        document.getElementById('code-display').textContent = code;
                        showStatus('验证码获取成功！', 'success');
                        return code;
                    }
                } catch (error) {
                    console.error('自动获取验证码失败:', error);
                    throw error;
                }
            }

            // 一键填充表单（按照网站流程）
            document.getElementById('btn-fill').addEventListener('click', async function() {
                if (!registerInfo.email || !registerInfo.password) {
                    showStatus('请先生成注册信息', 'error');
                    return;
                }
                
                this.disabled = true;
                
                try {
                    const elements = findFormElements();
                    
                    // 步骤1: 先填充邮箱
                    showStatus('步骤1: 填充邮箱... <span class="loading"></span>', 'info');
                    if (elements.email && registerInfo.email) {
                        fillForm(elements.email, registerInfo.email);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // 步骤2: 查找并点击获取验证码按钮
                        showStatus('步骤2: 点击获取验证码按钮... <span class="loading"></span>', 'info');
                        const sendBtn = findSendCodeButton();
                        if (sendBtn) {
                            console.log('找到发送验证码按钮，自动点击');
                            sendBtn.click();
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            
                            // 步骤3: 等待并获取验证码
                            showStatus('步骤3: 等待验证码邮件（可能需要5-30秒）... <span class="loading"></span>', 'info');
                            try {
                                const code = await waitForVerificationCode(registerInfo.email);
                                if (code) {
                                    registerInfo.verificationCode = code;
                                    document.getElementById('code-display').textContent = code;
                                    console.log('成功获取验证码:', code);
                                    
                                    // 步骤4: 填充所有表单字段
                                    showStatus('步骤4: 填充所有表单字段... <span class="loading"></span>', 'info');
                                    await fillAllFormFields(elements, registerInfo);
                                    
                                    showStatus('✅ 表单填充完成！请检查并提交', 'success');
                                    // 3秒后自动最小化
                                    setTimeout(() => {
                                        autoMinimize();
                                    }, 3000);
                                } else {
                                    throw new Error('未能获取到验证码');
                                }
                            } catch (error) {
                                showStatus('❌ 验证码获取失败，请手动操作: ' + error.message, 'error');
                                // 即使验证码失败，也填充其他字段
                                await fillAllFormFields(elements, registerInfo);
                            }
                        } else {
                            showStatus('❌ 未找到获取验证码按钮，请手动点击', 'error');
                            // 继续填充其他字段
                            await fillAllFormFields(elements, registerInfo);
                        }
                    } else {
                        showStatus('❌ 未找到邮箱输入框', 'error');
                    }
                } catch (error) {
                    showStatus('❌ 操作失败: ' + error.message, 'error');
                } finally {
                    this.disabled = false;
                }
            });
            
            // 填充所有表单字段的辅助函数
            async function fillAllFormFields(elements, info) {
                let filledCount = 0;
                
                // 填充用户名
                if (elements.userId && info.username) {
                    fillForm(elements.userId, info.username);
                    filledCount++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // 填充验证码（如果有）
                if (elements.verificationCode && info.verificationCode) {
                    fillForm(elements.verificationCode, info.verificationCode);
                    filledCount++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // 填充密码
                if (elements.password && info.password) {
                    fillForm(elements.password, info.password);
                    filledCount++;
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
                
                // 填充确认密码
                if (elements.confirmPassword && info.password) {
                    fillForm(elements.confirmPassword, info.password);
                    filledCount++;
                }
                
                console.log(`填充了 ${filledCount} 个字段`);
                return filledCount;
            }
        }

        // 延迟创建面板，确保页面加载完成
        setTimeout(() => {
            createControlPanel();
            console.log('智能注册助手已加载');
        }, 2000);
    }

})(); 