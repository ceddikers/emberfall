#!/usr/bin/env node
// Voice files: what the game expects, what is on disk, and the manifest entries for them.
//
//   node tools/audio/voice-manifest.js           scan client/sounds/voice/, merge every voice file into
//                                                client/sounds/manifest.json as 'voice/<id>' (other entries kept),
//                                                and report what is still missing
//   node tools/audio/voice-manifest.js --dry     the same, without writing the manifest
//   node tools/audio/voice-manifest.js --list    every expected file name, one per line (<lineId>-<n>.ogg)
//   node tools/audio/voice-manifest.js --json    the expected files as JSON ({ file, lineId, n, speaker, text, note })
//   node tools/audio/voice-manifest.js --doc     rewrite docs/audio/voice-lines.md (the recording script) from the data
//
// File scheme (client/js/voice-lines.js): each variant of a line is its own file, numbered from 1 in the order its
// texts are listed: voice/<lineId>-<n>.ogg, e.g. voice/boss-grubnak-intro-2.ogg. .mp3/.wav/.m4a also work: those
// go in the manifest with their extension ('voice/hero-bastion-move-1.mp3'); .ogg goes in bare (audio.js adds it).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const VOICE_DIR = path.join(ROOT, 'client', 'sounds', 'voice');
const MANIFEST = path.join(ROOT, 'client', 'sounds', 'manifest.json');
const DOC = path.join(ROOT, 'docs', 'audio', 'voice-lines.md');
const EXT = /\.(ogg|mp3|wav|m4a)$/i;

function loadVoiceLines() {
  return require(path.join(ROOT, 'client', 'js', 'voice-lines.js'));
}

function expected(VL) { return VL.files(); }

// manifest entries for what is on disk, and the merged manifest
function scan(VL, dir = VOICE_DIR) {
  const want = new Map(expected(VL).map(f => [f.file, f]));
  const onDisk = fs.existsSync(dir) ? fs.readdirSync(dir).filter(n => EXT.test(n)).sort() : [];
  const entries = [], unknown = [], found = new Set();
  for (const name of onDisk) {
    const bare = name.replace(EXT, '');
    entries.push(/\.ogg$/i.test(name) ? 'voice/' + bare : 'voice/' + name);
    if (want.has(bare)) found.add(bare); else unknown.push(name);
  }
  const missing = [...want.keys()].filter(k => !found.has(k));
  return { entries, unknown, missing, found, total: want.size };
}

function merge(entries, file = MANIFEST) {
  let list = [];
  if (fs.existsSync(file)) {
    try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); if (Array.isArray(j)) list = j; else throw new Error('not an array'); }
    catch (e) { console.error(`manifest.json could not be read (${e.message}); not touching it.`); process.exit(1); }
  }
  const keep = list.filter(id => typeof id === 'string' && !id.startsWith('voice/'));
  return keep.concat(entries);
}

// ------------------------------------------------------------------ the recording script (docs/audio/voice-lines.md)
const KIND_TITLE = {
  move: 'Move (told to go somewhere)', select: 'Select (clicked on)', down: 'Down (falls in battle)', revive: 'Revived',
  low: 'Low health', ult: 'Ultimate (shouted as it fires)', victory: 'Victory (after a boss falls)',
  intro: 'Intro (as the fight is shown)', pull: 'Pull (the fight begins)', phase: 'Phase changes', taunt: 'Taunts (75 / 50 / 25% health)',
  enrage: 'Enrage', death: 'Death', wipe: 'Wipe (the party has fallen)',
};
const MIN_HEROES = ['bastion', 'ranger', 'pyromancer', 'cleric'];
const MIN_BOSS_KINDS = ['intro', 'death', 'wipe'];
const inMinimum = e => e.boss ? MIN_BOSS_KINDS.includes(e.kind) : (MIN_HEROES.includes(e.speakerId) && (e.kind === 'move' || e.kind === 'select'));


