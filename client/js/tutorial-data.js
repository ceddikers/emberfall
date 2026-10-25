// The Tutorial (opt-in): everything worth knowing before a pull, in plain terms.
// Lessons are general chapters in reading order; bosses list every move by its exact cast-bar name (the same keys as
// the boss journal, client/js/journal/*.js). Written from the fight code: fight.js, the boss files, raid-ui.js, hud.js.
const TUTORIAL = {
  lessons: [
    {
      id: 'controls', title: 'Controls',
      pages: [
        { h: 'Moving', keys: ['Right-click', 'Left-click'],
          body: [
            'Right-click the floor to walk there. Hold the button and drag to steer as you go.',
            'There is no keyboard movement: your keys are for skills.',
            'Left-click a lantern, a prop or a person to walk over and use it.',
          ] },
        { h: 'Skills', keys: ['Q', 'W', 'E', 'R', 'D', 'F', 'T', 'Shift'],
          body: [
            'Q W E R D F are your six skills. T is your Ultimate, where your hero has one: the ring round it fills as you play your class, and at full it glows. A damage hero\'s opens a few seconds of empowered skills; a tank\'s or a healer\'s is one big moment for the whole party. A fall keeps half the charge.',
            'Shift + a healing or support skill casts it on yourself.',
          ] },
        { h: 'Dash', keys: ['Space'],
          body: [
            'Every hero has a dash on Space: two charges, each back 12 seconds after use. It goes where you are heading, or toward the cursor.',
            'A dash snaps a silk thread that is reeling you in. You cannot dash while rooted.',
          ] },
        { h: 'Panels and chat', keys: ['Enter', 'G', 'M', 'V', 'K', 'I', 'N', 'J', 'L', 'Esc'],
          body: [
            'Enter: chat. G: Limit Break. M: live damage meter (click its header for healing). V: set focus.',
            'K: options. I: bags. N: talents. J: journal. L: Logbook (feats, titles, secrets, your catch). Esc closes a panel or clears your targets; with nothing to close, it opens the menu (also the button in the bottom-left corner).',
          ] },
        { h: 'Options', keys: ['K'],
          body: [
            'Any skill or panel can be bound to another key or a mouse side button. Enter, Esc, Tab, `, 1-4 and the modifier keys are kept by the game.',
            'Arrange the HUD from the same panel: drag any piece where you want it; double-click a piece to put it back.',
          ] },
      ],
    },
    {
      id: 'targeting', title: 'Targeting',
      pages: [
        { h: 'Enemies', keys: ['Left-click', 'Tab', 'Shift+Tab', 'Esc'],
          body: [
            'Left-click an enemy to lock it as your target. Tab and Shift+Tab cycle through enemies, nearest first.',
            'With nothing locked, or your lock out of range, a skill hits the nearest enemy in range: the boss or an add.',
            'The target frame shows who that enemy is attacking.',
          ] },
        { h: 'Focus', keys: ['V'],
          body: [
            'V makes your current target your focus: a blue diamond over it and a frame of its own. V on it again clears it.',
          ] },
        { h: 'Allies', keys: ['1', '2', '3', '4', '`', 'Shift'],
          body: [
            '1-4 lock the party frames in their order: tank, healer, then damage. An Alembist\'s number keys mark its vials instead, so it takes F1-F4 for this.',
            '` locks the most hurt ally. Press it again within a second and a half to step to the next most hurt.',
            'A heal goes, in order, to: the party frame under your mouse, the ally under your cursor, your locked ally, the nearest ally to your cursor, then yourself. Shift + the key always means yourself.',
          ] },
        { h: 'Positionals', body: [
          'The ring round the boss shows its front (red arc and a pointer), its rear (purple arc) and its flanks (white arcs).',
          'Some moves hit harder from the rear or a flank; their tooltips say which.',
        ] },
        { h: 'Facing', body: [
          'You turn toward whatever you are casting at. That matters when a mechanic cares which way you face.',
        ] },
      ],
    },
    {
      id: 'hotbar', title: 'Your hotbar',
      pages: [
        { h: 'GCD and oGCD', body: [
          'GCD skills share a global cooldown of 2.5 seconds, shortened by haste. Some have cast times.',
          'oGCD skills have their own cooldowns and a short lock, so one or two fit between GCDs. Pressing more than that delays your next GCD (clipping).',
          'Every tooltip says GCD or oGCD, its cooldown, and its charges if it has any.',
          'A few kits are not paced by the GCD at all; their tooltips say what limits each move instead.',
        ] },
        { h: 'Queueing and casting', body: [
          'A press up to half a second early is queued and fires the instant it can.',
          'Moving cancels a cast, except in its last half second. Start casts when you know you can stand still.',
        ] },
        { h: 'Reading a slot', body: [
          'The sweep is the cooldown (or the GCD); the number is the seconds left; a small number in the corner is charges left.',
          'A glowing slot is ready to spend (a proc, a full gauge). A dimmed slot cannot be used now. A queued press stays lit.',
        ] },
        { h: 'Auto-attacks and buffs', body: [
          'Your weapon swings on its own every couple of seconds while you are fighting and an enemy is in range, never while you cast.',
          'Your buffs sit above the bar with their timers. The class gauge explains in its tooltip what fills it and what spends it.',
        ] },
      ],
    },
    {
      id: 'roles', title: 'Roles',
      pages: [
        { h: 'Tank', body: [
          'Hold the boss: while you stand, it attacks you and nobody else can pull it away. It auto-attacks its target every few seconds if they are near it, and walks after them.',
          'Tankbusters (red casts) hit whoever he is attacking: use a defensive as the cast starts.',
          'Face it away from the party: its busters are cones, and anyone else caught in one takes most of it.',
          'Place him: where the boss stands decides where many mechanics land.',
        ] },
        { h: 'Healer', body: [
          'Keep everyone alive. Purple casts are raid damage: top people up before they land.',
          'Your party frames show missing health. A frame lights up when its player has something you can cleanse.',
          'Healers carry a raise. Keep an eye on the boss bar: you are not exempt from mechanics.',
        ] },
        { h: 'Damage', body: [
          'Do damage without missing mechanics. A hit you could have avoided costs more damage than greed gains.',
          'Break what the fight asks you to break (eggs, knots, coffins) before it is too late, and kill linked adds together.',
        ] },
        { h: 'Who counts as "the tank"', body: [
          'Many targeted moves pick from everyone except the boss\'s current target. That is always a tank while one stands; with every tank down, whoever the boss turns to is treated as the tank: they get the buster and skip the spreads.',
        ] },
      ],
    },
    {
      id: 'threat', title: 'Taunts & adds',
      pages: [
        { h: 'Who the boss is on', body: [
          'The boss stays on the tank who taunted last, or on the tank it started on. Damage and healing do not move him.',
          'If that tank falls it goes to the other tank and stays there, even after a raise. With every tank down it goes for the nearest player, and the first tank raised takes it back.',
          'An eye on a party frame marks who the boss is attacking.',
        ] },
        { h: 'Taunt',
          body: [
            'Tanks only, and it rides on one of your own skills: the Bastion\'s Brace, the Bloodreaver\'s Bloodletting, the Runeguard\'s Rune Strike, the Ironpalm\'s Read, the Gorgemaw\'s Open Wide and the Oathbroker\'s Renegotiate.',
            'Use that skill while the enemy you face is attacking someone else and it taunts as well: the boss is yours from then on, until you fall or the other tank taunts. On an add, your threat on it jumps to 10% above the highest and it is fixed on you for 6 seconds. 20 second cooldown. If the boss is already on you, it is just the skill.',
            'A small mark above the skill shows the taunt is ready, and its seconds while it cools. You cannot taunt a boss that is out of reach.',
          ] },
        { h: 'Adds', body: [
          'Adds do keep threat. An add goes for the nearest player until someone hits it, then for whoever has done the most to it, tanks counting 2.75 times. That fades about 5% a second, and dying wipes it.',
          'Taunt works on adds.',
        ] },
      ],
    },
    {
      id: 'floor', title: 'Reading the floor',
      pages: [
        { h: 'Two colours', body: [
          'Every hit you can avoid is drawn on the floor from the start of its cast to the moment it lands, on every difficulty. On every boss the rim and its wash mean the same thing:',
          'Red: damage. Keep out of it, or keep it off the others when it is on you (a spread circle, a line aimed through you, a pool you are carrying). A deeper red is a tankbuster.',
          'Blue: share it. Stand in it together, or soak it.',
          'Safe floor has no colour. Nothing marks where to stand: it is wherever the red is not.',
          'A circle in a player\'s own colour (green, violet, pink or white, the colour of their number in the party list) belongs to that player alone.',
          'No rim at all means a raidwide: the whole room is hit and there is nothing to dodge.',
          'The art inside (meat, legs, lightning, silk) tells you whose move it is; the rim is the exact area.',
        ] },
        { h: 'Timing', body: [
          'A wash grows out from the origin as the cast runs. In the last moments the rim pulses faster.',
          'A circle that follows a player, or a line aimed at one, flashes white when it locks in place. After that, moving takes you out of it, but no longer moves it.',
        ] },
        { h: 'Shapes', body: [
          'Circles, cones out of the boss, lines and lanes, crosses of two lines, half the room, and rings.',
          'A donut (a red ring with a hole in its middle) spares only the floor inside that hole: get in.',
          'Some come as sequences: waves of rings, stripes catching one after another, beams that turn. Walk behind the part that has just landed.',
        ] },
        { h: 'Stack (blue, chevrons in)', body: [
          'On one player, chevrons closing in. Its damage is split among everyone inside.',
          'Fewer people than it wants: each takes half again as much. Nobody in it: everyone in the room is hit, as an avoidable hit.',
        ] },
        { h: 'Spread (red, chevrons out)', body: [
          'On you, chevrons pushing out. You take it; anyone else inside your circle takes half again as much, as an avoidable hit.',
        ] },
        { h: 'Tower (blue rim, a column of light)', body: [
          'A column of light with a countdown ring; the pips round it are how many people it wants.',
          'Everyone inside takes a small hit. Too few inside and the whole party takes a much bigger one.',
          'A tower whose column glows gold or blue wants someone of that charge (Volkar).',
        ] },
        { h: 'Proximity', body: [
          'Heat waves rolling out from one point: everyone is hit, far harder close in. Get as far away as you can.',
        ] },
        { h: 'Tethers', body: [
          'A thread between two players. Long: be farther apart than its length when it ends. Short (thick): stay within its length.',
          'Right: it runs straight and bright. Wrong: it sags and flickers. Wrong when it ends: both are hit.',
        ] },
        { h: 'Cover', body: [
          'Some blasts come from a point (the boss, the middle, the throne). Something solid between you and that point shelters you: a cask, a pillar, a lid, a boulder. The room fills with a red wash; the shadow behind each prop is simply left out of it.',
          'Cover takes a hit each time; a cracked prop has one hit left. Some blasts let only two shelter behind each prop.',
        ] },
        { h: 'What stays and what moves', body: [
          'Puddles, fire and sticky silk or acid stay on the floor. Standing in damage ticks; sticky ground slows you.',
          'Rolling meatballs, orbs and turning walls hit once as they pass and shove you aside.',
          'Thrown into a wall or a prop before the throw is done: a wall slam, extra damage and dazed for a moment.',
          'Floor that falls away or breaks off is no floor: off the edge you drop, or die.',
        ] },
      ],
    },
    {
      id: 'castbar', title: 'The cast bar & what\'s next',
      pages: [
        { h: 'The cast frame', body: [
          'The boss\'s cast, big and near the middle of the screen: its icon, its name, a bar and the seconds left. It flashes as the move lands.',
          'Between casts it shows the next move, dimmed, counting down from 15 seconds out.',
          'Drag it anywhere; double-click puts it back.',
        ] },
        { h: 'The colour of the cast', body: [
          'Purple, "Hits everyone": raid damage, or a stack or spread round for the whole party.',
          'Red, "Tank hit": a tankbuster on whoever he is attacking.',
          'Gold, "Burn it": a damage check. A goal mark appears on the boss bar.',
          'Dark red, "Enrage": the end of the fight.',
          'No colour: a mechanic. Read the floor.',
        ] },
        { h: 'Upcoming moves', body: [
          'Under the boss bar: its next three named moves and the seconds until each. It reads across phase changes, and shows the enrage when it is near.',
          'Every fight is the same authored sequence on every pull; nothing is random except who gets picked, and some sides and angles.',
        ] },
        { h: 'The boss bar', body: [
          'Health, a trail of recent damage, the difficulty and the fight clock ("Unengaged" before the pull). It dims while he is out of reach.',
          'Icons under it: Staggered (it takes more damage), Fury (its hits land harder), debuffs your party put on him, and the enrage timer in the last minute.',
        ] },
        { h: 'Auto-attacks', body: [
          'It winds up just before each auto-attack on its target.',
        ] },
      ],
    },
    {
      id: 'checks', title: 'Damage checks & enrage',
      pages: [
        { h: 'Hard enrage', body: [
          'Every boss has a named 8-second cast at about the ten-minute mark. When it lands, everyone dies.',
          'An icon under the boss bar counts down its last 60 seconds.',
        ] },
        { h: 'Soft enrage', body: [
          'Each phase ends at a health mark. If a slow party runs through all its moves first, its last few moves repeat, each pass with 10% more boss damage (the Fury icon).',
          'Some last phases ramp on their own as well: they get worse every pass until he dies.',
        ] },
        { h: 'Phase changes', body: [
          'When its health reaches the mark, the move set already running finishes (up to about 8 seconds) before the next phase starts. Pushing faster never cuts a combo in half.',
        ] },
        { h: 'Damage checks', body: [
          'A gold cast with a goal mark on the boss bar: get its health below the mark before the cast ends.',
          'Make it and the cast breaks, usually leaving him staggered and open. Miss it and it is usually a wipe.',
          'Passing one fills most of a Limit Break bar.',
        ] },
        { h: 'Heal checks', body: [
          'Some moves are survival checks: a stretch of heavy, unavoidable damage. If nobody falls during it, the Limit Break fills most of a bar.',
        ] },
      ],
    },
    {
      id: 'defensives', title: 'Defensives & mitigation',
      pages: [
        { h: 'Stacking', body: [
          'Damage reductions multiply together. The shield chip on a party frame shows the total: "taking 40% less damage".',
          'Shields soak what is left after reductions; they show as a segment on the health bar.',
        ] },
        { h: 'Timing windows', body: [
          'Some defensives are best pressed at the last instant. A Brace in the 0.8 seconds before a hit is a Perfect Block: that hit is cut by 60% and the Brace is spent.',
          'A Read catches a hit only in its first 0.4 seconds, halving it. Some moves reflect a single hit.',
          'Read the cast bar: the hit lands when it fills.',
        ] },
        { h: 'Immunity', body: [
          'A few cooldowns make you, or the whole party, immune for a moment. Others keep you from dropping below 1 health; those do not save you from the enrage or a fall.',
        ] },
        { h: 'Before the pull', body: [
          'Shields, reductions and heals over time put up before the pull carry into it, with whatever time they have left.',
        ] },
      ],
    },
    {
      id: 'status', title: 'Status effects',
      pages: [
        { h: 'From mistakes', body: [
          'Every avoidable hit gives you Vulnerability. Some moves also give Damage Down (10% less damage dealt for 10 seconds).',
          'Vulnerability: in a raid, each stack is 50% more damage taken, up to double, for 15 seconds. Two mistakes close together can kill you.',
          'Standing in a lasting puddle, fire or thread gives no Vulnerability.',
        ] },
        { h: 'Movement', body: [
          'Slowed: you move at about half speed (silk, venom, sticky ground).',
          'Rooted: you cannot move or dash. Dazed after a wall slam is a short root.',
        ] },
        { h: 'After a raise', body: [
          'Weakness: just raised, dealing 25% less damage for 20 seconds.',
        ] },
        { h: 'From the bosses', body: [
          'Tenderized: the next cleaver blow hits much harder. Stuffed: another plate hurts.',
          'Conductive: the next bolt you catch hurts far more. Static: a jolt every 1.5 seconds.',
          'Bleed: health lost over time. Royal Doom: when it runs out, you die. Dread: you met his eyes; meeting them again hurts far more.',
        ] },
        { h: 'Cleansing', body: [
          'Some healer tools wash off Damage Down, Vulnerability, slows and roots. A healer\'s frames light up on anyone who has one.',
        ] },
      ],
    },
    {
      id: 'limit', title: 'The Limit Break',
      pages: [
        { h: 'The gauge', keys: ['G'],
          body: [
            'Three bars under the party frames, shared by the whole party.',
            'Every mechanic that resolves with nobody taking an avoidable hit and nothing failed adds a sliver. A passed damage check, or a heal check with nobody lost, adds most of a bar. Raw damage adds nothing.',
          ] },
        { h: 'Spending it', body: [
          'G spends every whole bar at once, by whoever presses first. What it does depends on that player\'s role:',
          'Tank, Stand Fast: the party takes 20 / 35 / 50% less damage for 8 seconds.',
          'Healer, Rekindle: heals the party 30 / 60 / 100%. Three bars also raise everyone who has fallen.',
          'Damage, Emberfall: one blow worth 0.8 / 1.8 / 3% of the boss\'s health.',
          'Agree before the pull who presses it, and when.',
        ] },
      ],
    },
    {
      id: 'markers', title: 'Markers, pings & the pull',
      pages: [
        { h: 'Raid markers', body: [
          'A bar of markers: A B C D (circles) and 1 2 3 4 (squares). Click one, then the floor. Right-click one on the bar to pick it up; the cross picks them all up.',
          'Anyone in the raid can place them. The host remembers them per boss.',
        ] },
        { h: 'Pings', keys: ['Middle-click', 'Alt + drag'],
          body: [
            'Middle-click: a plain ping where you click, seen by the whole party for a few seconds.',
            'Alt + left-drag: a wheel of eight callouts round the cursor; let go over one to ping it where you pressed. Defaults: Stack, Spread, Move, On me, Danger, Go here, Wait, Nice.',
            'The speech-bubble button on the marker bar opens the callouts: change any slot to your own text or a small image.',
          ] },
        { h: 'The pull', body: [
          'The room is yours until someone hits the boss ("Unengaged" on the boss bar): place markers, buff, plan.',
          'The fight starts on the first blow, or use the clock button on the marker bar: a 5-second countdown, then he engages.',
          'The enrage clock starts at the pull.',
        ] },
      ],
    },
    {
      id: 'after', title: 'After a pull',
      pages: [
        { h: 'The death recap', body: [
          'While you are down: the last hits before you fell (up to five, in the last 10 seconds), the killing blow on top, each named by the move it came from. Avoidable ones are flagged.',
        ] },
        { h: 'The results', body: [
          'Everyone\'s damage, healing, damage taken, avoidable hits and deaths.',
          'The pull timeline: the boss\'s health over time, a dot for every cast he made coloured by its kind, and a cross for every death. Hover any of them.',
          'Your own report: GCD uptime, positionals, wasted resources and procs, cancelled casts, and what to work on.',
        ] },
        { h: 'Progress', body: [
          'Under the party frames: the pull count, your best pull (health left and phase reached), and a bar for each recent pull. A clear is gold.',
        ] },
        { h: 'The Practice Hall', body: [
          'In town. Any boss you have reached, either difficulty, from any phase. No loot, no clears, and the progress record does not see it. Empty slots fill with bots.',
        ] },
        { h: 'The journal', keys: ['J'],
          body: [
            'Each boss\'s moves, written up by your own hero once you have seen them.',
          ] },
      ],
    },
  ],

  bosses: {
    grubnak: {
      intro: 'Five courses in a kitchen that shrinks: the Appetiser and Mains teach his tools, the Flare-Up at 50% sets the top third burning for good, the Second Sitting pairs everything round the stockpot, and Dessert is a gauntlet that ends in Gorge until he drops or casts Last Call at about 10:00 (10:15 on Hard). Groups die to where they put things: grease that later burns, casks they need for Gut Blast, and his charge into the wrong wall.',
      phases: [
        { name: 'Appetiser', body: '100% to 80%. One tool at a time, with room between: Grease Fire, Mince, Ladle Spin, Lid Slam, Tenderize, Meat Toss with Family Meal, Larder Toss into Gut Blast. Hard opens with Clogged Drains.' },
        { name: 'Mains', body: '80% to 50%. Everything in pairs: Butcher\'s Charge, Chop Chop, Order Up!, Meat Toss into Family Meal, casks (with a Mince behind them on Normal) then the charge then Gut Blast, Order Up! under Rolling Meatballs, and on Normal a Family Meal with a Ladle Spin behind it.' },
        { name: 'Flare-Up', body: 'At 50%, no break: the Flare-Up sets the top third of the kitchen burning for the rest of the fight, a Flambé sweeps the room, he drags the Stockpot to the middle and it Simmers out, then in.' },
        { name: 'Second Sitting', body: '50% to 18%. The smaller kitchen with the pot in the middle: Whisk, Spice Rack and Boil Over join his tools, now landing two at a time. The order rail between them is the Dinner Rush, three beats at the stove. On Hard: Mise en Place, later Service!, and you lay the Dinner Rush plates yourselves.' },
        { name: 'Dessert', body: '18% to 0%. Flambé, Meat Toss, Rolling Meatballs, Mince, Ladle Spin or Lid Slam, Spice Rack, Family Meal and Whisk back to back, each landing as the next is called; Last Orders; then Gorge every 15 seconds until he dies or calls Last Call.' },
      ],
      moves: {
        'Grease Fire': { what: '{b:8500} fire damage to everyone.', answer: 'Healers top up; a party mitigation fits here.' },
        'Tenderize': { what: 'Tankbuster: {b:26000} in a cleaver cone from him at his target, turning to follow them until just before it lands. Anyone else in the cone takes {b:18200}.', answer: 'Tank: a defensive as the cast starts, and face him away from the party. Everyone else: not in front of him.',
          hard: false, hardNote: 'Leaves the tank Tenderized for 30 s: a Tenderize on them meanwhile hits 60% harder. In the Second Sitting a Meat Hook drags the healer toward the stove as it lands: not through burning grease, which costs {b:8000}.' },
        'Mince': { what: 'One cleaver glints and he chops that whole half of the room for {b:13000}: everything on that side of the line he faces along. He holds his facing until it lands.', answer: 'Go to the side whose cleaver is not glinting. On Normal a Tenderize can land a second behind it: the tank takes the safe half and keeps the cleaver off the rest.',
          hard: false, hardNote: 'Replaced by Double Chop.' },
        'Double Chop': { what: 'Mince, then the other half 2.2 s later, {b:13000} each. Both halves are drawn from the start, the second as a ghost.', answer: 'Stand in the second half, then step across into the first as soon as it lands.', hard: true },
        'Ladle Spin': { what: 'A spin round him: a circle centred on the boss, {b:13000}. Sometimes the Lid Slam lands about a second after it, already drawn on the floor.', answer: 'Get out, and be moving back in as the spin ends when the lid follows.' },
        'Lid Slam': { what: 'The lid slams everything except a small circle under him (a donut): {b:13000}.', answer: 'Get in close, inside the red ring\'s inner edge.' },
        'Chop Chop': { what: 'Mince, then the tool on his back 2.4 s later: Ladle Spin (out) or Lid Slam (in), {b:13000} each. Both are on the floor from the cast.', answer: 'Safe half first, then out of or into his reach for the second part.' },
        'Meat Toss': { what: 'A spread circle on everyone but the tank, {b:7500/6500} each. Each leaves a grease puddle, {b:2600} a second to stand in, then a stain that stays and burns for {b:4000} a second when fire reaches it.', answer: 'Spread apart. Drop your puddle somewhere you will not need, toward the walls and away from where the party fights.',
          hardNote: 'Bigger, longer puddles. In the Mains it comes with Family Meal on the tank at once.' },
        'Family Meal': { what: 'A stack on one non-tank: {b:22000/20000} split among those inside. On Normal it wants everyone but one (the tank may stay); fewer and everyone in it takes 50% more.', answer: 'Stack on the marked player. After a Meat Toss, stack away from the fresh puddles.',
          hardNote: 'Wants the whole party, tank included.' },
        'Larder Toss': { what: 'Two casks thrown at the two farthest non-tanks, {b:9000} where each lands; each circle follows its player until just before it lands. A cask stays where it lands: solid, and cover.', answer: 'On Normal in the Second Sitting a Boil Over follows close behind: keep going out toward the far walls. The two farthest drop their casks apart, clear of the group, where people can get behind them from the boss. Four casks at most; the oldest breaks.' },
        'Gut Blast': { what: 'A {b:15000/16000} roar across the whole kitchen from where he stands. Only a cask (or, later, the pot) between you and him saves you. Every cask takes a hit; two breaks one.', answer: 'Get behind a cask, on the far side from him.',
          hardNote: 'Only two people can hide behind each cask.' },
        "Butcher's Charge": { what: 'A line from him at his tank, following them until a second before; then he charges until he hits something. Anyone on the line is run over for {b:14000}.', answer: 'On Normal a Meat Toss lands right after it: clear the line, then spread. Tank: aim him at a brick wall (stuck 4 s, taking 20% more damage). Not the stove before the Flare-Up (the top third erupts for 10 s, {b:4500} a second), not a cask you need.' },
        'Order Up!': { what: 'A plate (tower) for each player round the kitchen, served one after another clockwise from the top left. The next one due has the fullest gold rim. {b:5000} to whoever takes one; an empty plate hits everyone for {b:14000}.', answer: 'One person per plate, in serving order. On Normal casks come down on the first plates: whoever is marked stands at the edge of their plate and steps across it as the cask lands.',
          hardNote: 'Six plates for four players, and each leaves you Stuffed for 4 s: a plate while Stuffed adds {b:14000}. Nobody takes two in a row.' },
        'Rolling Meatballs': { what: 'Three meatballs land against the walls, wobble a moment with their lane shown, then roll straight across the kitchen. Each hits once for {b:13000} and shoves you aside.', answer: 'Stand outside every lane. In the Mains the lanes run between the plates.',
          hardNote: 'Four, faster.' },
        'Flare-Up': { what: 'He heaves the stockpot onto the stove. The top third of the kitchen burns for the rest of the fight, {b:4500} a second, and lights any grease in it. A {b:6500} blast of heat on everyone with it.', answer: 'Out of the top third for good. Heal through the blast.' },
        'Flambé': { what: 'Brandy in stripes across the kitchen, {b:14000} each, catching one after another from one side. Each stripe sets the grease in it alight.', answer: 'Follow behind the fire: step into a stripe that has just gone off. Not onto a stain it lit.',
          hardNote: 'Every other stripe first, the rest 2.2 s later: stand in the second set, then step into a burnt stripe.' },
        'Stockpot': { what: 'He drags the pot down to the middle. It stays: solid, cover from Gut Blast, and something his charge can stop on.', answer: 'Nothing to dodge; learn where it is.' },
        'Simmer': { what: 'The pot\'s coils go off ring by ring, {b:13000} each: outward from the pot the first time, inward the second.', answer: 'Outward: step into the inner ring once it has gone off. Inward: step out behind the wave.',
          hardNote: 'The rings follow each other faster.' },
        'Whisk': { what: 'A cross of two {b:13000} beams through him that turns 30 degrees four times, a beat apart.', answer: 'Stand between the arms and walk round with the turn. On Normal the pot boils over as the last arms turn: be out toward the far walls by then.' },
        'Spice Rack': { what: 'Jars pour on set spots (a pattern for each use), and a circle under each non-tank follows them until a few seconds before it lands; {b:13000} each.', answer: 'Out of the fixed spots, and drop your own circle clear of everyone else.' },
        'Boil Over': { what: 'Proximity: the pot boils over from him. {b:40000/46000} next to him, falling off with distance to {b:900/1035} far away.', answer: 'Everyone, tank included, as far from him as the kitchen allows.' },
        'Last Orders': { what: '{b:11000} to everyone, after a quiet moment at the end of the Dessert Trolley.', answer: 'Heal up; Gorge follows.' },
        'Gorge': { what: 'He eats: {b:6500} to everyone, and every Gorge makes all his hits 10% stronger, for good. It repeats every 15 seconds.', answer: 'The soft enrage. Burn him down; save mitigation and the Limit Break for the late Gorges.' },
        'Clogged Drains': { what: 'Grease spills round the three drains (the middle and two lower sides) and stays for the whole fight. It burns for {b:4000} a second when fire reaches it.', answer: 'Keep fire away from it: no stripes or charges into it while people stand there.', hard: true },
        'Belly Flop': { what: 'He flops where he stands, {b:13000} in a circle under him, and throws everyone away from him. The tool on his back says what follows: Ladle Spin or Lid Slam, drawn from the cast.', answer: 'Out from under him, with clear floor behind you (a wall or cask is a {b:5000} slam). Then out for the ladle, back in for the lid.', hard: true },
        'Cleaver Toss': { what: 'A cleaver flies along a line at each of the two farthest non-tanks (following them until a second before), then comes back along the same line: {b:13000} each way.', answer: 'The two aim it away from the party, then stay off the line for the return.', hard: true },
        'Mise en Place': { what: 'Three tools laid out on the pass along the bottom wall, left to right: a cleaver on one side of its board (that half will be chopped), the ladle, the lid.', answer: 'Remember the order and the cleaver\'s side.', hard: true },
        'Service!': { what: 'The Mise en Place tools come out in that order, 2 s apart: a half-room chop, Ladle Spin, Lid Slam, {b:13000} each.', answer: 'Move through the three in the order you remembered.', hard: true },
        'Dinner Rush': { what: 'In the Second Sitting, in place of the order rail. He plants himself just south of the stockpot, facing it, and four plates come up one beat after another, nearest him first: the first with a half-room chop (the west half), the second with the other half and a Lid Slam at once (only the west side of his quiet circle is safe), the last two together with a Ladle Spin. Each tool hits for {b:13000}; each plate wants one person and hits them for {b:5000}. The chop is drawn from the cast; the lid and ladle as the beats come.', answer: 'Plate one on his east side, plate two on his west side inside the lid\'s circle, the other two well out of the ladle\'s reach: east, in to the west, out. On Normal the plates are already laid there.',
          hard: false, hardNote: 'The plates are not laid: a hot plate hangs over every player and is set down where you stand when it comes down, and they come up nearest him first, so where each is set decides its beat. Put the first nearest him on his east side, the second a little farther out on his west side but inside the lid\'s circle (at its edge, so the one who served the first has room to stand there), the other two well out of the ladle\'s reach. Each plate leaves you Stuffed. The first half is Double Chop\'s.' },
      },
    },

    skitterra: {
      intro: 'Four acts in a web cave: The Web to 70%, forty seconds of The Dark Between, The Brood to 28% ending in the Swarm, then the Chrysalis damage check opens The Collapse, where the floor falls ring by ring until she dies or Devour lands at about 10:10 (10:20 on Hard). Groups die to what they did not break: every egg clutch left standing hatches in the Swarm, every uncut thread is a drop in the dark, and pillars spent on Acid Deluge are cover gone.',
      phases: [
        { name: 'The Web', body: '100% to 70%. One thing at a time, about 15 s apart: Venom Mist, Silk Wrap, Eightfold Lunge, Silk Lines, Spin, Venom Spit, Strand Reel, Venom Mist, Silk Wrap into a Lunge, Brood with Silk Reel, Acid Deluge. Six egg clutches sit in the web from the pull, each showing when it hatches.' },
        { name: 'The Dark Between', body: 'At 70%, about 40 s. Into the Dark: she cannot be hit and the cave goes dark except pools of light. From the Dark drops along each uncut thread in turn, with a Venom Drip; then Tightening Web brings her back.' },
        { name: 'The Brood', body: '70% to 28%. Pairs: Silk Wrap into Lunge, Silk Lines then Venom Spit, Silk Reel, Strand Reel, Venom Mist, Acid Deluge, then The Swarm (about two minutes in), then the Web\'s moves again. On Hard, a Snare Weave comes just before that Acid Deluge.' },
        { name: 'The Collapse', body: 'At 28% she cocoons (the Chrysalis check) while Venom Drip falls. Then The Web Gives Way three times, between Lunges, Silk Lines, Silk Wrap and Venom Mist, each pass 6% harder, until she dies.' },
      ],
      moves: {
        'Venom Mist': { what: '{b:8500} poison damage to everyone.', answer: 'Healers top up.' },
        'Silk Wrap': { what: 'Tankbuster cone at her target: {b:26000}; anyone else in it takes {b:18200}. Roots the tank for a few seconds. In later acts it lands just before an Eightfold Lunge starts.', answer: 'Tank: a defensive, facing her away from the party, standing where you can survive the Lunge\'s first strikes while rooted.',
          hardNote: 'Also comes with a Silk Reel on the healer in the Brood.' },
        'Eightfold Lunge': { what: 'Four strikes of {b:13000/11000}, each down one leg\'s line and its opposite (two wide cones), turning 45 degrees each time. Her lit legs show the whole order; each strike\'s floor shows only shortly before.', answer: 'Read the order off her legs, stand in a gap, and step round with the turns.',
          hardNote: 'Six strikes, faster, with less warning on the floor.' },
        'Silk Lines': { what: 'A long tether between two non-tanks. When it ends they must be far apart or both are hit for {b:16000}.', answer: 'The pair stretch it until it runs straight and bright, without crossing a thread.',
          hardNote: 'Two pairs from the whole party: a green long one (stretch) and a red short one (stay close).' },
        'Spin': { what: 'Four threads pillar to pillar, a square round the middle. Crossing one stings for {b:3000} and roots. Each has a knot by its first pillar: break it and the thread is cut for good.', answer: 'Do not cross threads; break knots. An uncut thread is a drop in the dark, but also a strip of floor in the Collapse.' },
        'Venom Spit': { what: 'A narrow {b:12000/10500} cone at each of the two farthest players, locking just before; a slowing venom pool, {b:2200} a second, stays where it lands, at their distance, for most of a minute.', answer: 'The two farthest aim it away from the party and drop the pool at the edge.' },
        'Strand Reel': { what: 'A strand to a far pillar, and she reels herself along it in a straight line. Anyone on the line is hit for {b:11000} and rooted. She hangs on that pillar for a few seconds.', answer: 'Off the line; melee follow her there.' },
        'Brood': { what: 'The two ripest egg clutches hatch: one spiderling each, a linked pair. When one dies the other enrages in 5 s; left 45 s, both enrage (faster, bites three times as hard, {b:5500} to everyone every 3 s).', answer: 'Kill the pair together. Breaking those clutches first means nothing hatches.',
          hardNote: 'A burning beam joins the pair, {b:6000} a second: do not stand across it.' },
        'Silk Reel': { what: 'Hooks the farthest non-tank and drags them toward her for 4 s. Dragged all the way in: a venomous bite of {b:17000/15000} that slows. A line of chevrons on the floor shows the way she drags you.', answer: 'Dash to snap the thread, or walk away to slow it. In the Collapse the thread stops dead at the brink of fallen floor and holds taut: snap it by dashing along the silk.',
          hardNote: 'Two people; in the Brood the healer is always one.' },
        'Acid Deluge': { what: 'She runs to the middle and sprays the whole cave for {b:15000/16000}. Only a pillar\'s shadow, away from the middle, is safe. Every pillar that sheltered someone takes a hit; three breaks it.', answer: 'Behind a pillar. Spread over pillars so none breaks early; a broken pillar cuts its threads.',
          hardNote: 'The floor the acid reached stays sticky for 8 s.' },
        'Into the Dark': { what: 'She climbs into the dark for about 40 s and cannot be hit. Only pools of light remain.', answer: 'Break the knot of the thread she will run next, then eggs.' },
        'From the Dark': { what: 'Her shadow runs along the next uncut thread and she drops at its far end: a big circle, {b:13000}. A cut thread is skipped.', answer: 'Out of the landing circle, or cut that thread\'s knot before she gets there.',
          hardNote: 'She drops at the far end, then the near end.' },
        'Venom Drip': { what: 'A spread circle on everyone, {b:7000} each.', answer: 'Spread out.' },
        'Tightening Web': { what: 'She comes back to the middle: {b:6800} to everyone, and the outer web turns sticky (slows) for the rest of the fight.', answer: 'Heal up and keep the fight off the outer ring.' },
        'The Swarm': { what: 'Every clutch still standing hatches at once: two spiderlings each, in linked pairs that enrage like the Brood.', answer: 'Break clutches before it. Kill each pair together.',
          hardNote: 'Three spiderlings to a clutch, and it comes sooner.' },
        'Chrysalis': { what: 'Damage check, about 25 s: she cocoons at the hub. Take 5% of her health off before it closes and she tears free, staggered (25% more damage taken for 8 s). Fail: Devour.', answer: 'Everything on her; a damage Limit Break fits here.' },
        'The Web Gives Way': { what: 'A ring of floor shudders for 6 s, then falls, from the walls inward, three times. The hub, eight spokes and the uncut threads stay. On falling floor: {b:14000}, held, hauled back up.', answer: 'Off the shuddering ring before it goes; stand on the hub, a spoke or a thread.' },
        'Egg Sacs': { what: 'Three sacs (towers) drop round the web, each wanting one person. Stomping one costs {b:5000} and roots you briefly; an unstomped sac bursts on everyone for {b:10000} and leaves venom.', answer: 'One person per sac.', hard: true },
        'Fang Rush': { what: 'She charges the farthest player along a line for {b:15000}, following them until just before, and leaves a sticky trail for 16 s. A pillar in the way stops her and takes a hit.', answer: 'The target leads it away from the party; everyone off the line.', hard: true },
        'Spinneret Volley': { what: 'Four {b:11000} globs fall in turn on every non-tank; each follows its target, then stops a second before landing.', answer: 'Keep moving between globs, away from each other.', hard: true },
        'Molt': { what: 'She leaves her husk and leaps aside to start a new Lunge. Moments later the husk replays her last Lunge from where she stood.', answer: 'Two Lunges overlap: find the gap common to both.', hard: true },
        'Ceiling Ambush': { what: 'She climbs up; her shadow crosses the floor, gathering speed, to where someone stood when she went up. She drops there: a large {b:16000} circle that throws everyone in it.', answer: 'Clear of the landing circle.', hard: true },
        'Snare Weave': { what: 'In the Brood, after a Venom Mist. She goes to the hub and fills the web with snares in two layers, about 3 s apart. Each layer leaves three pockets clear (not marked: read them from the snares): one close by her, two out at range. The second layer\'s pockets are the first\'s turned a sixth of the way round her, and they are shown (faint) from early on. A snare hits for {b:10000} and flings you. The two farthest from her shield are Egg-Laden: when it runs out, between the layers, a venom pool of {b:3520} a second drops where they stand and stays about 25 s. Acid Deluge follows.', answer: 'Pocket, then the next pocket round. The Egg-Laden wait in the pocket they are leaving and drop it there (the second layer covers it anyway, and it is off everyone\'s way); never in a pocket still to come, nor behind the pillar you want for the Deluge.', hard: true },
      },
    },

    volkar: {
      intro: 'Four parts on a round summit under a Storm Pulse that hits everyone for {b:260/300} every 4 s and grows 5% each minute: The Front to 55%, The Eye (a short calm, no Pulse), the Back of the Storm to 15% while the edge closes in, then Heavens Fall until he dies or Skybreak lands at about 10:00 (10:15 on Hard). Everyone carries + (gold) or − (blue) all fight; groups die to wrong pairings, to bolts with no stone, and to being thrown into walls or off the edge.',
      phases: [
        { name: 'The Front', body: '100% to 55%. Gaps tighten from about 15 s to 8 s: Thunderclap, Titan Fist, Polarity Surge, Thunder Crash into Static Field, a Squall Line with Static Field and Surge inside it, Rod Strike, Gale Slam, Storm Walls (on Normal with a Surge landing in them), Lightning Rods with Gale Slam, Avalanche into Storm Walls, Surge with Crash. On Hard, the second Lightning Rods is the Supercell instead, Chain Lightning comes with the fist, and one Skyfall falls.' },
        { name: 'The Eye', body: 'At 55%, about 20 s. The Pulse stops and he stays targetable. Still Air lights the stones; Eye Closes, and the stones resolve.' },
        { name: 'Back of the Storm', body: '55% to 15%. The Front again from the other side, doubled up, with Gathering Storm and Thunderhead, and a Squall Line with a Thunder Crash inside it on Normal. The edge closes in twice (Normal); on Hard, the second half is the summit breaking away wedge by wedge (with Chain Lightning, a Squall Line and Ball Lightning, and no Gale Slam).' },
        { name: 'Heavens Fall', body: 'At 15% the summit closes to its last ring. Heavens Fall every 15 s (13 s on Hard), the third and fifth of them split in two as a Twin Fall; once those are done each is 10% harder, until he dies.' },
      ],
      moves: {
        'Thunderclap': { what: '{b:6500} lightning damage to everyone.', answer: 'Healers top up; the Pulse keeps chipping in between.' },
        'Titan Fist': { what: 'Tankbuster cone at his target: {b:20000/22000}; anyone else in it takes {b:14000/15400}.', answer: 'Tank: a defensive, facing him away from the party.',
          hardNote: 'Leaves the tank Conductive for 20 s: no rods for them. Twice it comes with Chain Lightning on the healer.' },
        'Polarity Surge': { what: 'When it lands, anyone near someone of the same charge arcs for {b:15000}, avoidable; near only opposite charges, {b:2000}; alone, {b:8500}.', answer: 'Pair up + with −, and keep each pair clear of the other. Often a Static Field lands right after it: pair about a long stride apart, not shoulder to shoulder, so both are answered at once.' },
        'Thunder Crash': { what: 'A stack on every + player, {b:13000} split among those in it, each wanting two. Straight after it, Static Field (no cast) puts a {b:3300/3025} spread on everyone.', answer: 'Each + stacks with a − partner, the two stacks apart; then scatter at once.' },
        'Static Field': { what: 'A spread circle on everyone, {b:5500} each.', answer: 'Spread out.' },
        'Rod Strike': { what: 'Two players marked, then the other two: a bolt falls on each. Beside a standing stone it strikes the stone, {b:8000/9000} to anyone at it; in the open, {b:15000/18000}. A stone struck twice within 10 s discharges, {b:12000} to anyone near it.', answer: 'Marked players each stand at their own stone; the second pair use the other two stones. Everyone else off the stones.',
          hardNote: 'A discharge also leaps to the nearest player beyond it for {b:9000}.' },
        'Gale Slam': { what: 'Everyone is thrown a long way from him, except whoever stands right behind a rod or a post. Thrown into the wall or a stone: {b:9000} and dazed.', answer: 'Stand close enough that the throw ends short of the wall, with no stone behind you, or shelter behind a rod or post.' },
        'Storm Walls': { what: 'Two walls of wind from him turn slowly round the summit for about 10 s. Each hits for {b:11000/9500} as it passes and shoves you along. A boulder shelters you once, then breaks.', answer: 'Walk ahead of the turning walls, or behind a boulder.',
          hardNote: 'Three walls, turning faster, for longer.' },
        'Lightning Rods': { what: 'Two rods (towers) round him, each wanting one, {b:5000} to the soaker. A soak leaves you Conductive: a second rod while Conductive adds {b:12000}. An empty rod hits everyone for {b:12000}. Each leaves a post that stands 30 s.', answer: 'One person per rod, not anyone already Conductive. Gale Slam follows: get behind a post.',
          hardNote: 'Three rods, and the Gale Slam lands with them: shelter behind the rod you soak. In the Front the second set is the Supercell instead.' },
        'Avalanche': { what: 'Boulders roll in from one side in lanes and stop past the middle; each lane hits for {b:11000/12000} and throws you aside. The boulders stay, solid. Storm Walls follow.', answer: 'Out of the lanes, then behind a boulder for the walls.',
          hardNote: 'Four lanes.' },
        'Squall Line': { what: 'For about 30 s a quiet circle drifts once round him; outside it, the storm (red) hits for {b:6000} every second. It shows from the cast, with a dashed red line where its edge is going.', answer: 'Walk with the circle. Other mechanics land inside it, and over the last of the walk it draws in, so keep toward its middle.' },
        'Eye of the Storm': { what: 'The wind drops and the Pulse stops for about 20 s. He stays targetable.', answer: 'Free damage. Read Still Air.',
          hardNote: 'Everyone\'s charge flips as it opens.' },
        'Still Air': { what: 'The four stones light: two + (gold) and two − (blue), opposite stones alike. When the Eye closes each wants one person of its own charge; a wrong charge is struck for {b:12000}, an empty stone hits everyone for {b:9000}.', answer: 'One per stone, matching your current charge.' },
        'Eye Closes': { what: 'The Eye ends and the Pulse returns.', answer: 'Be at your stone.' },
        'Gathering Storm': { what: 'Heal check: Static on everyone, {b:1600} every 1.5 s for 12 s, then a {b:5000} Thunderhead.', answer: 'Heal through it; mitigation for the Thunderhead. Nobody dead: Limit Break.' },
        'Thunderhead': { what: 'The storm breaks: {b:5000} to everyone at the end of Gathering Storm.', answer: 'Everyone healed up and mitigated before it lands.' },
        'Heavens Fall': { what: 'A column of sky on a set spot round him: {b:28000} split among the party in it, and it wants both charges inside. All one charge: it arcs, {b:15000} each. After the fifth, each makes all his hits 10% stronger.', answer: 'Everyone in, both charges. Mitigation and the Limit Break for the late ones.',
          hardNote: 'It breaks over the summit as it lands: everyone is marked, and a few seconds later the party that held it up scatters apart.' },
        'Twin Fall': { what: 'The sky splits in two: a column on each side of him, shown from the cast, {b:16000} split among those in it. Each wants a gold and a blue together; two of the same charge in one arcs, {b:17000} each. A lighter second pair, a quarter-turn round, lands a little later.', answer: 'The Surge pairs again: a gold and a blue to each column, the pairs apart. Mitigation for the late ones.',
          hardNote: 'The second pair is heavier and lands sooner, shown from the start: hold one, then run to the next.' },
        'Chain Lightning': { what: 'A bolt on the healer (as Titan Fist lands): it strikes them for {b:7000}, then leaps to the nearest player close by, up to three more times.', answer: 'The healer stays well clear of everyone; everyone clear of each other.', hard: true },
        'Ball Lightning': { what: 'Four orbs gather at the edge, then drift slowly across the summit. Touch one and it bursts for {b:12000}, throwing you.', answer: 'Step round them.', hard: true },
        'Skyfall': { what: 'The sky falls where a player stood when he called it: {b:36000} close in, falling off with distance to {b:810} far away.', answer: 'Everyone far from that spot.', hard: true },
        'Grounding Rods': { what: 'In the Front, in place of a Lightning Rods. An iron rod hangs over each + player; where they stand when it comes down, it is driven into the rock and stands until the fronts have passed. Supercell comes straight after.', answer: 'The two + players plant theirs a stride either side of him, east and west, in the row that runs through him.', hard: true },
        'Supercell': { what: 'Three squall fronts march across the summit a strip at a time, always in this order: from the west, then from the north, then from the east, each starting before the last is through. A front\'s {b:7500} bolt runs along each row of the grid until it strikes a rod: the rod\'s own square is hit, and every square past it stays dry, a lane of still air (not marked: the red squares stop short of it) while that front passes. As the last front passes, a {b:6500} Thunderclap.', answer: 'Round your rod with your partner: east of it for the first front, south of it for the second, west of it for the third. With the rods either side of him, those lanes run past his flanks and nobody has to leave him. Be healed up for the Thunderclap at the end.', hard: true },
      },
    },

    hollowking: {
      intro: 'A trial in six parts: The Summons to 80%, Testimony to 62% where two Echo Knights replay his swings, the Court of Bones recess, The Verdict, Judgement to 25%, and The Long Night until he falls or Moonset lands at about 10:30 (10:40 on Hard). He asks what you just saw: groups die to echoes of swings they forgot, to facing him (or not) at the wrong moment, and to Doom with no lantern near.',
      phases: [
        { name: 'The Summons', body: '100% to 80%. His calls one at a time: Barrow Knell, Sceptre Sweep, Royal Gaze, Grave Cleave, Barrow Stomp, Royal Doom, Crown of Graves, Barrow Knell.' },
        { name: 'Testimony', body: '80% to 62%. Echo Knights rise and The Charge Sheet is read. Swings with their echoes, Coffin Lids into Royal Decree, Stomp with an echo and a Gaze, Grave Cleave, Barrow Bells, Lights Out, Knell.' },
        { name: 'Court of Bones', body: 'At 62%, about 38 s. He sits on the throne out of reach; six coffins wake one by one and his Grave Warden climbs down from the dais. Sceptre Throw, Barrow Knell, Grave Summons, Grave Marks, then The King Rises and the knights move.' },
        { name: 'The Verdict', body: '62% to about 46%. Calls overlap: two swings at once and two echoes, Royal Doom with Grave Marks, Lids and Decree, Grave Cleave, Royal Tithe and Dirge, Crown with an echo and a Gaze. On Hard, Burial Rites with the Writ come straight after the opening swings, and nothing else lands until the graves have closed.' },
        { name: 'Judgement', body: 'To 25%. Opens with Judgement, then Knell, Barrow Bells, Lights Out, Stomp and Sweep with echoes, Grave Cleave, Lids and Decree, Crown with an echo and a Gaze.' },
        { name: 'The Long Night', body: 'From 25%. The braziers die and one lantern is left. Royal Doom every 12 s, passed round the party, with swings, an echo, a Gaze, Knells and Cleaves between.' },
      ],
      moves: {
        'Barrow Knell': { what: '{b:9000} to everyone.', answer: 'Healers top up.',
          hardNote: 'On three of the Knells (the last of The Summons, the one in Testimony and the first after Judgement; never in The Verdict) two chunks of the vault fall on marked circles, {b:12000} each, and stay: solid, and cover from Royal Decree.' },
        'Sceptre Sweep': { what: 'A wide cone in front of him reaching the walls: {b:14000}. At times the sceptre comes back the other way, a cone behind him, shown on the floor for a moment after the first lands. A risen knight remembers the first.', answer: 'Beside him: both strokes leave his flanks clean.' },
        'Barrow Stomp': { what: 'A large circle round him: {b:14000}. At times the ground answers a beat later, as the Crown of Graves does: everything but the ground close round him. A risen knight remembers the stomp.', answer: 'Out for the stomp, then straight back in close for the answer.' },
        'Crown of Graves': { what: 'Everywhere except a small circle round him (a donut): {b:14000}. A risen knight remembers it.', answer: 'Get in close.' },
        'Royal Gaze': { what: 'Anyone facing him when it lands takes {b:9000}, is held 2 s and given Dread for 20 s; caught again while Dreaded: {b:16000}. Often lands with a knight\'s echo.', answer: 'Face away as it lands. Casting at him turns you toward him: walk away or stop casting for that moment.' },
        'Grave Cleave': { what: 'Tankbuster cone at his target, {b:25000}, then a bleed of {b:750/900} every 1.5 s for 9 s. Anyone else in the cone takes {b:17500}.', answer: 'Tank: a defensive, facing him away from the party. Healer: cover the bleed.',
          hardNote: 'From the Verdict, Gravebind lands on two of the others as it does.' },
        'Royal Doom': { what: 'Doom on one non-tank: death when it runs out (about 14 s). Lanterns appear round the hall. A lantern\'s light cures Doom and is used up; the doomed cannot pick one up.', answer: 'The doomed walk to a lantern on the floor, or someone picks one up and brings it to them.',
          hardNote: 'Two doomed in the Verdict. In the Long Night, see The Long Night.' },
        'Echo Knights': { what: 'Two knights rise by the side walls. Each remembers one of his swings in turn as it lands (it flashes on the knight) and later replays it for {b:14000} from where it stands, aimed at the middle, shown on the floor for 2.6 s first.', answer: 'Track which knight holds which swing; dodge the replay from that knight\'s position.',
          hardNote: 'Replays are shown for a little less time (2.2 s). They always land on the same beat.' },
        'The Charge Sheet': { what: 'Three banners above the throne light in turn, each with the sigil of one of his swings, then go dark. Nothing lands.', answer: 'Remember the order. Judgement replays it much later; it is the same on every pull.',
          hardNote: 'Four sigils; one is Royal Audience.' },
        'Judgement': { what: 'The Charge Sheet\'s swings land in that order, {b:14000} each, 1.5 s apart, from him and both knights at once (the Crown from him only). Each shows on the floor for 1.6 s before it lands.', answer: 'Move to where all three of the next swing miss before its floor appears.',
          hardNote: 'Shown for 2.2 s each; the Audience step means face him.' },
        'Coffin Lids': { what: 'He tears a lid off a coffin on each side wall and sends it skidding into the hall along a lane. Anyone in the lane is hit for {b:12000}. Each lid stops where it lands: solid.', answer: 'Out of the lanes; Royal Decree follows.' },
        'Royal Decree': { what: 'A {b:15000/16000} wave of grave-light down the hall from the throne. Only something solid between you and the throne shelters you. The lids are smashed by it.', answer: 'Behind a lid, on the side away from the throne.' },
        'Barrow Bells': { what: 'Two bells (towers) across the hall from each other, each wanting two people, {b:4500} to each. If either is short, everyone is doomed.', answer: 'Two per bell.' },
        'Lights Out': { what: 'Every brazier goes out; a moment later the two nearest him flare back up. When it lands, anyone outside a lit brazier\'s light is caught as by the Gaze.', answer: 'Into the light of one of the two lit braziers.' },
        'Court of Bones': { what: 'He goes to his throne, out of reach. Six coffins down the walls wake one by one, 3 s apart, glowing as they near opening; each opened one sends out a skeleton. His Grave Warden, a slow, heavy-biting skeleton in plate, climbs down from the dais as well and goes for whoever is nearest.', answer: 'Break each coffin before it opens, in order. Tank: take the Warden (taunt it) and lead it away from the party. Everyone else: cut it down once the coffins are dealt with, then any skeleton that gets out.' },
        'Grave Marks': { what: 'A spread circle on everyone, {b:8000} each.', answer: 'Spread out.' },
        'The King Rises': { what: 'He leaves the throne and can be hit again. The knights take new places.', answer: 'Note where each knight now stands.' },
        'Royal Tithe': { what: 'Heal check: everyone drops to a third of their health (shields stay). The Dirge hits everyone 8 s later; he holds his blows on the tank until then.', answer: 'Shield before it lands; heal everyone up before the Dirge. Nobody dead: Limit Break.' },
        'Dirge': { what: '{b:3000} to everyone, 8 s after the Tithe.', answer: 'Everyone healed before it lands.' },
        'The Long Night': { what: 'The braziers die and one lantern is set down. Doom now passes from player to player in a fixed order (the tank last); the next one\'s sigil glows 6 s ahead. Whoever the lantern cures carries it on.', answer: 'Carry the lantern to whoever is doomed next, before their Doom lands.',
          hardNote: 'Two lanterns and two doomed at a time.' },
        'Royal Audience': { what: 'His crown blazes: anyone with their back to him when it lands is caught as by the Gaze.', answer: 'Face him as it lands.', hard: true },
        'Funeral March': { what: 'Five ranks of the dead, {b:14000} each, march across the hall wall to wall, a second apart, leaving one lane open the whole way.', answer: 'Stand in the open lane, or step in behind a rank that has passed.', hard: true },
        'Gravebind': { what: 'A grave-chain binds two of the others (never the tank, drawn at random each pull); they must be close when it breaks, or both take {b:16000}. It comes with Grave Cleave.', answer: 'The bound pair stay together until it breaks.', hard: true },
        'Burial Rites': { what: 'Early in the Verdict. He walks to the middle of the hall and opens a grave for each player, in their own colour, drawn fresh each pull: a corner of the hall for each. They close about 16 s later, after the Writ; nothing else lands before they close. Out of your own grave when it closes: {b:15000}, and the dead strike everyone for {b:2500}. In someone else\'s: {b:10000}.', answer: 'Writ out to the sides, then out to your own grave with a few seconds to spare.', hard: true },
        'Writ of Execution': { what: 'A grave-chain from him to everyone; when the writ is read, a line runs out from him through each of them. You take your own line for {b:9000}; anyone else in it takes {b:11250}. One writ is torn, its chain hanging broken and no line drawn (Pardoned, drawn at random each pull): it does nothing. Every red line stays burning on the floor, {b:4000} a second, a spoke out from him, for about 12 s.', answer: 'Point your line between the graves (toward a corner of the hall), apart from the others, then step off it. A line pointed at a grave walls off the way to it. The Pardoned can stand anywhere off the red lines.', hard: true },
      },
    },
  },
};

if (typeof module !== 'undefined') module.exports = { TUTORIAL };
