const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let modifiedFiles = 0;

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace broken characters
    content = content.replace(/â€¢/g, '•');
    content = content.replace(/ΓÇö/g, '—');
    content = content.replace(/â€”/g, '—'); // em dash
    content = content.replace(/â€“/g, '–'); // en dash
    content = content.replace(/â€˜/g, '‘'); // left single quote
    content = content.replace(/â€™/g, '’'); // right single quote
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed encoding in:', filePath);
      modifiedFiles++;
    }
  }
});

console.log(`Finished fixing encodings. Modified ${modifiedFiles} files.`);
