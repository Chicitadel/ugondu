/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Plugin / ugondu-plugin-composer
 * File           : manifest.json + index.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

// [en] PHP Composer Dependency Resolution Plugin for Ugondu
const payload = (() => {
    try { return JSON.parse(process.argv[2] || '{}'); } catch { return {}; }
})();

const noDevFlag = payload.nodev ? ' --no-dev' : '';
const optimizeFlag = payload.optimize ? ' --optimize-autoloader' : '';

const steps = [
    {
        action: 'SHELL_EXEC',
        payload: {
            command: `composer install${noDevFlag}${optimizeFlag}`,
            description: '[en] Install PHP Composer dependencies'
        }
    }
];

process.stdout.write(JSON.stringify(steps));
