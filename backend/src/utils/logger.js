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

const formatMeta = (meta = {}) => {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);
  if (!entries.length) {
    return '';
  }

  try {
    return ` ${JSON.stringify(Object.fromEntries(entries))}`;
  } catch {
    return ' {"meta":"unserializable"}';
  }
};

const emit = (level, label, message, meta = {}) => {
  if (!shouldEmit(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `[${level}][${label}] ${message}${formatMeta(meta)}`;
  const payload = `${timestamp} ${line}`;

  if (level === 'ERROR') {
    console.error(payload);
    return;
  }

  console.log(payload);
};

const emitTable = (level, label, message, rows = [], meta = {}) => {
  if (!shouldEmit(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const line = `[${level}][${label}] ${message}${formatMeta(meta)}`;
  const payload = `${timestamp} ${line}`;

  if (level === 'ERROR') {
    console.error(payload);
  } else {
    console.log(payload);
  }

  if (Array.isArray(rows) && rows.length > 0) {
    console.table(rows);
  }
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
