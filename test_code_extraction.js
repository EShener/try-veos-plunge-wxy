// 验证码提取测试脚本
// 在控制台运行此脚本测试验证码提取功能

// 提取验证码函数
function testExtractCode(text) {
    console.log('测试文本:', text);
    console.log('文本长度:', text.length);
    
    const patterns = [
        // 中文模式
        { name: '中文验证码', pattern: /验证码[：:：\s]*(\d{4,6})/ },
        { name: '您的验证码是', pattern: /您的验证码是[：:：\s]*(\d{4,6})/ },
        { name: '动态验证码', pattern: /动态验证码[：:：\s]*(\d{4,6})/ },
        
        // 英文模式
        { name: 'verification code', pattern: /verification code[：:：\s]*(\d{4,6})/i },
        { name: 'your code is', pattern: /your code is[：:：\s]*(\d{4,6})/i },
        { name: 'code:', pattern: /code[：:：\s]*(\d{4,6})/i },
        { name: 'OTP', pattern: /OTP[：:：\s]*(\d{4,6})/i },
        
        // 宽松模式
        { name: 'code is', pattern: /code\s*is\s*(\d{4,6})/i },
        { name: 'is:', pattern: /is[：:：\s]*(\d{4,6})/i },
        
        // 独立数字
        { name: '6位数字', pattern: /\b(\d{6})\b/ },
        { name: '4位数字', pattern: /\b(\d{4})\b/ }
    ];
    
    for (const {name, pattern} of patterns) {
        const match = text.match(pattern);
        if (match) {
            console.log(`✅ 匹配成功 [${name}]:`, match[1]);
            return match[1];
        }
    }
    
    // 备用方案：查找所有数字
    const allNumbers = text.match(/\d{4,6}/g);
    if (allNumbers) {
        console.log('找到的所有4-6位数字:', allNumbers);
        return allNumbers[0];
    }
    
    console.log('❌ 未找到验证码');
    return null;
}

// 测试用例
const testCases = [
    // 中文
    "您的验证码是：123456",
    "验证码: 123456",
    "动态验证码：123456",
    
    // 英文
    "Your verification code is 123456",
    "Your code is: 123456",
    "Verification Code: 123456",
    "OTP: 123456",
    "Your OTP is 123456",
    
    // 其他格式
    "Code: 123456",
    "Your login code is 123456",
    "Use 123456 to verify your email",
    "123456 is your verification code",
    
    // 复杂文本
    "Hello! Your verification code is 123456. Please enter it within 5 minutes.",
    "感谢您注册！验证码：123456，请在5分钟内输入。"
];

// 运行测试
console.log('=== 开始测试验证码提取 ===\n');
testCases.forEach((testCase, index) => {
    console.log(`测试 ${index + 1}:`);
    const result = testExtractCode(testCase);
    console.log('---\n');
});

// 手动测试函数
window.testCodeExtraction = function(text) {
    return testExtractCode(text);
};

console.log('💡 提示：可以使用 testCodeExtraction("您的邮件内容") 测试任意文本'); 