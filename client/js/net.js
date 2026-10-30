// Peer-to-peer networking over WebRTC (via PeerJS). One player hosts in their browser tab and
// acts as the server: it tracks everyone and relays positions, hero picks, casts and chat.
// Everyone else connects straight to the host using a 4-letter room code.

const Net = (() => {
  const PREFIX = 'emberfall-v1-';
  const MAX_PLAYERS = 8;
  // WebRTC often never notices a closed tab, so players say "bye" on the way out and send
  // heartbeats; anyone silent for TIMEOUT_MS is dropped.
  const PING_MS = 3000, TIMEOUT_MS = 15000;
  // A joined player who drops mid-raid keeps their slot for HOLD_MS (the game stands a bot in for them, see hostHooks);
  // their tab retries quietly for a little longer than that, and the host's reply says at once if the slot is gone.
  const HOLD_MS = 60000, REJOIN_MS = 70000, TRY_MS = 8000, RETRY_GAP_MS = 2000;
  const TOKEN = /^[A-Za-z0-9]{12,40}$/;

  // setInterval that keeps ticking in background tabs (browsers throttle normal timers there,
  // but not timers inside a Web Worker).
  function steadyInterval(fn, ms) {
    try {
      const src = `setInterval(() => postMessage(0), ${ms});`;
      let url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      // (once it ticks the worker has its script, and the blob needn't live on)
      w.onmessage = e => { if (url) { URL.revokeObjectURL(url); url = null; } fn(e); };
      return () => w.terminate();
    } catch (e) {
      const id = setInterval(fn, ms);
      return () => clearInterval(id);
    }
  }
  const SPAWN = { x: 1200, y: 1180 };
  const CLASS_IDS = new Set(CLASSES.map(c => c.id));

  const net = {
    id: null, online: false, solo: false, isHost: false, room: null, handlers: {}, hostHandlers: {},
    // joiner: 'ok', or 'lost' while the tab is quietly rejoining the host (then 'linklost' / 'linkback' go to the handlers)
    link: 'ok',
    // joiner: is the game somewhere a dropped link should be won back (a raid)? Else a drop is the old "lost connection".
    canRejoin: () => false,
    // host: the game's say over a joined player whose link dropped: shouldHold(p) -> keep the slot (a raid is running);
    // onHold(p) a stand-in takes over; onBack(p) they are back (hand the hero back, send the snapshot)
    hostHooks: {},
    // for the debug overlay: round trip to the host (ms, from the heartbeat) and messages in/out so far
    stats: { rtt: null, in: 0, out: 0 },
    peers: () => players.size,
    on(type, fn) { this.handlers[type] = fn; },
    // host only: messages from players that game code handles (combat events etc.): fn(playerId, msg)
    onHost(type, fn) { this.hostHandlers[type] = fn; },
    send(msg) {
      if (!this.online) return;
      if (this.isHost) handle(hostPlayer, msg);
      else if (hostConn && hostConn.open) { hostConn.send(msg); net.stats.out++; }
    },
    // host only: send to every player, the host included (solo: just to ourselves)
    broadcastAll(msg) {
      if (this.solo) { dispatch(msg); return; }
      if (this.isHost && this.online) broadcast(msg);
    },
    // host only: send to one player (nothing if they are away or gone)
    sendTo(id, msg) {
      const p = players.get(id);
      if (this.isHost && this.online && p && !p.held) deliver(p, msg);
    },
    // host only: players whose link dropped and whose slot is being held
    heldIds: () => [...players.values()].filter(p => p.held).map(p => p.id),
    host, join, startSolo, steadyInterval,
  };

  let peer = null, hostConn = null, hostPlayer = null, players = new Map(), nextId = 1, stopHostTimeouts = null;

  // A handler error must never break the caller (on the host that caller can be the fight sim itself).
  const dispatch = msg => { const fn = net.handlers[msg.t]; if (fn) try { fn(msg); } catch (e) { console.error(e); } };
  const num = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
  const clock = v => (Number.isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : null);   // a sender's game clock, in seconds
  const pub = p => ({ id: p.id, name: p.name, cls: p.cls, spec: p.spec || null, sv: p.sv || null, x: p.x, y: p.y, a: p.a });

  function describe(err) {
    switch (err.type) {
      case 'network': case 'server-error': case 'socket-error': case 'socket-closed':
        return 'Could not reach the matchmaking server. Check your internet connection.';
      case 'browser-incompatible': return 'This browser does not support WebRTC.';
      default: return err.message || 'Connection failed.';
    }
  }

  // ------------------------------------------------------------- host side

  // Send to one player: the host's own player is handled locally, everyone else over WebRTC.
  function deliver(p, msg) {
    if (!p.conn) dispatch(msg);
    else if (p.conn.open && !p.held) { p.conn.send(msg); net.stats.out++; }   // (a held player's link is down: nothing goes out until they are back)
  }
  function broadcast(msg, exceptId) {
    for (const p of players.values()) if (p.id !== exceptId) deliver(p, msg);
  }
  function uniqueName(raw) {
    const name = String(raw || '').replace(/[^\w \-']/g, '').trim().slice(0, 16) || 'Adventurer';
    const taken = new Set([...players.values()].map(p => p.name.toLowerCase()));
    let n = name, i = 2;
    while (taken.has(n.toLowerCase())) n = `${name.slice(0, 13)} ${i++}`;
    return n;
  }
  function addPlayer(rawName, conn) {
    const spawn = { x: SPAWN.x + (Math.random() - 0.5) * 120, y: SPAWN.y + Math.random() * 60 };
    const p = { conn, id: nextId++, name: uniqueName(rawName), cls: null, x: spawn.x, y: spawn.y, a: -Math.PI / 2, m: 0, l: 0 };
    const welcome = { t: 'welcome', id: p.id, name: p.name, spawn, room: net.room, players: [...players.values()].map(pub) };
    players.set(p.id, p);
    broadcast({ t: 'join', p: pub(p) }, p.id);
    if (conn) conn.send(welcome);
    return { p, welcome };
  }
  function removePlayer(p) {
    if (!players.has(p.id)) return;
    players.delete(p.id);
    broadcast({ t: 'leave', id: p.id });
  }
  // A joined player's link ended without a goodbye. In a raid the slot is held (net.hostHooks) instead of dropped.
  function lose(p) {
    if (!players.has(p.id) || p.held) return;
    const hk = net.hostHooks;
    if (p.tok && hk.shouldHold && hk.shouldHold(p)) {
      p.held = true; p.holdUntil = Date.now() + HOLD_MS;
      try { hk.onHold && hk.onHold(p); } catch (e) { console.error(e); }
      try { p.conn.close(); } catch (e) { /* already gone */ }
    } else removePlayer(p);
  }
  // a held (or half-dead) player's tab is back on a new connection: the same player, hero and all
  function resume(p, conn) {
    const old = p.conn;
    p.conn = conn; p.held = false; p.holdUntil = 0; p.seen = Date.now();
    if (old && old !== conn) { try { old.close(); } catch (e) { /* already gone */ } }   // (its handlers ignore it from here: it is no longer p.conn)
    conn.send({ t: 'welcome', id: p.id, name: p.name, spawn: { x: p.x, y: p.y }, room: net.room, resumed: 1, players: [...players.values()].filter(q => q.id !== p.id).map(pub) });
    try { net.hostHooks.onBack && net.hostHooks.onBack(p); } catch (e) { console.error(e); }
  }

  // The host's copy of the game rules. Same checks the Node server used to do.
  function handle(p, msg) {
    if (!msg || typeof msg.t !== 'string') return;
    // Coordinates: the town is 0..2400 x 0..1700, the arena is centered on 0,0. `s` says which scene.
    switch (msg.t) {
      case 'pos':
        p.x = num(msg.x, -3000, 3000, p.x); p.y = num(msg.y, -3000, 3000, p.y); p.s = msg.s ? 1 : 0;
        p.a = num(msg.a, -10, 10, p.a); p.m = msg.m ? 1 : 0; p.l = num(msg.l, 0, 60, 0);
        // Relay right away (not on a timer) so it keeps working even if the host's tab is in the background.
        // The sender's clock rides along so everyone can space their moves evenly (interp.js).
        broadcast({ t: 'snap', ps: [[p.id, Math.round(p.x), Math.round(p.y), +p.a.toFixed(2), p.m, Math.round(p.l), p.s, clock(msg.c)]] }, p.id);
        break;
      case 'cls':
        // spec: the hero's specialization id (specs.js), or none for the base kit
        // sv: the Cinder Sovereign's cosmetic rewards this hero wears, { wings, glow } or none (heroes.js SvRewards: drawn on remote heroes from this)
        if (CLASS_IDS.has(msg.id)) {
          p.cls = msg.id; p.spec = /^[a-z]{1,16}$/.test(msg.spec) ? msg.spec : null;
          p.sv = msg.sv && typeof msg.sv === 'object' && (msg.sv.wings || msg.sv.glow) ? { wings: msg.sv.wings ? 1 : 0, glow: msg.sv.glow ? 1 : 0 } : null;
          broadcast({ t: 'cls', id: p.id, cls: p.cls, spec: p.spec, sv: p.sv }, p.id);
        }
        break;
      case 'cast':
        if (!p.cls || !Number.isInteger(msg.i) || msg.i < 0 || msg.i > 7) return;   // (6: the dash, 7: the Ultimate)
        p.x = num(msg.x, -3000, 3000, p.x); p.y = num(msg.y, -3000, 3000, p.y);
        // a: the move's id, so a move a talent swapped onto a button is found by others (specs.js abilityById)
        broadcast({ t: 'cast', id: p.id, i: msg.i, a: /^[a-z]{1,16}$/.test(msg.a) ? msg.a : undefined, x: p.x, y: p.y, tx: num(msg.tx, -3000, 3000, p.x), ty: num(msg.ty, -3000, 3000, p.y),
          ally: Number.isInteger(msg.ally) ? msg.ally : null, s: msg.s ? 1 : 0, c: clock(msg.c), st: Number.isInteger(msg.st) && msg.st >= 0 && msg.st < 8 ? msg.st : undefined }, p.id);   // (st: a combo's step)
        break;
      case 'castStart':
        if (!p.cls || !Number.isInteger(msg.i) || msg.i < 0 || msg.i > 5) return;
        // h, to: a heal's expected size and the ally it's aimed at (the party frames' incoming-heal preview)
        broadcast(Object.assign({ t: 'castStart', id: p.id, i: msg.i, dur: num(msg.dur, 0, 5, 1) },
          Number.isFinite(msg.h) && msg.h >= 1 && Number.isInteger(msg.to) && msg.to >= 0 && msg.to < 1e6 ? { h: Math.round(Math.min(msg.h, 1e5)), to: msg.to } : null), p.id);
        break;
      case 'castStop':
        if (p.cls) broadcast({ t: 'castStop', id: p.id }, p.id);
        break;
      case 'auto':  // an auto-attack's visual (its damage goes to the host as a normal combat event)
        if (!p.cls || !/^[a-z]{1,8}$/.test(msg.k)) return;
        broadcast({ t: 'auto', id: p.id, k: msg.k, tx: num(msg.tx, -3000, 3000, p.x), ty: num(msg.ty, -3000, 3000, p.y), a: msg.a ? 1 : 0, s: msg.s ? 1 : 0 }, p.id);
        break;
      case 'kfx':
        if (!p.cls || !/^[A-Za-z-]{1,20}$/.test(msg.k)) return;
        broadcast({ t: 'kfx', id: p.id, k: msg.k, s: msg.s ? 1 : 0, d: fxData(msg.d) }, p.id);
        break;
      case 'pbf': {   // a hero's buffs for the party frames (party-buffs.js): cleaned here, then on to the others
        const m = p.cls ? pbfData(msg) : null;
        if (m) broadcast(Object.assign({ t: 'pbf', id: p.id }, m), p.id);
        break;
      }
      case 'chat': {
        const text = String(msg.text || '').trim().slice(0, 120);
        if (text) broadcast({ t: 'chat', id: p.id, text }, p.id);
        break;
      }
      default: {
        const fn = net.hostHandlers[msg.t];
        if (fn) fn(p.id, msg);
      }
    }
  }

  function onConnection(conn) {
    let me = null;
    const mine = () => !!me && me.conn === conn;   // (false for a connection a rejoin has replaced)
    conn.on('data', msg => {
      if (!msg || typeof msg.t !== 'string') return;
      net.stats.in++;
      if (me) {
        if (!mine()) return;
        me.seen = Date.now();
        if (msg.t === 'ping') conn.send({ t: 'pong', c: Number.isFinite(msg.c) ? msg.c : undefined });   // echo the timestamp back
        else if (msg.t === 'bye') { removePlayer(me); conn.close(); }
        else handle(me, msg);
        return;
      }
      if (msg.t !== 'hello') return;
      // a dropped player's tab coming back: it carries the token it joined with
      if (msg.rejoin) {
        const back = TOKEN.test(msg.tok) ? [...players.values()].find(q => q.tok === msg.tok && q.conn) : null;
        if (!back) { conn.send({ t: 'norejoin' }); setTimeout(() => conn.close(), 300); return; }
        me = back;
        resume(back, conn);
        return;
      }
      if (players.size >= MAX_PLAYERS) {
        conn.send({ t: 'full', msg: `That game is full (${MAX_PLAYERS} players).` });
        setTimeout(() => conn.close(), 300);
        return;
      }
      me = addPlayer(msg.name, conn).p;
      me.seen = Date.now();
      if (TOKEN.test(msg.tok)) me.tok = msg.tok;
    });
    conn.on('close', () => { if (mine()) lose(me); });
    conn.on('error', () => { if (mine()) lose(me); });
  }

  function makeCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, to avoid confusion with 1 and 0
    let s = '';
    for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }

  // a fresh start after a lost connection: drop the old peer so it stops answering for us
  function reset() {
    if (stopHostTimeouts) { stopHostTimeouts(); stopHostTimeouts = null; }
    if (stopBeat) { stopBeat(); stopBeat = null; }
    if (rejoinTimer) { clearTimeout(rejoinTimer); rejoinTimer = null; }
    if (peer && !peer.destroyed) peer.destroy();
    peer = null; hostConn = null; hostPlayer = null; session = null;
    net.isHost = false; net.solo = false; net.online = false; net.room = null; net.stats.rtt = null; net.link = 'ok';
  }

  function host(name) {
    reset();
    return new Promise((resolve, reject) => {
      const attempt = n => {
        const code = makeCode();
        peer = new Peer(PREFIX + code, { debug: 0 });
        peer.on('open', () => {
          net.isHost = true; net.room = code; net.online = true;
          players = new Map(); nextId = 1;
          const { p, welcome } = addPlayer(name, null);
          hostPlayer = p; net.id = p.id;
          stopHostTimeouts = steadyInterval(() => {
            for (const pl of [...players.values()]) {
              if (!pl.conn) continue;
              if (pl.held) { if (Date.now() > pl.holdUntil) removePlayer(pl); continue; }   // (held long enough: they are gone)
              if (Date.now() - pl.seen > TIMEOUT_MS) { lose(pl); try { pl.conn.close(); } catch (e) { /* already gone */ } }
            }
          }, PING_MS);
          resolve(welcome);
        });
        peer.on('connection', onConnection);
        peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); }); // keep accepting new joins
        peer.on('error', err => {
          if (err.type === 'unavailable-id' && n < 5) { peer.destroy(); attempt(n + 1); return; }
          if (!net.online) reject(new Error(describe(err)));
          else console.warn('peer error', err);
        });
      };
      attempt(0);
    });
  }

  // Play alone without any network: we are the host of a room nobody else can join.
  function startSolo(name) {
    reset();
    net.isHost = true; net.solo = true; net.online = false; net.room = null; net.id = 1;
    return Promise.resolve({ t: 'welcome', id: 1, name: String(name || 'Adventurer').slice(0, 16), spawn: { x: SPAWN.x, y: SPAWN.y }, players: [] });
  }

  // ------------------------------------------------------------- client side

  // What a joined tab needs to win its slot back: the room, its name and the token the host knows it by.
  let session = null, lastHeard = 0, stopBeat = null, rejoinTimer = null;
  const makeToken = () => {
    const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    try { const r = new Uint8Array(24); crypto.getRandomValues(r); for (const b of r) s += A[b % A.length]; } catch (e) { for (let i = 0; i < 24; i++) s += A[Math.floor(Math.random() * A.length)]; }
    return s;
  };

  // pings the host every few seconds; a host silent for TIMEOUT_MS is a lost link (closing the connection says so)
  function beat(conn) {
    if (stopBeat) stopBeat();
    const stop = stopBeat = steadyInterval(() => {
      if (!net.online || conn !== hostConn) { stop(); return; }
      if (Date.now() - lastHeard > TIMEOUT_MS) { stop(); conn.close(); return; }
      if (conn.open) conn.send({ t: 'ping', c: performance.now() });
    }, PING_MS);
  }

  // The link to the host is up (a first join, or a rejoin): this connection is the host connection from here on.
  function adopt(pr, conn, code) {
    const old = peer;
    peer = pr; hostConn = conn; lastHeard = Date.now();
    if (old && old !== pr && !old.destroyed) old.destroy();
    net.room = code; net.online = true;
    beat(conn);
  }

  // a message from the host on the live connection
  function onLive(conn, msg) {
    if (conn !== hostConn) return;   // ignore a connection we've moved on from
    lastHeard = Date.now();
    net.stats.in++;
    if (msg.t === 'pong') { if (Number.isFinite(msg.c)) net.stats.rtt = performance.now() - msg.c; return; }
    if (msg.t === 'hostleft') { net.online = false; net.link = 'ok'; dispatch({ t: 'disconnect' }); conn.close(); return; }
    dispatch(msg);
  }
  function onLiveClose(conn) {
    if (conn !== hostConn || !net.online) return;
    // in a raid the tab tries to get back in quietly; anywhere else (or with nothing to rejoin) it is the old lost connection
    if (session && !net.isHost && net.canRejoin()) beginRejoin();
    else { net.online = false; dispatch({ t: 'disconnect' }); }
  }

  // One try at reaching the host: resolves with { peer, conn, welcome } once the host has answered "welcome".
  // Rejects with an Error that may carry .fatal (stop trying: full, or the slot is gone) or .gone (no such room on the broker).
  function dial(code, name, rejoin, ms) {
    return new Promise((resolve, reject) => {
      let done = false;
      const pr = new Peer({ debug: 0 });
      const end = (err, ok) => {
        if (done) return;
        done = true; clearTimeout(timer);
        if (err) { try { pr.destroy(); } catch (e) { /* already gone */ } reject(err); } else resolve(ok);
      };
      const timer = setTimeout(() => end(new Error('Could not connect. Check the code; your network may also block peer-to-peer.')), ms);
      pr.on('open', () => {
        const conn = pr.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => conn.send(rejoin ? { t: 'hello', name, tok: session.tok, rejoin: 1 } : { t: 'hello', name, tok: session.tok }));
        conn.on('data', msg => {
          if (!msg || typeof msg.t !== 'string') return;
          if (done) { onLive(conn, msg); return; }
          if (msg.t === 'welcome') { adopt(pr, conn, code); end(null, { peer: pr, conn, welcome: msg }); onLive(conn, msg); }   // (the welcome goes to the handlers too)
          else if (msg.t === 'full') end(Object.assign(new Error(msg.msg), { fatal: true }));
          else if (msg.t === 'norejoin') end(Object.assign(new Error('Your place in the raid is gone.'), { fatal: true }));
        });
        conn.on('close', () => { if (done) onLiveClose(conn); else end(new Error(rejoin ? 'The host closed the connection.' : 'The host closed the connection.')); });
      });
      pr.on('error', err => {
        if (done) { console.warn('peer error', err); return; }
        if (err.type === 'peer-unavailable') end(Object.assign(new Error(`No game found with code ${code}.`), { gone: true }));
        else end(new Error(describe(err)));
      });
    });
  }

  function join(rawCode, name) {
    reset();
    const code = String(rawCode || '').trim().toUpperCase();
    session = { code, name, tok: makeToken() };
    return dial(code, name, false, 15000).then(({ welcome }) => {
      net.id = welcome.id;
      return welcome;
    }, err => { session = null; throw err; });
  }

  // The link dropped mid-raid. Keep trying for REJOIN_MS (the host holds the slot for HOLD_MS), quietly: 'linklost' tells
  // the game once, 'linkback' when the host has taken us back (msg.welcome), 'disconnect' if it never does.
  function beginRejoin() {
    if (net.link === 'lost') return;
    net.link = 'lost';
    if (stopBeat) { stopBeat(); stopBeat = null; }
    dispatch({ t: 'linklost' });
    const t0 = Date.now();
    let gone = 0;
    const giveUp = () => {
      if (net.link !== 'lost') return;
      net.link = 'ok'; net.online = false; rejoinTimer = null;
      dispatch({ t: 'disconnect' });
    };
    const attempt = () => {
      rejoinTimer = null;
      if (net.link !== 'lost') return;
      if (Date.now() - t0 > REJOIN_MS) { giveUp(); return; }
      dial(session.code, session.name, true, TRY_MS).then(({ welcome }) => {
        if (net.link !== 'lost') return;
        net.link = 'ok';
        dispatch({ t: 'linkback', welcome });
      }, err => {
        if (net.link !== 'lost') return;
        // twice "no such room" in a row: the host's tab is gone, not just slow (the old lost connection)
        if (err.fatal || (err.gone && ++gone >= 2)) { giveUp(); return; }
        if (!err.gone) gone = 0;
        rejoinTimer = setTimeout(attempt, RETRY_GAP_MS);
      });
    };
    attempt();
  }

  window.addEventListener('pagehide', () => {
    if (!net.online) return;
    if (!net.isHost && hostConn && hostConn.open) hostConn.send({ t: 'bye' });
    if (net.isHost) broadcast({ t: 'hostleft' }, hostPlayer.id);
    setTimeout(() => peer && peer.destroy(), 0);
  });

  return net;
})();

