import os
import glob
import re

base_dir = r"D:\ujomor-platform\products\ugondu\server"
jest_configs = glob.glob(os.path.join(base_dir, "**", "jest.config.js"), recursive=True)

for config in jest_configs:
    with open(config, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "moduleNameMapper" not in content:
        content = content.replace("transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],", 
            "transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],\n  moduleNameMapper: {\n    '^canonicalize$': '<rootDir>/tests/canonicalize-mock.js'\n  }")
        with open(config, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # also create canonicalize-mock.js in tests directory
        mock_file = os.path.join(os.path.dirname(config), "tests", "canonicalize-mock.js")
        os.makedirs(os.path.dirname(mock_file), exist_ok=True)
        with open(mock_file, 'w', encoding='utf-8') as f:
            f.write("module.exports = function canonicalize(obj) { return JSON.stringify(obj); };\nmodule.exports.default = module.exports;")

print("Patched all jest.config.js")
