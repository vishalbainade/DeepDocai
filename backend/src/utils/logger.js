// ── Rich Console Logger for DeepDoc AI ──────────────────────────────────
// Produces beautiful, scannable terminal output with colors, boxes, and tables.

const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel = (() => {
  const envLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[envLevel] ? envLevel : 'info';
})();

const shouldEmit = (level) => {
  const normalized = String(level || '').toLowerCase();
  return (LOG_LEVELS[normalized] || LOG_LEVELS.info) >= LOG_LEVELS[currentLevel];
};

// ── ANSI Color Codes ─────────────────────────────────────────────────────
const c = {
  reset:    '\x1b[0m',
  bold:     '\x1b[1m',
  dim:      '\x1b[2m',
  // Foreground
  black:    '\x1b[30m',
  red:      '\x1b[31m',
  green:    '\x1b[32m',
  yellow:   '\x1b[33m',
  blue:     '\x1b[34m',
  magenta:  '\x1b[35m',
  cyan:     '\x1b[36m',
  white:    '\x1b[37m',
  gray:     '\x1b[90m',
  // Background
  bgRed:    '\x1b[41m',
  bgGreen:  '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue:   '\x1b[44m',
  bgMagenta:'\x1b[45m',
  bgCyan:   '\x1b[46m',
  bgWhite:  '\x1b[47m',
  bgGray:   '\x1b[100m',
};

// ── Level Badge ──────────────────────────────────────────────────────────
const levelBadge = (level) => {
  const upper = String(level).toUpperCase();
  switch (upper) {
    case 'INFO':  return `${c.bgGreen}${c.black}${c.bold} INFO  ${c.reset}`;
    case 'ERROR': return `${c.bgRed}${c.white}${c.bold} ERROR ${c.reset}`;
    case 'WARN':  return `${c.bgYellow}${c.black}${c.bold} WARN  ${c.reset}`;
    case 'DEBUG': return `${c.bgGray}${c.white}${c.bold} DEBUG ${c.reset}`;
    default:      return `${c.bgWhite}${c.black}${c.bold} ${upper} ${c.reset}`;
  }
};

// ── Label Icons ──────────────────────────────────────────────────────────
const labelIcon = (label) => {
  const lower = String(label).toLowerCase();
  if (lower.includes('llm') || lower.includes('ai'))       return '🤖';
  if (lower.includes('stream'))                             return '🌊';
  if (lower.includes('chat') || lower.includes('request'))  return '💬';
  if (lower.includes('citation'))                           return '📎';
  if (lower.includes('data flow') || lower.includes('flow'))return '📊';
  if (lower.includes('router'))                             return '🔀';
  if (lower.includes('provider'))                           return '🔌';
  if (lower.includes('error'))                              return '❌';
  if (lower.includes('token'))                              return '🔤';
  if (lower.includes('table'))                              return '📋';
  if (lower.includes('startup') || lower.includes('init'))  return '🚀';
  return '•';
};

// ── Timestamp ────────────────────────────────────────────────────────────
const timestamp = () => {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${c.dim}${h}:${m}:${s}.${ms}${c.reset}`;
};

// ── Format metadata as key=value pairs ───────────────────────────────────
const formatKV = (meta = {}) => {
  const entries = Object.entries(meta).filter(([, v]) => v !== undefined);
  if (!entries.length) return '';

  return entries.map(([key, val]) => {
    const k = `${c.cyan}${key}${c.reset}`;
    let v;
    if (typeof val === 'number') {
      v = `${c.yellow}${val}${c.reset}`;
    } else if (typeof val === 'boolean') {
      v = val ? `${c.green}true${c.reset}` : `${c.red}false${c.reset}`;
    } else {
      const s = String(val);
      v = s.length > 60 ? `${c.white}${s.slice(0, 57)}...${c.reset}` : `${c.white}${s}${c.reset}`;
    }
    return `${k}=${v}`;
  }).join('  ');
};

// ── Main emitter ─────────────────────────────────────────────────────────
const emit = (level, label, message, meta = {}) => {
  if (!shouldEmit(level)) return;

  const badge = levelBadge(level);
  const icon  = labelIcon(label);
  const ts    = timestamp();
  const lbl   = `${c.bold}${c.magenta}${label}${c.reset}`;
  const msg   = `${c.white}${message}${c.reset}`;
  const kv    = formatKV(meta);

  const line = `${ts}  ${badge}  ${icon} ${lbl}  ${msg}${kv ? `  ${c.dim}│${c.reset} ${kv}` : ''}`;

  if (String(level).toUpperCase() === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
};

// ── Rich Table Emitter ───────────────────────────────────────────────────
const emitTable = (level, label, message, rows = [], meta = {}) => {
  if (!shouldEmit(level)) return;

  emit(level, label, message, meta);

  if (!Array.isArray(rows) || rows.length === 0) return;

  // Build a compact, aligned box table
  const keys = Object.keys(rows[0] || {});
  if (!keys.length) return;

  // Calculate column widths
  const colWidths = {};
  keys.forEach((key) => {
    colWidths[key] = key.length;
    rows.forEach((row) => {
      const val = String(row[key] ?? '');
      colWidths[key] = Math.max(colWidths[key], Math.min(val.length, 40));
    });
  });

  const pad = (str, len) => {
    const s = String(str);
    return s.length > len ? s.slice(0, len - 1) + '…' : s.padEnd(len);
  };

  const divider = `${c.dim}  ┌${keys.map((k) => '─'.repeat(colWidths[k] + 2)).join('┬')}┐${c.reset}`;
  const header  = `${c.dim}  │${keys.map((k) => ` ${c.bold}${c.cyan}${pad(k, colWidths[k])}${c.reset}${c.dim} `).join('│')}│${c.reset}`;
  const sep     = `${c.dim}  ├${keys.map((k) => '─'.repeat(colWidths[k] + 2)).join('┼')}┤${c.reset}`;
  const bottom  = `${c.dim}  └${keys.map((k) => '─'.repeat(colWidths[k] + 2)).join('┴')}┘${c.reset}`;

  console.log(divider);
  console.log(header);
  console.log(sep);

  rows.forEach((row, idx) => {
    const rowColor = idx % 2 === 0 ? c.white : c.gray;
    const line = `${c.dim}  │${keys.map((k) => ` ${rowColor}${pad(row[k] ?? '', colWidths[k])}${c.reset}${c.dim} `).join('│')}│${c.reset}`;
    console.log(line);
  });

  console.log(bottom);
  console.log(`${c.dim}  ${rows.length} row(s)${c.reset}`);
};

export const createLogger = (baseMeta = {}) => {
  const withMeta = (meta = {}) => ({ ...baseMeta, ...meta });

  return {
    child(meta = {}) {
      return createLogger(withMeta(meta));
    },
    info(label, message, meta = {}) {
      emit('INFO', label, message, withMeta(meta));
    },
    error(label, message, meta = {}) {
      emit('ERROR', label, message, withMeta(meta));
    },
    warn(label, message, meta = {}) {
      emit('WARN', label, message, withMeta(meta));
    },
    debug(label, message, meta = {}) {
      emit('DEBUG', label, message, withMeta(meta));
    },
    table(level, label, message, rows = [], meta = {}) {
      emitTable(level, label, message, rows, withMeta(meta));
    },
    isLevelEnabled(level) {
      return shouldEmit(level);
    },
  };
};

const logger = createLogger();

export default logger;
