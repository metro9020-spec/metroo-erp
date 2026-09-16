const fs = require('fs');
let code = fs.readFileSync('G:/sw m/erp/src/state.js', 'utf8');

const regex = /async pullLatestFromServer\(\) \{[\s\S]*?console\.warn\("Could not pull latest state:", e\);\s*\}\s*\}/;

if (regex.test(code)) {
    code = code.replace(regex, "");
    fs.writeFileSync('G:/sw m/erp/src/state.js', code);
    console.log('Reverted state.js');
} else {
    console.log('Regex did not match state.js');
}
