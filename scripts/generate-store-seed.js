const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.resolve(__dirname, 'store-lines.txt'), 'utf-8');

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const entries = raw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const [name, website, categories, aliases, weight] = line.split('|').map((value) => value.trim());
    return {
      id: slugify(name),
      name,
      website,
      categories: categories.split(',').map((item) => item.trim()).filter(Boolean),
      aliases: aliases.split(';').map((item) => item.trim()).filter(Boolean),
      country: 'US',
      popularityWeight: Number(weight)
    };
  });

const uniqueIds = new Set(entries.map((item) => item.id));
if (uniqueIds.size !== entries.length) {
  throw new Error('Duplicate store id detected');
}

if (entries.length < 200) {
  throw new Error('Need at least 200 stores. Currently ' + entries.length);
}

const outputPath = path.resolve(__dirname, '../server/data/stores.seed.json');
fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
console.log(`Generated ${entries.length} stores at ${outputPath}`);
