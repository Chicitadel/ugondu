/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugins / PHP-FPM
 * File           : index.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 ******************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');

// Read payload from first argument
const payloadStr = process.argv[2] || '{}';
let payload;
try {
    payload = JSON.parse(payloadStr);
} catch (err) {
    console.error('[en] Invalid JSON payload provided to plugin.');
    process.exit(1);
}

const steps = [];

// Option defaults
const reloadFpm = payload.reload_fpm !== false;
const clearOpcache = payload.clear_opcache !== false;

if (clearOpcache) {
    // Generates a temporary PHP script that clears the opcache, 
    // runs it via CLI or web loopback, then deletes it.
    // In many shared environments, CLI opcache_reset() does not reset the FPM opcache.
    // We will deploy a standard curl loopback step.
    steps.push({
        action: 'SHELL_EXEC',
        payload: {
            command: 'echo "<?php opcache_reset(); ?>" > public_html/.ugondu_opcache.php && curl -s http://127.0.0.1/.ugondu_opcache.php || true && rm -f public_html/.ugondu_opcache.php',
            description: '[en] Resetting PHP Opcache via web loopback'
        }
    });
}

if (reloadFpm) {
    // Try standard ways to reload FPM on cPanel/DirectAdmin if user has permission
    // For many shared hosts, touch the .user.ini or restarting a dedicated user pool works.
    steps.push({
        action: 'SHELL_EXEC',
        payload: {
            command: 'if [ -f /etc/init.d/php-fpm ]; then /etc/init.d/php-fpm reload || true; else touch public_html/.user.ini || true; fi',
            description: '[en] Reloading PHP-FPM configuration'
        }
    });
}

// Output the steps as JSON for the Plugin Manager to parse
console.log(JSON.stringify(steps));
