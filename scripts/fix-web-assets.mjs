// Pós-export web: a Vercel ignora QUALQUER pasta chamada `node_modules` no
// deploy. O Expo emite as fontes de ícone em `dist/assets/node_modules/...`,
// então elas somem em produção (ícones viram quadrados/vazios).
// Fix: renomeia a pasta para `assets/vendor` e corrige as referências no bundle.
//
// Uso: node scripts/fix-web-assets.mjs   (rodar após `expo export -p web`)
import fs from 'fs';
import path from 'path';

const DIST = path.resolve('dist');
const FROM_DIR = path.join(DIST, 'assets', 'node_modules');
const TO_DIR = path.join(DIST, 'assets', 'vendor');

if (!fs.existsSync(DIST)) {
  console.error('dist/ não existe — rode `expo export -p web` antes.');
  process.exit(1);
}

if (fs.existsSync(FROM_DIR)) {
  fs.rmSync(TO_DIR, { recursive: true, force: true });
  fs.renameSync(FROM_DIR, TO_DIR);
  console.log('renomeado: assets/node_modules -> assets/vendor');
} else if (fs.existsSync(TO_DIR)) {
  console.log('assets/vendor já existe (export já corrigido)');
} else {
  console.log('aviso: assets/node_modules não encontrado');
}

// Corrige referências em todos os arquivos texto do dist.
const exts = new Set(['.js', '.html', '.css', '.json', '.map']);
let patched = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (exts.has(path.extname(e.name))) {
      const txt = fs.readFileSync(p, 'utf8');
      if (txt.includes('assets/node_modules')) {
        fs.writeFileSync(p, txt.split('assets/node_modules').join('assets/vendor'));
        patched++;
      }
    }
  }
};
walk(DIST);
console.log('arquivos com refs corrigidas:', patched);
