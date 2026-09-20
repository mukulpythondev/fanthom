import { writeFileSync, appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const AGENT_LOGS_DIR = join(process.cwd(), '.agent-logs');
const SESSION_FILE = join(homedir(), '.claude', '.current-session-id');

if (!existsSync(AGENT_LOGS_DIR)) {
  mkdirSync(AGENT_LOGS_DIR, { recursive: true });
}

function getOrCreateSessionId() {
  try {
    if (existsSync(SESSION_FILE)) {
      const existing = readFileSync(SESSION_FILE, 'utf-8').trim();
      if (existing && existing.length > 0) return existing;
    }
  } catch (_) { /* ignore */ }
  const id = crypto.randomUUID();
  try {
    writeFileSync(SESSION_FILE, id, { flag: 'w' });
  } catch (_) { /* ignore */ }
  return id;
}

const eventType = process.argv[2]; // 'prompt' or 'response'
const sessionId = getOrCreateSessionId();
const timestamp = new Date().toISOString();
const dateStr = new Date().toISOString().split('T')[0];

// Read hook payload from stdin
let payload = '';
for await (const chunk of process.stdin) {
  payload += chunk;
}

let parsedPayload = {};
try {
  parsedPayload = JSON.parse(payload);
} catch (_) { /* ignore */ }

const model = process.env.CLAUDE_MODEL || 'unknown';
const tool = 'claude-code';
const projectName = process.cwd().split(/[\\\/]/).filter(Boolean).pop() || 'unknown';

let sessionLogPath = join(AGENT_LOGS_DIR, `${dateStr}_${sessionId.slice(0, 8)}.md`);

// Create session header if file doesn't exist
if (!existsSync(sessionLogPath)) {
  const header = `---
session_id: ${sessionId}
date: ${dateStr}
author: MukulRana
model: ${model}
tool: ${tool}
project: ${projectName}
total_exchanges: 0
first_prompt_time: ${timestamp}
last_prompt_time: ${timestamp}
---

# Session Log - ${dateStr}

Session: \`${sessionId.slice(0, 8)}\` | Project: \`${projectName}\` | Author: \`MukulRana\`

---

`;
  writeFileSync(sessionLogPath, header, 'utf-8');
}

// Determine exchange number
const content = readFileSync(sessionLogPath, 'utf-8');
const promptMatches = content.match(/\[LOG_ENTRY type=PROMPT num=(\d+)/g) || [];
const exchangeNum = promptMatches.length + 1;

if (eventType === 'prompt') {
  // Extract prompt text from payload or argv
  const promptText = parsedPayload.prompt || parsedPayload.user_prompt || process.argv[3] || '(no prompt text captured)';

  const entry = `
[LOG_ENTRY type=PROMPT num=${exchangeNum} session=${sessionId}]
timestamp: ${timestamp}
model: ${model}

${promptText}

`;
  appendFileSync(sessionLogPath, entry, 'utf-8');
} else if (eventType === 'response') {
  const responseText = process.argv[3] || parsedPayload.response || '(no response text captured)';

  const entry = `
[LOG_ENTRY type=RESPONSE num=${exchangeNum} session=${sessionId}]
timestamp: ${timestamp}
model: ${model}

${responseText}

`;
  appendFileSync(sessionLogPath, entry, 'utf-8');

  // Update totals in header
  const currentContent = readFileSync(sessionLogPath, 'utf-8');
  const totalMatch = currentContent.match(/total_exchanges: (\d+)/);
  if (totalMatch) {
    const newTotal = parseInt(totalMatch[1]) + 1;
    const updated = currentContent
      .replace(/total_exchanges: \d+/, `total_exchanges: ${newTotal}`)
      .replace(/last_prompt_time: .*/, `last_prompt_time: ${timestamp}`);
    writeFileSync(sessionLogPath, updated, 'utf-8');
  }
}

process.stdout.write(JSON.stringify({}));