function buildDoc(VL) {
  const T = VL.TABLE, files = VL.files();
  const esc = s => String(s).replace(/\|/g, '\\|');
  const secs = f => VL.duration(f.text, T[f.lineId].voiceHint);
  const total = files.length, totalSecs = files.reduce((a, f) => a + secs(f), 0);
  const minFiles = files.filter(f => inMinimum(T[f.lineId]));
  const minSecs = minFiles.reduce((a, f) => a + secs(f), 0);
  const L = [];
  L.push('# Emberfall voice lines: the recording script', '');
  L.push('Every spoken line in the game, for recording with an AI voice tool. **Generated** from `client/js/voice-lines.js` by `node tools/audio/voice-manifest.js --doc`: change a line there, then regenerate this page, so the game and the script never drift apart.', '');
  L.push(`**${total} files** (${files.filter(f => !T[f.lineId].boss).length} hero, ${files.filter(f => T[f.lineId].boss).length} boss), about **${(totalSecs / 60).toFixed(1)} minutes** of audio in all. The recommended minimum set is **${minFiles.length} files**, about ${(minSecs / 60).toFixed(1)} minutes.`, '');
  L.push('## How to record and deliver', '');
  L.push('- **One file per row.** The file name is in the first column, exactly as written (lower case, hyphens). A line with several variants has one file for each, numbered from 1: `boss-grubnak-intro-1.ogg`, `boss-grubnak-intro-2.ogg`, `boss-grubnak-intro-3.ogg`. The game picks a variant, and shows that variant\'s exact text as the subtitle, so each file must say exactly its own line.');
  L.push('- **Format:** `.ogg` (Vorbis, quality 5 or so) preferred; `.mp3` also works. Mono, 44.1 kHz.');
  L.push('- **Trim:** no leading silence (the line must start within 20 ms), at most 150 ms of tail. No music, no sound effects under the voice. Reverb only where the direction asks for it (Volkar, the Hollow King), and keep it short.');
  L.push('- **Level:** normalise each file to about **-16 LUFS** integrated, peaks under -1 dBTP. Shouts are still -16 LUFS: the shout is in the performance, not the level.');
  L.push('- **Where:** put the files in `client/sounds/voice/`, then run `node tools/audio/voice-manifest.js`. It scans that folder, rewrites the `voice/...` entries of `client/sounds/manifest.json` (every other entry is kept) and lists what is still missing. Only files in the manifest are played; a line with no file stays silent (or uses the device voice if the player turns that on) and still shows its subtitle.');
  L.push('- **Delivery notes** in the last column are for the performance only; they are never spoken. Brackets in a line mean nothing: speak only the words in the "Line" column. Ellipses (`...`) are breaths or trailing off.');
  L.push('- **Lengths:** every line is meant to land in 0.5 to 2.5 seconds for heroes and 1 to 4 seconds for bosses. If a take runs long, ask for it faster rather than cutting words.');
  L.push('- **Pronunciation:** Grubnak GROOB-nack; Skitterra skih-TEH-ra; Volkar VOLL-kar; Bastion BAS-tee-un; Alembist AL-em-bist; Gorgemaw GORJ-maw; Marionettist marry-uh-NET-ist; Chronomancer KRON-o-man-ser; Flambé flahm-BAY.', '');
  L.push('## When lines play', '');
  L.push('- **Heroes** speak only for the player\'s own hero; other players\' heroes stay silent. A move bark plays on about 12-18% of move orders (each hero has its own rate), never more than once in 9 s, never while a boss is talking and never during the pull countdown. Clicking your own hero: 60%, at most every 6 s. Low health: always, at most every 12 s. Ultimate, down and revive: always. Victory: after the boss\'s death line.');
  L.push('- **Bosses**: intro when the fight is shown, the pull line as it starts, one line at each phase change, the enrage and death lines always. Move calls are rare: each has its own chance, and a boss makes at most one call or taunt every 22-30 s. Taunts fire once each at 75%, 50% and 25% health. Priorities: enrage and death > phase, intro, pull and wipe > move calls > taunts > hero barks. A boss line always cuts off a hero bark.', '');
  L.push('## Recommended minimum set (record these first)', '');
  L.push(`The move and select lines of four favourites (${MIN_HEROES.map(h => VL.SPEAKERS[h].name).join(', ')}), and every boss\'s intro, death and wipe lines: **${minFiles.length} files**. The game is fully playable with any subset: anything missing is simply silent.`, '');
  const bySpk = {};
  for (const f of minFiles) (bySpk[f.speakerId] = bySpk[f.speakerId] || []).push(f.file);
  for (const k of Object.keys(bySpk)) L.push(`- **${VL.SPEAKERS[k].name}:** ${bySpk[k].map(x => '`' + x + '`').join(', ')}`);
  L.push('');
  L.push('## Totals by speaker', '', '| Speaker | Files | About |', '|---|---:|---:|');
  const order = Object.keys(VL.SPEAKERS);
  for (const k of order) {
    const fs_ = files.filter(f => f.speakerId === k);
    L.push(`| ${VL.SPEAKERS[k].name} | ${fs_.length} | ${Math.round(fs_.reduce((a, f) => a + secs(f), 0))} s |`);
  }
  L.push(`| **All** | **${total}** | **${(totalSecs / 60).toFixed(1)} min** |`, '');

  const section = (title, keys) => {
    L.push(`## ${title}`, '');
    for (const k of keys) {
      const sp = VL.SPEAKERS[k], d = sp.dir;
      L.push(`### ${sp.name}`, '');
      L.push(`**Voice:** ${d.adj}. ${d.ref}`, '');
      L.push(`- **Age:** ${d.age}`, `- **Accent:** ${d.accent}`, `- **Pacing:** ${d.pacing}`, `- **Device-speech fallback:** pitch ${sp.hint.pitch}, rate ${sp.hint.rate}`, '');
      L.push('| File | Line | Delivery |', '|---|---|---|');
      let lastKind = null;
      for (const id of Object.keys(VL.TABLE)) {
        const e = VL.TABLE[id];
        if (e.speakerId !== k) continue;
        e.texts.forEach((t, i) => {
          let kindLabel = KIND_TITLE[e.kind] || e.kind;
          if (e.kind === 'move' && e.boss) kindLabel = 'Move call: ' + e.moveName;
          if (e.kind === 'phase') kindLabel = 'Phase ' + e.phase + (e.phaseName ? ': ' + e.phaseName : '');
          if (e.kind === 'taunt') kindLabel = 'Taunt at ' + ({ 1: '75%', 2: '50%', 3: '25%' }[e.taunt]) + ' health';
          const head = (id + kindLabel) !== lastKind ? `*${kindLabel}* ` : '';
          lastKind = id + kindLabel;
          const star = inMinimum(e) ? ' ★' : '';
          L.push(`| \`${id}-${i + 1}.ogg\`${star} | ${esc(t)} | ${head ? head + '· ' : ''}${esc(e.notes[i])} |`);
        });
      }
      L.push('');
    }
  };
  section('Bosses', order.filter(k => VL.SPEAKERS[k].boss));
  section('Heroes', order.filter(k => !VL.SPEAKERS[k].boss));
  L.push('★ = in the recommended minimum set.', '');
  return L.join('\n');
}

