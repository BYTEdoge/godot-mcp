#!/usr/bin/env node
/**
 * Quickly set / view the Godot executable path used by godot-mcp.
 *
 * Usage:
 *   node scripts/set-godot-path.mjs <path-to-godot-executable>
 *   node scripts/set-godot-path.mjs --show
 *   node scripts/set-godot-path.mjs --clear
 *
 * Writes to <userHome>/.godot-mcp.json which the server auto-loads on startup.
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'fs';
import { execFileSync } from 'child_process';

const CONFIG_FILE = join(homedir(), '.godot-mcp.json');

function readConfig() {
  if (!existsSync(CONFIG_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.error(`[!] Existing config at ${CONFIG_FILE} is invalid JSON: ${err.message}`);
    process.exit(1);
  }
}

function writeConfig(cfg) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2) + '\n', 'utf8');
}

function showConfig() {
  console.log(`Config file: ${CONFIG_FILE}`);
  if (!existsSync(CONFIG_FILE)) {
    console.log('(not created yet)');
    return;
  }
  console.log(readFileSync(CONFIG_FILE, 'utf8'));
}

function clearConfig() {
  if (existsSync(CONFIG_FILE)) {
    unlinkSync(CONFIG_FILE);
    console.log(`Removed ${CONFIG_FILE}`);
  } else {
    console.log('Nothing to clear.');
  }
}

function verifyGodot(path) {
  try {
    const out = execFileSync(path, ['--version'], { encoding: 'utf8', timeout: 15000 });
    return out.trim();
  } catch (err) {
    throw new Error(`Failed to execute "${path} --version": ${err.message}`);
  }
}

const arg = process.argv[2];

if (!arg || arg === '--help' || arg === '-h') {
  console.log('Usage:');
  console.log('  set-godot-path <path-to-godot-executable>   set the Godot path');
  console.log('  set-godot-path --show                       print current config');
  console.log('  set-godot-path --clear                      remove the config file');
  process.exit(arg ? 0 : 1);
}

if (arg === '--show') { showConfig(); process.exit(0); }
if (arg === '--clear') { clearConfig(); process.exit(0); }

const target = arg;

if (!existsSync(target)) {
  console.error(`[!] Path does not exist: ${target}`);
  process.exit(1);
}
try {
  const st = statSync(target);
  if (!st.isFile()) {
    console.error(`[!] Path is not a file: ${target}`);
    process.exit(1);
  }
} catch (err) {
  console.error(`[!] Cannot stat path: ${err.message}`);
  process.exit(1);
}

let versionInfo = 'unknown';
try {
  versionInfo = verifyGodot(target);
  console.log(`[ok] Godot version: ${versionInfo}`);
} catch (err) {
  console.warn(`[warn] ${err.message}`);
  console.warn('[warn] Saving path anyway; you may need to fix it later.');
}

const cfg = readConfig();
cfg.godotPath = target;
writeConfig(cfg);

console.log(`[ok] Wrote godotPath to ${CONFIG_FILE}`);
console.log(`[ok] Restart your MCP client (VS Code, Claude, etc.) for the change to take effect.`);
