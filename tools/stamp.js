// Cache-busting stamps for client/index.html: every local <script src> and <link href> gets ?v=<hash of the file>, so after a
// deploy a browser fetches exactly the files that changed instead of mixing fresh ones with cached ones (GitHub Pages lets
// browsers keep a file for about ten minutes). check.js runs this before every push.
//   node tools/stamp.js           rewrite the stamps that are out of date
//   node tools/stamp.js --check   only report them (exit 1 if any)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CLIENT = path.join(__dirname, '..', 'client');
const INDEX = path.join(CLIENT, 'index.html');

// (line endings don't count: a checkout that turned CRLF into LF still gets the same stamp)
const hashOf = file => crypto.createHash('sha1').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);

function stamp(write) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const stale = [], missing = [];
  let n = 0;
  const out = html.replace(/(<script\s+src="|<link\s+rel="stylesheet"\s+href=")([^"?]+)(\?v=[0-9a-f]*)?"/g, (all, head, url, old) => {
    if (/^[a-z]+:|^\/\//i.test(url)) return all;   // (other sites: peerjs, fonts)
    const file = path.join(CLIENT, url);
    if (!fs.existsSync(file)) { missing.push(url); return all; }
    n++;
    const v = '?v=' + hashOf(file);
    if (old !== v) stale.push(url);
    return head + url + v + '"';
  });
  if (write && out !== html) fs.writeFileSync(INDEX, out);
  return { n, stale, missing };
}

if (require.main === module) {
  const check = process.argv.includes('--check');
  const { n, stale, missing } = stamp(!check);
  if (missing.length) { console.log('stamps: missing files: ' + missing.join(', ')); process.exit(1); }
  if (check && stale.length) { console.log(`stamps: ${stale.length} of ${n} out of date (run node tools/stamp.js): ${stale.join(', ')}`); process.exit(1); }
  console.log(check ? `stamps: all ${n} current` : `stamps: ${n} files, ${stale.length} restamped`);
}

module.exports = { stamp };
