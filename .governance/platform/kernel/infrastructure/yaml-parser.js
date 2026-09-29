/**
 * Infrastructure Layer: YAML Parser
 * Pushed out of the Domain model to maintain pure I/O isolation.
 */
function parseYaml(yamlString) {
    const obj = {};
    let currentBlock = obj;
    let currentBlockName = null;
    let currentSubBlock = null;
    
    const lines = yamlString.split('\n');
    for (let line of lines) {
        line = line.replace(/\r/g, '').trimEnd();
        if (!line || line.startsWith('#')) continue;
        
        const blockMatch = line.match(/^([a-z_]+):$/);
        if (blockMatch) {
            currentBlockName = blockMatch[1];
            obj[currentBlockName] = {};
            currentBlock = obj[currentBlockName];
            currentSubBlock = null;
            continue;
        }

        const subBlockMatch = line.match(/^[\s]{2}([a-z_]+):$/);
        if (subBlockMatch && currentBlockName) {
            const subName = subBlockMatch[1];
            obj[currentBlockName][subName] = {};
            currentSubBlock = obj[currentBlockName][subName];
            continue;
        }

        const kvMatch = line.match(/^[\s]+([a-z_]+):\s*(.*)$/);
        if (kvMatch) {
            let [, key, val] = kvMatch;
            val = val.replace(/^["'](.*)["']$/, '$1');
            if (val === 'true') val = true;
            if (val === 'false') val = false;
            
            if (currentSubBlock) {
                currentSubBlock[key] = val;
            } else if (currentBlockName) {
                currentBlock[key] = val;
            } else {
                obj[key] = val;
            }
        }
    }
    return obj;
}

module.exports = { parseYaml };
