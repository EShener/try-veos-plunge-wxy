// ==UserScript==
// @name         椰椰表单填充助手
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  自动填充Google Form问卷的辅助工具
// @author       AI Assistant
// @match        *://docs.google.com/forms/*
// @match        https://docs.google.com/forms/d/e/*
// @match        https://docs.google.com/forms/u/0/d/e/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 确保在页面加载完成后执行
    function initializeScript() {
        console.log('初始化表单填充助手...');

        // 等待页面完全加载
        function waitForElement(selector, timeout = 5000) {
            return new Promise((resolve, reject) => {
                if (document.querySelector(selector)) {
                    return resolve(document.querySelector(selector));
                }

                const observer = new MutationObserver(() => {
                    if (document.querySelector(selector)) {
                        observer.disconnect();
                        resolve(document.querySelector(selector));
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });

                setTimeout(() => {
                    observer.disconnect();
                    reject('Timeout waiting for element');
                }, timeout);
            });
        }

        // 添加样式
        const styleText = `
            .auto-fill-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 99999;
                max-width: 300px;
                font-family: Arial, sans-serif;
            }
            .auto-fill-panel h3 {
                margin: 0 0 10px 0;
                color: #1a73e8;
            }
            .auto-fill-panel button {
                background: #1a73e8;
                color: white;
                border: none;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin: 5px;
                transition: background 0.3s;
            }
            .auto-fill-panel button:hover {
                background: #1557b0;
            }
            .auto-fill-panel .preset-group {
                margin: 10px 0;
                padding: 10px;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
            }
            .auto-fill-panel .preset-group label {
                display: block;
                margin: 5px 0;
            }
            .auto-fill-panel .minimize-btn {
                position: absolute;
                top: 5px;
                right: 5px;
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 5px;
                font-size: 18px;
            }
            .auto-fill-panel.minimized {
                width: 40px;
                height: 40px;
                overflow: hidden;
                padding: 0;
            }
            .auto-fill-panel.minimized .minimize-btn {
                width: 100%;
                height: 100%;
                position: static;
                background: #1a73e8;
                color: white;
            }
        `;

        // 添加样式到页面
        const style = document.createElement('style');
        style.textContent = styleText;
        document.head.appendChild(style);

        // 创建控制面板
        const panel = document.createElement('div');
        panel.className = 'auto-fill-panel';
        panel.innerHTML = `
            <button class="minimize-btn" title="最小化/展开">⚡</button>
            <h3>表单自动填充</h3>
            <div class="preset-group">
                <h4>选择预设答案：</h4>
                <label>
                    <input type="radio" name="preset" value="preset1"> 预设方案1
                </label>
                <label>
                    <input type="radio" name="preset" value="preset2"> 预设方案2
                </label>
            </div>
            <button id="fillFormBtn">自动填充</button>
            <button id="submitFormBtn">自动提交</button>
            <button id="clearFormBtn">清空表单</button>
        `;

        // 确保面板添加到页面
        if (!document.querySelector('.auto-fill-panel')) {
            document.body.appendChild(panel);
            console.log('控制面板已添加到页面');
        }

        // 预设答案配置
        const presets = {
            preset1: {
                'first_time': 'Yes',
                'profession': ['Student', 'Social media / short video creator']
            },
            preset2: {
                'first_time': 'No',
                'profession': ['Corporate / brand marketing professional', 'Education / training professional']
            }
        };

        // 最小化/展开面板
        const minimizeBtn = panel.querySelector('.minimize-btn');
        minimizeBtn.addEventListener('click', () => {
            panel.classList.toggle('minimized');
            minimizeBtn.textContent = panel.classList.contains('minimized') ? '⚡' : '⚡';
        });

        // 填充表单函数
        async function fillForm(preset) {
            try {
                console.log('开始填充表单...');
                // 处理单选题 (radio buttons)
                if (preset.first_time) {
                    // 等待第一个问题加载
                    const radioGroups = document.querySelectorAll('.freebirdFormviewerComponentsQuestionRadioRoot');
                    for (const group of radioGroups) {
                        const options = group.querySelectorAll('.docssharedWizToggleLabeledContainer');
                        for (const option of options) {
                            if (option.textContent.includes(preset.first_time)) {
                                option.click();
                                console.log('已选择单选项:', preset.first_time);
                                break;
                            }
                        }
                    }
                }

                // 处理多选题 (checkboxes)
                if (preset.profession) {
                    const checkboxGroups = document.querySelectorAll('.freebirdFormviewerComponentsQuestionCheckboxRoot');
                    for (const group of checkboxGroups) {
                        const options = group.querySelectorAll('.docssharedWizToggleLabeledContainer');
                        for (const option of options) {
                            const label = option.textContent.trim();
                            if (preset.profession.some(prof => label.includes(prof))) {
                                option.click();
                                console.log('已选择多选项:', label);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('填充表单时出错:', error);
                alert('填充表单时出错，请检查页面是否完全加载');
            }
        }

        // 清空表单
        async function clearForm() {
            try {
                console.log('开始清空表单...');
                // 清除单选按钮
                const checkedRadios = document.querySelectorAll('.freebirdFormviewerComponentsQuestionRadioRoot .docssharedWizToggleLabeledContainer[aria-checked="true"]');
                checkedRadios.forEach(radio => {
                    radio.click();
                    console.log('已清除单选项');
                });

                // 清除复选框
                const checkedBoxes = document.querySelectorAll('.freebirdFormviewerComponentsQuestionCheckboxRoot .docssharedWizToggleLabeledContainer[aria-checked="true"]');
                checkedBoxes.forEach(checkbox => {
                    checkbox.click();
                    console.log('已清除多选项');
                });
            } catch (error) {
                console.error('清空表单时出错:', error);
                alert('清空表单时出错，请检查页面是否完全加载');
            }
        }

        // 绑定事件处理
        document.getElementById('fillFormBtn').addEventListener('click', () => {
            const selectedPreset = document.querySelector('input[name="preset"]:checked');
            if (selectedPreset) {
                fillForm(presets[selectedPreset.value]);
            } else {
                alert('请先选择一个预设方案');
            }
        });

        document.getElementById('clearFormBtn').addEventListener('click', clearForm);

        document.getElementById('submitFormBtn').addEventListener('click', async () => {
            try {
                console.log('尝试提交表单...');
                const submitButton = document.querySelector('.freebirdFormviewerViewNavigationSubmitButton');
                if (submitButton) {
                    submitButton.click();
                    console.log('已点击提交按钮');
                } else {
                    alert('未找到提交按钮');
                }
            } catch (error) {
                console.error('提交表单时出错:', error);
                alert('提交表单时出错，请检查页面是否完全加载');
            }
        });

        // 添加快捷键支持
        document.addEventListener('keydown', (e) => {
            // Alt + F: 填充表单
            if (e.altKey && e.key === 'f') {
                document.getElementById('fillFormBtn').click();
            }
            // Alt + S: 提交表单
            if (e.altKey && e.key === 's') {
                document.getElementById('submitFormBtn').click();
            }
            // Alt + C: 清空表单
            if (e.altKey && e.key === 'c') {
                document.getElementById('clearFormBtn').click();
            }
            // Alt + M: 最小化/展开面板
            if (e.altKey && e.key === 'm') {
                minimizeBtn.click();
            }
        });

        console.log('表单填充助手初始化完成');
    }

    // 确保在页面加载完成后执行初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeScript);
    } else {
        initializeScript();
    }
})(); 