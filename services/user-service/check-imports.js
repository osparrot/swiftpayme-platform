const fs = require('fs');
const path = require('path');

function checkImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = content.match(/^import.*from\s+['"]([^'"]+)['"];?$/gm) || [];
  
  console.log(`\n=== ${path.basename(filePath)} ===`);
  
  imports.forEach(imp => {
    const match = imp.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      const importPath = match[1];
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        const fullPath = path.resolve(path.dirname(filePath), importPath);
        const tsPath = fullPath + '.ts';
        const jsPath = fullPath + '.js';
        const indexPath = path.join(fullPath, 'index.ts');
        
        if (!fs.existsSync(tsPath) && !fs.existsSync(jsPath) && !fs.existsSync(indexPath)) {
          console.log(`❌ MISSING: ${importPath} -> ${tsPath}`);
        } else {
          console.log(`✅ EXISTS: ${importPath}`);
        }
      }
    }
  });
}

// Check main files
checkImports('./src/index.ts');
checkImports('./src/routes/userRoutes.ts');
checkImports('./src/controllers/userController.ts');
