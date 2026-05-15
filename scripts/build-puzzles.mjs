// Generates a set of 2-across / 1-down crossword puzzles.
//
// Layout (5x5 grid):
//   Across 1: row 0, col 0, len 5
//   Across 2: row 4, col 0, len 5
//   Down  1: row 0, col 2, len 5  (crosses both)
//
// Requirements for a valid puzzle:
//   down[0] === across1[2]    (top crossing)
//   down[4] === across2[2]    (bottom crossing)
//
// Each across pair shares a theme. The down word can be any common
// word — its role is to connect the two across answers.
//
// Run: node scripts/build-puzzles.mjs
// Writes: scripts/new-puzzles-test.mjs (with up to MAX_PUZZLES entries).

import { writeFileSync } from 'node:fs';

const MAX_PUZZLES = 30;
const MAX_PER_THEME = 4;

// ── Across word pool, grouped by theme ──────────────────────────
// Each entry: [word, clue]. Words must be uppercase and 5 letters.
const THEMED_WORDS = {
  Fitness: [
    ['SQUAT', 'Leg exercise'],
    ['LUNGE', 'Forward step exercise'],
    ['PRESS', 'Push weight overhead'],
    ['BENCH', 'Gym weight station'],
    ['SWEAT', 'Workout byproduct'],
    ['TRAIN', 'Exercise regularly'],
    ['POWER', 'Physical strength'],
    ['PLANK', 'Core hold position'],
    ['PULSE', 'Heart rate'],
    ['PACES', 'Steady steps'],
    ['PULLS', 'Yanks toward body'],
    ['LIFTS', 'Raises weights'],
  ],
  Wellness: [
    ['SLEEP', 'Nightly rest'],
    ['DREAM', 'Sleep vision'],
    ['RELAX', 'Unwind and rest'],
    ['HABIT', 'Daily routine'],
    ['PEACE', 'Calm state of mind'],
    ['SMILE', 'Happy facial expression'],
    ['LAUGH', 'Joyful sound'],
    ['HEALS', 'Recovers from injury'],
    ['CALMS', 'Soothes nerves'],
    ['BLISS', 'Perfect happiness'],
  ],
  Nature: [
    ['TREES', 'Forest plants'],
    ['RIVER', 'Flowing water body'],
    ['OCEAN', 'Vast salty water'],
    ['BEACH', 'Sandy shoreline'],
    ['STONE', 'Hard rock piece'],
    ['GRASS', 'Lawn covering'],
    ['WAVES', 'Sea ripples'],
    ['CLOUD', 'Sky formation'],
    ['STORM', 'Severe weather'],
    ['FROST', 'Icy surface coating'],
  ],
  Science: [
    ['ATOMS', 'Tiny matter units'],
    ['CELLS', 'Basic life units'],
    ['LIGHT', 'Visible radiation'],
    ['LASER', 'Focused light beam'],
    ['ORBIT', 'Planetary path'],
    ['SOLAR', 'Of the sun'],
    ['SPACE', 'Cosmic expanse'],
    ['FORCE', 'Push or pull'],
  ],
  Animals: [
    ['TIGER', 'Striped big cat'],
    ['HORSE', 'Riding animal with mane'],
    ['EAGLE', 'Large bird of prey'],
    ['SHARK', 'Ocean predator fish'],
    ['ZEBRA', 'Striped African equine'],
    ['WHALE', 'Largest sea mammal'],
    ['CAMEL', 'Humped desert animal'],
    ['MOUSE', 'Tiny rodent'],
    ['SHEEP', 'Wool-producing animal'],
    ['SNAKE', 'Legless reptile'],
  ],
  Food: [
    ['BREAD', 'Baked loaf'],
    ['APPLE', 'Red orchard fruit'],
    ['GRAPE', 'Vine fruit'],
    ['CREAM', 'Dairy topping'],
    ['HONEY', 'Bee product'],
    ['SUGAR', 'Common sweetener'],
    ['PASTA', 'Italian noodle dish'],
    ['STEAK', 'Beef cut'],
    ['PIZZA', 'Italian pie'],
    ['SALAD', 'Bowl of greens'],
    ['LEMON', 'Yellow citrus'],
    ['MANGO', 'Tropical fruit'],
  ],
  Music: [
    ['NOTES', 'Score markings'],
    ['TEMPO', 'Music speed'],
    ['CHORD', 'Group of notes'],
    ['DRUMS', 'Percussion set'],
    ['PIANO', 'Keyboard instrument'],
  ],
  Movies: [
    ['ACTOR', 'Screen performer'],
    ['SCENE', 'Filmed segment'],
    ['STAGE', 'Performance platform'],
    ['DRAMA', 'Serious genre'],
    ['ROLES', 'Character parts'],
  ],
  Sports: [
    ['SCORE', 'Total points'],
    ['MATCH', 'Athletic competition'],
    ['COACH', 'Team trainer'],
    ['TEAMS', 'Player groups'],
    ['GOALS', 'Scoring targets'],
    ['FIELD', 'Playing area'],
  ],
  Travel: [
    ['HOTEL', 'Place of lodging'],
    ['PLANE', 'Air vehicle'],
    ['ROUTE', 'Travel path'],
    ['COAST', 'Shoreline'],
  ],
};

