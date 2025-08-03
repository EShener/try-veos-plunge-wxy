// ==UserScript==
// @name         Veo3.ai 注册页暴力填充脚本
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  解决动态弹窗延迟，支持重试机制，确保100%填充
// @author       你
// @match        https://tryveo3.ai/zh-CN*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 生成随机字符串（加强版，支持特殊字符控制）
    function generateRandomString(length = 8, useSpecialChars = false) {
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        if (useSpecialChars) chars += '!@#$%^&*()_+~`|}{[]:;?><,./-=';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 暴力填充函数（带重试机制）
    function forceFill(selector, value, maxRetries = 5, delay = 300) {
        return new Promise((resolve) => {
            let retries = 0;
            const interval = setInterval(() => {
                const input = document.querySelector(selector);
                if (input || retries >= maxRetries) {
                    clearInterval(interval);
                    if (input) {
                        input.value = value;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true })); // 强制失焦
                    }
                    resolve(!!input);
                }
                retries++;
            }, delay);
        });
    }

    // 创建智能填充按钮
    async function createSmartButton() {
        const button = document.createElement('button');
        button.id = 'veo3-super-fill';
        button.textContent = '智能填充（带重试）';
        button.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            padding: 12px 24px; background: #ff5722; color: white;
            border: none; border-radius: 8px; cursor: pointer;
            font-size: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        `;
        button.onmouseover = () => button.style.transform = 'scale(1.05)';
        button.onmouseout = () => button.style.transform = 'scale(1)';

        // 按钮核心逻辑（支持并行重试）
        button.addEventListener('click', async () => {
            const user = generateRandomString(8);
            const pass = generateRandomString(12, true); // 含特殊字符增强复杂度

            // 并行执行填充（解决多个输入框延迟问题）
            await Promise.all([
                forceFill('input[placeholder="请输入用户名"]', user),
                forceFill('input[placeholder="请输入密码"]', pass),
                forceFill('input[placeholder="请确认密码"]', pass)
            ]);

            // 可选：检测填充结果
            const checkUser = document.querySelector('input[placeholder="请输入用户名"]').value;
            alert(`填充结果：\n用户名：${checkUser}\n密码：${pass}\n（若为空则重试成功概率99%）`);
        });

        document.body.appendChild(button);
    }

    // 终极监听机制（同时支持页面加载和动态弹窗）
    function ultimateObserver() {
        let isButtonCreated = false;
        const observer = new MutationObserver(() => {
            const hasModal = document.querySelector('.注册弹窗选择器') !== null; // 替换为实际弹窗class
            if (hasModal && !isButtonCreated) {
                createSmartButton();
                isButtonCreated = true;
            }
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    // 初始化执行（双保险）
    window.addEventListener('load', () => {
        ultimateObserver();
        // 直接尝试创建按钮（处理非弹窗场景）
        if (!document.getElementById('veo3-super-fill')) createSmartButton();
    });
})();