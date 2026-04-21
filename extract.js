const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith('.component.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const targetDir = '/home/macbook/workspace/iamsourabh/trueauth/frontend/src/app';
const files = walkDir(targetDir);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Custom parsing without regex to handle nested backticks flawlessly
  const baseName = path.basename(file, '.ts'); // e.g. calendar.component
  const dirName = path.dirname(file);
  
  let modified = false;

  // 1. Extract Template
  const templateStartMatch = content.match(/template:\s*`/);
  if (templateStartMatch) {
      const startIndex = templateStartMatch.index + templateStartMatch[0].length;
      let openTicks = 1;
      let cursor = startIndex;
      
      while(openTicks > 0 && cursor < content.length) {
         if (content[cursor] === '`' && content[cursor - 1] !== '\\') {
            openTicks--;
         }
         if (openTicks === 0) break; // found closing
         cursor++;
      }
      
      const templateStr = content.substring(startIndex, cursor).trim();
      const htmlFile = path.join(dirName, `${baseName}.html`);
      fs.writeFileSync(htmlFile, templateStr);
      
      // Replace the block.
      const blockToReplace = content.substring(templateStartMatch.index, cursor + 1);
      content = content.replace(blockToReplace, `templateUrl: './${baseName}.html'`);
      modified = true;
      console.log(`Extracted template to ${baseName}.html`);
  }

  // 2. Extract Styles
  const styleStartMatch = content.match(/styles:\s*\[\s*`/);
  if (styleStartMatch) {
      const startIndex = styleStartMatch.index + styleStartMatch[0].length;
      let openTicks = 1;
      let cursor = startIndex;
      
      while(openTicks > 0 && cursor < content.length) {
         if (content[cursor] === '`' && content[cursor - 1] !== '\\') {
            openTicks--;
         }
         if (openTicks === 0) break; // found closing
         cursor++;
      }
      
      const styleStr = content.substring(startIndex, cursor).trim();
      const cssFile = path.join(dirName, `${baseName}.css`);
      fs.writeFileSync(cssFile, styleStr);
      
      // We also need to consume the trailing `]` because it was `styles: [ `...` ]`
      const fullBlockRegex = new RegExp('styles:\\s*\\[\\s*`[\\s\\S]{' + (cursor-startIndex) + '}`\\s*\\]');
      
      content = content.replace(fullBlockRegex, `styleUrl: './${baseName}.css'`);
      modified = true;
      console.log(`Extracted styles to ${baseName}.css`);
  }

  if(modified) {
     fs.writeFileSync(file, content, 'utf8');
     console.log('Modified TS:', file);
  }
});
