// English, Traditional and Simplified Chinese. The hub says which through the
// address (#lang=zh-Hant); opened on its own, the app follows the browser.
// Hong Kong and Taiwan players use different words for the same things, so the
// words that differ depend on the rules being played as well as the language.

const code = (() => {
  const asked = new URLSearchParams(location.hash.slice(1)).get('lang');
  if (['en', 'zh-Hant', 'zh-Hans'].includes(asked)) return asked;
  if (asked) return 'en';
  const nav = navigator.language || 'en';
  if (/^zh-(hans|cn|sg)/i.test(nav)) return 'zh-Hans';
  if (/^zh/i.test(nav)) return 'zh-Hant';
  return 'en';
})();
export const lang = code;
export const browserRules = () => (/^zh-(tw|hant-tw)/i.test(navigator.language || '') ? 'tw' : 'hk');
const col = code === 'zh-Hant' ? 1 : code === 'zh-Hans' ? 2 : 0;
document.documentElement.lang = code;

const T = {
  title: ['Mahjong', '麻將', '麻将'],
  titleHK: ['Mahjong', '麻雀', '麻雀'],
  rulesHK: ['Hong Kong', '香港麻雀', '香港麻雀'],
  rulesTW: ['Taiwan', '台灣麻將', '台湾麻将'],
  rulesHKSub: ['13 tiles, scored in faan', '13 張，計番', '13 张，计番'],
  rulesTWSub: ['16 tiles, scored in tai', '16 張，計台', '16 张，计台'],
  pickRules: ['Rules', '玩法', '玩法'],
  pickLevel: ['Opponents', '對手', '对手'],
  level0: ['Easy', '輕鬆', '轻松'],
  level1: ['Normal', '普通', '普通'],
  level2: ['Hard', '高手', '高手'],
  pickMin: ['Least faan to win', '起糊番數', '起糊番数'],
  pickLength: ['Length', '長度', '长度'],
  lengthOne: ['One wind, 4 hands or more', '一圈，至少 4 局', '一圈，至少 4 局'],
  lengthFull: ['All four winds, 16 hands or more', '四圈，至少 16 局', '四圈，至少 16 局'],
  start: ['Start game', '開始遊戲', '开始游戏'],
  keepPlaying: ['Keep playing', '繼續遊戲', '继续游戏'],
  howTo: ['How to play', '玩法說明', '玩法说明'],

  menu: ['Menu', '選單', '菜单'],
  newGame: ['New game', '新遊戲', '新游戏'],
  rulesBtn: ['Rules and scoring', '規則與計分', '规则与计分'],
  soundOn: ['Sound on', '聲音開啟', '声音开启'],
  soundOff: ['Sound off', '聲音關閉', '声音关闭'],
  speedNormal: ['Opponents: normal speed', '對手速度：普通', '对手速度：普通'],
  speedFast: ['Opponents: fast', '對手速度：快', '对手速度：快'],
  numbersOn: ['Tile numbers on', '牌面數字開啟', '牌面数字开启'],
  numbersOff: ['Tile numbers off', '牌面數字關閉', '牌面数字关闭'],
  close: ['Close', '關閉', '关闭'],
  confirmNew: ['Tap again to end this game', '再按一次結束這局', '再按一次结束这局'],

  you: ['You', '你', '你'],
  right: ['Right', '下家', '下家'],
  across: ['Across', '對家', '对家'],
  left: ['Left', '上家', '上家'],
  left_: ['tiles left', '張剩餘', '张剩余'],
  dealer: ['Dealer', '莊', '庄'],

  yourTurn: ['Your turn. Tap a tile, then tap it again to discard it.', '輪到你。點一張牌，再點一次打出。', '轮到你。点一张牌，再点一次打出。'],
  yourTurnPicked: ['Tap it again to discard it.', '再點一次打出。', '再点一次打出。'],
  thinking: ['{who} is playing', '{who}出牌中', '{who}出牌中'],
  discarded: ['{who} discarded', '{who}打出', '{who}打出'],
  canAdd: ['{who} is adding to a kong', '{who}加槓', '{who}加杠'],
  ready: ['Waiting on', '聽牌', '听牌'],
  readyIf: ['Discard this to wait on', '打出後聽', '打出后听'],
  drawOnly: ['self-draw only', '只能自摸', '只能自摸'],
  tooLow: ['too few {unit}', '{unit}數不足', '{unit}数不足'],
  short: ['Your hand is complete but worth {n} {unit}. This table needs {min}.', '牌型完成，但只有 {n} {unit}，本桌需要 {min} {unit}。', '牌型完成，但只有 {n} {unit}，本桌需要 {min} {unit}。'],
  hint: ['Hint', '提示', '提示'],
  hintPass: ['Hint: pass on this one', '提示：這張不要', '提示：这张不要'],
  pass: ['Pass', '過', '过'],

  win: ['Win', '胡', '胡'],
  winHK: ['Win', '食糊', '食糊'],
  selfWin: ['Self-draw', '自摸', '自摸'],
  pung: ['Pung', '碰', '碰'],
  kong: ['Kong', '槓', '杠'],
  chow: ['Chow', '吃', '吃'],
  chowHK: ['Chow', '上', '上'],

  faan: ['faan', '番', '番'],
  tai: ['tai', '台', '台'],
  points: ['points', '分', '分'],
  pts: ['pts', '分', '分'],

  handOf: ['Hand {n}', '第 {n} 局', '第 {n} 局'],
  roundE: ['East wind', '東風圈', '东风圈'],
  roundS: ['South wind', '南風圈', '南风圈'],
  roundW: ['West wind', '西風圈', '西风圈'],
  roundN: ['North wind', '北風圈', '北风圈'],

  wonYou: ['You win', '你贏了', '你赢了'],
  wonOther: ['{who} wins', '{who}贏了', '{who}赢了'],
  byDraw: ['Self-drawn', '自摸', '自摸'],
  fromYou: ['on your discard', '你放槍', '你放枪'],
  fromOther: ['on {who}’s discard', '{who}放槍', '{who}放枪'],
  fromYouHK: ['on your discard', '你出銃', '你出铳'],
  fromOtherHK: ['on {who}’s discard', '{who}出銃', '{who}出铳'],
  wallGame: ['Nobody won. The wall ran out.', '流局，牌牆摸完了。', '流局，牌墙摸完了。'],
  noScore: ['Bare hand', '雞糊', '鸡糊'],
  noScoreTW: ['Bare hand', '屁胡', '屁胡'],
  totalIs: ['{n} {unit}', '{n} {unit}', '{n} {unit}'],
  dealerLine: ['Dealer', '莊家', '庄家'],
  streakLine: ['Dealer kept {n} times', '連 {n} 拉 {n}', '连 {n} 拉 {n}'],
  nextHand: ['Next hand', '下一局', '下一局'],
  finalScores: ['Final scores', '最後分數', '最后分数'],
  firstPlace: ['You finished first', '你得了第一', '你得了第一'],
  placeN: ['You finished number {n}', '你排第 {n}', '你排第 {n}'],
  playAgain: ['Play again', '再玩一局', '再玩一局'],

  howTitle: ['How to play', '玩法說明', '玩法说明'],
  how1: ['Everyone starts with {size} tiles. On your turn you take one from the wall, then discard one.', '每人起手 {size} 張。輪到你時摸一張，再打出一張。', '每人起手 {size} 张。轮到你时摸一张，再打出一张。'],
  how2: ['You win with {sets} sets and a pair. A set is three in a row in one suit (a chow), or three alike (a pung). Four alike is a kong, and it counts as one set; you take an extra tile for it.', '胡牌需要 {sets} 組加一對。一組是同花色三張順子（吃）或三張相同（碰）。四張相同是槓，算一組，並補摸一張。', '胡牌需要 {sets} 组加一对。一组是同花色三张顺子（吃）或三张相同（碰）。四张相同是杠，算一组，并补摸一张。'],
  how3: ['Anyone can take a discard to finish a pung, a kong or a winning hand. Only the player after the one who discarded can take it for a chow. A taken set stays face up.', '別人打出的牌，任何人都可以碰、槓或胡；只有下家可以吃。吃碰的牌要亮在桌上。', '别人打出的牌，任何人都可以碰、杠或胡；只有下家可以吃。吃碰的牌要亮在桌上。'],
  how4: ['Tiles are three suits numbered 1 to 9 (characters, dots, bamboo), four winds and three dragons. Flowers go face up beside you and earn points, and you draw another tile for each.', '牌有三種花色各 1 到 9（萬、筒、條），四種風牌和三種箭牌。花牌亮在旁邊，可以計分，並補摸一張。', '牌有三种花色各 1 到 9（万、筒、条），四种风牌和三种箭牌。花牌亮在旁边，可以计分，并补摸一张。'],
  how5: ['If two players want the same discard, a win comes first, then a pung or kong, then a chow. Of two wins, the player next in order takes it.', '同一張牌有多人要時，胡優先，其次碰或槓，最後吃。兩人都胡時，由出牌者的下一位優先。', '同一张牌有多人要时，胡优先，其次碰或杠，最后吃。两人都胡时，由出牌者的下一位优先。'],
  how6: ['The dealer stays after winning or when the wall runs out. Otherwise the deal passes to the next player.', '莊家胡牌或流局就連莊，否則換下一位做莊。', '庄家胡牌或流局就连庄，否则换下一位做庄。'],
  howHK: ['Hong Kong table: a hand needs the minimum faan to win. Win on a discard and that player pays the table points; on a self-draw each of the three pays half. The wall is played to its last tile, and scoring is half spicy, capped at 13 faan.', '香港規則：牌型要達到起糊番數才能食糊。出銃者全付；自摸三家各付一半。牌牆摸到最後一張，半辣計分，上限 13 番。', '香港规则：牌型要达到起糊番数才能食糊。出铳者全付；自摸三家各付一半。牌墙摸到最后一张，半辣计分，上限 13 番。'],
  howTW: ['Taiwan table: any complete hand can win. A win pays 100 plus 20 per tai, from the discarder or from all three on a self-draw. A dealer adds 1 tai and 2 more per hand kept to whatever they win or pay. 16 tiles stay in the wall.', '台灣規則：牌型完成就能胡。每次 100 底、每台 20，放槍者付，自摸三家各付。莊家輸贏多算 1 台，連莊每次再加 2 台。牌牆留 16 張。', '台湾规则：牌型完成就能胡。每次 100 底、每台 20，放枪者付，自摸三家各付。庄家输赢多算 1 台，连庄每次再加 2 台。牌墙留 16 张。'],
  scoreTable: ['What hands are worth', '牌型計分', '牌型计分'],
  rulesNote: ['Tables differ on the details. These values follow Chinese Wikipedia for Hong Kong and Chinese Wikibooks for Taiwan. There is no real money here: points are only for keeping score.', '各桌規則略有不同。香港計分依中文維基百科，台灣計分依中文維基教科書。遊戲不涉及真錢，分數僅供計分。', '各桌规则略有不同。香港计分依中文维基百科，台湾计分依中文维基教科书。游戏不涉及真钱，分数仅供计分。'],
};

