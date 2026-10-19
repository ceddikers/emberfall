// Peer-to-peer networking over WebRTC (via PeerJS). One player hosts in their browser tab and
// acts as the server: it tracks everyone and relays positions, hero picks, casts and chat.
// Everyone else connects straight to the host using a 4-letter room code.

const Net = (() => {
  const PREFIX = 'emberfall-v1-';
  const MAX_PLAYERS = 8;
  // WebRTC often never notices a closed tab, so players say "bye" on the way out and send
  // heartbeats; anyone silent for TIMEOUT_MS is dropped.
  const PING_MS = 3000, TIMEOUT_MS = 15000;

  // setInterval that keeps ticking in background tabs (browsers throttle normal timers there,
  // but not timers inside a Web Worker).
  function steadyInterval(fn, ms) {
    try {
      const src = `setInterval(() => postMessage(0), ${ms});`;
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = fn;
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
    host, join, startSolo, steadyInterval,
  };

  let peer = null, hostConn = null, hostPlayer = null, players = new Map(), nextId = 1;

  // A handler error must never break the caller (on the host that caller can be the fight sim itself).
  const dispatch = msg => { const fn = net.handlers[msg.t]; if (fn) try { fn(msg); } catch (e) { console.error(e); } };
  const num = (v, lo, hi, fallback) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
  const clock = v => (Number.isFinite(v) && v >= 0 ? Math.round(v * 1000) / 1000 : null);   // a sender's game clock, in seconds
  const pub = p => ({ id: p.id, name: p.name, cls: p.cls, spec: p.spec || null, x: p.x, y: p.y, a: p.a });

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
    else if (p.conn.open) { p.conn.send(msg); net.stats.out++; }
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
        if (CLASS_IDS.has(msg.id)) { p.cls = msg.id; p.spec = /^[a-z]{1,16}$/.test(msg.spec) ? msg.spec : null; broadcast({ t: 'cls', id: p.id, cls: p.cls, spec: p.spec }, p.id); }
        break;
      case 'cast':
        if (!p.cls || !Number.isInteger(msg.i) || msg.i < 0 || msg.i > 6) return;
        p.x = num(msg.x, -3000, 3000, p.x); p.y = num(msg.y, -3000, 3000, p.y);
        // a: the move's id, so a move a talent swapped onto a button is found by others (specs.js abilityById)
        broadcast({ t: 'cast', id: p.id, i: msg.i, a: /^[a-z]{1,16}$/.test(msg.a) ? msg.a : undefined, x: p.x, y: p.y, tx: num(msg.tx, -3000, 3000, p.x), ty: num(msg.ty, -3000, 3000, p.y),
          ally: Number.isInteger(msg.ally) ? msg.ally : null, s: msg.s ? 1 : 0, c: clock(msg.c) }, p.id);
        break;
      case 'castStart':
        if (!p.cls || !Number.isInteger(msg.i) || msg.i < 0 || msg.i > 5) return;
        broadcast({ t: 'castStart', id: p.id, i: msg.i, dur: num(msg.dur, 0, 5, 1) }, p.id);
        break;
      case 'castStop':
        if (p.cls) broadcast({ t: 'castStop', id: p.id }, p.id);
        break;
      case 'auto':  // an auto-attack's visual (its damage goes to the host as a normal combat event)
        if (!p.cls || !/^[a-z]{1,8}$/.test(msg.k)) return;
        broadcast({ t: 'auto', id: p.id, k: msg.k, tx: num(msg.tx, -3000, 3000, p.x), ty: num(msg.ty, -3000, 3000, p.y), a: msg.a ? 1 : 0, s: msg.s ? 1 : 0 }, p.id);
        break;
      case 'kfx':
        if (!p.cls || !/^[a-z-]{1,16}$/.test(msg.k)) return;
        broadcast({ t: 'kfx', id: p.id, k: msg.k, s: msg.s ? 1 : 0, d: fxData(msg.d) }, p.id);
        break;
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
    conn.on('data', msg => {
      if (!msg || typeof msg.t !== 'string') return;
      net.stats.in++;
      if (me) {
        me.seen = Date.now();
        if (msg.t === 'ping') conn.send({ t: 'pong', c: Number.isFinite(msg.c) ? msg.c : undefined });   // echo the timestamp back
        else if (msg.t === 'bye') { removePlayer(me); conn.close(); }
        else handle(me, msg);
        return;
      }
      if (msg.t !== 'hello') return;
      if (players.size >= MAX_PLAYERS) {
        conn.send({ t: 'full', msg: `That game is full (${MAX_PLAYERS} players).` });
        setTimeout(() => conn.close(), 300);
        return;
      }
      me = addPlayer(msg.name, conn).p;
      me.seen = Date.now();
    });
    conn.on('close', () => { if (me) removePlayer(me); });
    conn.on('error', () => { if (me) removePlayer(me); });
  }

  function makeCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I or O, to avoid confusion with 1 and 0
    let s = '';
    for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }

  // a fresh start after a lost connection: drop the old peer so it stops answering for us
  function reset() {
    if (peer && !peer.destroyed) peer.destroy();
    peer = null; hostConn = null; hostPlayer = null;
    net.isHost = false; net.solo = false; net.online = false; net.room = null; net.stats.rtt = null;
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
          steadyInterval(() => {
            for (const pl of players.values()) {
              if (pl.conn && Date.now() - pl.seen > TIMEOUT_MS) { removePlayer(pl); pl.conn.close(); }
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

  function join(rawCode, name) {
    reset();
    return new Promise((resolve, reject) => {
      const code = String(rawCode || '').trim().toUpperCase();
      let settled = false;
      const fail = m => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (peer) peer.destroy();
        reject(new Error(m));
      };
      let lastHeard = Date.now();
      const timer = setTimeout(() => fail('Could not connect. Check the code; your network may also block peer-to-peer.'), 15000);
      peer = new Peer({ debug: 0 });
      peer.on('open', () => {
        const conn = hostConn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        conn.on('open', () => conn.send({ t: 'hello', name }));
        conn.on('data', msg => {
          if (!msg || typeof msg.t !== 'string' || conn !== hostConn) return;   // ignore a connection we've moved on from
          lastHeard = Date.now();
          net.stats.in++;
          if (msg.t === 'pong') { if (Number.isFinite(msg.c)) net.stats.rtt = performance.now() - msg.c; return; }
          if (msg.t === 'welcome') {
            settled = true; clearTimeout(timer);
            net.id = msg.id; net.room = code; net.online = true;
            const stop = steadyInterval(() => {
              if (!net.online || conn !== hostConn) { stop(); return; }
              if (Date.now() - lastHeard > TIMEOUT_MS) { stop(); conn.close(); return; }
              conn.send({ t: 'ping', c: performance.now() });
            }, PING_MS);
            resolve(msg);
          } else if (msg.t === 'full') fail(msg.msg);
          else if (msg.t === 'hostleft') { net.online = false; dispatch({ t: 'disconnect' }); conn.close(); return; }
          dispatch(msg);
        });
        conn.on('close', () => {
          if (conn !== hostConn) return;
          if (net.online) { net.online = false; dispatch({ t: 'disconnect' }); }
          else fail('The host closed the connection.');
        });
      });
      peer.on('error', err => {
        if (err.type === 'peer-unavailable') fail(`No game found with code ${code}.`);
        else if (!settled) fail(describe(err));
        else console.warn('peer error', err);
      });
    });
  }

  window.addEventListener('pagehide', () => {
    if (!net.online) return;
    if (!net.isHost && hostConn && hostConn.open) hostConn.send({ t: 'bye' });
    if (net.isHost) broadcast({ t: 'hostleft' }, hostPlayer.id);
    setTimeout(() => peer && peer.destroy(), 0);
  });

  return net;
})();

// a class moment's few parameters (a Thermal Shock's size and side...): small numbers and short words only
function fxData(d) {
  if (!d || typeof d !== 'object') return undefined;
  const o = {};
  for (const k of Object.keys(d).slice(0, 6)) {
    if (!/^[a-z]{1,8}$/.test(k)) continue;
    const v = d[k];
    if (typeof v === 'number' && Number.isFinite(v)) o[k] = Math.max(-1e4, Math.min(1e4, v));
    else if (typeof v === 'string' && /^[a-z0-9#]{1,12}$/.test(v)) o[k] = v;
  }
  return o;
}
