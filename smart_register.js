// ==UserScript==
// @name         智能注册助手 - 集成临时邮箱系统
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  自动获取临时邮箱、提取验证码、生成随机信息并填充注册表单
// @author       AI Assistant
// @match        https://tryveo3.ai/zh-CN*
// @match        http://localhost/*
// @match        https://*/*register*
// @match        https://*/*signup*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      159.75.188.43
// ==/UserScript==

(function() {
    'use strict';

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
            top: 20px;
            left: 20px;
            z-index: 99999;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            padding: 20px;
            width: 320px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        #smart-register-panel h3 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 18px;
        }
        .register-info {
            margin: 10px 0;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 5px;
            font-size: 14px;
        }
        .register-info label {
            font-weight: bold;
            color: #666;
            display: inline-block;
            width: 80px;
        }
        .register-info span {
            color: #333;
            word-break: break-all;
        }
        .register-button {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        .register-button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
            margin: 10px 0;
            border-radius: 5px;
            font-size: 13px;
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
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            vertical-align: middle;
            margin-left: 10px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
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
            GM_xmlhttpRequest({
                method: method,
                url: `${CONFIG.TEMPMAIL_API}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': CONFIG.ALLOWED_USER || document.getElementById('user-id-input')?.value || ''
                },
                data: data ? JSON.stringify(data) : null,
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        resolve(result);
                    } catch (e) {
                        reject(new Error('API响应解析失败'));
                    }
                },
                onerror: function() {
                    reject(new Error('API请求失败'));
                }
            });
        });
    }

    // 获取新邮箱
    async function getNewEmail() {
        try {
            const result = await callAPI('/email/generate', 'POST');
            if (result.success && result.email) {
                return result.email;
            }
            throw new Error(result.message || '获取邮箱失败');
        } catch (error) {
            console.error('获取邮箱失败:', error);
            throw error;
        }
    }

    // 获取邮件列表
    async function getEmails(email) {
        try {
            const result = await callAPI(`/emails/${email}`);
            if (result.success) {
                return result.emails || [];
            }
            return [];
        } catch (error) {
            console.error('获取邮件失败:', error);
            return [];
        }
    }

    // 提取验证码
    function extractVerificationCode(emailContent) {
        // 常见验证码模式
        const patterns = [
            /验证码[：:]\s*(\d{4,6})/,
            /verification code[：:]\s*(\d{4,6})/i,
            /code[：:]\s*(\d{4,6})/i,
            /您的验证码是[：:]\s*(\d{4,6})/,
            /\b(\d{4,6})\b/  // 匹配独立的4-6位数字
        ];
        
        for (const pattern of patterns) {
            const match = emailContent.match(pattern);
            if (match) {
                return match[1];
            }
        }
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
                for (const email of newEmails) {
                    const code = extractVerificationCode(email.content || email.subject);
                    if (code) {
                        return code;
                    }
                }
                lastEmailCount = emails.length;
            }
            
            await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        }
        
        throw new Error('等待验证码超时');
    }

    // 填充表单
    function fillForm(selector, value) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (element) {
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        });
        return elements.length > 0;
    }

    // 创建控制面板
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'smart-register-panel';
        panel.innerHTML = `
            <h3>🤖 智能注册助手</h3>
            <div id="status-message"></div>
            <div class="register-info" style="background: #fff3cd; border: 1px solid #ffeaa7;">
                <label>用户ID:</label>
                <input type="text" id="user-id-input" placeholder="请输入有效用户ID" style="width: 200px; padding: 5px; border: 1px solid #ddd; border-radius: 3px;">
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
            <button class="register-button btn-get-code" id="btn-get-code" style="display:none;">获取验证码</button>
            <button class="register-button btn-fill" id="btn-fill" style="display:none;">填充到表单</button>
        `;
        document.body.appendChild(panel);

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
                document.getElementById('btn-get-code').style.display = 'block';
                document.getElementById('btn-fill').style.display = 'block';
            } catch (error) {
                showStatus('生成失败: ' + error.message, 'error');
            } finally {
                this.disabled = false;
            }
        });

        // 获取验证码
        document.getElementById('btn-get-code').addEventListener('click', async function() {
            if (!registerInfo.email) {
                showStatus('请先生成注册信息', 'error');
                return;
            }
            
            this.disabled = true;
            showStatus('等待验证码邮件... <span class="loading"></span>', 'info');
            
            try {
                // 先填充邮箱到表单（触发发送验证码）
                const filled = fillForm('input[type="email"], input[placeholder*="邮箱"], input[name*="email"]', registerInfo.email);
                if (!filled) {
                    showStatus('请先在页面上触发发送验证码', 'error');
                    return;
                }
                
                // 等待验证码
                registerInfo.verificationCode = await waitForVerificationCode(registerInfo.email);
                document.getElementById('code-display').textContent = registerInfo.verificationCode;
                showStatus('验证码获取成功！', 'success');
            } catch (error) {
                showStatus('获取验证码失败: ' + error.message, 'error');
            } finally {
                this.disabled = false;
            }
        });

        // 填充表单
        document.getElementById('btn-fill').addEventListener('click', function() {
            if (!registerInfo.email || !registerInfo.username || !registerInfo.password) {
                showStatus('请先生成注册信息', 'error');
                return;
            }
            
            let filledCount = 0;
            
            // 填充邮箱
            if (fillForm('input[type="email"], input[placeholder*="邮箱"], input[name*="email"]', registerInfo.email)) {
                filledCount++;
            }
            
            // 填充用户名
            if (fillForm('input[placeholder*="用户名"], input[name*="username"], input[name*="user"]', registerInfo.username)) {
                filledCount++;
            }
            
            // 填充密码
            if (fillForm('input[type="password"]:not([placeholder*="确认"]), input[placeholder*="密码"]:not([placeholder*="确认"]), input[name*="password"]:not([name*="confirm"])', registerInfo.password)) {
                filledCount++;
            }
            
            // 填充确认密码
            if (fillForm('input[placeholder*="确认密码"], input[name*="confirm"], input[name*="password2"]', registerInfo.password)) {
                filledCount++;
            }
            
            // 填充验证码
            if (registerInfo.verificationCode) {
                if (fillForm('input[placeholder*="验证码"], input[name*="code"], input[name*="captcha"]', registerInfo.verificationCode)) {
                    filledCount++;
                }
            }
            
            showStatus(`成功填充 ${filledCount} 个字段`, 'success');
        });
    }

    // 初始化
    window.addEventListener('load', () => {
        setTimeout(createControlPanel, 1000);
    });

})(); 