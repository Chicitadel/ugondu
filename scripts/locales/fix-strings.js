const fs = require('fs');
const p = require('path');

function walk(d) {
    let r = [];
    if (!fs.existsSync(d)) return r;
    fs.readdirSync(d).forEach(f => {
        let x = p.join(d, f);
        if (fs.statSync(x).isDirectory()) {
            r = r.concat(walk(x));
        } else if (x.endsWith('.ts') || x.endsWith('.js')) {
            r.push(x);
        }
    });
    return r;
}

walk('server').forEach(f => {
    let c = fs.readFileSync(f, 'utf-8');
    let o = c;
    
    c = c.replace(/throw new Error\('UGONDU_CERT_REGION environment variable is required and must not be empty.'\);/g, "throw new Error(__t('error.cert.missing_region'));");
    c = c.replace(/throw new Error\("UGONDU_CERT_REGION is missing from the environment"\);/g, "throw new Error(__t('error.cert.missing_region'));");
    
    // we also saw AWS CSV string
    // "msg_aws_csv_missing_user_name_attempting_saf": "AWS CSV missing User Name. Attempting safe recovery via STS..."
    // Wait, let's just make sure we get those exact regions replaced.
    
    if (o !== c) {
        fs.writeFileSync(f, c);
        console.log('Fixed', f);
    }
});