// ── Common word pool used for the down answer ──────────────────
// These pull from a broad set of recognizable 5-letter words so the
// generator can usually find a down word that matches the required
// first/last letters from the across pair.
const COMMON_WORDS = [
  ['ABOUT', 'Concerning'],
  ['AGAIN', 'Once more'],
  ['ALERT', 'On guard'],
  ['ALPHA', 'First Greek letter'],
  ['ANGEL', 'Heavenly being'],
  ['ANGLE', 'Corner measure'],
  ['ANGRY', 'Mad and upset'],
  ['ARENA', 'Sports venue'],
  ['ARGUE', 'Quarrel verbally'],
  ['ARISE', 'Stand up'],
  ['ARROW', 'Bow projectile'],
  ['AWARD', 'Prize given'],
  ['AWAKE', 'Not sleeping'],
  ['BADLY', 'Poorly'],
  ['BASIC', 'Fundamental'],
  ['BEAST', 'Wild creature'],
  ['BEGIN', 'Start'],
  ['BIRTH', 'Being born'],
  ['BLACK', 'Darkest color'],
  ['BLAME', 'Hold responsible'],
  ['BLANK', 'Empty page'],
  ['BLAST', 'Loud explosion'],
  ['BLEED', 'Lose blood'],
  ['BLEND', 'Mix together'],
  ['BLIND', 'Sightless'],
  ['BLOCK', 'Stop or obstruct'],
  ['BLOOD', 'Vital red fluid'],
  ['BLOOM', 'Flower opening'],
  ['BOARD', 'Plank of wood'],
  ['BOAST', 'Brag'],
  ['BOOST', 'Lift up'],
  ['BOOTH', 'Small stall'],
  ['BORED', 'Uninterested'],
  ['BRAIN', 'Skull organ'],
  ['BRAKE', 'Car stopper'],
  ['BRAND', 'Product label'],
  ['BRAVE', 'Courageous'],
  ['BREAK', 'Snap apart'],
  ['BRICK', 'Wall block'],
  ['BRIDE', 'New wife'],
  ['BRIEF', 'Short'],
  ['BRING', 'Carry to'],
  ['BROAD', 'Wide'],
  ['BROOK', 'Small stream'],
  ['BROOM', 'Sweeping tool'],
  ['BROWN', 'Earthy color'],
  ['BUILD', 'Construct'],
  ['BURST', 'Pop open'],
  ['BUYER', 'Purchaser'],
  ['CABIN', 'Small wood house'],
  ['CABLE', 'Strong cord'],
  ['CANDY', 'Sweet treat'],
  ['CARGO', 'Ship freight'],
  ['CATCH', 'Grab'],
  ['CHAIN', 'Linked metal'],
  ['CHAIR', 'Seat'],
  ['CHARM', 'Magical appeal'],
  ['CHART', 'Information graph'],
  ['CHASE', 'Run after'],
  ['CHEAP', 'Low cost'],
  ['CHECK', 'Verify'],
  ['CHEER', 'Encouraging shout'],
  ['CHEST', 'Storage box'],
  ['CHIEF', 'Top leader'],
  ['CHILD', 'Young person'],
  ['CHIPS', 'Crispy snacks'],
  ['CHOSE', 'Picked'],
  ['CIVIL', 'Polite'],
  ['CLAIM', 'Assert ownership'],
  ['CLASH', 'Conflict'],
  ['CLASS', 'School group'],
  ['CLEAN', 'Free of dirt'],
  ['CLEAR', 'See through'],
  ['CLICK', 'Mouse press'],
  ['CLIMB', 'Go up'],
  ['CLOCK', 'Time piece'],
  ['CLOSE', 'Near'],
  ['CLOTH', 'Fabric piece'],
  ['CLOWN', 'Circus jester'],
  ['COULD', 'Was able'],
  ['COUNT', 'Tally'],
  ['COURT', 'Tennis area'],
  ['COVER', 'Lid'],
  ['CRACK', 'Thin break'],
  ['CRAFT', 'Handmade art'],
  ['CRASH', 'Loud collision'],
  ['CRAZY', 'Wild'],
  ['CREEK', 'Small stream'],
  ['CREST', 'Wave top'],
  ['CRIED', 'Wept'],
  ['CRIME', 'Illegal act'],
  ['CRISP', 'Crunchy'],
  ['CROSS', 'Plus shape'],
  ['CROWD', 'Big group'],
  ['CROWN', 'Royal headpiece'],
  ['CRUEL', 'Mean and harsh'],
  ['CRUSH', 'Smash'],
  ['CURVE', 'Bend'],
  ['CYCLE', 'Repeated pattern'],
  ['DAILY', 'Every day'],
  ['DANCE', 'Move to music'],
  ['DEALT', 'Distributed cards'],
  ['DEATH', 'End of life'],
  ['DELAY', 'Postpone'],
  ['DEPTH', 'How deep'],
  ['DEVIL', 'Evil being'],
  ['DIRTY', 'Soiled'],
  ['DOUBT', 'Uncertainty'],
  ['DOUGH', 'Bread mix'],
  ['DOZEN', 'Group of twelve'],
  ['DRAFT', 'Early version'],
  ['DRAIN', 'Empty out'],
  ['DRAWN', 'Sketched'],
  ['DREAD', 'Fear deeply'],
  ['DRIED', 'No water left'],
  ['DRIFT', 'Float along'],
  ['DRINK', 'Beverage'],
  ['DRIVE', 'Operate car'],
  ['DRONE', 'Flying robot'],
  ['DROVE', 'Past of drive'],
  ['DRUNK', 'Inebriated'],
  ['DUSTY', 'Full of dust'],
  ['EARLY', 'Before time'],
  ['EATEN', 'Consumed'],
  ['EIGHT', 'Number after seven'],
  ['ELDER', 'Older person'],
  ['ELITE', 'Top class'],
  ['EMPTY', 'Containing nothing'],
  ['ENEMY', 'Foe'],
  ['ENJOY', 'Take pleasure in'],
  ['ENTER', 'Go in'],
  ['EQUAL', 'The same'],
  ['ERROR', 'Mistake'],
  ['EXACT', 'Precise'],
  ['EXIST', 'Be real'],
  ['EXTRA', 'Additional'],
  ['FAITH', 'Strong belief'],
  ['FALSE', 'Untrue'],
  ['FANCY', 'Elaborate'],
  ['FATAL', 'Deadly'],
  ['FAULT', 'Defect'],
  ['FAVOR', 'Kind deed'],
  ['FEAST', 'Big meal'],
  ['FEVER', 'High temperature'],
  ['FIBER', 'Thin strand'],
  ['FIFTH', 'After fourth'],
  ['FIFTY', 'Half a hundred'],
  ['FIGHT', 'Struggle'],
  ['FINAL', 'Last'],
  ['FIRST', 'Number one'],
  ['FLAME', 'Fire tongue'],
  ['FLASH', 'Bright burst'],
  ['FLEET', 'Naval group'],
  ['FLOOR', 'Room base'],
  ['FLOUR', 'Baking powder'],
  ['FLUID', 'Liquid'],
  ['FOCUS', 'Concentrate'],
  ['FORTH', 'Forward'],
  ['FRAME', 'Picture border'],
  ['FRONT', 'Forward side'],
  ['FROZE', 'Turned to ice'],
  ['FRUIT', 'Tree produce'],
  ['FULLY', 'Completely'],
  ['FUNNY', 'Humorous'],
  ['GHOST', 'Spirit'],
  ['GIANT', 'Huge being'],
  ['GIVEN', 'Provided'],
  ['GLOBE', 'Earth model'],
  ['GLORY', 'Honor'],
  ['GRACE', 'Elegance'],
  ['GRADE', 'School mark'],
  ['GRAND', 'Magnificent'],
  ['GRANT', 'Give formally'],
  ['GRASP', 'Hold firmly'],
  ['GREAT', 'Excellent'],
  ['GROUP', 'Set together'],
  ['GROVE', 'Cluster of trees'],
  ['GROWN', 'Matured'],
  ['GUARD', 'Protector'],
  ['GUESS', 'Estimate'],
  ['GUIDE', 'Lead the way'],
  ['HAPPY', 'Joyful'],
  ['HEART', 'Blood pump organ'],
  ['HEAVY', 'Weighty'],
  ['HELLO', 'Greeting'],
  ['HOUSE', 'Home dwelling'],
  ['HUMAN', 'Person'],
  ['IDEAL', 'Perfect'],
  ['IDEAS', 'Mental concepts'],
  ['IMAGE', 'Picture'],
  ['INDEX', 'Reference list'],
  ['ISSUE', 'Problem'],
  ['IVORY', 'Tusk material'],
  ['JOINT', 'Body hinge'],
  ['JUDGE', 'Court official'],
  ['JUMPS', 'Leaps'],
  ['KARMA', 'Cosmic justice'],
  ['KNIFE', 'Cutting tool'],
  ['KNOCK', 'Rap on door'],
  ['KNOWN', 'Familiar'],
  ['LABEL', 'Tag'],
  ['LABOR', 'Hard work'],
  ['LARGE', 'Big'],
  ['LATER', 'After'],
  ['LAYER', 'Stratum'],
  ['LEAFY', 'Full of leaves'],
  ['LEAST', 'Smallest'],
  ['LEAVE', 'Depart'],
  ['LEGAL', 'Lawful'],
  ['LEVEL', 'Even surface'],
  ['LIMIT', 'Boundary'],
  ['LINER', 'Cruise ship'],
  ['LIVED', 'Was alive'],
  ['LIVES', 'Exists'],
  ['LOCAL', 'Nearby'],
  ['LOOSE', 'Not tight'],
  ['LOVED', 'Cherished'],
  ['LOWER', 'Below'],
  ['LOYAL', 'Faithful'],
  ['LUCKY', 'Fortunate'],
  ['LUNCH', 'Midday meal'],
  ['MAGIC', 'Sorcery'],
  ['MAJOR', 'Important'],
  ['MAKER', 'Creator'],
  ['MARCH', 'Third month'],
  ['MAYBE', 'Perhaps'],
  ['MAYOR', 'City leader'],
  ['MEANS', 'Methods'],
  ['MEDAL', 'Award disc'],
  ['MEDIA', 'News outlets'],
  ['METAL', 'Iron or steel'],
  ['METER', 'Measure unit'],
  ['MIGHT', 'Could possibly'],
  ['MINOR', 'Less important'],
  ['MIXER', 'Kitchen tool'],
  ['MODEL', 'Example'],
  ['MONEY', 'Currency'],
  ['MONTH', 'Calendar period'],
  ['MORAL', 'Ethical'],
  ['MOTOR', 'Engine'],
  ['MOUNT', 'Climb on'],
  ['MOUTH', 'Eating opening'],
  ['MOVIE', 'Film'],
  ['NAKED', 'Bare'],
  ['NAMED', 'Called'],
  ['NEEDY', 'Wanting help'],
  ['NEVER', 'At no time'],
  ['NIGHT', 'Dark hours'],
  ['NOBLE', 'Honorable'],
  ['NOISE', 'Loud sound'],
  ['NORTH', 'Up direction'],
  ['NOVEL', 'Long story book'],
  ['NURSE', 'Hospital caregiver'],
  ['OFTEN', 'Frequently'],
  ['ORDER', 'Sequence'],
  ['ORGAN', 'Body part'],
  ['OTHER', 'Different one'],
  ['OUNCE', 'Weight unit'],
  ['OUTER', 'Outside'],
  ['OWNER', 'Possessor'],
  ['PAINT', 'Color liquid'],
  ['PANEL', 'Flat board'],
  ['PANIC', 'Sudden fear'],
  ['PAPER', 'Writing sheet'],
  ['PARTY', 'Celebration'],
  ['PATCH', 'Repair piece'],
  ['PEACH', 'Fuzzy fruit'],
  ['PEARL', 'Oyster gem'],
  ['PHASE', 'Stage'],
  ['PHONE', 'Mobile device'],
  ['PHOTO', 'Picture'],
  ['PIECE', 'Portion'],
  ['PILOT', 'Plane operator'],
  ['PIVOT', 'Turn on point'],
  ['PLACE', 'Location'],
  ['PLAIN', 'Simple'],
  ['PLANT', 'Greenery'],
  ['PLATE', 'Dinner dish'],
  ['POINT', 'Sharp tip'],
  ['PRICE', 'Cost'],
  ['PRIDE', 'Self respect'],
  ['PRINT', 'Push letters on'],
  ['PRIZE', 'Award'],
  ['PROOF', 'Evidence'],
  ['PROUD', 'Self-satisfied'],
  ['PROVE', 'Show as true'],
  ['QUICK', 'Speedy'],
  ['QUIET', 'Hushed'],
  ['QUITE', 'Rather'],
  ['QUOTE', 'Repeat exactly'],
  ['RADIO', 'Broadcast box'],
  ['RAISE', 'Lift up'],
  ['RANCH', 'Cattle farm'],
  ['RANGE', 'Span'],
  ['RAPID', 'Fast'],
  ['REACH', 'Extend hand'],
  ['READY', 'Prepared'],
  ['REPLY', 'Answer'],
  ['RESET', 'Restart'],
  ['RIDGE', 'Mountain top line'],
  ['RIGHT', 'Correct'],
  ['RIVAL', 'Competitor'],
  ['ROAST', 'Cook in oven'],
  ['ROBOT', 'Machine being'],
  ['ROCKS', 'Stones'],
  ['ROUGH', 'Not smooth'],
  ['ROUND', 'Circular'],
  ['ROYAL', 'Kingly'],
  ['RURAL', 'Country side'],
  ['SCALE', 'Weigh device'],
  ['SCARF', 'Neck cloth'],
  ['SCENT', 'Smell'],
  ['SCOPE', 'Range'],
  ['SHAKE', 'Tremble'],
  ['SHAPE', 'Form'],
  ['SHARE', 'Divide between'],
  ['SHARP', 'Pointed'],
  ['SHEET', 'Flat layer'],
  ['SHELL', 'Outer cover'],
  ['SHIFT', 'Move slightly'],
  ['SHINE', 'Glow brightly'],
  ['SHIRT', 'Top garment'],
  ['SHOES', 'Foot covers'],
  ['SHORE', 'Beach edge'],
  ['SHORT', 'Not tall'],
  ['SHOUT', 'Yell'],
  ['SIGHT', 'Vision'],
  ['SIGNS', 'Indicators'],
  ['SILLY', 'Foolish'],
  ['SINCE', 'From then'],
  ['SIXTH', 'After fifth'],
  ['SIXTY', 'Sum of forty plus twenty'],
  ['SKILL', 'Ability'],
  ['SLICE', 'Cut piece'],
  ['SLIDE', 'Glide down'],
  ['SLOPE', 'Incline'],
  ['SMALL', 'Tiny'],
  ['SMART', 'Clever'],
  ['SMELL', 'Sense odor'],
  ['SMOKE', 'Fire byproduct'],
  ['SNACK', 'Small bite'],
  ['SOLID', 'Firm'],
  ['SOLVE', 'Find answer'],
  ['SOUND', 'Audible'],
  ['SOUTH', 'Down direction'],
  ['SPARK', 'Small fire'],
  ['SPEAK', 'Talk aloud'],
  ['SPEND', 'Use money'],
  ['SPICE', 'Flavoring'],
  ['SPOON', 'Eating utensil'],
  ['SPORT', 'Athletic activity'],
  ['STAFF', 'Workers'],
  ['STAIR', 'Step'],
  ['STAMP', 'Mail tag'],
  ['STAND', 'Get up'],
  ['STARE', 'Long look'],
  ['START', 'Begin'],
  ['STEAM', 'Hot vapor'],
  ['STEEL', 'Strong metal'],
  ['STEEP', 'Sharp slope'],
  ['STICK', 'Wooden rod'],
  ['STILL', 'Motionless'],
  ['STORY', 'Tale'],
  ['STOVE', 'Cooking unit'],
  ['STRAW', 'Drink tube'],
  ['STRIP', 'Long band'],
  ['STUDY', 'Learn'],
  ['STUFF', 'Material'],
  ['STYLE', 'Fashion'],
  ['SUITE', 'Hotel rooms'],
  ['SUPER', 'Excellent'],
  ['SWEET', 'Sugary'],
  ['SWING', 'Hanging seat'],
  ['TABLE', 'Furniture top'],
  ['TASTE', 'Flavor'],
  ['TEACH', 'Instruct'],
  ['THANK', 'Express gratitude'],
  ['THEME', 'Topic'],
  ['THICK', 'Wide and dense'],
  ['THIEF', 'Stealer'],
  ['THINK', 'Use brain'],
  ['THIRD', 'After second'],
  ['THREE', 'Number 3'],
  ['THROW', 'Toss'],
  ['TIGHT', 'Snug'],
  ['TIRED', 'Sleepy'],
  ['TODAY', 'This day'],
  ['TOOTH', 'Mouth bone'],
  ['TOTAL', 'Sum'],
  ['TOUCH', 'Feel'],
  ['TOUGH', 'Hard to break'],
  ['TOWEL', 'Drying cloth'],
  ['TOWER', 'Tall structure'],
  ['TRACK', 'Race path'],
  ['TRADE', 'Exchange'],
  ['TRAIL', 'Hiking path'],
  ['TREAT', 'Reward'],
  ['TRIAL', 'Test in court'],
  ['TRIBE', 'Group of people'],
  ['TRICK', 'Prank'],
  ['TRUCK', 'Large vehicle'],
  ['TRULY', 'Honestly'],
  ['TRUNK', 'Tree base'],
  ['TRUST', 'Have faith'],
  ['TRUTH', 'Fact'],
  ['TWICE', 'Two times'],
  ['UNCLE', "Parent's brother"],
  ['UNDER', 'Below'],
  ['UNION', 'Joining of two'],
  ['UNITE', 'Bring together'],
  ['UNITS', 'Single pieces'],
  ['UNTIL', 'Up to a point'],
  ['UPPER', 'Higher one'],
  ['UPSET', 'Disturbed'],
  ['URBAN', 'City-like'],
  ['USAGE', 'Way of using'],
  ['USERS', 'App members'],
  ['USHER', 'Theatre guide'],
  ['VALUE', 'Worth'],
  ['VAULT', 'Bank safe'],
  ['VENUE', 'Event location'],
  ['VIDEO', 'Recorded clip'],
  ['VINYL', 'Old record'],
  ['VIRAL', 'Widely spread'],
  ['VIRUS', 'Disease cause'],
  ['VITAL', 'Essential'],
  ['VOCAL', 'Voice-related'],
  ['VOICE', 'Speech sound'],
  ['VOTES', 'Ballots cast'],
  ['WAGON', 'Pull cart'],
  ['WATCH', 'Wrist clock'],
  ['WATER', 'H2O'],
  ['WEARY', 'Tired out'],
  ['WHEAT', 'Bread grain'],
  ['WHEEL', 'Round roller'],
  ['WHITE', 'No color'],
  ['WHOLE', 'Entire'],
  ['WORLD', 'Our planet'],
  ['WORRY', 'Anxiety'],
  ['WORSE', 'Less good'],
  ['WORTH', 'Value of'],
  ['WOULD', 'Conditional verb'],
  ['WOUND', 'Cut injury'],
  ['WRITE', 'Author text'],
  ['WRONG', 'Incorrect'],
  ['YOUNG', 'Not old'],
  ['YOUTH', 'Young age'],
];

