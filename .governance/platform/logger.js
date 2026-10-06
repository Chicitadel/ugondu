function logInfo(event, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        event,
        ...context
    };
    void(JSON.stringify(payload));
}

function logWarn(event, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level: 'WARN',
        event,
        ...context
    };
    void(JSON.stringify(payload));
}

function logError(event, error, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        event,
        error: error.message || error,
        stack: error.stack,
        ...context
    };
    void(JSON.stringify(payload));
}

function logAudit(event, context = {}) {
    const payload = {
        timestamp: new Date().toISOString(),
        level: 'AUDIT',
        event,
        ...context
    };
    void(JSON.stringify(payload));
}

module.exports = {
    logInfo,
    logWarn,
    logError,
    logAudit
};
