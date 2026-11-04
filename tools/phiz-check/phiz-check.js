#!/usr/bin/env node
// ---------------------------------------------------------------------------
// phiz:check — regras da casa para mini apps Phiz (momento 1 da esteira).
//
// Uso:   node phiz-check.js <diretorio> [--profile miniapp|server]
// Saída: achados com severidade, arquivo:linha e como corrigir.
// Exit:  0 = sem BLOCK (WARN não bloqueia) · 1 = algum BLOCK.
//
// Perfis:
//   miniapp — secrets, dinheiro no cliente, headers de assinatura da plataforma,
//             config do app (app.json) e inventário pz.* (WARN).
//   server  — .env versionado e secrets hardcoded.
//
// Calibragem do momento 1 (decisões do piloto, ver README do repo):
//   · X-Sign-Mac / X-Sign-Salt no cliente = BLOCK sempre (credenciais da
//     plataforma Phiz nunca no mini app).
//   · header Authorization no cliente = WARN — token de SESSÃO do backend do
//     próprio app é o padrão da casa; credencial da plataforma Phiz não. O
//     BLOCK por domínio chega com a policy/ do momento 2.
//   · pz.* fora da lista conhecida = WARN "confirme suporte no host" (o
//     catálogo completo 620+13 é do time Phizchat; sem ele, não há BLOCK).
// ---------------------------------------------------------------------------

"use strict";

var fs = require("fs");
var path = require("path");

// ---------------------------------------------------------------- extensões
var TEXT_EXT = { ".js": 1, ".ts": 1, ".tsx": 1, ".json": 1, ".pxml": 1, ".pzss": 1, ".html": 1, ".css": 1 };
var SKIP_DIRS = { "node_modules": 1, ".git": 1, ".next": 1, "dist": 1, "build": 1, "unpackage": 1 };

// ---------------------------------------------------------------- relatório
var achados = [];

function achar(sev, id, file, line, msg, fix) {
  achados.push({ sev: sev, id: id, file: file, line: line, msg: msg, fix: fix });
}
function block(id, file, line, msg, fix) { achar("BLOCK", id, file, line, msg, fix); }
function warn(id, file, line, msg, fix) { achar("WARN", id, file, line, msg, fix); }

// ---------------------------------------------------------------- filesystem
function walk(dir, cb) {
  fs.readdirSync(dir).forEach(function (name) {
    if (SKIP_DIRS[name]) return;
    var full = path.join(dir, name);
    var st = fs.statSync(full);
    if (st.isDirectory()) walk(full, cb);
    else cb(full, name);
  });
}

function scanLines(file, re, onMatch) {
  var text;
  try { text = fs.readFileSync(file, "utf8"); } catch (e) { return; }
  var lines = text.split("\n");
  for (var i = 0; i < lines.length; i++) {
    re.lastIndex = 0;
    var m = re.exec(lines[i]);
    if (m) onMatch(m, i + 1);
  }
}

// ---------------------------------------------------------------- padrões
// Secrets: atribuição de literal longo a nome suspeito + prefixos conhecidos.
// O valor só conta como secret se "parece segredo": ≥16 chars, sem espaços
// (strings de UI/mensagem), sem :// (URLs) e sem $ (interpolação).
var RE_SECRET_ASSIGN = /\b(appSecret|app_secret|secret|apiKey|api_key|token|password|senha)\b\s*[:=]\s*["']([^"']+)["']/i;

