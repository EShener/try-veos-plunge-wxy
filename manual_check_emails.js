// 手动检查邮件脚本
// 在控制台运行此脚本，手动检查邮件

async function checkEmails(email) {
    const API_URL = 'http://159.75.188.43/tempmail/api';
    const USER_ID = 'wuxinyi'; // 您的用户ID
    
    console.log(`\n=== 检查邮箱: ${email} ===`);
    console.log(`时间: ${new Date().toLocaleString()}`);
    
    try {
        const response = await fetch(`${API_URL}/emails/${email}`, {
            headers: {
                'X-User-ID': USER_ID
            }
        });
        
        if (!response.ok) {
            console.error('请求失败:', response.status, response.statusText);
            return;
        }
        
        const data = await response.json();
        
        if (data.success && data.emails) {
            console.log(`\n总共 ${data.emails.length} 封邮件:\n`);
            
            data.emails.forEach((email, index) => {
                console.log(`--- 邮件 ${index + 1} ---`);
                console.log('主题:', email.subject || '无主题');
                console.log('发件人:', email.from || '未知');
                console.log('时间:', email.createdAt || '未知');
                console.log('内容长度:', (email.content || '').length);
                
                // 如果不是欢迎邮件，打印完整内容
                if (!email.subject || !email.subject.includes('欢迎使用临时邮箱')) {
                    console.log('完整内容:');
                    console.log(email.content || '无内容');
                }
                
                console.log('---\n');
            });
        } else {
            console.log('获取邮件失败:', data);
        }
    } catch (error) {
        console.error('请求出错:', error);
    }
}

// 持续监控邮件
async function monitorEmails(email, interval = 3000) {
    console.log(`开始监控邮箱: ${email}`);
    console.log('按 Ctrl+C 停止监控\n');
    
    let lastCount = 0;
    
    const check = async () => {
        try {
            const response = await fetch(`http://159.75.188.43/tempmail/api/emails/${email}`, {
                headers: { 'X-User-ID': 'wuxinyi' }
            });
            
            const data = await response.json();
            if (data.success && data.emails) {
                if (data.emails.length > lastCount) {
                    console.log(`\n🔔 收到新邮件！当前共 ${data.emails.length} 封`);
                    
                    // 显示新邮件
                    const newEmails = data.emails.slice(lastCount);
                    newEmails.forEach((email, index) => {
                        console.log(`\n=== 新邮件 ${lastCount + index + 1} ===`);
                        console.log('主题:', email.subject);
                        console.log('发件人:', email.from);
                        console.log('内容:', email.content);
                        console.log('===\n');
                    });
                    
                    lastCount = data.emails.length;
                } else {
                    process.stdout.write('.');
                }
            }
        } catch (error) {
            console.error('\n监控出错:', error.message);
        }
    };
    
    // 立即检查一次
    await check();
    
    // 定期检查
    const timer = setInterval(check, interval);
    
    // 返回停止函数
    return () => {
        clearInterval(timer);
        console.log('\n监控已停止');
    };
}

// 使用说明
console.log(`
📧 邮件检查工具

使用方法：
1. checkEmails('邮箱地址')     - 单次检查邮件
2. monitorEmails('邮箱地址')   - 持续监控新邮件

示例：
checkEmails('wuxinyigm2ho@somoj.com')
const stop = await monitorEmails('wuxinyigm2ho@somoj.com')
// 调用 stop() 停止监控
`); 