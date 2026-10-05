const fs = require('fs');
const path = require('path');

const base = 'D:\\ujomor-platform\\products\\ugondu\\server\\engine-core\\src';
const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());

const results = [];

for (const d of dirs) {
    const dirPath = path.join(base, d.name);
    
    const files = [];
    const walkSync = function(dir, filelist) {
        const _files = fs.readdirSync(dir);
        filelist = filelist || [];
        _files.forEach(function(file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                filelist = walkSync(path.join(dir, file), filelist);
            }
            else {
                if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                    filelist.push(path.join(dir, file));
                }
            }
        });
        return filelist;
    };
    walkSync(dirPath, files);
    
    let hasRealImplementation = false;
    let hasStubImplementation = false;
    let hasTypesOnly = false;
    let expectsFail = 0;
    let todos = 0;
    
    let totalClasses = 0;
    let totalInterfaces = 0;
    let linesOfCode = 0;

    for (const f of files) {
        const content = fs.readFileSync(f, 'utf8');
        
        expectsFail += (content.match(/expect\(true\)\.toBe\(false\)/g) || []).length;
        todos += (content.match(/TODO|FIXME/gi) || []).length;
        
        const lines = content.split('\n').filter(l => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.trim().startsWith('/*') && l.trim().length > 0);
        linesOfCode += lines.length;
        
        totalClasses += (content.match(/export\s+class\s+\w+/g) || []).length;
        totalInterfaces += (content.match(/export\s+(interface|type)\s+\w+/g) || []).length;
        
        const classMatches = content.match(/class\s+\w+[\s\S]*?\{([\s\S]*?)\}/g);
        if (classMatches) {
            for (const c of classMatches) {
                const bodyLines = c.split('\n').filter(l => l.trim().length > 0 && !l.trim().startsWith('*') && !l.trim().startsWith('//'));
                if (bodyLines.length < 5 || (c.includes('throw new Error(') && bodyLines.length < 10 && !c.includes('if '))) {
                    hasStubImplementation = true;
                } else {
                    hasRealImplementation = true;
                }
            }
        }
    }
    
    let status = 'Unknown';
    if (files.length === 0) {
        status = 'Empty Stub';
    } else if (hasRealImplementation) {
        status = 'Implemented';
    } else if (hasStubImplementation) {
        status = 'Implementation Stub';
    } else if (totalInterfaces > 0 && totalClasses === 0) {
        status = 'Types Only (Stub)';
    } else {
        status = 'Needs Inspection';
    }

    results.push({
        name: d.name,
        files: files.length,
        loc: linesOfCode,
        classes: totalClasses,
        interfaces: totalInterfaces,
        status: status,
        todos,
        expectsFail
    });
}

console.log(JSON.stringify(results, null, 2));
