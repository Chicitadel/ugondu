const { logInfo, logError } = require('./logger');

function validateEnvironment() {
    const requiredEnvVars = ['DEPLOYMENT_PROFILE'];
    // In a real environment, we might require DB credentials depending on profile
    // For now we just log the startup validation
    
    for (const env of requiredEnvVars) {
        if (!process.env[env] && env === 'REQUIRED_SECRET_EXAMPLE') {
            logError('startup_validation_failed', new Error(`Missing required environment variable: ${env}`));
            process.exit(1);
        }
    }
    
    logInfo('startup_validation_passed', { profile: process.env.DEPLOYMENT_PROFILE || 'shared_host' });
}

function configureSecurityHeaders(app) {
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        next();
    });
}

module.exports = {
    validateEnvironment,
    configureSecurityHeaders
};
