const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function walk(dir) {
    let files = [];
    fs.readdirSync(dir).forEach(f => {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            files = files.concat(walk(full));
        } else if (f.endsWith('.js')) {
            files.push(full);
        }
    });
    return files;
}

const files = walk(srcDir);
let fixed = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    // Remove '${process.env.REACT_APP_API_URL} from single-quoted strings (broken pattern)
    const newContent = content
        .replace(/'(\$\{process\.env\.REACT_APP_API_URL\})(.*?)'/g, "'$2'")
        .replace(/`(\$\{process\.env\.REACT_APP_API_URL\})(.*?)`/g, '`$2`');
    if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Fixed:', path.relative(srcDir, file));
        fixed++;
    }
});

console.log(`\nDone. Fixed ${fixed} file(s).`);
