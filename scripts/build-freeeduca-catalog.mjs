import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sourcePath = path.join(projectRoot, 'Biblioteca_Cogniticus_FreeEduca_Com_Links.md');
const outputPath = path.join(projectRoot, 'assets/js/freeeduca-catalog.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const lines = source.split(/\r?\n/);
const declaredCatalogTotal = Number(source.match(/\*\*Total de obras catalogadas:\*\*\s*(\d+)/)?.[1]);
const categories = [];
let currentCategory = null;

for (const line of lines) {
  const heading = line.match(/^##\s+(\d+)\s+·\s+(.+)$/);
  if (heading) {
    currentCategory = { id: heading[1], name: heading[2].trim(), declaredTotal: 0, items: [] };
    categories.push(currentCategory);
    continue;
  }

  if (!currentCategory) continue;

  const declaredTotal = line.match(/^Total:\s*(\d+)$/);
  if (declaredTotal) {
    currentCategory.declaredTotal = Number(declaredTotal[1]);
    continue;
  }

  const item = line.match(/^- \[(.+)]\((https?:\/\/.+)\)$/);
  if (item) currentCategory.items.push({ title: item[1].trim(), url: item[2].trim() });
}

const extractedTotal = categories.reduce((sum, category) => sum + category.items.length, 0);
const invalidCategories = categories.filter(category => category.declaredTotal !== category.items.length);

if (!declaredCatalogTotal || declaredCatalogTotal !== extractedTotal) {
  throw new Error(`Total divergente: declarado=${declaredCatalogTotal || 0}, extraído=${extractedTotal}`);
}

if (invalidCategories.length) {
  const details = invalidCategories
    .map(category => `${category.id}: declarado=${category.declaredTotal}, extraído=${category.items.length}`)
    .join('; ');
  throw new Error(`Categorias divergentes: ${details}`);
}

const catalog = {
  title: 'Biblioteca do Cogniticus — Free-Educa',
  sourceFile: path.basename(sourcePath),
  sourceRepository: 'https://github.com/free-educa/free-books/tree/master/books',
  total: extractedTotal,
  categories
};

const banner = '// Gerado por scripts/build-freeeduca-catalog.mjs. Não edite manualmente.\n';
const payload = `${banner}window.FREEEDUCA_CATALOG = Object.freeze(${JSON.stringify(catalog, null, 2)});\n`;
fs.writeFileSync(outputPath, payload, 'utf8');

console.log(`Catálogo gerado: ${extractedTotal} obras, ${categories.length} categorias.`);
