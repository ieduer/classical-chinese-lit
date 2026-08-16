#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataBytes = await readFile(resolve(root, 'data/poems.json'));
const data = JSON.parse(dataBytes);
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const script = await readFile(resolve(root, 'js/script.5d5119fe.js'), 'utf8');
const expected = [
  [4, '思国之安者 必积其德义'],
  [7, '战不善 弊在赂秦'],
  [43, '户庭无尘杂 虚室有余闲'],
  [69, '小楼一夜听春雨 深巷明朝卖杏花'],
];
const failures = [];

for (const [order, answer] of expected) {
  const entry = data.find((item) => item.order === order);
  if (!entry) {
    failures.push(`missing order ${order}`);
    continue;
  }
  const suffixes = Object.keys(entry)
    .filter((key) => /^year\d+$/.test(key) && entry[key] === 2026)
    .map((key) => key.slice(4));
  if (suffixes.length !== 1) {
    failures.push(`${entry.title}: expected one 2026 question`);
    continue;
  }
  const suffix = suffixes[0];
  if (entry[`reference_answer${suffix}`] !== answer) failures.push(`${entry.title}: answer mismatch`);
  if (entry[`answer_origin${suffix}`] !== 'OpenAI Codex（GPT-5）本任务独立作答') failures.push(`${entry.title}: attribution mismatch`);
  const evidence = entry.beijing_2026_source_evidence;
  if (evidence?.jurisdiction !== 'CN-BJ' || evidence?.language !== 'zh-CN') failures.push(`${entry.title}: identity mismatch`);
  if (evidence?.coverageSha256 !== 'c6171cc5bdbf4032cf940734a0a5c0e6d60e35adc7585131006036def204a593') failures.push(`${entry.title}: coverage mismatch`);
}

const dataHash = createHash('sha256').update(dataBytes).digest('hex');
if (dataHash !== 'ad0aad7245517e84d49fe967c6207ed07df51bd6c9c4c483d770336f1eaa1f50') failures.push('data hash mismatch');
if (!html.includes('js/script.5d5119fe.js')) failures.push('HTML does not bind the new script');
if (!script.includes('data/poems.ad0aad72.json') || !script.includes('answer_origin') || !script.includes('非官方答案')) failures.push('script data binding or attribution missing');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, jurisdiction: 'CN-BJ', language: 'zh-CN', questions: 4, dataSha256: dataHash, model: 'OpenAI Codex (GPT-5)' }));