// The names of what scores
const N = {
  commonHand: ['All chows', '平糊', '平糊'],
  flatHand: ['All chows, no honors', '平胡', '平胡'],
  allPungs: ['All pungs', '對對糊|碰碰胡', '对对糊|碰碰胡'],
  halfFlush: ['One suit with honors', '混一色', '混一色'],
  fullFlush: ['One suit', '清一色', '清一色'],
  mixedOrphans: ['Only ones, nines and honors', '花么九', '花么九'],
  smallDragons: ['Small dragons', '小三元', '小三元'],
  greatDragons: ['Great dragons', '大三元', '大三元'],
  smallWinds: ['Small winds', '小四喜', '小四喜'],
  greatWinds: ['Great winds', '大四喜', '大四喜'],
  concealedPungs: ['Four concealed pungs', '坎坎糊', '坎坎糊'],
  threeConcealed: ['Three concealed pungs', '三暗坎', '三暗坎'],
  fourConcealed: ['Four concealed pungs', '四暗坎', '四暗坎'],
  fiveConcealed: ['Five concealed pungs', '五暗坎', '五暗坎'],
  allHonors: ['All honors', '字一色', '字一色'],
  orphans: ['Only ones and nines', '清么九', '清么九'],
  nineGates: ['Nine gates', '九子連環', '九子连环'],
  allKongs: ['Four kongs', '十八羅漢', '十八罗汉'],
  fourKongs: ['Four kongs', '四槓牌', '四杠牌'],
  thirteen: ['Thirteen orphans', '十三么', '十三么'],
  heavenly: ['Dealer wins on the deal', '天糊|天胡', '天糊|天胡'],
  earthly: ['Win on the dealer’s first discard', '地糊|地胡', '地糊|地胡'],
  seatWind: ['Pung of your seat wind', '門風', '门风'],
  roundWind: ['Pung of the round’s wind', '圈風', '圈风'],
  redDragon: ['Pung of red dragons', '紅中', '红中'],
  greenDragon: ['Pung of green dragons', '發財', '发财'],
  whiteDragon: ['Pung of white dragons', '白板', '白板'],
  noFlowers: ['No flowers', '無花', '无花'],
  ownFlower: ['Your seat’s flower', '正花', '正花'],
  flowerSet: ['All four of a flower set', '一台花|花槓', '一台花|花杠'],
  flowerWin7: ['Seven flowers', '花糊|七搶一', '花糊|七抢一'],
  flowerWin8: ['All eight flowers', '八仙過海', '八仙过海'],
  selfDraw: ['Self-draw', '自摸', '自摸'],
  concealed: ['Nothing taken from others', '門前清|門清', '门前清|门清'],
  concealedSelf: ['Concealed and self-drawn', '不求人', '不求人'],
  allAsked: ['Everything taken but the pair', '全求人', '全求人'],
  singleWait: ['Waiting on one tile', '獨聽', '独听'],
  robKong: ['Robbing a kong', '搶槓', '抢杠'],
  lastTile: ['Last tile of the wall', '海底撈月', '海底捞月'],
  lastDiscard: ['Last discard', '河底撈魚', '河底捞鱼'],
  kongFlower: ['Win on a kong’s extra tile', '槓上開花', '杠上开花'],
  doubleKong: ['Win after two kongs in a row', '連槓開花', '连杠开花'],
};