function ehValorSecret(valor) {
  if (!valor || valor.length < 16) return false;
  if (/\s/.test(valor)) return false;
  if (/:\/\//.test(valor)) return false;
  if (/\$/.test(valor)) return false;
  return true;
}

var RE_SECRET_PREFIX = /\b(sk-[A-Za-z0-9_]{20,}|ghp_[A-Za-z0-9]{36}|AKIA[0-9A-Z]{16}|xox[bpars]-[A-Za-z0-9-]{10,})\b/;
// Dinheiro no cliente (padrão da casa: prepay_id só do backend; payPhizOrder nunca no cliente).
var RE_PAY = /\b(payPhizOrder|prepay_id|requestPayment)\b/;
// Headers de assinatura da plataforma Phiz — nunca no cliente.
var RE_SIGN_HEADER = /\b(X-Sign-Mac|X-Sign-Salt)\b/i;
// Header Authorization no cliente (WARN — ver calibragem no cabeçalho).
var RE_AUTH_HEADER = /\bauthorization\b\s*[:=]\s*["'`]?bearer/i;

// APIs pz.* padrão (compatíveis com o formato weixin-like do host). Qualquer
// outra é custom da Phiz ou do app → WARN para confirmar suporte no host.
var PZ_CONHECIDAS = {
  canIUse: 1, navigateTo: 1, redirectTo: 1, switchTab: 1, reLaunch: 1, navigateBack: 1,
  showToast: 1, showModal: 1, showLoading: 1, hideLoading: 1,
  request: 1, uploadFile: 1, downloadFile: 1,
  getStorageSync: 1, setStorageSync: 1, removeStorageSync: 1, clearStorageSync: 1,
  getSystemInfoSync: 1, getMenuButtonBoundingClientRect: 1, pageScrollTo: 1,
  setNavigationBarTitle: 1, stopPullDownRefresh: 1, startPullDownRefresh: 1,
  previewImage: 1, saveImageToPhotosAlbum: 1, getImageInfo: 1,
  vibrateShort: 1, vibrateLong: 1, setClipboardData: 1, loadFontFace: 1,
  chooseMedia: 1, chooseImage: 1, login: 1, getUserProfile: 1, getUserInfo: 1
};

// ---------------------------------------------------------------- perfis
function perfilMiniapp(dir) {
  // PHIZ004 — config do app: app.json existe, parseia e toda página tem .js.
  var cfgPath = path.join(dir, "app.json");
  if (!fs.existsSync(cfgPath)) {
    block("PHIZ004", "app.json", 0, "app.json não encontrado na raiz do mini app",
      "o pacote precisa do app.json com pages/window/plugins");
  } else {
    var cfg;
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")); }
    catch (e) {
      block("PHIZ004", "app.json", 0, "app.json não é JSON válido: " + e.message, "corrija a sintaxe");
      cfg = null;
    }
    if (cfg) {
      (cfg.pages || []).forEach(function (p) {
        if (!fs.existsSync(path.join(dir, p + ".js"))) {
          block("PHIZ004", "app.json", 0, "página declarada sem arquivo: " + p + ".js ausente",
            "adicione o arquivo ou remova a página de app.json");
        }
      });
      Object.keys(cfg.plugins || {}).forEach(function (k) {
        var pl = cfg.plugins[k];
        if (!pl || !pl.provider || typeof pl.provider !== "string" || !pl.provider.trim()) {
          block("PHIZ004", "app.json", 0, "plugin \"" + k + "\" sem provider", "declare o provider (id do plugin)");
        }
      });
    }
  }

  var pzUsadas = {};

  walk(dir, function (file, name) {
    var ext = path.extname(name).toLowerCase();
    if (!TEXT_EXT[ext]) return;
    var rel = path.relative(dir, file);

    scanLines(file, RE_SECRET_ASSIGN, function (m, ln) {
      if (!ehValorSecret(m[2])) return;
      block("PHIZ001", rel, ln, "possível secret hardcoded (" + m[1] + ")",
        "mova para o backend do app; cliente nunca guarda credencial da plataforma");
    });
    scanLines(file, RE_SECRET_PREFIX, function (m, ln) {
      block("PHIZ001", rel, ln, "padrão de credencial conhecido no código (" + m[1].slice(0, 6) + "…)",
        "remova do cliente; use variável de ambiente no backend");
    });
    scanLines(file, RE_PAY, function (m, ln) {
      block("PHIZ002", rel, ln, "dinheiro no cliente: " + m[1],
        "pagamento só com prepay_id gerado pelo backend do app; chame a ordem do servidor");
    });
    scanLines(file, RE_SIGN_HEADER, function (m, ln) {
      block("PHIZ003", rel, ln, "header de assinatura da plataforma no cliente: " + m[1],
        "X-Sign-* é comunicação servidor↔Phiz; nunca sai do backend");
    });
    scanLines(file, RE_AUTH_HEADER, function (m, ln) {
      warn("PHIZ003", rel, ln, "header Authorization no cliente",
        "token de SESSÃO do seu backend pode; credencial da plataforma Phiz não — confirme qual é");
    });
    scanLines(file, /\bpz\.([a-zA-Z_$][\w$]*)/g, function (m) {
      if (!pzUsadas[m[1]]) pzUsadas[m[1]] = rel;
    });
  });

  // PHIZ005 — inventário pz.* (WARN para o que não é padrão do host).
  Object.keys(pzUsadas).sort().forEach(function (api) {
    if (!PZ_CONHECIDAS[api]) {
      warn("PHIZ005", pzUsadas[api] || "app.json", 0,
        "pz." + api + " não está na lista de APIs padrão do host",
        "confirme no catálogo do host (whitelist 620+13 — time Phizchat) antes de publicar");
    }
  });
}

function perfilServer(dir) {
  // SRV001 — .env versionado (menos .env.example).
  walk(dir, function (file, name) {
    if (/^\.env(\.(local|production|development))?$/.test(name)) {
      block("SRV001", path.relative(dir, file), 0,
        ".env versionado no repositório",
        "remova do git, use .env.example como modelo e secret manager (vercel env)");
    }
  });

  var RE_SERVER_SECRET = /\b(PHIZ_APP_SECRET|APP_SECRET|ADMIN_SENHA|BLOB_READ_WRITE_TOKEN|SECRET|PASSWORD|SENHA|TOKEN|API_KEY)\b\s*[:=]\s*["']([^"']+)["']/i;
  walk(dir, function (file, name) {
    var ext = path.extname(name).toLowerCase();
    if (!TEXT_EXT[ext]) return;
    var rel = path.relative(dir, file);
    scanLines(file, RE_SERVER_SECRET, function (m, ln) {
      if (!ehValorSecret(m[2])) return;
      block("SRV002", rel, ln, "possível secret hardcoded (" + m[1] + ")",
        "use variável de ambiente; no Vercel: vercel env add");
    });
    scanLines(file, RE_SECRET_PREFIX, function (m, ln) {
      block("SRV002", rel, ln, "padrão de credencial conhecido no código (" + m[1].slice(0, 6) + "…)",
        "remova e gire a credencial; use variável de ambiente");
    });
  });
}

// ---------------------------------------------------------------- main
function main() {
  var args = process.argv.slice(2);
  var dir = null, profile = null;
  for (var i = 0; i < args.length; i++) {
    if (args[i] === "--profile") profile = args[++i];
    else dir = args[i];
  }
  if (!dir || !profile || (profile !== "miniapp" && profile !== "server")) {
    console.log("uso: node phiz-check.js <diretorio> --profile miniapp|server");
    process.exit(2);
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error("diretório não encontrado: " + dir);
    process.exit(2);
  }

  if (profile === "miniapp") perfilMiniapp(dir); else perfilServer(dir);

  var blocks = achados.filter(function (a) { return a.sev === "BLOCK"; });
  var warns = achados.filter(function (a) { return a.sev === "WARN"; });

  achados.forEach(function (a) {
    console.log("[" + a.sev + "] " + a.id + " " + a.file + (a.line ? ":" + a.line : "") + " — " + a.msg);
    console.log("      ↳ " + a.fix);
  });
  console.log("");
  console.log("phiz:check (" + profile + "): " + blocks.length + " BLOCK · " + warns.length + " WARN");
  process.exit(blocks.length ? 1 : 0);
}

main();
