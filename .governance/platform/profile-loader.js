const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadProfile(env) {
    const profilePath = path.join(__dirname, 'deployment-profile.yaml');
    const fileContents = fs.readFileSync(profilePath, 'utf8');
    const data = yaml.load(fileContents);
    
    const profileName = env || process.env.DEPLOYMENT_PROFILE || 'shared_host';
    if (!data.profiles[profileName]) {
        throw new Error(`Deployment profile '${profileName}' not found.`);
    }
    
    return data.profiles[profileName];
}

module.exports = { loadProfile };
