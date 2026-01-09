const { existsSync, lstatSync, unlinkSync, symlinkSync } = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const clientNodeModules = path.join(root, 'client', 'node_modules');
const rootNodeModules = path.join(root, 'node_modules');
const packagesToLink = ['react-native'];

function ensureDirectory(dir) {
  if (!existsSync(dir)) {
    throw new Error(`Required directory missing: ${dir}`);
  }
}

function linkPackage(pkg) {
  const source = path.join(clientNodeModules, pkg);
  const target = path.join(rootNodeModules, pkg);

  if (!existsSync(source)) {
    console.warn(`Skipping link for ${pkg}; ${source} does not exist yet.`);
    return;
  }

  if (existsSync(target)) {
    const stats = lstatSync(target);
    if (stats.isSymbolicLink()) {
      unlinkSync(target);
    } else {
      return;
    }
  }

  symlinkSync(source, target, 'junction');
  console.log(`Linked ${pkg} -> ${source}`);
}

function main() {
  ensureDirectory(clientNodeModules);
  ensureDirectory(rootNodeModules);

  packagesToLink.forEach(linkPackage);
}

main();
