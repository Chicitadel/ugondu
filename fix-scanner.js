const fs = require('fs');
let code = fs.readFileSync('scripts/ci/residual-scanner.ts', 'utf8');

const elseBlock = } else {
                    console.warn(\[Residual Scanner] Unsupported resource type \ for node \\);
                    classification = ResidualClassification.SCAN_INCOMPLETE;
                };

code = code.replace(/} catch \\(err\\)/, elseBlock + '\n            } catch (err)');

fs.writeFileSync('scripts/ci/residual-scanner.ts', code);