// ------------------------------------------------------------------ main
if (require.main === module) {
  const args = process.argv.slice(2);
  const VL = loadVoiceLines();
  if (args.includes('--list')) { for (const f of expected(VL)) console.log(f.file + '.ogg'); process.exit(0); }
  if (args.includes('--json')) { console.log(JSON.stringify(expected(VL), null, 1)); process.exit(0); }
  if (args.includes('--doc')) {
    fs.mkdirSync(path.dirname(DOC), { recursive: true });
    fs.writeFileSync(DOC, buildDoc(VL));
    console.log('wrote ' + path.relative(ROOT, DOC));
    process.exit(0);
  }
  const s = scan(VL);
  const merged = merge(s.entries);
  if (!args.includes('--dry')) {
    fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
    fs.writeFileSync(MANIFEST, JSON.stringify(merged, null, 1) + '\n');
  }
  console.log(`voice files: ${s.found.size} of ${s.total} expected found; ${s.entries.length} voice entries in the manifest${args.includes('--dry') ? ' (dry run, not written)' : ''}.`);
  if (s.unknown.length) console.log(`not used by the game (check the names): ${s.unknown.join(', ')}`);
  if (s.missing.length && s.found.size) console.log(`still missing: ${s.missing.length} (run with --list for every name)`);
}

module.exports = { loadVoiceLines, expected, scan, merge, buildDoc, VOICE_DIR, MANIFEST };