export function t(key, vars = {}) {
  const row = T[key];
  let text = row ? row[col] : key;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
}

// Names with a "|" have Hong Kong's word first and Taiwan's second
export function itemName(key, rules) {
  const row = N[key];
  if (!row) return key;
  const parts = row[col].split('|');
  return parts[rules === 'tw' ? parts.length - 1 : 0];
}

export const WIND_NAMES = {
  en: ['East', 'South', 'West', 'North'],
  'zh-Hant': ['東', '南', '西', '北'],
  'zh-Hans': ['东', '南', '西', '北'],
}[code];

const SUITS = {
  en: [n => `${n} of characters`, n => `${n} of dots`, n => `${n} of bamboo`],
  'zh-Hant': [n => `${n} 萬`, n => `${n} 筒`, n => `${n} 條`],
  'zh-Hans': [n => `${n} 万`, n => `${n} 筒`, n => `${n} 条`],
}[code];
const DRAGONS = { en: ['Red dragon', 'Green dragon', 'White dragon'], 'zh-Hant': ['紅中', '發財', '白板'], 'zh-Hans': ['红中', '发财', '白板'] }[code];

// For screen readers
export function tileName(tile) {
  if (tile < 27) return SUITS[Math.floor(tile / 9)](tile % 9 + 1);
  if (tile < 31) return WIND_NAMES[tile - 27];
  if (tile < 34) return DRAGONS[tile - 31];
  return `${code === 'en' ? 'Flower' : '花'} ${(tile - 34) % 4 + 1}`;
}
