#!/usr/bin/env node

// External receive tester: generate mailbox via API, send external email, poll GET API for receipt
// Usage examples:
//   node external_receive_tester.js --client 2720093 --user 2720093 --rounds 1
//   node external_receive_tester.js --client zhanghui --user zhanghui --rounds 1 --timeout 90 --interval 5
//   node external_receive_tester.js --emails verifyxxx@somoj.com,abc@teihu.com --timeout 60 --interval 5
//   node external_receive_tester.js --base http://159.75.188.43/tempmail/api --client 2720093 --user 2720093

const fetch = require('node-fetch');

const DEFAULT_API_BASE = process.env.API_BASE || 'http://159.75.188.43/tempmail/api';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = i + 1 < argv.length ? argv[i + 1] : undefined;
    const setKV = (k) => {
      if (next && !next.startsWith('--')) { args[k] = next; i++; } else { args[k] = true; }
    };
    switch (a) {
      case '--base': setKV('base'); break;
      case '--client': setKV('client'); break;
      case '--user': setKV('user'); break;
      case '--domain': setKV('domain'); break;
      case '--rounds': setKV('rounds'); break;
      case '--timeout': setKV('timeout'); break;
      case '--interval': setKV('interval'); break;
      case '--emails': setKV('emails'); break;
      default:
        if (a.startsWith('--')) {
          const [k, v] = a.replace(/^--/, '').split('=');
          if (v !== undefined) args[k] = v; else args[k] = true;
        }
        break;
    }
  }
  return args;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function generateEmail(apiBase, clientPrefix, userName, domain) {
  const body = { clientPrefix, userName };
  if (domain) body.domain = domain;
  const res = await fetch(`${apiBase}/email/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  let json = null; try { json = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, json };
}

async function sendExternalEmail(to, subject, text) {
  // Use non-www domain to avoid 301 and method rewrite
  const url = 'https://mail-tester.ninja/send-test-email';
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, text })
  });
  return { ok: res.ok, status: res.status };
}

async function getEmails(apiBase, email) {
  const enc = encodeURIComponent(email);
  const res = await fetch(`${apiBase}/emails/${enc}`);
  let json = null; try { json = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, json };
}

function extractExternalEmails(json) {
  const list = (json && json.data) || [];
  // Filter out welcome emails by subject
  return list.filter((e) => !(e.subject && e.subject.includes('欢迎使用临时邮箱')));
}

async function waitForSpecificEmail(apiBase, email, matchFn, timeoutMs, intervalMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await getEmails(apiBase, email);
    if (r.ok && r.json && r.json.success) {
      const externals = extractExternalEmails(r.json);
      if (externals.some(matchFn)) {
        return { received: true, response: r };
      }
    }
    await sleep(intervalMs);
  }
  return { received: false };
}

async function testOne(apiBase, clientPrefix, userName, domain, timeoutMs, intervalMs) {
  console.log(`\n=== Generate mailbox (clientPrefix=${clientPrefix}, userName=${userName}${domain ? `, domain=${domain}` : ''}) ===`);
  const gen = await generateEmail(apiBase, clientPrefix, userName, domain);
  if (!gen.ok || !gen.json || !gen.json.success) {
    console.log(`Generate failed: HTTP ${gen.status}`, gen.json || '');
    return { success: false, stage: 'generate', detail: gen };
  }
  const email = gen.json.data.email;
  const serviceName = gen.json.data.serviceName;
  console.log(`Email: ${email} via ${serviceName}`);

  const testId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const subject = `EXT-TEST ${testId}`;
  const text = `自动测试ID=${testId}`;

  console.log('Send external test email...');
  const snd = await sendExternalEmail(email, subject, text);
  if (!snd.ok) {
    console.log(`External send failed: HTTP ${snd.status}`);
    // 即使外部发送失败，也继续观察是否有任何外部邮件进入
  } else {
    console.log('External send OK');
  }

  console.log(`Wait for email (timeout ${Math.round(timeoutMs / 1000)}s, interval ${Math.round(intervalMs / 1000)}s)...`);
  const wait = await waitForSpecificEmail(apiBase, email, (e) => (e.subject || '').includes(testId), timeoutMs, intervalMs);
  if (wait.received) {
    console.log('Receive OK');
    return { success: true, email, serviceName, testId };
  } else {
    // 做一次最终拉取，输出统计
    const final = await getEmails(apiBase, email);
    const externals = final.ok && final.json && final.json.success ? extractExternalEmails(final.json) : [];
    console.log(`No external email detected in time. Current external count: ${externals.length}`);
    return { success: false, stage: 'receive', email, serviceName, testId, externalCount: externals.length };
  }
}

async function testExistingEmail(apiBase, email, timeoutMs, intervalMs) {
  const testId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const subject = `EXT-TEST ${testId}`;
  const text = `自动测试ID=${testId}`;
  console.log(`\n=== Existing mailbox: ${email} ===`);
  console.log('Send external test email...');
  const snd = await sendExternalEmail(email, subject, text);
  if (!snd.ok) console.log(`External send failed: HTTP ${snd.status}`); else console.log('External send OK');
  console.log(`Wait for email (timeout ${Math.round(timeoutMs / 1000)}s, interval ${Math.round(intervalMs / 1000)}s)...`);
  const wait = await waitForSpecificEmail(apiBase, email, (e) => (e.subject || '').includes(testId), timeoutMs, intervalMs);
  if (wait.received) {
    console.log('Receive OK');
    return { success: true, email, testId };
  } else {
    const final = await getEmails(apiBase, email);
    const externals = final.ok && final.json && final.json.success ? extractExternalEmails(final.json) : [];
    console.log(`No external email detected in time. Current external count: ${externals.length}`);
    return { success: false, stage: 'receive', email, testId, externalCount: externals.length };
  }
}

(async () => {
  const args = parseArgs(process.argv);
  const apiBase = args.base || DEFAULT_API_BASE;
  const rounds = Number(args.rounds || 1);
  const timeoutMs = Number(args.timeout || 60) * 1000;
  const intervalMs = Number(args.interval || 5) * 1000;

  const results = [];

  if (args.emails) {
    const emails = String(args.emails).split(',').map((s) => s.trim()).filter(Boolean);
    for (const email of emails) {
      const r = await testExistingEmail(apiBase, email, timeoutMs, intervalMs);
      results.push(r);
    }
  } else {
    const client = args.client || '2720093';
    const user = args.user || client;
    const domain = args.domain || undefined; // optional
    for (let i = 0; i < rounds; i++) {
      const r = await testOne(apiBase, client, user, domain, timeoutMs, intervalMs);
      results.push(r);
    }
  }

  const ok = results.filter(r => r.success).length;
  const total = results.length;
  console.log(`\n===== Summary: ${ok}/${total} received =====`);
  results.forEach((r, idx) => {
    const tag = r.success ? 'OK' : 'FAIL';
    const svc = r.serviceName ? ` [${r.serviceName}]` : '';
    console.log(`#${idx + 1}: ${tag}${svc} ${r.email || ''} ${r.testId ? `(id=${r.testId})` : ''}`);
  });

  process.exit(ok > 0 ? 0 : 1);
})().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(2);
}); 