// ── Build lookup tables ─────────────────────────────────────────
const allEntries = new Map();
for (const [theme, list] of Object.entries(THEMED_WORDS)) {
  for (const [w, c] of list) {
    if (w.length !== 5) throw new Error(`Bad themed word: ${w}`);
    if (!allEntries.has(w)) allEntries.set(w, { word: w, clue: c, theme });
  }
}
for (const [w, c] of COMMON_WORDS) {
  if (w.length !== 5) throw new Error(`Bad common word: ${w}`);
  if (!allEntries.has(w)) allEntries.set(w, { word: w, clue: c, theme: null });
}

// Index down candidates by (firstLetter, lastLetter).
const downIndex = new Map();
for (const entry of allEntries.values()) {
  const key = entry.word[0] + entry.word[4];
  if (!downIndex.has(key)) downIndex.set(key, []);
  downIndex.get(key).push(entry);
}

// ── Generate puzzles ────────────────────────────────────────────
const picked = [];
const usedDown = new Set();
const themes = Object.keys(THEMED_WORDS);

for (const theme of themes) {
  const list = THEMED_WORDS[theme];
  const pickedForTheme = [];

  outer: for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const w1 = { word: list[i][0], clue: list[i][1] };
      const w2 = { word: list[j][0], clue: list[j][1] };
      const key = w1.word[2] + w2.word[2];
      const candidates = downIndex.get(key) ?? [];
      const downPick = candidates.find(
        (d) => d.word !== w1.word
          && d.word !== w2.word
          && !usedDown.has(d.word),
      );
      if (!downPick) continue;

      pickedForTheme.push({
        theme,
        across1: w1,
        across2: w2,
        down: downPick,
      });
      usedDown.add(downPick.word);
      if (pickedForTheme.length >= MAX_PER_THEME) break outer;
    }
  }

  for (const p of pickedForTheme) {
    picked.push(p);
    if (picked.length >= MAX_PUZZLES) break;
  }
  if (picked.length >= MAX_PUZZLES) break;
}