// a class moment's few parameters (a Thermal Shock's size and side, an Alembist vial's recipe and target...): small numbers,
// short words and short lists only
// A 'pbf' message from a player (party-buffs.js): { b: [[id, seconds left, stacks, flags, name?], ...], tp?: { id: text } }, kept to its shape and size.
function pbfData(msg) {
  if (!msg || !Array.isArray(msg.b)) return null;
  const idOk = v => typeof v === 'string' && /^[A-Za-z0-9_:.-]{1,32}$/.test(v), int = (v, lo, hi) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : lo);
  const b = [];
  for (const r of msg.b.slice(0, 24)) {
    if (!Array.isArray(r) || !idOk(r[0]) || !Number.isFinite(r[1])) continue;
    const e = [r[0], Math.max(-1, Math.min(9999, Math.round(r[1] * 10) / 10)), int(r[2], 1, 99), int(r[3], 0, 7)];
    if (typeof r[4] === 'string' && r[4]) e.push(r[4].replace(/[^\w \-'.:%+]/g, '').slice(0, 24));
    b.push(e);
  }
  const out = { b };
  if (msg.tp && typeof msg.tp === 'object') {
    const tp = {};
    for (const k of Object.keys(msg.tp).slice(0, 24)) if (idOk(k) && typeof msg.tp[k] === 'string') tp[k] = msg.tp[k].replace(/[<>]/g, '').slice(0, 360);
    if (Object.keys(tp).length) out.tp = tp;
  }
  return out;
}
function fxData(d) {
  if (!d || typeof d !== 'object') return undefined;
  const o = {};
  const val = v => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-1e4, Math.min(1e4, v))
    : typeof v === 'string' && /^[A-Za-z0-9#_-]{1,16}$/.test(v) ? v : typeof v === 'boolean' || v === null ? v : undefined);
  for (const k of Object.keys(d).slice(0, 8)) {
    if (!/^[a-z]{1,8}$/.test(k)) continue;
    const v = d[k];
    if (Array.isArray(v)) { const a = v.slice(0, 8).map(val); if (a.every(x => x !== undefined)) o[k] = a; }   // (a Grand Blend's parts)
    else if (val(v) !== undefined) o[k] = val(v);
  }
  return o;
}