// ── Emit puzzle file ────────────────────────────────────────────
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

function quote(str) {
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

const lines = [];
lines.push('// Generated by scripts/build-puzzles.mjs — do not edit by hand.');
lines.push('// 2 Across + 1 Down crossword puzzles.');
lines.push('export const CROSSWORD_PUZZLES = [');

picked.forEach((p, idx) => {
  const diff = DIFFICULTIES[idx % 3];
  const a1 = p.across1.word;
  const a2 = p.across2.word;
  const dw = p.down.word;

  // Sanity check
  if (a1[2] !== dw[0]) throw new Error(`Top crossing mismatch: ${a1} / ${dw}`);
  if (a2[2] !== dw[4]) throw new Error(`Bottom crossing mismatch: ${a2} / ${dw}`);

  const grid = [
    [a1[0], a1[1], a1[2], a1[3], a1[4]],
    ['#', '#', dw[1], '#', '#'],
    ['#', '#', dw[2], '#', '#'],
    ['#', '#', dw[3], '#', '#'],
    [a2[0], a2[1], a2[2], a2[3], a2[4]],
  ];

  lines.push('  {');
  lines.push(`    theme: ${quote(p.theme)}, difficulty: ${quote(diff)},`);
  lines.push('    grid: [');
  for (const row of grid) {
    lines.push(`      [${row.map((c) => quote(c)).join(',')}],`);
  }
  lines.push('    ],');
  lines.push('    clues: {');
  lines.push('      across: {');
  lines.push(`        1: { clue: ${quote(p.across1.clue)}, row: 0, col: 0, len: 5 },`);
  lines.push(`        2: { clue: ${quote(p.across2.clue)}, row: 4, col: 0, len: 5 },`);
  lines.push('      },');
  lines.push('      down: {');
  lines.push(`        1: { clue: ${quote(p.down.clue)}, row: 0, col: 2, len: 5 },`);
  lines.push('      },');
  lines.push('    },');
  lines.push('  },');
});

lines.push('];');

writeFileSync('scripts/new-puzzles-test.mjs', lines.join('\n') + '\n');

console.log(`Wrote ${picked.length} puzzles to scripts/new-puzzles-test.mjs`);
console.log('Themes covered:');
const counts = {};
for (const p of picked) counts[p.theme] = (counts[p.theme] ?? 0) + 1;
for (const [t, n] of Object.entries(counts)) console.log(`  ${t}: ${n}`);
