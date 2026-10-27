// Translated from Turbo Pascal by tools/kroz/pascal.mjs; do not edit.
import * as R from '../runtime.js';
let parsed = new Int16Array(83);
let gems = 0;
let whips = 0;
let teleports = 0;
let keys = 0;
let difficulty = 0;
let level = 0;
let pxold = 0;
let pyold = 0;
let skiptime = 0;
let btime = 0;
let stime = 0;
let mtime = 0;
let ftime = 0;
let xdir = 0;
let ydir = 0;
let loop = 0;
let width = 0;
let xl = 0;
let xr = 0;
let yl = 0;
let yr = 0;
let replacement = 0;
let bonus = 0;
let genfactor = 0;
let cf1 = 0;
let cf2 = 0;
let bf1 = 0;
let bf2 = 0;
let x = 0;
let y = 0;
let i = 0;
let a = 0;
let b = 0;
let xb = 0;
let yb = 0;
let result = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
let mixup = false;
let done = false;
let restart = false;
let foundset = R.EMPTY;
let i_score = 0;
let i_gems = 0;
let i_whips = 0;
let i_teleports = 0;
let i_keys = 0;
let i_whippower = 0;
let i_difficulty = 0;
let i_px = 0;
let i_py = 0;
let i_foundset = R.EMPTY;
let savestuff = { s_level: 0, s_score: 0, s_gems: 0, s_whips: 0, s_teleports: 0, s_keys: 0, s_whippower: 0, s_difficulty: 0, s_px: 0, s_py: 0, s_foundset: R.EMPTY, s_mixup: false };
let savefile = R.file();
let hslist = Array.from({ length: 15 }, () => ({ name: '', highscore: 0, highlevel: 0 }));
let hsfile = R.file();
let filename = R.file();
let df = new Array(75).fill('');
let pf = new Uint8Array(1650);
let fp = new Array(23).fill('');
let bx = new Uint8Array(1300);
let by = new Uint8Array(1300);
let sx = new Uint8Array(1000);
let sy = new Uint8Array(1000);
let mx = new Uint8Array(1000);
let my = new Uint8Array(1000);
let fx = new Uint8Array(1000);
let fy = new Uint8Array(1000);
let t = new Int16Array(9);
let ch = '\x00';
let slow = '\x00';
let medium = '\x00';
let fast = '\x00';
let tile = '\x00';
let score = 0;
let strval = '';
let whippower = 0;
let px = 0;
let py = 0;
let bc = 0;
let bb = 0;
let rx = 0;
let ry = 0;
let gennum = 0;
let bnum = 0;
let snum = 0;
let mnum = 0;
let fnum = 0;
let evaporate = 0;
let gravrate = 0;
let gravcounter = 0;
let treerate = 0;
let lavarate = 0;
let gemcolor = 0;
let artcolor = 0;
let fastpc = false;
let lavaflow = false;
let hidetrap = false;
let hiderock = false;
let hidestairs = false;
let hideopenwall = false;
let hidecreate = false;
let hidemblock = false;
let hidelevel = false;
let hidegems = false;
let gravon = false;
let sideways = false;
let onemove = false;
let floorpattern = false;
let magicewalls = false;
let color = false;
function makefloor(tilepattern, a$2, b$2, c, d) {
  tile = tilepattern;
  cf1 = (a$2) << 16 >> 16;
  cf2 = (b$2) << 16 >> 16;
  bf1 = (c) << 16 >> 16;
  bf2 = (d) << 16 >> 16;
  floorpattern = true;
}
function print(xpos, ypos, message) {
  R.gotoxy(xpos, ypos);
  R.write(message);
}
function printnum(ypos$2, num) {
  let tempstr = '';
  let $1;
  R.gotoxy(70, ypos$2);
  R.write('       ');
  strval = R.trunc(R.fmt(num, 0), 222);
  if (((ypos$2 === 2) && (score > 0))) {
    strval = R.trunc((strval + '0'), 222);
  }
  if ((ypos$2 === 11)) {
    $1 = whippower;
    if (($1 >= 0 && $1 <= 2)) {

    } else if (($1 >= 3 && $1 <= 9)) {
      tempstr = R.trunc(R.fmt((whippower - 2), 0), 222);
      strval = R.trunc(((strval + '+') + tempstr), 222);
    }
  }
  R.gotoxy((73 - Math.trunc(strval.length / 2)), ypos$2);
  R.write(strval);
}
function update_info() {
  bak(7, 0);
  col(4, 7);
  printnum(2, score);
  printnum(5, level);
  if ((gems > 9)) {
    printnum(8, gems);
  } else {
    col(20, 23);
    printnum(8, gems);
    col(4, 7);
  }
  printnum(11, whips);
  printnum(14, teleports);
  printnum(17, keys);
  bak(0, 0);
}
function border() {
  let $2, $3;
  R.gotoxy(1, 24);
  bc = ((R.random(8) + 8)) << 16 >> 16;
  bb = ((R.random(7) + 1)) << 16 >> 16;
  col(bc, 0);
  bak(bb, 7);
  i = 1; $2 = 66;
  if (i <= $2) for (;;) {
    R.gotoxy(i, 25);
    R.write('\xb2');
    R.gotoxy(i, 1);
    R.write('\xb2');
    if (i >= $2) break;
    i++;
  }
  i = 2; $3 = 24;
  if (i <= $3) for (;;) {
    R.gotoxy(1, i);
    R.write('\xb2');
    R.gotoxy(66, i);
    R.write('\xb2');
    if (i >= $3) break;
    i++;
  }
  bak(0, 0);
}
function restore_border() {
  let $4;
  R.gotoxy(2, 25);
  col(bc, 0);
  bak(bb, 7);
  x = 1; $4 = 64;
  if (x <= $4) for (;;) {
    R.write('\xb2');
    if (x >= $4) break;
    x++;
  }
  bak(0, 0);
}
function flash(xpos$2, ypos$3, message$2) {
  let counter = 0;
  counter = (14) << 16 >> 16;
  clearkeys();
  do {
    counter = ((counter + 1)) << 16 >> 16;
    if ((counter > 15)) {
      counter = (13) << 16 >> 16;
    }
    col(counter, 15);
    R.delay(20);
    print(xpos$2, ypos$3, message$2);
  } while (!(R.keypressed()));
  restore_border();
}
function clearkeys() {
  while (R.keypressed()) {
    ch = R.readKbd();
  }
}
function cur(num$2) {
  let result$2 = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
  let $5, $6, $7;
  result$2.ax = (256) & 65535;
  $5 = result$2;
  if (color) {
    $6 = num$2;
    if ($6 === 1) {
      $5.cx = (1799) & 65535;
    } else if ($6 === 2) {
      $5.cx = (8) & 65535;
    } else if ($6 === 3) {
      $5.cx = (8192) & 65535;
    }
  } else {
    $7 = num$2;
    if ($7 === 1) {
      $5.cx = (3085) & 65535;
    } else if ($7 === 2) {
      $5.cx = (14) & 65535;
    } else if ($7 === 3) {
      $5.cx = (8192) & 65535;
    }
  }
  R.intr(16, result$2);
}
function footstep() {
  let x$2 = 0;
  let $8, $9;
  x$2 = 1; $8 = ((+(fastpc) * 50) + (+(!(fastpc)) * 23));
  if (x$2 <= $8) for (;;) {
    R.sound((R.random(550) + 350));
    if (x$2 >= $8) break;
    x$2++;
  }
  R.nosound();
  R.delay(120);
  x$2 = 1; $9 = ((+(fastpc) * 60) + (+(!(fastpc)) * 30));
  if (x$2 <= $9) for (;;) {
    R.sound((R.random(50) + 150));
    if (x$2 >= $9) break;
    x$2++;
  }
  R.nosound();
}
function grabsound() {
  let x$3 = 0;
  let $10;
  x$3 = 1; $10 = ((+(fastpc) * 160) + (+(!(fastpc)) * 65));
  if (x$3 <= $10) for (;;) {
    R.sound((R.random(1000) + 1000));
    if (x$3 >= $10) break;
    x$3++;
  }
  R.nosound();
}
function blocksound() {
  let x$4 = 0;
  let $11;
  x$4 = 60; $11 = 30;
  if (x$4 >= $11) for (;;) {
    R.sound(x$4);
    R.delay((1 + (+(fastpc) * 2)));
    if (x$4 <= $11) break;
    x$4--;
  }
  R.nosound();
}
function nonesound() {
  let x$5 = 0;
  let $12;
  x$5 = 1; $12 = 5;
  if (x$5 <= $12) for (;;) {
    R.sound(400);
    R.delay(10);
    R.nosound();
    R.delay(10);
    R.sound(700);
    R.delay(10);
    R.nosound();
    R.delay(10);
    if (x$5 >= $12) break;
    x$5++;
  }
}
function static_() {
  let x$6 = 0;
  let y$2 = 0;
  let $13, $14, $15, $16;
  x$6 = 1; $13 = 15;
  if (x$6 <= $13) for (;;) {
    bor(R.random(16));
    if (x$6 >= $13) break;
    x$6++;
  }
  bor(4);
  x$6 = 1; $14 = 33;
  if (x$6 <= $14) for (;;) {
    $15 = R.random(2);
    if ($15 === 0) {
      y$2 = 1; $16 = (R.random(60) + 10);
      if (y$2 <= $16) for (;;) {
        R.sound((R.random(4000) + 3000));
        if (y$2 >= $16) break;
        y$2++;
      }
    } else if ($15 === 1) {
      R.nosound();
      R.delay(R.random(30));
    }
    if (x$6 >= $14) break;
    x$6++;
  }
  R.nosound();
}
function col(num1, num2) {
  if (color) {
    R.textcolor(num1);
  } else {
    R.textcolor(num2);
  }
}
function bak(num1$2, num2$2) {
  if (color) {
    R.textbackground(num1$2);
  } else {
    R.textbackground(num2$2);
  }
}
function bor(num$3) {
  let result$3 = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
  let $17;
  if (color) {
    $17 = result$3;
    $17.ax = (2816) & 65535;
    $17.bx = (num$3) & 65535;
    R.intr(16, result$3);
  }
}
function sign_off() {
  shareware(false);
  clearkeys();
  col(7, 7);
  bor(0);
  bak(0, 0);
  R.clrscr();
  R.gotoxy(27, 2);
  R.write('THE LOST ADVENTURES OF KROZ');
  R.gotoxy(26, 3);
  R.write('An Apogee Software Production' + '\r\n');
  R.write('' + '\r\n');
  R.write('Other new games available from Scott Miller:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 15);
  R.write('\xfe Six more Kroz games!  KINGDOM OF KROZ, CAVERNS OF KROZ, DUNGEONS OF KROZ,' + '\r\n');
  R.write('     RETURN TO KROZ, TEMPLE OF KROZ and THE FINAL CRUSADE OF KROZ.' + '\r\n');
  R.write('     Each volume is just $7.50, or order all six for $35! (155 new levels!)' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('\xfe SUPERNOVA - Explore a galaxy and save a planet from an exploding star!' + '\r\n');
  R.write('     An epic adventure rated by Shareware Magazine as one of the best games' + '\r\n');
  R.write('     ever!  Highly advanced game has graphics, sound effects galore, clue' + '\r\n');
  R.write('     command, and dozens of unique features. ($10)' + '\r\n');
  R.write('' + '\r\n');
  R.write('\xfe BEYOND THE TITANIC - A fantastic adventure of exploration and survival.' + '\r\n');
  R.write('     What really happened?  Sound effects and 16 color screens.  ($8)' + '\r\n');
  R.write('' + '\r\n');
  R.write('\xfe WORD WHIZ - New game that challenges your knowledge of the English' + '\r\n');
  R.write('     language.  Fun to play, yet very education, too.  ($5)' + '\r\n');
  R.write('' + '\r\n');
  R.write('\xfe Call for availability:  THE UNDERGROUND EMPIRE OF KROZ' + '\r\n');
  cur(2);
  clearkeys();
  R.halt();
}
function shareware(wait) {
  let $18;
  bak(1, 0);
  bor(1);
  R.clrscr();
  cur(3);
  col(15, 15);
  R.gotoxy(18, 1);
  R.write('THE LOST ADVENTURES OF KROZ \xc4 HOW TO REGISTER' + '\r\n');
  R.gotoxy(1, 2);
  x = 1; $18 = 80;
  if (x <= $18) for (;;) {
    R.write('\xc4');
    if (x >= $18) break;
    x++;
  }
  R.gotoxy(1, 3);
  col(7, 7);
  R.write('  This is not a shareware game, but it is user-supported.  If you enjoy this' + '\r\n');
  R.write('game you are asked by the author to please send a registration check in the' + '\r\n');
  R.write('amount of $20 to Apogee Software.' + '\r\n');
  R.write('  This registration fee will qualify you to order any of the other Kroz' + '\r\n');
  R.write('volumes available:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 7);
  R.write('  \xfe Caverns of Kroz  - the first discovery of Kroz' + '\r\n');
  R.write('  \xfe Dungeons of Kroz - the dark side of Kroz, fast-paced action' + '\r\n');
  R.write('  \xfe Kingdom of Kroz  - the national contest winner ("Best Game" in 1988)' + '\r\n');
  R.write('  \xfe Return to Kroz   - the discovery of entirely new underground chambers' + '\r\n');
  R.write('  \xfe Temple of Kroz   - the bizarre side of Kroz, nothing is what it seems' + '\r\n');
  R.write('  \xfe The Final Crusade of Kroz - the surprising finish?' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('Each game is priced $7.50 each, any three for $20, or all six for only $35.' + '\r\n');
  R.write('You\'ll also get a secret code that makes this game easier to complete,' + '\r\n');
  R.write('plus a "Hints, Tricks and Scoring Secrets" guide and "The Domain of Kroz" map.' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('Please make checks payable to:');
  col(14, 7);
  R.write('   Apogee Software    (phone: 214/240-0614)' + '\r\n');
  R.gotoxy(31, 21);
  R.write('   4206 Mayflower' + '\r\n');
  R.gotoxy(31, 22);
  R.write('   Garland, TX 75043' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('Thank you and enjoy the game.  -- Scott Miller');
  if (wait) {
    R.delay(0);
  }
  bak((R.random(6) + 1), 7);
  R.gotoxy(1, 25);
  R.insline();
  R.gotoxy(27, 25);
  col(16, 16);
  R.write('Press any key to continue.');
  clearkeys();
  do {
    x = (R.random(32767)) << 16 >> 16;
  } while (!(R.keypressed()));
  clearkeys();
  bak(0, 0);
  bor(4);
  R.clrscr();
  cur(3);
}
function new_gem_color() {
  do {
    gemcolor = ((R.random(15) + 1)) << 16 >> 16;
    if (!(color)) {
      gemcolor = (7) << 16 >> 16;
    }
  } while (!((gemcolor !== 8)));
  do {
    artcolor = ((R.random(15) + 1)) << 16 >> 16;
  } while (!(((artcolor !== 8) && (artcolor !== gemcolor))));
  if (!(color)) {
    artcolor = (7) << 16 >> 16;
  }
}
function play(start, stop, speed) {
  let x$7 = 0;
  let $19, $20;
  if ((start <= stop)) {
    x$7 = start; $19 = stop;
    if (x$7 <= $19) for (;;) {
      R.sound(x$7);
      R.delay(speed);
      if (x$7 >= $19) break;
      x$7++;
    }
  } else {
    x$7 = start; $20 = stop;
    if (x$7 >= $20) for (;;) {
      R.sound(x$7);
      R.delay(speed);
      if (x$7 <= $20) break;
      x$7--;
    }
  }
  R.nosound();
}
function addscore(what) {
  let $21;
  $21 = what;
  if (($21 >= 1 && $21 <= 3)) {
    score = ((score + what)) | 0;
  } else if ($21 === 4 || $21 === 14) {
    if ((score > 2)) {
      score = ((score - 2)) | 0;
    }
  } else if ($21 === 5) {
    score = ((score + 1)) | 0;
  } else if ($21 === 6) {
    score = ((score + level)) | 0;
  } else if ($21 === 7) {
    score = ((score + 5)) | 0;
  } else if ($21 === 9) {
    score = ((score + 1)) | 0;
  } else if ($21 === 10) {
    score = ((score + 10)) | 0;
  } else if ($21 === 11) {
    score = ((score + 1)) | 0;
  } else if ($21 === 15) {
    score = ((score + 2)) | 0;
  } else if ($21 === 16) {
    if ((score > 5)) {
      score = ((score - 5)) | 0;
    }
  } else if ($21 === 22) {
    score = ((score + 25)) | 0;
  } else if ($21 === 20) {
    if ((score > level)) {
      score = ((score - Math.trunc(level / 2))) | 0;
    }
  } else if ($21 === 27) {
    score = ((score + 50)) | 0;
  } else if ($21 === 35) {
    score = ((score + (level * 2))) | 0;
  } else if ($21 === 36) {
    score = ((score + 50)) | 0;
  } else if ($21 === 38) {
    score = ((score + 1)) | 0;
  }
  update_info();
}
function won() {
  border();
  clearkeys();
  col(16, 31);
  bak(bb, 0);
  print(6, 1, 'YOUR QUEST FOR THE ANCIENT TOME OF KROZ WAS SUCCESSFUL!!');
  bak(0, 0);
  high_score(false);
}
function high_score(playagain) {
  let x$8 = 0;
  let place = 0;
  let stop$2 = false;
  let $22, $23, $24, $25, $26, $27, $28, $29, $30, $31;
  clearkeys();
  R.window(2, 2, (64 + 1), (23 + 1));
  bak(0, 0);
  R.clrscr();
  R.window(1, 1, 80, 25);
  cur(3);
  R.assign(hsfile, 'LOST.HS');
  R.reset(hsfile);
  if ((R.ioresult() !== 0)) {
    R.rewrite(hsfile);
    x$8 = 1; $22 = 15;
    if (x$8 <= $22) for (;;) {
      $23 = (hslist[(x$8) - 1] || { name: '', highscore: 0, highlevel: 0 });
      $24 = x$8;
      if ($24 === 1) {
        $23.name = R.trunc('Scott Miller', 15);
        $23.highscore = (26991) | 0;
        $23.highlevel = (31) | 0;
      } else if ($24 === 2) {
        $23.name = R.trunc('Mom Miller', 15);
        $23.highscore = (21862) | 0;
        $23.highlevel = (27) | 0;
      } else if ($24 === 3) {
        $23.name = R.trunc('J. T. Kirk', 15);
        $23.highscore = (12028) | 0;
        $23.highlevel = (20) | 0;
      } else if ($24 === 4) {
        $23.name = R.trunc('Clifton Karnes', 15);
        $23.highscore = (8936) | 0;
        $23.highlevel = (14) | 0;
      } else if ($24 === 5) {
        $23.name = R.trunc('Indy Jones', 15);
        $23.highscore = (90) | 0;
        $23.highlevel = (1) | 0;
      } else {
        $23.name = R.trunc('Lost Adventurer', 15);
        $23.highscore = (0) | 0;
        $23.highlevel = (0) | 0;
      }
      R.fwrite(hsfile, (hslist[(x$8) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$8 >= $22) break;
      x$8++;
    }
    R.close(hsfile);
  }
  col(9, 9);
  R.gotoxy(21, 3);
  R.write('THE LOST ADVENTURES OF KROZ');
  col(11, 7);
  R.gotoxy(16, 5);
  R.write('NAME');
  R.gotoxy(34, 5);
  R.write('HIGH SCORE');
  R.gotoxy(49, 5);
  R.write('LEVEL');
  R.reset(hsfile);
  x$8 = 1; $25 = 15;
  if (x$8 <= $25) for (;;) {
    hslist[(x$8) - 1] = R.clone(R.fread(hsfile));
    if (x$8 >= $25) break;
    x$8++;
  }
  place = (1) << 16 >> 16;
  stop$2 = false;
  do {
    if ((score > (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 }).highscore)) {
      stop$2 = true;
    }
    place = ((place + 1)) << 16 >> 16;
    if ((!(stop$2) && (place > 15))) {
      place = (100) << 16 >> 16;
    }
  } while (!((stop$2 || (place > 15))));
  place = ((place - 1)) << 16 >> 16;
  if ((place < 16)) {
    x$8 = 15; $26 = place;
    if (x$8 >= $26) for (;;) {
      hslist[(x$8) - 1] = R.clone((hslist[((x$8 - 1)) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$8 <= $26) break;
      x$8--;
    }
  }
  $27 = (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 });
  $27.name = R.trunc('', 15);
  $27.highscore = (score) | 0;
  $27.highlevel = (level) | 0;
  x$8 = 1; $28 = 15;
  if (x$8 <= $28) for (;;) {
    if (((x$8 & 1) !== 0)) {
      col(12, 7);
    } else {
      col(13, 7);
    }
    $29 = (hslist[(x$8) - 1] || { name: '', highscore: 0, highlevel: 0 });
    R.gotoxy(13, (x$8 + 6));
    R.write(R.fmt(x$8, 2));
    R.gotoxy(16, (x$8 + 6));
    R.write($29.name);
    R.gotoxy(36, (x$8 + 6));
    R.write(String($29.highscore));
    if (($29.highscore > 0)) {
      R.write('0');
    }
    R.gotoxy(50, (x$8 + 6));
    R.write(String($29.highlevel));
    if (x$8 >= $28) break;
    x$8++;
  }
  R.close(hsfile);
  clearkeys();
  if ((place < 16)) {
    bak(4, 7);
    R.gotoxy(16, (place + 6));
    R.write('               ');
    col(4, 0);
    bak(7, 7);
    R.gotoxy(16, 23);
    R.write('Enter your name then press <enter>.');
    col(15, 15);
    bak(4, 7);
    R.gotoxy(16, (place + 6));
    cur(2);
    (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 }).name = R.trunc(R.readLine(15), 15);
    cur(3);
    R.rewrite(hsfile);
    x$8 = 1; $30 = 15;
    if (x$8 <= $30) for (;;) {
      R.fwrite(hsfile, (hslist[(x$8) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$8 >= $30) break;
      x$8++;
    }
    R.close(hsfile);
  }
  bak(0, 0);
  R.gotoxy(16, 23);
  R.write('                                   ');
  x$8 = 1; $31 = 999;
  if (x$8 <= $31) for (;;) {
    sx[(x$8) - 1] = 0;
    sy[(x$8) - 1] = 0;
    mx[(x$8) - 1] = 0;
    my[(x$8) - 1] = 0;
    fx[(x$8) - 1] = 0;
    fy[(x$8) - 1] = 0;
    bx[(x$8) - 1] = 0;
    by[(x$8) - 1] = 0;
    if (x$8 >= $31) break;
    x$8++;
  }
  if (playagain) {
    flash(14, 25, 'Do you want to play another game (Y/N)?');
  } else {
    ch = 'N';
    flash(21, 25, 'Press any key to continue.');
  }
  if (playagain) {
    ch = R.readKbd();
  }
  if ((R.upcase(ch) !== 'N')) {
    restart = true;
  } else {
    bak(0, 0);
    col(15, 15);
    bor(0);
    cur(1);
    R.clrscr();
    if (!(playagain)) {
      R.gotoxy(1, 2);
      R.write('You\'ve completed THE LOST ADVENTURES OF KROZ!' + '\r\n');
    } else {
      R.gotoxy(17, 2);
      R.write('THE LOST ADVENTURES OF KROZ' + '\r\n');
    }
    sign_off();
  }
}
function dead(deaddot) {
  let $32;
  if ((gems > 9)) {
    col(4, 7);
  } else {
    gems = (0) << 16 >> 16;
    col(20, 23);
  }
  bak(7, 0);
  R.gotoxy(71, 8);
  R.write('     ');
  strval = R.trunc(R.fmt(gems, 0), 222);
  R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
  R.write(strval);
  bak(0, 0);
  if (deaddot) {
    x = 150; $32 = 5;
    if (x >= $32) for (;;) {
      R.gotoxy(px, py);
      col(x, x);
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound((x * x));
      if (x <= $32) break;
      x--;
    }
  }
  R.nosound();
  clearkeys();
  col(16, 16);
  bak(bb, 7);
  print(27, 1, 'YOU HAVE DIED!!');
  bak(0, 0);
  do {
    col(R.random(16), R.random(16));
    R.gotoxy(px, py);
    if (deaddot) {
      R.write('*');
    }
    print(21, 25, 'Press any key to continue.');
  } while (!(R.keypressed()));
  border();
  high_score(true);
}
function define_levels() {
  df[(3) - 1] = R.trunc(((' 80       50     1                      30                                                                           ' + '                                                                                    ') + '  9                  '), 222);
  df[(5) - 1] = R.trunc((('100          30  1        9     2                                                                                    ' + '                                                                        900         ') + '  5                  '), 222);
  df[(7) - 1] = R.trunc((('         980 20  3  2     9            320     9             20                 9                                    ' + '                       3  1  1  1  1                                                ') + '                 9   '), 222);
  df[(10) - 1] = R.trunc(((' 50          90  2  2                         25     1200 50                   55                                    ' + '        1                 1  1  1  1                                                ') + '                     '), 222);
  df[(12) - 1] = R.trunc((('100              2       45                                               8   100  3                                 ' + '                                                                           100600   ') + '                     '), 222);
  df[(16) - 1] = R.trunc((('350          20  2     9 40                                                    20  1                       3         ' + '     1                                                                              ') + ' 30                  '), 222);
  df[(17) - 1] = R.trunc((('                 2       20 20  1            700                                9                          1         ' + '                          1  1  1  1                                         3300   ') + '                     '), 222);
  df[(19) - 1] = R.trunc((('   300       65  2    58  9     9      200                                                                           ' + '                                                                                    ') + '                     '), 222);
  df[(21) - 1] = R.trunc((('600          20  1     5 30     5                                              20  5                           700   ' + '                                                                                    ') + '                     '), 222);
  df[(23) - 1] = R.trunc(((' 40              3                            30                               80                    2               ' + '                          1  1  1  1                                       800      ') + '                     '), 222);
  df[(25) - 1] = R.trunc((('                 1                                                                                         3         ' + '                          1  1  1  1                                                ') + ' 70 50  9 25  9 18   '), 222);
  df[(27) - 1] = R.trunc((('        3        1  1      400               999                                                                50   ' + '                          1  1  1  1                                         3      ') + '        1            '), 222);
  df[(29) - 1] = R.trunc(((' 50            550         210                                                150  6                       2         ' + '                                                                                    ') + '                     '), 222);
  df[(31) - 1] = R.trunc((('             70  2       50                           500150  6           3    20                                    ' + '                 1        2  2  2  2                                                ') + '                     '), 222);
  df[(36) - 1] = R.trunc((('      100        1                                                                     200   100100         100   100' + '                                                                              200100') + '                     '), 222);
  df[(38) - 1] = R.trunc((('             70  3       50     5  2           5                                                                     ' + '                          1  1  1  1      300                           960         ') + '                     '), 222);
  df[(39) - 1] = R.trunc((('100      400     3                  500                                   5    50                                    ' + '                    1     1  1  1  1                                                ') + '                     '), 222);
  df[(41) - 1] = R.trunc((('             25  2  1    25                                                   100                          1         ' + '                                                                           300900   ') + '                     '), 222);
  df[(43) - 1] = R.trunc((('999              2      300                                                                                          ' + '     8                                    100                                       ') + '                     '), 222);
  df[(45) - 1] = R.trunc((('                 4                                             300            500 20                                 ' + '                          2  2  2  2                                                ') + '                     '), 222);
  df[(47) - 1] = R.trunc(((' 50          90  2                                                             50   600                              ' + '                          1  1  1  1                                                ') + '                     '), 222);
  df[(49) - 1] = R.trunc((('             30  2  2           5                                                            781               650   ' + '                                                                                    ') + '                     '), 222);
  df[(50) - 1] = R.trunc((('                 1                                                                                     15            ' + '                 1                                                                  ') + '                     '), 222);
  df[(51) - 1] = R.trunc((('         999     1       50                                   3                                        20  1         ' + '                          2  2  2  2                                                ') + '                     '), 222);
  df[(57) - 1] = R.trunc((('600         200  2                                                                                                   ' + '                                                                                    ') + '                     '), 222);
  df[(58) - 1] = R.trunc((('         716     5  5    20    10                                                                                    ' + '                                                                        715         ') + '                     '), 222);
  df[(60) - 1] = R.trunc((('       25    30  4       30                   30                          5   100                                    ' + '                                                                           600      ') + '           6         '), 222);
  df[(62) - 1] = R.trunc((('             30  2  2           5                                                            781               650   ' + '                                                                                    ') + '                     '), 222);
  df[(63) - 1] = R.trunc((('100          20  4       20 20  9                               90       10    90  5                                 ' + '     1                                                                        400   ') + '                     '), 222);
  df[(65) - 1] = R.trunc((('         800 40  1                                           20                                                      ' + '         600           5  1  1  1  1                                                ') + '                     '), 222);
  df[(67) - 1] = R.trunc((('300             20     9        9                     400100                                         6               ' + '     2                                                                              ') + '        8  8  8 99 20'), 222);
  df[(69) - 1] = R.trunc((('      400        3          20             50                 2          25                                          ' + '     1                                                                              ') + '     2  5  5  5 70   '), 222);
  df[(71) - 1] = R.trunc((('150150150900 20  6  3    20     5                                                                                    ' + '        1                                                                            ') + '        1  1  1 50   '), 222);
  df[(73) - 1] = R.trunc((('      420        5          30                20              1               200                90          90    90' + '     1                    4  4  4  4                                    250       90') + ' 20     9  9  9 50   '), 222);
}
function convert_format() {
  let xloop = 0;
  let yloop = 0;
  let tempstr$2 = '';
  let $33, $34, $35, $36, $37, $38, $39;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  t[(9) - 1] = -(1);
  lavaflow = false;
  treerate = (0) << 16 >> 16;
  gravcounter = (0) << 16 >> 16;
  gravon = false;
  x = 1; $33 = 66;
  if (x <= $33) for (;;) {
    y = 1; $34 = 25;
    if (y <= $34) for (;;) {
      pf[(x) * 25 + (y) - 26] = 0;
      if (y >= $34) break;
      y++;
    }
    if (x >= $33) break;
    x++;
  }
  x = 1; $35 = 999;
  if (x <= $35) for (;;) {
    sx[(x) - 1] = 0;
    sy[(x) - 1] = 0;
    mx[(x) - 1] = 0;
    my[(x) - 1] = 0;
    fx[(x) - 1] = 0;
    fy[(x) - 1] = 0;
    if (x >= $35) break;
    x++;
  }
  x = 1; $36 = 1300;
  if (x <= $36) for (;;) {
    bx[(x) - 1] = 0;
    by[(x) - 1] = 0;
    if (x >= $36) break;
    x++;
  }
  new_gem_color();
  yloop = 1; $37 = 23;
  if (yloop <= $37) for (;;) {
    xloop = 1; $38 = 64;
    if (xloop <= $38) for (;;) {
      tempstr$2 = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
      $39 = R.charAt(tempstr$2, 1);
      if ($39 === ' ') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 0;
      } else if ($39 === '1') {
        snum = ((snum + 1)) << 16 >> 16;
        sx[(snum) - 1] = (xloop + 1);
        sy[(snum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 1;
      } else if ($39 === '2') {
        mnum = ((mnum + 1)) << 16 >> 16;
        mx[(mnum) - 1] = (xloop + 1);
        my[(mnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 2;
      } else if ($39 === '3') {
        fnum = ((fnum + 1)) << 16 >> 16;
        fx[(fnum) - 1] = (xloop + 1);
        fy[(fnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 3;
      } else if ($39 === 'X') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 4;
      } else if ($39 === 'W') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 5;
      } else if ($39 === 'L') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 6;
      } else if ($39 === 'C') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 7;
      } else if ($39 === 'S') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 8;
      } else if ($39 === '+') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 9;
      } else if ($39 === 'I') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 10;
      } else if ($39 === 'T') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 11;
      } else if ($39 === 'K') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 12;
      } else if ($39 === 'D') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 13;
      } else if ($39 === '#') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 14;
      } else if ($39 === 'F') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 15;
      } else if ($39 === '.') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 16;
      } else if ($39 === 'R') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 17;
      } else if ($39 === 'Q') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 18;
      } else if ($39 === '/') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 19;
      } else if ($39 === '\\') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 20;
      } else if ($39 === 'B') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 21;
      } else if ($39 === 'V') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 22;
      } else if ($39 === '=') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 23;
      } else if ($39 === 'A') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 24;
      } else if ($39 === 'U') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 25;
      } else if ($39 === 'Z') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 26;
      } else if ($39 === '*') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 27;
      } else if ($39 === 'E') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 28;
      } else if ($39 === ';') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 29;
      } else if ($39 === ':') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 30;
      } else if ($39 === '`') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 31;
      } else if ($39 === '-') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 32;
      } else if ($39 === '@') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 33;
      } else if ($39 === '%') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 34;
      } else if ($39 === ']') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 35;
      } else if ($39 === 'G') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 36;
        gennum = ((gennum + 1)) << 16 >> 16;
      } else if ($39 === '(') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 37;
      } else if ($39 === 'M') {
        bnum = ((bnum + 1)) << 16 >> 16;
        bx[(bnum) - 1] = (xloop + 1);
        by[(bnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 38;
      } else if ($39 === ')') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 39;
      } else if ($39 === 'P') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 40;
        px = ((xloop + 1)) << 16 >> 16;
        py = ((yloop + 1)) << 16 >> 16;
      } else if ($39 === '&') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 41;
      } else if ($39 === '!') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 42;
      } else if ($39 === 'O') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 43;
      } else if ($39 === 'H') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 44;
      } else if ($39 === '?') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 45;
      } else if ($39 === '>') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 46;
        t[(9) - 1] = 32000;
      } else if ($39 === 'N') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 47;
      } else if ($39 === '<') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 48;
      } else if ($39 === '[') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 49;
      } else if ($39 === '|') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 50;
      } else if ($39 === '"') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 51;
      } else if ($39 === '4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 52;
      } else if ($39 === '5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 53;
      } else if ($39 === '6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 54;
      } else if ($39 === '7') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 55;
      } else if ($39 === '8') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 56;
      } else if ($39 === '9') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 57;
      } else if ($39 === '\xf1') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 58;
      } else if ($39 === '\xf2') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 59;
      } else if ($39 === '\xf3') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 60;
      } else if ($39 === '\xf4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 61;
      } else if ($39 === '\xf5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 62;
      } else if ($39 === '\xf6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 63;
      } else if ($39 === 'Y') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 64;
      } else if ($39 === '0') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 65;
      } else if ($39 === '~') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 66;
      } else if ($39 === '$') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 67;
      } else if ($39 === '\x91') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 68;
      } else if ($39 === '\x92') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 69;
      } else if ($39 === '\x93') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 70;
      } else if ($39 === '\x94') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 71;
      } else if ($39 === '\x95') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 72;
      } else if ($39 === '\x96') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 73;
      } else if ($39 === '\x97') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 74;
      } else if ($39 === '\xb3') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 75;
      } else if ($39 === '\xb9') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 76;
      } else if ($39 === '\xba') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 77;
      } else if ($39 === '\xbb') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 78;
      } else if ($39 === '\xbc') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 79;
      } else if ($39 === '\xbd') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 80;
      } else if ($39 === '\x83') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 81;
      } else if ($39 === '\xb4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 180;
      } else if ($39 === '\xb5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 181;
      } else if ($39 === '\xb6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 182;
      } else if ($39 === '\xb7') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 183;
      } else if ($39 === '\xb8') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 184;
      } else if ($39 === '\xe0') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 224;
      } else if ($39 === '\xe1') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 225;
      } else if ($39 === '\xe2') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 226;
      } else if ($39 === '\xe3') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 227;
      } else if ($39 === '\xe4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 228;
      } else if ($39 === '\xe5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 229;
      } else if ($39 === '\xe6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 230;
      } else if ($39 === '\xe7') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 231;
      } else if ($39 === '\xaf') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 82;
      } else if ($39 === '\xae') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 83;
      } else if ($39 === '\xfc') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 252;
      } else {
        tempstr$2 = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = R.charAt(tempstr$2, 1).charCodeAt(0);
      }
      if (xloop >= $38) break;
      xloop++;
    }
    if (yloop >= $37) break;
    yloop++;
  }
}
function go(xway, yway, human) {
  let previous = 0;
  let oldx = 0;
  let oldy = 0;
  let $40;
  L1_jump: {
  if ((((sideways && (yway.v === -(1))) && !(onemove)) && (replacement !== 75))) {
    break L1_jump;
  }
  previous = (replacement) << 16 >> 16;
  oldx = (px) << 16 >> 16;
  oldy = (py) << 16 >> 16;
  pf[(px) * 25 + (py) - 26] = replacement;
  R.gotoxy(px, py);
  R.write(' ');
  px = ((px + xway.v)) << 16 >> 16;
  py = ((py + yway.v)) << 16 >> 16;
  if (($40 = pf[(px) * 25 + (py) - 26], ($40 >= 55 && $40 <= 57) || $40 === 75)) {
    replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
  } else {
    replacement = (0) << 16 >> 16;
  }
  if ((previous === 75)) {
    col(7, 7);
    R.gotoxy(oldx, oldy);
    R.write('\xb3');
  }
  pf[(px) * 25 + (py) - 26] = 40;
  if ((t[(5) - 1] < 1)) {
    R.gotoxy(px, py);
    col(14, 15);
    bak(0, 0);
    R.write('\x02');
  } else {
    R.gotoxy(px, py);
    R.write(' ');
  }
  if (!(sideways)) {
    footstep();
  } else if (((replacement !== 75) && human)) {
    footstep();
  }
  if ((R.keypressed() && human)) {
    ch = R.readKbd();
    if ((ch === '\x1b')) {
      ch = R.readKbd();
    }
  }
  }
}
function moverock(xway$2, yway$2) {
  let $41;
  i = 1; $41 = ((+(fastpc) * 500) + (+(!(fastpc)) * 330));
  if (i <= $41) for (;;) {
    R.sound((R.random(100) + 20));
    R.delay(1);
    if (i >= $41) break;
    i++;
  }
  R.nosound();
  R.gotoxy((px + xway$2.v), (py + yway$2.v));
  col(0, 0);
  R.write(' ');
  R.gotoxy(rx, ry);
  col(7, 7);
  R.write('O');
  pf[(rx) * 25 + (ry) - 26] = 65;
  go(xway$2, yway$2, true);
  skiptime = (3001) << 16 >> 16;
}
function trigger_trap(place$2, i$2, ch$2) {
  let $42, $43, $44, $45, $46, $47, $48, $49;
  if (((($42 = pf[((px - 1)) * 25 + ((py - 1)) - 26], $42 === 0 || $42 === 32 || $42 === 33 || $42 === 37 || $42 === 39 || $42 === 41 || $42 === 47 || ($42 >= 67 && $42 <= 74) || ($42 >= 224 && $42 <= 231)) && ((px - 1) > 1)) && ((py - 1) > 1))) {
    R.gotoxy((px - 1), (py - 1));
    R.write(ch$2);
    if (place$2) {
      pf[((px - 1)) * 25 + ((py - 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if ((($43 = pf[(px) * 25 + ((py - 1)) - 26], $43 === 0 || $43 === 32 || $43 === 33 || $43 === 37 || $43 === 39 || $43 === 41 || $43 === 47 || ($43 >= 67 && $43 <= 74) || ($43 >= 224 && $43 <= 231)) && ((py - 1) > 1))) {
    R.gotoxy(px, (py - 1));
    R.write(ch$2);
    if (place$2) {
      pf[(px) * 25 + ((py - 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if (((($44 = pf[((px + 1)) * 25 + ((py - 1)) - 26], $44 === 0 || $44 === 32 || $44 === 33 || $44 === 37 || $44 === 39 || $44 === 41 || $44 === 47 || ($44 >= 67 && $44 <= 74) || ($44 >= 224 && $44 <= 231)) && ((px + 1) < 66)) && ((py - 1) > 1))) {
    R.gotoxy((px + 1), (py - 1));
    R.write(ch$2);
    if (place$2) {
      pf[((px + 1)) * 25 + ((py - 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if ((($45 = pf[((px + 1)) * 25 + (py) - 26], $45 === 0 || $45 === 32 || $45 === 33 || $45 === 37 || $45 === 39 || $45 === 41 || $45 === 47 || ($45 >= 67 && $45 <= 74) || ($45 >= 224 && $45 <= 231)) && ((px + 1) < 66))) {
    R.gotoxy((px + 1), py);
    R.write(ch$2);
    if (place$2) {
      pf[((px + 1)) * 25 + (py) - 26] = i$2;
    }
  }
  R.delay(5);
  if (((($46 = pf[((px + 1)) * 25 + ((py + 1)) - 26], $46 === 0 || $46 === 32 || $46 === 33 || $46 === 37 || $46 === 39 || $46 === 41 || $46 === 47 || ($46 >= 67 && $46 <= 74) || ($46 >= 224 && $46 <= 231)) && ((px + 1) < 66)) && ((py + 1) < 25))) {
    R.gotoxy((px + 1), (py + 1));
    R.write(ch$2);
    if (place$2) {
      pf[((px + 1)) * 25 + ((py + 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if ((($47 = pf[(px) * 25 + ((py + 1)) - 26], $47 === 0 || $47 === 32 || $47 === 33 || $47 === 37 || $47 === 39 || $47 === 41 || $47 === 47 || ($47 >= 67 && $47 <= 74) || ($47 >= 224 && $47 <= 231)) && ((py + 1) < 25))) {
    R.gotoxy(px, (py + 1));
    R.write(ch$2);
    if (place$2) {
      pf[(px) * 25 + ((py + 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if (((($48 = pf[((px - 1)) * 25 + ((py + 1)) - 26], $48 === 0 || $48 === 32 || $48 === 33 || $48 === 37 || $48 === 39 || $48 === 41 || $48 === 47 || ($48 >= 67 && $48 <= 74) || ($48 >= 224 && $48 <= 231)) && ((px - 1) > 1)) && ((py + 1) < 25))) {
    R.gotoxy((px - 1), (py + 1));
    R.write(ch$2);
    if (place$2) {
      pf[((px - 1)) * 25 + ((py + 1)) - 26] = i$2;
    }
  }
  R.delay(5);
  if ((($49 = pf[((px - 1)) * 25 + (py) - 26], $49 === 0 || $49 === 32 || $49 === 33 || $49 === 37 || $49 === 39 || $49 === 41 || $49 === 47 || ($49 >= 67 && $49 <= 74) || ($49 >= 224 && $49 <= 231)) && ((px - 1) > 1))) {
    R.gotoxy((px - 1), py);
    R.write(ch$2);
    if (place$2) {
      pf[((px - 1)) * 25 + (py) - 26] = i$2;
    }
  }
  R.delay(5);
}
function got_amulet(xway$3, yway$3, human$2) {
  let $50, $51;
  go({ get v() { return xway$3; }, set v($v) { xway$3 = $v; } }, { get v() { return yway$3; }, set v($v) { yway$3 = $v; } }, human$2);
  grabsound();
  x = 45; $50 = 11;
  if (x >= $50) for (;;) {
    y = 13; $51 = 1;
    if (y >= $51) for (;;) {
      R.sound(((x * x) * y));
      R.delay((y + 1));
      if (y <= $51) break;
      y--;
    }
    if (x <= $50) break;
    x--;
  }
  R.nosound();
  score = ((score + 2500)) | 0;
  update_info();
  flash(7, 25, 'You have found the Amulet of Yendor -- 25,000 points!');
  flash(5, 25, '(It seems that Kroz and Rogue share the same underground!)');
  flash(5, 25, 'Your quest for the treasure of Kroz must still continue...');
}
function end_routine() {
  let $52, $53, $54, $55, $56, $57, $58, $59, $60;
  footstep();
  R.delay(300);
  footstep();
  R.delay(300);
  footstep();
  x = 1; $52 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
  if (x <= $52) for (;;) {
    R.sound((R.random(3000) + x));
    R.gotoxy(px, py);
    bak(R.random(8), 0);
    col(14, 15);
    R.write('\x02');
    col(R.random(16), R.random(16));
    bak(0, 0);
    print(15, 25, 'Oh no, something strange is happening!');
    if (x >= $52) break;
    x++;
  }
  i = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $53 = 20;
  if (i >= $53) for (;;) {
    R.sound(R.random(i));
    if (i <= $53) break;
    i--;
  }
  col(14, 15);
  bak(0, 0);
  x = 1; $54 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
  if (x <= $54) for (;;) {
    R.sound((x * 3));
    R.gotoxy(px, py);
    R.write(String.fromCharCode(((220 + R.random(4))) & 255));
    if (x >= $54) break;
    x++;
  }
  R.nosound();
  R.gotoxy(px, py);
  col(16, 16);
  bak(2, 7);
  R.write('\xf0');
  restore_border();
  flash(14, 25, 'You are magically transported from Kroz!');
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(15, 25, 'Your Gems are worth 100 points each...');
  i = 1; $55 = gems;
  if (i <= $55) for (;;) {
    R.sound(((i * 8) + 100));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $55) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(15, 25, 'Your Whips are worth 100 points each...');
  i = 1; $56 = whips;
  if (i <= $56) for (;;) {
    R.sound(((i * 10) + 200));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $56) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
  i = 1; $57 = teleports;
  if (i <= $57) for (;;) {
    R.sound(((i * 12) + 300));
    score = ((score + 20)) | 0;
    update_info();
    R.delay(30);
    if (i >= $57) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(14, 25, 'Your Keys are worth 10,000 points each...');
  i = 1; $58 = keys;
  if (i <= $58) for (;;) {
    R.sound(((i * 30) + 100));
    score = ((score + 1000)) | 0;
    update_info();
    R.delay(50);
    if (i >= $58) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  bak(gemcolor, 7);
  x = 1; $59 = 30;
  if (x <= $59) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    if (x >= $59) break;
    x++;
  }
  bak(0, 0);
  x = 1; $60 = 30;
  if (x <= $60) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    R.sound((x * 45));
    if (x >= $60) break;
    x++;
  }
  R.nosound();
  R.window(1, 1, 80, 25);
  cur(3);
  bak(1, 0);
  R.window(2, 2, 65, 24);
  R.clrscr();
  col(14, 15);
  R.gotoxy(25, 2);
  R.write('BACK AT YOUR HUT' + '\r\n');
  R.gotoxy(25, 3);
  R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
  R.write('' + '\r\n');
  col(15, 7);
  R.write('   Carefully, you place the ancient tome on your table and open' + '\r\n');
  R.write(' to the first page.  You read the book intently, quickly' + '\r\n');
  R.write(' deciphering the archaic writings.' + '\r\n');
  R.write('   You learn of Lord Dullwit, the once powerful and benevolent' + '\r\n');
  R.write(' ruler of Kroz, who sought wealth and education for his people.' + '\r\n');
  R.write(' The magnificent kingdom of Kroz was once a great empire, until' + '\r\n');
  R.write(' it was overthrown by an evil Wizard, who wanted the riches of' + '\r\n');
  R.write(' Kroz for himself.' + '\r\n');
  R.write('   Using magic beyond understanding, the Wizard trapped Lord' + '\r\n');
  R.write(' Dullwit and his people in a chamber so deep in Kroz that any' + '\r\n');
  R.write(' hope of escape was fruitless.' + '\r\n');
  R.write('   The Wizard then built hundreds of deadly chambers that would' + '\r\n');
  R.write(' stop anyone from ever rescuing the good people of Kroz.' + '\r\n');
  R.write('   Once again your thoughts becomes clear:  To venture into the' + '\r\n');
  R.write(' depths once more and set free the people of Kroz, in:' + '\r\n');
  R.write('' + '\r\n');
  col(14, 15);
  R.write('                  THE UNDERGROUND EMPIRE OF KROZ' + '\r\n');
  col(15, 7);
  R.write('               (Coming in 1991 -- call for details)');
  clearkeys();
  R.window(1, 1, 80, 25);
  bak(0, 0);
  flash(21, 25, 'Press any key, Adventurer.');
  won();
}
function level1() {
  fp[(1) - 1] = R.trunc('//\\///////\\///\\////////\\////////\\//#the#lost#adventures#of#kroz#', 64);
  fp[(2) - 1] = R.trunc('//\\//////////////\\//\\////////\\////////\\///\\/\\\\/\\\\/\\/\\\\/\\\\\\\\\\\\\\/\\', 64);
  fp[(3) - 1] = R.trunc('\\###your#hut###////\\///\\/////////\\/////\\/\\\\//\\\\/\\\\/\\\\\\\\\\\\\\\\\\\\\\\\\\', 64);
  fp[(4) - 1] = R.trunc('/##           D---/////////\\//\\///\\//\\/\\/\\/\\/\\/\\/\\/\\\\\\\\\\\\\\###\\\\\\', 64);
  fp[(5) - 1] = R.trunc('/##  P ####  ##///-\\//\\//\\/----\\///\\////\\//\\//RRR/\\\\\\\\\\\\\\##L##\\\\', 64);
  fp[(6) - 1] = R.trunc('/##      K#**##/\\\\/-//--/\\-\\//\\--\\//\\//\\////RRRRR//\\\\\\\\\\\\\\#0#\\\\\\', 64);
  fp[(7) - 1] = R.trunc('\\##############/////--\\/--//\\////-///////\\////RRRRRRR/\\\\\\\\#!#\\\\\\', 64);
  fp[(8) - 1] = R.trunc('////\\\\///\\/\\\\///\\//\\//////////\\//\\---\\//\\////RRRRRR/\\\\/\\\\\\\\-\\\\\\\\', 64);
  fp[(9) - 1] = R.trunc('/\\//////\\/////\\////////\\///\\/////////--/////\\///RRRRR\\\\\\\\\\\\\\-\\\\\\', 64);
  fp[(10) - 1] = R.trunc('///////\\////////\\///////////////\\/////\\---/////RRRRR/\\/\\\\\\\\\\\\-\\\\', 64);
  fp[(11) - 1] = R.trunc('////\\/////\\\\\\//\\////\\/////\\//////\\////////-//\\/\\/RRRRRR\\/\\\\\\-\\\\\\', 64);
  fp[(12) - 1] = R.trunc('/////////\\\\\\\\\\///\\////\\////////\\///\\///////-//\\///RRRR\\//\\/-\\/\\/', 64);
  fp[(13) - 1] = R.trunc('\\//////\\//\\\\////\\////////\\//\\//////////\\///-\\////RRRRRR\\\\/\\-/\\/\\', 64);
  fp[(14) - 1] = R.trunc('//\\\\//////\\/###storage###///////\\--//\\\\///-////RRRRRRRRR/\\/\\-/\\/', 64);
  fp[(15) - 1] = R.trunc('////////\\///##WWW-WWW-W##/\\////--//-//\\\\/-///\\RRRRRRRRR/\\/\\/-/\\/', 64);
  fp[(16) - 1] = R.trunc('/\\////////\\/##W-WWW-WW---------//\\//-----//\\///RRRRRRRR\\\\//\\-\\//', 64);
  fp[(17) - 1] = R.trunc('\\/////\\/////#############\\///\\-/\\\\\\/\\/\\\\/\\////RRRRRRRR//\\/\\/-//\\', 64);
  fp[(18) - 1] = R.trunc('///\\////\\//////\\\\////\\////\\///-////\\/\\\\/\\///\\RRRRRRR/\\/\\//\\-/\\//', 64);
  fp[(19) - 1] = R.trunc('/\\///\\/////\\////\\///\\//\\//\\////------\\///\\////\\////\\//--/\\-\\\\//\\', 64);
  fp[(20) - 1] = R.trunc('\\//\\///\\/\\//\\/\\/\\///\\//\\/\\///\\////\\//------\\/\\//\\///\\-\\/--//\\/\\/', 64);
  fp[(21) - 1] = R.trunc('/\\///\\////\\//\\///\\////\\///\\//\\/\\////\\///\\/\\-----/\\\\/-/\\//\\/\\//\\/', 64);
  fp[(22) - 1] = R.trunc('\\//\\////\\/\\///\\//\\///\\/\\///\\//\\/////\\///\\/////\\/----\\\\//\\///\\//\\', 64);
  fp[(23) - 1] = R.trunc('#by#scott#miller#\\///\\/////\\/\\////\\////\\////\\//\\//\\/\\//\\/\\\\///\\\xfc', 64);
  fast = '\xea';
  convert_format();
}
function level2() {
  fp[(1) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXX#XXXXXXXXXXXXXXXXXXXXXXXX#XXXXXXXXX### P ###X', 64);
  fp[(2) - 1] = R.trunc('XXXXX##XXXXXXXXXXXXXXXXXXX##XXXXXXXXXXXXXXXXXXXXXXXXXXXX##  ##XX', 64);
  fp[(3) - 1] = R.trunc('XXXXXXXXXXXXXXX&-XXXXXXXXXXXXXXXXXX#XXXXXXXXXXXXXXXX#XXXXX#  #XX', 64);
  fp[(4) - 1] = R.trunc('#XXXXXXXXXXXXXXXX-XXXX--XXXXXXXXXXXXXXXX##XXXXXXXXXXXXXXXX  XXXX', 64);
  fp[(5) - 1] = R.trunc('XXXXXXXXX#XXXXXXXX-XX-XX-XXXXXXX#XXXXXXXXXXXXXXXXXXXXX##   #XXXX', 64);
  fp[(6) - 1] = R.trunc('XXX#XXXXXXXXXXX#XXX--XX#X--XXXXXXXXX#XXXXX#XXXX##XXXX##  ##XXXXX', 64);
  fp[(7) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXX--XXXXXXXXXXXXXXXXXXXXXXX##XX##XXXXXX', 64);
  fp[(8) - 1] = R.trunc('XXXXXXXXXXX##XXXXXXXXXXXXX#XX-XXXXXXXXXXXXXXXXXXXXX##  ##XXXX##X', 64);
  fp[(9) - 1] = R.trunc('XXXXX#XXXXXXXXXXXX#XXXXXXXXXXX--XXXX##XXXXXX#XXXXX##  ##XXXXXXXX', 64);
  fp[(10) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXX#XXXXXXX-#XXXXXXXXXXXXX      XXXX#XXXXXX', 64);
  fp[(11) - 1] = R.trunc('XXXXX##XXXXXX#XXXXXXX#XXXXXXXXXX#X##XXXXX       XXXXXXXXXXXXXXXX', 64);
  fp[(12) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXX##XXX#   0    XXXXXXXX!XXXXXXXXXXXXX', 64);
  fp[(13) - 1] = R.trunc('XXXXXXXXXXXXXX#XXXXXXX===XXXXXXX#  XXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(14) - 1] = R.trunc('XXXXXXX#XXXXXXXXXXXX=======XXXXX  XXXXXXXX#XXXXX#XXXXXXXXXX##XXX', 64);
  fp[(15) - 1] = R.trunc('XXXXXXXXXXXXXXXXX=========       XX=====XXXXXXXXXXXXX#XXXXXXXXXX', 64);
  fp[(16) - 1] = R.trunc('XX#XXXXXXX##XXX==========  ===========XXXXXXXXXXXXXXXXX#XXXXXXXX', 64);
  fp[(17) - 1] = R.trunc('XXXXXXXXXXXXXX==========  ===========XXXXXXXXX##XXXXXXXXXXXXXXXX', 64);
  fp[(18) - 1] = R.trunc('XXXX#XXXXXXX             ===========XX#XXXXXXXXXXXXXXXXXXXXX#XXX', 64);
  fp[(19) - 1] = R.trunc('XXXXXXXX    XX#XXXX================XXXXXXXX#XXXXXX#XXXXXXXXXXXXX', 64);
  fp[(20) - 1] = R.trunc('XXX     XX#XXXXXXXXXX===========XXXXXXXXXXXXXXXXXXXX##the#secret', 64);
  fp[(21) - 1] = R.trunc('XXXXXXXXXXXXXXXXXX#XXXXXX=====XXXXXXXXXX#XXXXXXXXXXX#tunnel#into', 64);
  fp[(22) - 1] = R.trunc('X  XX#XXXXXX##XXXXXXXXXXXXXXXXXX#XXXXXXXXXXXXXXXXXXX#the#kingdom', 64);
  fp[(23) - 1] = R.trunc('LLXXXXXX#XXXXXXXXXXXXX#XXXXXXXXXXXXXX#4XXXXXX##XXXXX#####of#kroz', 64);
  fast = '\xea';
  convert_format();
  hidestairs = true;
}
function level4() {
  fp[(1) - 1] = R.trunc('                                   1                        1  &', 64);
  fp[(2) - 1] = R.trunc(' ####shop####         1                                       \x91 ', 64);
  fp[(3) - 1] = R.trunc(' ##++++++++##                            1                      ', 64);
  fp[(4) - 1] = R.trunc(' ##++++++++##                                 ##4444444444444444', 64);
  fp[(5) - 1] = R.trunc(' #####OO#####                                 ##   1   1   1  1 ', 64);
  fp[(6) - 1] = R.trunc('                          ###spells###        ## 1 1  1  1   1  ', 64);
  fp[(7) - 1] = R.trunc('     1                    ##\xf1EF\x91T\xf2 @##     1  ##    1   1  1  1 ', 64);
  fp[(8) - 1] = R.trunc('                          ##I@ \x91S  T##        ##11   1 1    1   ', 64);
  fp[(9) - 1] = R.trunc('                     1    ##Z\xf3T\x91  ] ##        ##   1   1 1  1 1 ', 64);
  fp[(10) - 1] = R.trunc('                          #########X##        ## 1   1  1  1 1  ', 64);
  fp[(11) - 1] = R.trunc('@@         1                                  ##1 1    1  1    1', 64);
  fp[(12) - 1] = R.trunc('1@W                            P              ## 1  1 1 1  1 1 1', 64);
  fp[(13) - 1] = R.trunc('1@W                                           ##1  11  1 1   1  ', 64);
  fp[(14) - 1] = R.trunc('1@W   1                                     1 ##  1   1     1   ', 64);
  fp[(15) - 1] = R.trunc('1@W                 1                         ##1    1  1  1  1 ', 64);
  fp[(16) - 1] = R.trunc('1@W                                     #.#OXX## 1 1  1   1    1', 64);
  fp[(17) - 1] = R.trunc('1@W          ###lair#of#kroz###         #.#XOX##1    1  1   1 1 ', 64);
  fp[(18) - 1] = R.trunc('1@W          77------------\xf4K##         #.#XXO##  1 1  1   1   1', 64);
  fp[(19) - 1] = R.trunc('1@W          ####1111111111####         #.#XOX## 1 1  1 1 1   1 ', 64);
  fp[(20) - 1] = R.trunc('1@W    1      Z##############           #H#X!X##1  1 1  1  1 1  ', 64);
  fp[(21) - 1] = R.trunc('1@W                                     ######## 1   1 1  1   1 ', 64);
  fp[(22) - 1] = R.trunc('1@@@@@@@@@@@@@@@                  ########@       1   1   1 1  1', 64);
  fp[(23) - 1] = R.trunc('111111111111111@                1 ##LLWWWD@         1   1    1 1', 64);
  fast = '\xea';
  convert_format();
  hidegems = true;
}
function level6() {
  fp[(1) - 1] = R.trunc('#diary\xb7#day#one\xb8################################################', 64);
  fp[(2) - 1] = R.trunc('################################################################', 64);
  fp[(3) - 1] = R.trunc('#you#finally#discover#the#twisty#tunnel#that#you#noticed#during#', 64);
  fp[(4) - 1] = R.trunc('################################################################', 64);
  fp[(5) - 1] = R.trunc('#your#last#exploration#of#kroz\xb7#in#the#final#crusade\xb4##with#a###', 64);
  fp[(6) - 1] = R.trunc('################################################################', 64);
  fp[(7) - 1] = R.trunc('#few#swings#of#your#thick#leather#whip#the#small#tunnel#opened\xb7#', 64);
  fp[(8) - 1] = R.trunc('################################################################', 64);
  fp[(9) - 1] = R.trunc('#giving#you#passage\xb4##you#sip#lightly#from#your#water#pouch#and#', 64);
  fp[(10) - 1] = R.trunc('################################################################', 64);
  fp[(11) - 1] = R.trunc('#flick#the#whip#in#the#air\xb7#snapping#in#half#an#annoying#bug\xb4###', 64);
  fp[(12) - 1] = R.trunc('################################################################', 64);
  fp[(13) - 1] = R.trunc('#you#again#wonder#what#new#surprises#await#you#in#the#vast#and##', 64);
  fp[(14) - 1] = R.trunc('################################################################', 64);
  fp[(15) - 1] = R.trunc('#dangerous#kingdom#of#kroz\xb4##only#one#way#to#find#out\xb4\xb4\xb4########', 64);
  fp[(16) - 1] = R.trunc('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4', 64);
  fp[(17) - 1] = R.trunc('##############################Q 2       W#######################', 64);
  fp[(18) - 1] = R.trunc('P ##################### #########---#### ########## # ##########', 64);
  fp[(19) - 1] = R.trunc('## # ### ########### # # # ######222#### ##### ### # # # ### ###', 64);
  fp[(20) - 1] = R.trunc('### # # # ######### # ### # ### ##2## ## #### # # ## ## # # #E##', 64);
  fp[(21) - 1] = R.trunc('###### ### # ### # ## ### ## # # ### # # ### ### ### ## ## ###&#', 64);
  fp[(22) - 1] = R.trunc('###### #### # # # ### ### ### ### # ### # # #### ###2## ##7####L', 64);
  fp[(23) - 1] = R.trunc('######2####!## ##2###2###2###2#### ####2## #####2###C##2##\xf4#####', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (3) << 16 >> 16;
  hidestairs = true;
}
function level8() {
  fp[(1) - 1] = R.trunc(' P !XC-----------##-----XXX-------7  1    7           ------DDLL', 64);
  fp[(2) - 1] = R.trunc('XXXXXX-----------##\xb3----X\xb9X----\xb3---###\xb3###             --#\xb3#####', 64);
  fp[(3) - 1] = R.trunc('    --------\xf1----##\xb3###########\xb3---##+\xb3+##             --4\xb3-----', 64);
  fp[(4) - 1] = R.trunc('     -------XXXX\xba##\xb3-----------\xb3---##+\xb3+##             -74   1  ', 64);
  fp[(5) - 1] = R.trunc('   T ------------##\xb3-----------\xb3---##+\xb3+##              "######\xb9', 64);
  fp[(6) - 1] = R.trunc('     ------------##\xb37  1        7--##+\xb3+##                    4 ', 64);
  fp[(7) - 1] = R.trunc('    -------------##\xb3 XXXXXXXXXXX---###X###              \x96     4 ', 64);
  fp[(8) - 1] = R.trunc('      -----------##\xb3 XXXXXXXXXXX------\xb3                       4 ', 64);
  fp[(9) - 1] = R.trunc('  T  -----7 1    ##\xb3 XXXXXKXXXXX------\xb3                 \x91     4 ', 64);
  fp[(10) - 1] = R.trunc('     -----\xb3XXXXXX##\xb3          --------\xb31 1 1 7                4 ', 64);
  fp[(11) - 1] = R.trunc('     -----\xb3          1        W#######\xb3######           \x96     4 ', 64);
  fp[(12) - 1] = R.trunc('     -----\xb3#############XXX######   71\xb3                       4 ', 64);
  fp[(13) - 1] = R.trunc('   T -----\xb3--------##---------##     #\xb317               \x91     4 ', 64);
  fp[(14) - 1] = R.trunc('          \xb3--------##---------##    71\xb3#        7      1   7  4 ', 64);
  fp[(15) - 1] = R.trunc('          \xb3--------##---------##     #\xb3\xba7        000000000#   4 ', 64);
  fp[(16) - 1] = R.trunc(' #        \xb3--------##---------##    71\xb3#           \xb3 WWWWW#   4 ', 64);
  fp[(17) - 1] = R.trunc('X#  T     \xb3--------##---------##     #\xb317          \xb3 ######   4 ', 64);
  fp[(18) - 1] = R.trunc('W#        \xb3   ##XXX##---------##    71\xb3#           \xb3          4 ', 64);
  fp[(19) - 1] = R.trunc('W#        \xb3   ##WW[##---------##     #\xb317          \xb3          4 ', 64);
  fp[(20) - 1] = R.trunc('W#        \xb3   ##WWW##---------##    71\xb3#           \xb3          4 ', 64);
  fp[(21) - 1] = R.trunc('W# <      \xb3   ##XXX##----K----##     #\xb317  7      1           4 ', 64);
  fp[(22) - 1] = R.trunc('W#        \xb3        ##---------##|     \xb3#    ####################', 64);
  fp[(23) - 1] = R.trunc('W#             1   ##       1 44          1 #a#\xb6sideways\xb6#level#', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level9() {
  fp[(1) - 1] = R.trunc('-------\xbc--------44---\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xba---\xba\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3------K---\xb9;-U-', 64);
  fp[(2) - 1] = R.trunc('XXXXXXX-XXX-----44---      -----------------    ----#######-;---', 64);
  fp[(3) - 1] = R.trunc('--------------71#####       ---------------      #####\xb9-----;;;;', 64);
  fp[(4) - 1] = R.trunc('K------------71###           -------------          #####\xb3##; P ', 64);
  fp[(5) - 1] = R.trunc('#17---------71####****        -----------       ****##----\x91W;   ', 64);
  fp[(6) - 1] = R.trunc('##17-------71#####*###         ----K----        ###*##\xb3#####;   ', 64);
  fp[(7) - 1] = R.trunc('###17-----71######*#             #####            #*## 1   7;   ', 64);
  fp[(8) - 1] = R.trunc('####17---71#######*;     W    W    W    W    W    :*#######\xb3;   ', 64);
  fp[(9) - 1] = R.trunc('#####17-71########*#444444444444444444444444444444#*##\xf1     ;   ', 64);
  fp[(10) - 1] = R.trunc('######---#########*#                              #*##444\xb3##;   ', 64);
  fp[(11) - 1] = R.trunc('#######\xe4##########U#                              #!##\x91     ;   ', 64);
  fp[(12) - 1] = R.trunc('----------------####                              ######\xb3###;   ', 64);
  fp[(13) - 1] = R.trunc('----------------##VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV## \x95    ;   ', 64);
  fp[(14) - 1] = R.trunc('----------------##VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV###\xb3####;   ', 64);
  fp[(15) - 1] = R.trunc('\xbb\xe4-------------\xf2######################################      ;   ', 64);
  fp[(16) - 1] = R.trunc('5555555555555555#############the#lava#pit#################\xb3#;   ', 64);
  fp[(17) - 1] = R.trunc('            -------         ------------***********-##+\x92   C;   ', 64);
  fp[(18) - 1] = R.trunc('              000            ---\xbb######-###########-####\xb3###;   ', 64);
  fp[(19) - 1] = R.trunc('                                ------7\x91##LL-D-D-D-\xb3##      ;   ', 64);
  fp[(20) - 1] = R.trunc('                                     ##-###########\xb3#######\xb3;   ', 64);
  fp[(21) - 1] = R.trunc('                                     ##-7  1   TTT7\xb3##     \x91;   ', 64);
  fp[(22) - 1] = R.trunc('                                     ##--#########\x91\xb3###\xb3####;   ', 64);
  fp[(23) - 1] = R.trunc('\xbc       1 1 1 1 1 1 1 1 1 1 1 1 1 1 1##111111111  \xe4C##\x95       \x91 ', 64);
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (75) << 16 >> 16;
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level11() {
  fp[(1) - 1] = R.trunc('66666666666666666666----------------------------66WW---I-------K', 64);
  fp[(2) - 1] = R.trunc('-----------D D D-----66666666666666666666666666(6666666666666---', 64);
  fp[(3) - 1] = R.trunc('-666666666666666666-((((((((((((((((22222222222(-----------666-6', 64);
  fp[(4) - 1] = R.trunc('-666666666666666666-66((((((((((((((22222222222(6-66666666-----6', 64);
  fp[(5) - 1] = R.trunc('-66666666666066WYY6-66VVVVVVVVVVVVVVVVVVVVVVVVV66-66666666666666', 64);
  fp[(6) - 1] = R.trunc('------------0B6WYY--66T-W-W-*-W-W-C-W-W-*-W-W-T66-66666666663666', 64);
  fp[(7) - 1] = R.trunc('-66666666666066WYY6666666666666666666666666666666\x9266666666636666', 64);
  fp[(8) - 1] = R.trunc('-MMMMM6666666666666666666666666666666666666666666-66666666366666', 64);
  fp[(9) - 1] = R.trunc('-MMMMM............................3!66222222266----$$$$$$$666666', 64);
  fp[(10) - 1] = R.trunc('-MMMMM6666666666666666666666666666666622222266~~~~~~~~~~~~-66666', 64);
  fp[(11) - 1] = R.trunc('-MMMMM666666666666666666666666666666662222266------------~~-6666', 64);
  fp[(12) - 1] = R.trunc('-MMMMM............................3H66222266-~~~~~~~~~~~~-~~-666', 64);
  fp[(13) - 1] = R.trunc('-MMMMM6666666666666666666666666666666622266-~~----------~~-~~-66', 64);
  fp[(14) - 1] = R.trunc('-66666666666666666666666666666666666@@@@66-~~-~~~~~~~~~~-~~-~~-6', 64);
  fp[(15) - 1] = R.trunc('----666-OWOWOWOWOWOWOWOWOWO 66666666@66@666-~~-~~K\x92-----~~-~~-66', 64);
  fp[(16) - 1] = R.trunc('-66-666-6666666666666666666 66666666@66-6666-~~-~~~~~~~~~-~~-666', 64);
  fp[(17) - 1] = R.trunc('-66F666-666T-3)K)3-T66           666@66-66666-~~---------~~-666C', 64);
  fp[(18) - 1] = R.trunc('-66F666-666T-3)))3-T66     G     666-66-666666-~~~~~~~~~~~-6666-', 64);
  fp[(19) - 1] = R.trunc('-66666---666666-666666           666-66-6633666-----------666333', 64);
  fp[(20) - 1] = R.trunc('-66YYYYYYYYY666-66666666666-66666666-66-66--6666666666666-666-66', 64);
  fp[(21) - 1] = R.trunc('--     P    666-66+------66-66-------66----Y--D-D-D-LL 66-666-66', 64);
  fp[(22) - 1] = R.trunc('666---------666-66666666-66-66Y66666-66666666666666666666-666-66', 64);
  fp[(23) - 1] = R.trunc('666222222222666-------------66---Z66--------------------------66', 64);
  fast = '\xea';
  convert_format();
}
function level13() {
  fp[(1) - 1] = R.trunc('P   ########Q##########################################1       L', 64);
  fp[(2) - 1] = R.trunc('#    #######X######H 1        H###########H    H######   W]H]W&L', 64);
  fp[(3) - 1] = R.trunc('##    ######O#####       \x92      #########        ####    #######', 64);
  fp[(4) - 1] = R.trunc('###    #####O####H   ####4###    #######   1##\xf1   ###H   #######', 64);
  fp[(5) - 1] = R.trunc('####    ####O#####H   ###4####    V<[|"V    ###    ###    ######', 64);
  fp[(6) - 1] = R.trunc('####    ####O######    ##4####    ######    ###    ####    #####', 64);
  fp[(7) - 1] = R.trunc('####    ####O#####  1 ###4####  1 ######    ###    #####   H####', 64);
  fp[(8) - 1] = R.trunc('#####    ###O####    ####4#####     H###    ###  1 ####    #####', 64);
  fp[(9) - 1] = R.trunc('######    ##O###    #####4######      ##    ###    ### 1  ######', 64);
  fp[(10) - 1] = R.trunc('#######            ######4#########   1    ####    ##    #######', 64);
  fp[(11) - 1] = R.trunc('########  1       #######K##########      ######        ########', 64);
  fp[(12) - 1] = R.trunc('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4', 64);
  fp[(13) - 1] = R.trunc('#diary\xb7#day#two\xb8################################################', 64);
  fp[(14) - 1] = R.trunc('################################################################', 64);
  fp[(15) - 1] = R.trunc('#the#journey#is#starting#to#wear#you#down\xb7#but#you#will#never###', 64);
  fp[(16) - 1] = R.trunc('################################################################', 64);
  fp[(17) - 1] = R.trunc('#give#up\xc3##you#have#discovered#new#items#in#kroz\xb4##some#areas###', 64);
  fp[(18) - 1] = R.trunc('################################################################', 64);
  fp[(19) - 1] = R.trunc('#have#a#strange#magical#gravity#that#tugs#you#down\xb4##you\xb6ve#####', 64);
  fp[(20) - 1] = R.trunc('################################################################', 64);
  fp[(21) - 1] = R.trunc('#also#discovered#ropes#that#allow#you#to#swing#and#climb#over###', 64);
  fp[(22) - 1] = R.trunc('################################################################', 64);
  fp[(23) - 1] = R.trunc('#trouble#spots\xb4##kroz#will#beat#you\xb7#you#cannot#accept#defeat\xc3##', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (3) << 16 >> 16;
  hidestairs = true;
}
function level14() {
  fp[(1) - 1] = R.trunc('VXVVVVVVVVXVVVVVVXVVVVV   P   VVVVVVVVVVXVVVVVXVVVVVXVVVVVVVVXVV', 64);
  fp[(2) - 1] = R.trunc('VVVVXVVVXVVVVVXVVVVVVV       VVVXVVVVVVVVVXVVVVVVVXVVVVXVVVVVVVV', 64);
  fp[(3) - 1] = R.trunc('VVVVVVXVVVXVVVVVVVVXVV         VVVXVVVVVVVVVVXVVVVVVVXVVVVVXVVVV', 64);
  fp[(4) - 1] = R.trunc('VVXVVVVVVVVVVVVVXVVVVVV      VVVVVVVVXVVVXVVVVVVVXVVVVVVXVVVVVXV', 64);
  fp[(5) - 1] = R.trunc('VVVVXVVVVXVVVVXVVVVXVVV     VVXVVVVVVVVXVVVVVXVVVVVVVXVVVVVXVVVV', 64);
  fp[(6) - 1] = R.trunc('XVVVVVVVVVVXVVVVXVVVV       VVVVXVVVVVVVVVVXVVVXVVVVVVVVVVXVVVVV', 64);
  fp[(7) - 1] = R.trunc('VVVVVVXVVVVVVVXVVVVVVV       VVVVVVVVXVVVXVVV#oh#no\xb7#you\xb6ve#VXVV', 64);
  fp[(8) - 1] = R.trunc('VVXVVVVVXVVVVVVVVVXVV        VVVXVVVVVVVVVVXV#fallen#into#a#VVVV', 64);
  fp[(9) - 1] = R.trunc('VVVVXVVVVVVXVVVVXVVVVV      VVVVVVVVVVXVVVVVV#volcano#pit\xc3##VVXV', 64);
  fp[(10) - 1] = R.trunc('VVVVVVVXVVVVVXVVVVVXVVV   CVVVXVVVXVVVVVVXVVVVVVVVVVVXVVVVVVVVVV', 64);
  fp[(11) - 1] = R.trunc('VXVVVVVVVVXVVVVVVVVVVXV   VVXVVVVVVVVXVVVVVVVVVXVVVVVVVXVVVVVVXV', 64);
  fp[(12) - 1] = R.trunc('VVVVXVVVVVVVVXVVXVVVVVV    VVVVVXVVVVVVVVVVXVVVVVVXVVVVVVVVXVVVV', 64);
  fp[(13) - 1] = R.trunc('VVVXVVVVXVVVVVVVVVVXVVVV VVVVVVVVVXVVVVVXVVVVXVVVVVVVXVVVVVVVXVV', 64);
  fp[(14) - 1] = R.trunc('VVVVVVXVVVXVVVVVVVVVVVV   VVVXVVVVVVVXVVVVVVVVVVVXVVVVVVVXVVVVVV', 64);
  fp[(15) - 1] = R.trunc('XVVVVVVVVVVVVVVVXVVVVV  W  VVVVVXVVVVVVVVVXVVVXVVVVVXVVVVVVVVXVV', 64);
  fp[(16) - 1] = R.trunc('VVVXVVVVVVVXVVVVVVVXVV   W  VVVVVVVXVVVVVVVVXVVVVXVVVVVVVVVXVVVV', 64);
  fp[(17) - 1] = R.trunc('VVVVVVXVVVVVVXVVVVVVVVV W    VXVVVVVVVVXVVVVVVVVVVVVXVVVVXVVVVVV', 64);
  fp[(18) - 1] = R.trunc('VVVVVVVVVXVVVVVVXVVVVVV  W   VVVVXVVVVVVVXVVVVXVVVVVVVVXVVVVVVXV', 64);
  fp[(19) - 1] = R.trunc('VXVVXVVVVVVVXVVVVVXVVVC W   VVVVVVVVXVVVVVVVVXVVVVXVVVVVVVVXVVVV', 64);
  fp[(20) - 1] = R.trunc('VVVVVVXVVVVVVVVXVVVVVVV  W   VXVXVVVVVVVXVVVVVVVXVVVVVXVVVVVVVXV', 64);
  fp[(21) - 1] = R.trunc('VVXVVVVXVVVXVVVVVXVVVVVV      VVVVVXVVVVVVXVVVVVVVXVVVVXVVVVXVVV', 64);
  fp[(22) - 1] = R.trunc('VVVVXVVVVVVVVXVVVVVVVVXVV      VVXVVVVVXVVVVVVVXVVVVVVVVVVXVVVVX', 64);
  fp[(23) - 1] = R.trunc('VVXVVVVXVVVVVVVVVXVXVVVVVVLLLLLLLVVVXVVVVVVXVVVVVVVVXVVVVVVVVVXV', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
  hidestairs = true;
}
function level15() {
  fp[(1) - 1] = R.trunc('VV#VVVVV#VVVVV#VVVVVV#VVVV   P  \xb9-----------I-------3-----\x95---LL', 64);
  fp[(2) - 1] = R.trunc('VVVV#VVVVVVV#VVV#VVVVVVV#VV      XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(3) - 1] = R.trunc('#VVVVV#VVVVVVVVVVVVVV#VVVVV      VVVVVV\x91VVVVVVVV#VVVVVVVVVVV#VVV', 64);
  fp[(4) - 1] = R.trunc('VVVVVVVVVV#VVVVVV#VVVVV#VVVV      VV#VV<VVVVV#VVVVVVVV#VVVVVVV#V', 64);
  fp[(5) - 1] = R.trunc('VV#VVVVVVVVVVV#VVVVV#VVVVVVVV      VVVV[VVV#VVVVVV#VVVVVV#VVVVVV', 64);
  fp[(6) - 1] = R.trunc('VVVVV#VVVVV#VVVVVV#VVVVVVV#V   WWWVVV#V|VVVVVVV#VVVVVV#VVVVVV#VV', 64);
  fp[(7) - 1] = R.trunc('VV#VVVVV#VVVVVVVVVVVVV#VVVVVV  YYY VVVV"VVVVV#VVVVVVVVVVVV#VVVVV', 64);
  fp[(8) - 1] = R.trunc('VVVVVVVVVVVVVV#VVVVVVVVVV#VVVV      VVV#VVVVVVVV#VVVVVVVVVVVVVV#', 64);
  fp[(9) - 1] = R.trunc('VVV#VVVVVVVVVVVVV#VVV#VVVVVVVVV      VVVVV#VVVVVVVV#VVVVVVVV#VVV', 64);
  fp[(10) - 1] = R.trunc('#VVVV#VVVVVVVVVVVVVVVVV#VVVVV#VV      VVVVVVV#VVVVVVV#VV#VVVVVVV', 64);
  fp[(11) - 1] = R.trunc('VVVVVVV#VVVV#VVVVVV#VVVVVVVVVVV      VVV#VVVVVVVV#VVVVVVVVVVVV#V', 64);
  fp[(12) - 1] = R.trunc('VV#VVVVVVVVVV#VVVVVVVVVVVVV#VV      VVVVVVV#VVVVVVVV#VVVVV#VVVVV', 64);
  fp[(13) - 1] = R.trunc('VVVVVVVVVV#VVVV#VVVVVVVVV#VVV      VVV#VVVVVVVV#VVVVVVV#VVVV#VVV', 64);
  fp[(14) - 1] = R.trunc('VVV#VVVVVVVVVVVVV#VVVV#VVVVVVV      VVVVV#VVVVVVVV#VVVVVV#VVVVVV', 64);
  fp[(15) - 1] = R.trunc('VVVVV#VVVVVVV#VVVVVV#VVVVVVVV      VVVVVVVVV#VVV#VVVVVVVVVVVVVV#', 64);
  fp[(16) - 1] = R.trunc('#VVVVVV#VVVVVVVVVVVVVVVV#VVV      VV#VVVVVVVVV#VVVVV#VVVVVVV#VVV', 64);
  fp[(17) - 1] = R.trunc('VV#VVVVVVVVVVVVV#VV#VVVVVVV  \xb9   VVVVVV#VVVVVVVVVV#VVVVV#VVVVVVV', 64);
  fp[(18) - 1] = R.trunc('VVVVVVVVVV#VVVVVVVVVV#VVV#VV      VVV#VVVVV#VVVVVVVVV#VVVVVVVV#V', 64);
  fp[(19) - 1] = R.trunc('VVVV#VVVVVVV#VVVVVVVVVV#VVVVV      VVVVV#VVVVVV#VVVVVVVVVV#VVVVV', 64);
  fp[(20) - 1] = R.trunc('#VVVVVV#VVVVVVV#VVVV#VVVVVVVVV      VV#VVVVVV#VVVVV#VVVVVVVVV#VV', 64);
  fp[(21) - 1] = R.trunc('VV#VVVVVV#VVVVVVVV#VVVVVVV#VV      VVVVVVV#VVVVVV#VVVVVV#VVVVVVV', 64);
  fp[(22) - 1] = R.trunc('VVVVV#VVVVVVV#VVVVVVVVV#VVVVVVVVVVVVVVV#VVVVVVV#VVVVV#VVVVV#VVVV', 64);
  fp[(23) - 1] = R.trunc('#VVVVVVVVV#VVVVVVVVVV#VVVVVVVVVVVVVV#VVVVVVV#VVVVVV#VVVVVVVVV#VV', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level18() {
  fp[(1) - 1] = R.trunc('K----------------------------YYY!YYY---------------------------K', 64);
  fp[(2) - 1] = R.trunc('-66666666666666666666666666666666666666666666666666666666666666-', 64);
  fp[(3) - 1] = R.trunc('-66\xf1                           \x97+          DTDTDTDTLL 66   -"66-', 64);
  fp[(4) - 1] = R.trunc('-66                                        6666666666666   --66-', 64);
  fp[(5) - 1] = R.trunc('-6666666666666666666666666666666666                          66-', 64);
  fp[(6) - 1] = R.trunc('-66<-     )                   66 ..                          66-', 64);
  fp[(7) - 1] = R.trunc('-66--     #############       66 66      ##$$$$$$$$$$$##     66-', 64);
  fp[(8) - 1] = R.trunc('-66      ##11111111111##      66 66      ###MMMMMMMMM###     66-', 64);
  fp[(9) - 1] = R.trunc('-66     ##1111111111111(      66 66      ####MMMMMMM####     66-', 64);
  fp[(10) - 1] = R.trunc('-66     ##1111111111111(      66(66      ##W##MMMMM##W##     66-', 64);
  fp[(11) - 1] = R.trunc('-66      ##11111111111(       66 66      ##WW##MMM##WW##     66-', 64);
  fp[(12) - 1] = R.trunc('-44)))))))############(       66P66      ##WWW##&##WWW##     55-', 64);
  fp[(13) - 1] = R.trunc('-66      )11111111111##       66 66      ##....###....##     66-', 64);
  fp[(14) - 1] = R.trunc('-66     )1111111111111##      66 66      ##     #     ##     66-', 64);
  fp[(15) - 1] = R.trunc('-66     )1111111111111##      66 66      ##     \x97     ##     66-', 64);
  fp[(16) - 1] = R.trunc('-66     ##11111111111##       66 66      ##           ##     66-', 64);
  fp[(17) - 1] = R.trunc('-66      #############        66 66      ##]]]]]]]]]]]##   --66-', 64);
  fp[(18) - 1] = R.trunc('-66                           .. 66                        -[66-', 64);
  fp[(19) - 1] = R.trunc('-66                           666666666666666666666666666666666-', 64);
  fp[(20) - 1] = R.trunc('-66--   6666666666666         +\x97                             66-', 64);
  fp[(21) - 1] = R.trunc('-66|-   66 LLWDWDWDWD                                       \xf266-', 64);
  fp[(22) - 1] = R.trunc('-66666666666666666666666666666666666666666666666666666666666666-', 64);
  fp[(23) - 1] = R.trunc('K----------------------------3333333---------------------------K', 64);
  fast = '\xea';
  convert_format();
  hidemblock = true;
  hidecreate = true;
  treerate = (70) << 16 >> 16;
}
function level20() {
  fp[(1) - 1] = R.trunc('<33333333333333333333333333333333333333333333333333333333333333[', 64);
  fp[(2) - 1] = R.trunc('3                                                              3', 64);
  fp[(3) - 1] = R.trunc('3                                                              3', 64);
  fp[(4) - 1] = R.trunc('3                                                              3', 64);
  fp[(5) - 1] = R.trunc('3           YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY           3', 64);
  fp[(6) - 1] = R.trunc('3           YC     F        F   Z         W    F \xf2KY           3', 64);
  fp[(7) - 1] = R.trunc('3           Y          W           F     F       \xf2\xf2Y           3', 64);
  fp[(8) - 1] = R.trunc('3           Y    F            \xf2\xf2\xf2\xf2\xf2          F   F Y           3', 64);
  fp[(9) - 1] = R.trunc('3           YW         F      \xf2   \xf2  F             Y           3', 64);
  fp[(10) - 1] = R.trunc('3           Y                 \xf2 P \xf2             W  Y           3', 64);
  fp[(11) - 1] = R.trunc('3           Y    W F      F   \xf2F  \xf2   F    F       Y           3', 64);
  fp[(12) - 1] = R.trunc('3           Y                 \xf2\xf2\xf2\xf2\xf2   W        F   Y           3', 64);
  fp[(13) - 1] = R.trunc('3           Y F              F                     Y           3', 64);
  fp[(14) - 1] = R.trunc('3           Y\xf2\xf2       F   W       F       F      F Y           3', 64);
  fp[(15) - 1] = R.trunc('3           YK\xf2 F               Z           W     CY           3', 64);
  fp[(16) - 1] = R.trunc('3           YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY           3', 64);
  fp[(17) - 1] = R.trunc('3                                                              3', 64);
  fp[(18) - 1] = R.trunc('3                                                              3', 64);
  fp[(19) - 1] = R.trunc('3                                                              3', 64);
  fp[(20) - 1] = R.trunc('"33333333333333333333333333333333333333333333333333333333333333|', 64);
  fp[(21) - 1] = R.trunc('5##############################444#############################5', 64);
  fp[(22) - 1] = R.trunc('--~~-~--~-~--~~-~~--~--~-D-D-++-L-WW-D-D-~--~--~-~~-~--~~-~~-~--', 64);
  fp[(23) - 1] = R.trunc('-~--~-~~-~-~~--~--~~-~~--D-D-++\xf1L\xf1WW-D-D--~~-~~-~--~-~~--~--~-~-', 64);
  fast = '\xea';
  convert_format();
  hideopenwall = true;
}
function level22() {
  fp[(1) - 1] = R.trunc('###key#shop###MTMMMMMMMMMMMMMMMMMMMMM-----MMMMMMMMMMMM-MM--!##LL', 64);
  fp[(2) - 1] = R.trunc('##K\xe1\xe044@@@@@##MMMMMMMMMMMMMMMMMMMMMM-MMMMM-MMMMMMMMMM-M-M-P-##LL', 64);
  fp[(3) - 1] = R.trunc('##K\xe13##@@@@@@DMMMMMMCMMMMMMMMMMMMMM-MMMMMMM-MMM<MMMM-MMM----##DD', 64);
  fp[(4) - 1] = R.trunc('##K\xe1\xe0##@@@@@##M-MMMMMMMMMMMMMMMM---MMMMMMMM-MMMMMMM-MMMMMMMM##DD', 64);
  fp[(5) - 1] = R.trunc('#######X######MM-MMMMMMMMMMM----MMMMMMMMMMMM-MMMMM-MMMMMMMMM##DD', 64);
  fp[(6) - 1] = R.trunc('##\xf1-----##MMMMMMM-MMMMM-----MMMMMMMMMMMKMMMMM-MMM-MMMMMMMMMM##DD', 64);
  fp[(7) - 1] = R.trunc('##########MMMMMMTMMMMM-MMMMMMMMMMMMMMMMMMMMMMM-M-MMMMMMMMMMMMMMM', 64);
  fp[(8) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMCMMMMMM-MM', 64);
  fp[(9) - 1] = R.trunc('MMMMMMMM-----MMMM----MMMMMMMM[MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMM', 64);
  fp[(10) - 1] = R.trunc('MMMM----MMMMM----MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMTMMMMMMMMMMM-MMMM', 64);
  fp[(11) - 1] = R.trunc('MMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMM', 64);
  fp[(12) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MM', 64);
  fp[(13) - 1] = R.trunc('MM-MMMMMMCMMMMMMMMMMMMMMMBWWWWWWWWWW-------------------------MMM', 64);
  fp[(14) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MM', 64);
  fp[(15) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMTMMMMMMMMMMMMMMM-M', 64);
  fp[(16) - 1] = R.trunc('MMM-------MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MM', 64);
  fp[(17) - 1] = R.trunc('MMMMMMMMMM-----MMMMMMMMMMMMMMMM]MMMMMMMMM-M-MMMMMMMMMMMMMMMM-MMM', 64);
  fp[(18) - 1] = R.trunc(')))))))))MMMMMM-MMMMMMMMMMMMMMMMMMMMMM-M-M-M-MMMMMMMMCMMMMM-MMMM', 64);
  fp[(19) - 1] = R.trunc('22222222)MMTMMM-MMMMMCMMMMMMMMMMMMMMM-M-MMMMM-MMM-MMMMMMMM-MMMMM', 64);
  fp[(20) - 1] = R.trunc('22222222)MMMMMM-MMMMMMMMMMMMMMM------MMMMMMM-MMM-M-MMMMMM-MMMMMM', 64);
  fp[(21) - 1] = R.trunc('22222222)MMMMMM-MMMMMMMMMM-----MMMMMMMMMMMM-MMM-MM-MMMMM-MMMMMMM', 64);
  fp[(22) - 1] = R.trunc('--222222)MMMMMM-----------MMMMMMMMMMMMMMMM-MM-M-MMM-M-M-MMMMM"MM', 64);
  fp[(23) - 1] = R.trunc('K-222222)MMMMMMMMMMMMMMMMMMMMMMMMMM|MMMMMMM--M-MMMMM-M-MMMMMMMMM', 64);
  fast = '\xea';
  convert_format();
}
function level24() {
  fp[(1) - 1] = R.trunc('T    P  #the#step#of#faith#-----\x92-~K\xf1-------U-----#---D-D-D-D-LL', 64);
  fp[(2) - 1] = R.trunc('######----------------------\xba44444444-------\xbb-K\x92--#\xbd############', 64);
  fp[(3) - 1] = R.trunc('-----------------------------#       ------#####\xbb-#-----\xb3-------', 64);
  fp[(4) - 1] = R.trunc('-----------------------------#        -----:------#----\xb3-\xb3------', 64);
  fp[(5) - 1] = R.trunc('------###--------------------#        -----:------#--\xb3\xb3---\xb3-----', 64);
  fp[(6) - 1] = R.trunc('--------#--------------------#        -----:------#-#------\xbc----', 64);
  fp[(7) - 1] = R.trunc('--------#--------------------#        -----#####--#-#-----------', 64);
  fp[(8) - 1] = R.trunc('--------#--------------------#        -----#---;--#-#------\xbc----', 64);
  fp[(9) - 1] = R.trunc('--------#--------------------#        -----#<###--#-#-----------', 64);
  fp[(10) - 1] = R.trunc('--------#---------\xf5---------\xba#         ----#[#----#-#-----\xb3-----', 64);
  fp[(11) - 1] = R.trunc('--K-----#\xb9########88888888888#         ----#|#----#-#----\xb3--W---', 64);
  fp[(12) - 1] = R.trunc('-XXX----#      #             #         ----#"#----#-#-------W---', 64);
  fp[(13) - 1] = R.trunc('        #      #             #          ---#-#----#-#---\xb3---W---', 64);
  fp[(14) - 1] = R.trunc('        # \x93    #             #          ----------#-##-\xb3----W---', 64);
  fp[(15) - 1] = R.trunc('        #      #             #             ;;;;;- #\xbdK#\xb3-----W---', 64);
  fp[(16) - 1] = R.trunc('        #      #             #                 +-+####------W---', 64);
  fp[(17) - 1] = R.trunc('        #      #             #                 +-+----\xb3-----W---', 64);
  fp[(18) - 1] = R.trunc('    XXXX#      #             #                 +-+---\xb3------W---', 64);
  fp[(19) - 1] = R.trunc('         \xb9     #             #                 +-+###-----------', 64);
  fp[(20) - 1] = R.trunc('       ###     #             #    U            +-+#--------7----', 64);
  fp[(21) - 1] = R.trunc('               #             #                 + +#   ##C.!.C## ', 64);
  fp[(22) - 1] = R.trunc('               #             #                 + +#   ######### ', 64);
  fp[(23) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
  lavaflow = true;
  lavarate = (75) << 16 >> 16;
}
function level26() {
  fp[(1) - 1] = R.trunc('::::::::::::::::::::::::::::::::::::::::::::::::####amulet####::', 64);
  fp[(2) - 1] = R.trunc(':###########::::::::::::::::::::::::::::::::::::#55]-----]---#::', 64);
  fp[(3) - 1] = R.trunc(':#         #::::::::::::::::::::::::::::::::::::#\x835----]--L-\xf2#::', 64);
  fp[(4) - 1] = R.trunc(':#    P   HOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO::::::#55-]------]-#::', 64);
  fp[(5) - 1] = R.trunc(':#K        #::::::O::::::::::::-:::::::::O::::::###D##########::', 64);
  fp[(6) - 1] = R.trunc(':###########::::::O::::::::::::-:::::::::O:::::::::O::::::::::::', 64);
  fp[(7) - 1] = R.trunc('::::::::::::::::::O::::::::::::-:::::::::O:::::::::O::-----:::::', 64);
  fp[(8) - 1] = R.trunc('::::::::::::::::::O::::::::::::-:::::::::O:::::::::O::+++:-:::::', 64);
  fp[(9) - 1] = R.trunc('::::::::::::::::::O::::::::::::-:::::::::O:::::::::O::+++:-:::::', 64);
  fp[(10) - 1] = R.trunc('::::::::::::::::::O::::::::::::-:::::::::O:::::::::O::::::-:::::', 64);
  fp[(11) - 1] = R.trunc(':::::::::::OOOOOOOO::::::::::::-::::#####D###::::::O::::::-:::::', 64);
  fp[(12) - 1] = R.trunc(':::::::::::O:::::::::::::::::::-::::#K;     #::::::OOOOO::-:::::', 64);
  fp[(13) - 1] = R.trunc(':::::::::::O:::::::::::::::::::-::::#;;     #::::::::::O::-:::::', 64);
  fp[(14) - 1] = R.trunc(':::::######D#############::::::-::::# W     #::::::::::O::-:::::', 64);
  fp[(15) - 1] = R.trunc(':::::#!---...----T---I--#::::::-::::#       #::::::::::O::-:::::', 64);
  fp[(16) - 1] = R.trunc(':::::#----K----F---\x92---\xf1#::::::-::::#     * #::::::::::O::-:::::', 64);
  fp[(17) - 1] = R.trunc(':::::#-S---I----------Z-#::::::-::::#       #::::::::::O::-:::::', 64);
  fp[(18) - 1] = R.trunc(':::::####################::::::-::::#   W   #::::::::::O::-:::::', 64);
  fp[(19) - 1] = R.trunc(':::::::::::::::::::::::::::::::-::::#       #::::::::::O::-:::::', 64);
  fp[(20) - 1] = R.trunc(':::::::::::::::::::::::::::::::-::::#4444444#::::::::::O::-:::::', 64);
  fp[(21) - 1] = R.trunc('::::::::::::::::::::::::+++::::-::::#K;-----DOOOOOOOOOOOOOOOOO::', 64);
  fp[(22) - 1] = R.trunc('###rogue###:::::::::::::+++-----::::#########:::::::::::::::::::', 64);
  fp[(23) - 1] = R.trunc('#was#here\xc3#:::::::::::::::::::::::::::::::::::::::::::::::::::::', 64);
  fast = '\xea';
  convert_format();
  hidegems = true;
  hidecreate = true;
}
function level28() {
  fp[(1) - 1] = R.trunc('#diary\xb7#day#three\xb8################## P #########################', 64);
  fp[(2) - 1] = R.trunc('###################################### ############\xb9   #########', 64);
  fp[(3) - 1] = R.trunc('#you#slept#well#last#night#after#######  ########## ### ########', 64);
  fp[(4) - 1] = R.trunc('###################################### ## ######### #### #######', 64);
  fp[(5) - 1] = R.trunc('#the#unexpected#discovery#of#the###### ##;######### #####  #####', 64);
  fp[(6) - 1] = R.trunc('###################################### ##;######### ####### ####', 64);
  fp[(7) - 1] = R.trunc('#fabled#amulet#of#yendor\xb4##the######## ##;######### ####### ####', 64);
  fp[(8) - 1] = R.trunc('###################################### ##;######### #######  ###', 64);
  fp[(9) - 1] = R.trunc('#amulet#was#long#thought#to#be######## ##;######### ######### ##', 64);
  fp[(10) - 1] = R.trunc('###################################### ## ######### ######## ###', 64);
  fp[(11) - 1] = R.trunc('#lost#in#a#land#stangely#called####### ###  ####### ######  ####', 64);
  fp[(12) - 1] = R.trunc('######################################\xf1#### ####### ###### #####', 64);
  fp[(13) - 1] = R.trunc('#\xb6rogue\xb6\xb4##many#of#your#fellow########4### ##\xba      ##### ######', 64);
  fp[(14) - 1] = R.trunc('######################################4#  ### ##### ### T#######', 64);
  fp[(15) - 1] = R.trunc('#archaeologist#friends#have#spent#####4 ##### ##### ## #########', 64);
  fp[(16) - 1] = R.trunc('###################################### ###### ##### ### ########', 64);
  fp[(17) - 1] = R.trunc('#countless#hours#trying#to#get######## ###### ##### ####  ######', 64);
  fp[(18) - 1] = R.trunc('###################################### ###### ##### ###### #####', 64);
  fp[(19) - 1] = R.trunc('#the#amulet\xb4##how#ironic#that######### ###### #####\xb9####### ####', 64);
  fp[(20) - 1] = R.trunc('###################################### ###### ##### ######## ###', 64);
  fp[(21) - 1] = R.trunc('#you#should#stumble#across#it\xb4######## ######X####====####### ##', 64);
  fp[(22) - 1] = R.trunc('#######################################        \xba#=======###### #', 64);
  fp[(23) - 1] = R.trunc('#what#other#mysteries#await#in#kroz\xb5############=========#####L#', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
  hidestairs = true;
  hideopenwall = true;
}
function level30() {
  fp[(1) - 1] = R.trunc('1111144       ##C######locksmith#shoppe######C##         RRRRRRR', 64);
  fp[(2) - 1] = R.trunc('1111144       ##]##K#K#K#K#K#-3-3#K#K#K#K#K##]##        RRRRRRR\xf1', 64);
  fp[(3) - 1] = R.trunc('1111144          ##:::::::::######::::::::;##         RRRRRRRCYY', 64);
  fp[(4) - 1] = R.trunc('1111144          ##------------------------##     666RRRRRRRR66 ', 64);
  fp[(5) - 1] = R.trunc('1111144          #############--#############     6666666666666 ', 64);
  fp[(6) - 1] = R.trunc('1111144                                           HOOOOOOOOH    ', 64);
  fp[(7) - 1] = R.trunc('1111144                                        6666666666666    ', 64);
  fp[(8) - 1] = R.trunc('1111144                                        66RRRRRRR6666    ', 64);
  fp[(9) - 1] = R.trunc('1111144                                        RRRRRRR          ', 64);
  fp[(10) - 1] = R.trunc('1111144                                      RRRRRR           YY', 64);
  fp[(11) - 1] = R.trunc('1111144               P                    RRRRRR             YZ', 64);
  fp[(12) - 1] = R.trunc('1111144                                 RRRRRRRRRR            YY', 64);
  fp[(13) - 1] = R.trunc('1111144                              RRRRR333RRRRR              ', 64);
  fp[(14) - 1] = R.trunc('1111144                             RRR3333333RRRRR             ', 64);
  fp[(15) - 1] = R.trunc('@@@@@##                           RRR3333333333RRRRR            ', 64);
  fp[(16) - 1] = R.trunc('MMMMM##                           RRR333333333RRRRR             ', 64);
  fp[(17) - 1] = R.trunc(')))))##                          RRR33333333RRRRR               ', 64);
  fp[(18) - 1] = R.trunc('MMMMM##                        RRRR333333RRRRRRR        DDDDDDDD', 64);
  fp[(19) - 1] = R.trunc('(((((##                       RRRR3LL3RRRRRRRR          DDDDDDDD', 64);
  fp[(20) - 1] = R.trunc('MMMMM##                      RRRRRRRRRRRRRR             DDDDDDDD', 64);
  fp[(21) - 1] = R.trunc('$$$$$##                     RRRRRRRRRRRR                DDDD7777', 64);
  fp[(22) - 1] = R.trunc('MMMMM##                     RRRRRRRR                    DDDD77\xf4\xf4', 64);
  fp[(23) - 1] = R.trunc(']]K]]##\x93                   RRRRRRK]                     DDDD77\xf4!', 64);
  fast = '\xea';
  convert_format();
  hidecreate = true;
}
function level32() {
  fp[(1) - 1] = R.trunc(' P                     I    \xf4 9                     \x94         K ', 64);
  fp[(2) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXX##77;XXXXXXXXXX##XXXXXXXXXXXXXXX##;;XX', 64);
  fp[(3) - 1] = R.trunc('XXXXXXXXXXXXXX##XXXXXXXXXXXXIICXXXXXXXXXXXXXXXXX##XXXXXXXXXX;;XX', 64);
  fp[(4) - 1] = R.trunc('XXX##XXXXX!XXXXXXXXXXXXX##XX---XXXXXXXXXXXXXXXXXXXXXXXXXXXXX;;##', 64);
  fp[(5) - 1] = R.trunc('XXXXXXXXXXXOOOOOOOOOOOOOOOOO---X##XXXXXXXXXXXXXXXXXXXX##XXXX;;XX', 64);
  fp[(6) - 1] = R.trunc('XXXXXXXX##XXXXXXXXXXXXXXXXXX---XXXXXXXXXXXXXX##XXXXXXXXXXXXX;;XX', 64);
  fp[(7) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXXW-+XXXXX##XXXXXXXXXXXXXXXXXXXX##;;XX', 64);
  fp[(8) - 1] = R.trunc('XXXXXXXXXXXXXXXX##XXXXXXXXXXW-+XXXXXXXXXXXXXXXXXXXXXXXXXXXXX;;XX', 64);
  fp[(9) - 1] = R.trunc('##XXXXXXXXXXXXXXXXXXXXXXXXXXW-+XXXXXXXXXXXXXXXXOXXXXXXXXXXXX;;XX', 64);
  fp[(10) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXXW-+XXX##XXXXXXXXXXXOXXXXXX##XXXX;;XX', 64);
  fp[(11) - 1] = R.trunc('XXX##XXXXXXXXXXXXXXXXXXXX##XW-+XXXXXXXXXXX##XXOOOXXXXXXXXXXX;;XX', 64);
  fp[(12) - 1] = R.trunc('XXXXXXXXXX##XXXXXXXXXXXXXXXXW-+XXXXXXXXXXXXXXXOQOXXXXXXXXXXX;;##', 64);
  fp[(13) - 1] = R.trunc('XXXXXXXXXXXXXXXXX\xc5XXXXXXXXXXW-+XXXXXXX##XXXXXXOOOXXXX##XXXXX\x96\x96XX', 64);
  fp[(14) - 1] = R.trunc('XXXXXX##XXX##rip##XXXXXXXXXXW-+XXXXXXXXXXXXXXXXOXXXXXXXXXXXX--XX', 64);
  fp[(15) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXX\x91-\x91XXXXXXXXXXXXXXXXOX##XXXXXXXXXCCXX', 64);
  fp[(16) - 1] = R.trunc('XXXXXXXXXXXX##XXXXXXXXXXXXXXXOXXXX##XXXXXXXXXXXXXXXXXXXXXXXX##XX', 64);
  fp[(17) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXX##XXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(18) - 1] = R.trunc('XX##XXXXXXXXXXXXXXXXXXXXXXXXXOXXXXXX##XXXXXXXXXXXXXXXXXX##XXXXXX', 64);
  fp[(19) - 1] = R.trunc('XXXXXXXX##XXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXX##XXXXXXXXXXXXXXXXXXX', 64);
  fp[(20) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXX##XXXXXXXOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(21) - 1] = R.trunc('XCCXXXXXXXXXXX##XXXXXXXXXXXXXOXX##XXXXXXXXXXXXXXXXXXXX##XXXXXXXX', 64);
  fp[(22) - 1] = R.trunc('XCCXX##XXXXXXXXXXXXXXXXXXXXXXOXXXXXXXXXXXXXXXXXXXXX#do#you#dare#', 64);
  fp[(23) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXX##XXXLXXXXXXXXXX##XXXXXXXXX####go#down\xc3#', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
  hidestairs = true;
}
function level33() {
  fp[(1) - 1] = R.trunc('##tunnels#of#kroz###########-P--################################', 64);
  fp[(2) - 1] = R.trunc('########################X###----######X##-------D--------##X####', 64);
  fp[(3) - 1] = R.trunc('############################----#########-------D--------#######', 64);
  fp[(4) - 1] = R.trunc('L---N-----######\xf2  \xf2 \xf2######-----------------########----#######', 64);
  fp[(5) - 1] = R.trunc('L---N-----##X###  CC  555555-----------------#####X##1111#######', 64);
  fp[(6) - 1] = R.trunc('######----######\xf2 \xf2  \xf2###############################----#####X#', 64);
  fp[(7) - 1] = R.trunc('######1111###########################################1111#######', 64);
  fp[(8) - 1] = R.trunc('#X####----##############X#######magic#####X##########----#######', 64);
  fp[(9) - 1] = R.trunc('######1111####################\x93-\x95-\x96-\x95-\x93##############----N-----#', 64);
  fp[(10) - 1] = R.trunc('######----####################---------##############----N-----#', 64);
  fp[(11) - 1] = R.trunc('######1111#######X############\x91-\x91-\x91-\x91-\x91#########X##########----#', 64);
  fp[(12) - 1] = R.trunc('######----########################-########################1111#', 64);
  fp[(13) - 1] = R.trunc('######1111################X#######-########################----#', 64);
  fp[(14) - 1] = R.trunc('######----########################---------N-------------------#', 64);
  fp[(15) - 1] = R.trunc('###X##----##########################################-----------#', 64);
  fp[(16) - 1] = R.trunc('######----------------\xf1########################X####----########', 64);
  fp[(17) - 1] = R.trunc('######-----------------444444%######################1111########', 64);
  fp[(18) - 1] = R.trunc('###################----#############################----#####X##', 64);
  fp[(19) - 1] = R.trunc('###################1111#############X###############1111########', 64);
  fp[(20) - 1] = R.trunc('############X######----#############################----########', 64);
  fp[(21) - 1] = R.trunc('###################-------N-----------------------------########', 64);
  fp[(22) - 1] = R.trunc('##X################-------N-----------------------------##X#####', 64);
  fp[(23) - 1] = R.trunc('################################################################', 64);
  fast = '\xea';
  convert_format();
  hidestairs = true;
  hideopenwall = true;
}
function level34() {
  fp[(1) - 1] = R.trunc('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(2) - 1] = R.trunc('~~~~~~~~~~~~~W-----------E----~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(3) - 1] = R.trunc('~~~~~~~~~~~~~------------E----~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(4) - 1] = R.trunc('~~~~~~~~~~~~~----~~~~~~~~~----~~~~~~~~~~W---E------------------P', 64);
  fp[(5) - 1] = R.trunc('~~~~~~~~~~~~~----~~~~~~~~~----~~~~~~~~~~----E-------------------', 64);
  fp[(6) - 1] = R.trunc('~~~~~~~~~~~~~----~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(7) - 1] = R.trunc('~~~~~~~~~~~~~----~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(8) - 1] = R.trunc('~~~~W------------~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(9) - 1] = R.trunc('~~~~-------------~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(10) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(11) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~W---~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(12) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(13) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(14) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(15) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(16) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~--------------<~~~~~~~~~', 64);
  fp[(17) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~W-------------[~~~~~~~~~', 64);
  fp[(18) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~~---|~~~~~~~~~', 64);
  fp[(19) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~~---"~~~~~~~~~', 64);
  fp[(20) - 1] = R.trunc('~~~~---W~~~~~~~~~~~~~~~~~~----~~~~~~~~~~~~~~~~~~~~~----~~~~~~~~~', 64);
  fp[(21) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~-----------------------------~~~~~~~~~', 64);
  fp[(22) - 1] = R.trunc('~~~~----~~~~~~~~~~~~~~~~~~W-------------------------W--~~~~~~~~~', 64);
  fp[(23) - 1] = R.trunc('~~~~LLLL~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fast = '\xea';
  convert_format();
  hidelevel = true;
}
function level35() {
  fp[(1) - 1] = R.trunc('VVVV--P-VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(2) - 1] = R.trunc('VVVV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(3) - 1] = R.trunc('VVVV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(4) - 1] = R.trunc('VVVV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVV-----------------------VVVV', 64);
  fp[(5) - 1] = R.trunc('VVVV---------------VVVVVVVVVVVVVVVVVV-----------------------VVVV', 64);
  fp[(6) - 1] = R.trunc('VVVV---------------VVVVVVVVVVVVVVVVVV----VVVVVVVVVVVVVVV----VVVV', 64);
  fp[(7) - 1] = R.trunc('VVVVVVVVVVVVVVV----VVVVVVWWVVVVVVVVVV----VVVVVVVVVVVVVVV----VVVV', 64);
  fp[(8) - 1] = R.trunc('VVVVVVVVVVVVVVV----VVVVVVWWVVVVVVVVVV----VVVVVVVVVVVVV?V----VVVV', 64);
  fp[(9) - 1] = R.trunc('VVVVVVVVVVVVVVV----VVVVVVWWVVVVVVVVVV----VVVVVLLVVVVVVVV----VVVV', 64);
  fp[(10) - 1] = R.trunc('VVVVVVVVVVVVV]V----VVVVVVWWVVVVVVVVVV----VVVVV--VVVVVVVV----VVVV', 64);
  fp[(11) - 1] = R.trunc('VVVVVVVVVVVVVVV----VVVVVVWWVVVVVVVVVV----VVVVV--VVVVVVVV----VVVV', 64);
  fp[(12) - 1] = R.trunc('VVVVVVVVVVVVVVV----VVVVVVWWVVVVVVVVVV----VVVVV--VVVVVVVV----VVVV', 64);
  fp[(13) - 1] = R.trunc('VVVVVVVV-----------VVVVVVWWVVVVVVVVVV----VVVVV--VVVVVVVV----VVVV', 64);
  fp[(14) - 1] = R.trunc('VVVVVVVV-----------VVVVVVWWVVVVVVVV]V----VVVVV--VVVVVVVV----VVVV', 64);
  fp[(15) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVV++VVVVVVVVVV----VVVV----VVVVVVV----VVVV', 64);
  fp[(16) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVV++VVVVVVVVVV----VVVV----VVVVVVV----VVVV', 64);
  fp[(17) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVV++VVVVVVVVVV----VVVV----VVVVVVV----VVVV', 64);
  fp[(18) - 1] = R.trunc('VVVVVVVV---------------------------------VVVV----VVVVVVV----VVVV', 64);
  fp[(19) - 1] = R.trunc('VVVVVVVV---------------------------------VVVV----VVVVVVV----VVVV', 64);
  fp[(20) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVV----VVVV', 64);
  fp[(21) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV---------------VVVV', 64);
  fp[(22) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV---------------VVVV', 64);
  fp[(23) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (15) << 16 >> 16;
}
function level37() {
  fp[(1) - 1] = R.trunc('"|[<-333333333---------------------------------`--D--D--D--D-&LL', 64);
  fp[(2) - 1] = R.trunc('##############\xbc###XXX###########################################', 64);
  fp[(3) - 1] = R.trunc('\x91-\x94-\x94-\x94-\x94-\x91-\x91-----I----------------------F------------\xbc#--\x94-----', 64);
  fp[(4) - 1] = R.trunc('###############################\xb3###########\xb3#############XXX###\xbb', 64);
  fp[(5) - 1] = R.trunc('--------------------------#C$$2$2$2$2$2$2$2$2$$$$$$$$$$$$$$$$#1-', 64);
  fp[(6) - 1] = R.trunc('\xb9############\xb3###########\xba#####################################-', 64);
  fp[(7) - 1] = R.trunc('-#T\xf4-M-----------------\xba#-----#-U-#--------------------------#1-', 64);
  fp[(8) - 1] = R.trunc('-##############777777\xb3###-#####\xf5\xf5\xf5#############################-', 64);
  fp[(9) - 1] = R.trunc('-P-W #+\x92------#222222C#+-------------------------------1-1-1-1-\xf2', 64);
  fp[(10) - 1] = R.trunc('-### ########\xb3###########-#####888#\xb3##################\xb3#########', 64);
  fp[(11) - 1] = R.trunc('-#+- #\x92-------------------4---#292#--1(T(((((MMMMMMMMMMMMMMMMMMK', 64);
  fp[(12) - 1] = R.trunc('-### ####################-##\xb3###-##############################\xb3', 64);
  fp[(13) - 1] = R.trunc('-#W- #\xf1-------------------#1\xb31#292#-----------------------------', 64);
  fp[(14) - 1] = R.trunc('-### #######################\xb3###-##::;::::::::::::::::::::::::::', 64);
  fp[(15) - 1] = R.trunc('-#T- #----------------------\xb31#292#--T--------------------333333', 64);
  fp[(16) - 1] = R.trunc('X### ##\xb3####################\xb3###-#######################\xb3#######', 64);
  fp[(17) - 1] = R.trunc('X#*- #--@1@1@1@1@1@1@1@1@!#1\xb31#---000000---#------#-------#-----', 64);
  fp[(18) - 1] = R.trunc('X### #######################\xb3############\xb3##--##\xb3###\xb3#######\xb3##-', 64);
  fp[(19) - 1] = R.trunc('--\x92------C--~-------------#1\xb31#K-DDD-----\xb31#--#---1---#*I*#1\xb31#K', 64);
  fp[(20) - 1] = R.trunc('##############\xb3#############\xb3############\xb3##--##########\xb3###\xb3##-', 64);
  fp[(21) - 1] = R.trunc('\xb9-)------------........)2K#1\xb31#K-DDD-----\xb31#--------------5---#\xbb', 64);
  fp[(22) - 1] = R.trunc('############################\xb3############\xb3#####################-', 64);
  fp[(23) - 1] = R.trunc('Q-1;1;1;1;1;1;1;1-1-1-1-1-1-------B----#-----------------------U', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level40() {
  fp[(1) - 1] = R.trunc('   00000000000000\x92-Y-----000000000-0-0000000000000000000000-0000', 64);
  fp[(2) - 1] = R.trunc(' P 0000000000000--000-00-000000000-0-----K000000000-000-----0000', 64);
  fp[(3) - 1] = R.trunc('   000000000000-0-0000-0-00000000-0000000000000000-0000000000-00', 64);
  fp[(4) - 1] = R.trunc('0-000000000000000-00000-00000000000000000-000000-0000-0000W0--00', 64);
  fp[(5) - 1] = R.trunc('00000000000000000I000000-000!000000-0000000-0000--00-00000W00000', 64);
  fp[(6) - 1] = R.trunc('0-0000000000000000000000000YYY000000------0-0---0000000000W000-0', 64);
  fp[(7) - 1] = R.trunc('0--000000000000-0000000000---------000-0--0000000000000000W-000-', 64);
  fp[(8) - 1] = R.trunc('0000000000000000-00000000000000000-00000000000000000000000-00000', 64);
  fp[(9) - 1] = R.trunc('000--0000000000000-000-0-000000000000000000000000000000000000-00', 64);
  fp[(10) - 1] = R.trunc('00000000000000000-00000-0000000000000000000-0-666666666000000-00', 64);
  fp[(11) - 1] = R.trunc('0-0000-00000000--000000000000000000000-0----00DDD\xf3LL&6600000-000', 64);
  fp[(12) - 1] = R.trunc('--00000000000-00-0000000000000000000000-0000-0666666666000--0000', 64);
  fp[(13) - 1] = R.trunc('0-00000000000000\x9200000000-0000-0000-00000-0000-000000000000-0000', 64);
  fp[(14) - 1] = R.trunc('-000000000000000-0000000-0-0000-00-00000--00000000000000-0000000', 64);
  fp[(15) - 1] = R.trunc('0-00000000000000-0-0000000-00-00000000000000000000000000000000-0', 64);
  fp[(16) - 1] = R.trunc('00-00000000000000-0000-00000-000-000-0--000000000000000000-0-000', 64);
  fp[(17) - 1] = R.trunc('00000000000000000----0-00000T-000-000-000000000000-00000000-0000', 64);
  fp[(18) - 1] = R.trunc('000--0000000000000000000000000000000000000000000000--0000000-000', 64);
  fp[(19) - 1] = R.trunc('00-00-00000-000000000000000000000000000000000000--00000000000-00', 64);
  fp[(20) - 1] = R.trunc('0-00000000-000000000000-00000000000000000000000-00-00000000000--', 64);
  fp[(21) - 1] = R.trunc('-00000000-0-000000-00000-------------0++++++++++0000000000000000', 64);
  fp[(22) - 1] = R.trunc('000--00000000---0-0-0--000000000000000000000000000--0-0-0-0-0-00', 64);
  fp[(23) - 1] = R.trunc('---00---00000-00-000-000-00<0[0|0"0000000000000000-0-0-0-0-0-000', 64);
  fast = '\xea';
  convert_format();
}
function level42() {
  fp[(1) - 1] = R.trunc('###########klose#enkounters#of#the#krazy#kubikal#kind\xc3##########', 64);
  fp[(2) - 1] = R.trunc('3                               P                              3', 64);
  fp[(3) - 1] = R.trunc('##-##############:########:#######:###########:##############:##', 64);
  fp[(4) - 1] = R.trunc('XXXXXXXXX##~W~W~W~W~##\x91-M----M.--$$$$$$$$$-9/-/\\--\\-|##---\x92\xf2\x92---', 64);
  fp[(5) - 1] = R.trunc('---------##*~*~*~*~*##-\x91.-\x94M-\x94-##$$$$$$$$$##\\--/-\\-/\\##YYYYYYYYY', 64);
  fp[(6) - 1] = R.trunc('MMMMMMMMM##~W~W~W~W~##M--\x91-.-M-##111111111##-/-\\/--/-##(((((((((', 64);
  fp[(7) - 1] = R.trunc(')))))))))##*~*~*~*~*##.\x94-.-\x94-.\x94##222222222##/\\--\\-\\-/##(((((((((', 64);
  fp[(8) - 1] = R.trunc('C))))))))--~W~W~W~W~##\xf3.-\x94--\x91-M##333333333##\xfc-//-\\-/-9-(((((((((', 64);
  fp[(9) - 1] = R.trunc('###################-################################9##55555555-', 64);
  fp[(10) - 1] = R.trunc('\x93-\x93-\x93-\x93-\x93##YYYYYYYYY##222222222------0---W##RRRRRRRRR##MMMMMMMMM', 64);
  fp[(11) - 1] = R.trunc('-----------YYYYYYYYY##@@@@@@@@@##---000---##RXXXXXXXR##MMMMMMMMM', 64);
  fp[(12) - 1] = R.trunc('XXXXXXXXX##YYYYYYYYY##@@@@@@@@@##--00G00--##RXXXKXXXR##MMMMMMMMM', 64);
  fp[(13) - 1] = R.trunc('---------##YYYYYYYYY##@@XXX@@@@##---000---##RXXXXXXXR##MMMMMMMMM', 64);
  fp[(14) - 1] = R.trunc('\x92\x92\x92\x92\x92\x92\x92\x92\x92##YYYYYYYYK##@@XZX@@@@##----0---W##RRRRRRRRR##MMMMMMMMK', 64);
  fp[(15) - 1] = R.trunc('-#####################-##########\xf4##################H##Z########', 64);
  fp[(16) - 1] = R.trunc('~-~[~-~-~##WWW......\xe01:1:1:1:1:##-773C7--7##=--=I==-=##\xe1\xe1\xe1\xe1\xe1\xe1Y0"', 64);
  fp[(17) - 1] = R.trunc('-~-~-~-~-##WWW......##1:1:1:1:1##7-777-77-##!==-=--==##\xe1\xe1\xe1\xe1\xe1\xe1Y00', 64);
  fp[(18) - 1] = R.trunc('~-~-~-~-~##.........##:1:1:1:1:##-77--77-7##=======-=##\xe1\xe1\xe1\xe1\xe1\xe1YYY', 64);
  fp[(19) - 1] = R.trunc('-~-~-~-~-##.........##1:1:1:1:1##7-7-77-77##-==-=-==I##\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1', 64);
  fp[(20) - 1] = R.trunc('K-~-~-~-~-\xe0..<......##:1:1:1:1\xf1##77-7777---I=--=-=--=##222222222', 64);
  fp[(21) - 1] = R.trunc('############################################################44##', 64);
  fp[(22) - 1] = R.trunc('LL---V--V-VV-V--VV---D-----D--\x92--D--\x94--D--66333333333333333-WWWW', 64);
  fp[(23) - 1] = R.trunc('LL--V-VV-V--V-VV--V--D-----D--\x94--D--\x92--D--66YYYYYYYYYYYYYYYYYYYY', 64);
  fast = '\xea';
  convert_format();
  treerate = (35) << 16 >> 16;
}
function level44() {
  fp[(1) - 1] = R.trunc('#diary\xb7#day#four\xb8###############################################', 64);
  fp[(2) - 1] = R.trunc('################################################################', 64);
  fp[(3) - 1] = R.trunc('#you\xb6ve#discovered#ancient#tablets#that#have#magical#mantras####', 64);
  fp[(4) - 1] = R.trunc('################################################################', 64);
  fp[(5) - 1] = R.trunc('#written#on#them\xb4##these#short#prayers#seem#to#awaken#a#magical#', 64);
  fp[(6) - 1] = R.trunc('################################################################', 64);
  fp[(7) - 1] = R.trunc('#force#that#pervades#the#entire#kroz#kingdom\xb4##as#you#drink####', 64);
  fp[(8) - 1] = R.trunc('################################################################', 64);
  fp[(9) - 1] = R.trunc('#from#your#water#pouch#and#chew#on#a#stick#of#dried#beef#you####', 64);
  fp[(10) - 1] = R.trunc('################################################################', 64);
  fp[(11) - 1] = R.trunc('#wonder#who#built#this#strange#place#called#kroz\xb7#and#why\xb5##if##', 64);
  fp[(12) - 1] = R.trunc('################################################################', 64);
  fp[(13) - 1] = R.trunc('#only#you#could#find#this#\xb6lost\xb6#information\xb4\xb4\xb4get#the#real#####', 64);
  fp[(14) - 1] = R.trunc('################################################################', 64);
  fp[(15) - 1] = R.trunc('#story#on#kroz\xb4##a#welcome#burst#of#excitement#urges#you#on\xb4\xb4\xb4##', 64);
  fp[(16) - 1] = R.trunc('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4', 64);
  fp[(17) - 1] = R.trunc('----\xb9-\xb9-\xb9-\xb9-\xb9-\xb9-\xb9-\xb9------------------------#-----~--------------', 64);
  fp[(18) - 1] = R.trunc('-----------------------------------\xb3######\xb3#-----~\xb3#0000--------', 64);
  fp[(19) - 1] = R.trunc('\xbd\xba\xbb\xbc\xb9W-W-W-K-W-W-W-----------------\xb3#-----\xb3#-----~\xb3#K----------K', 64);
  fp[(20) - 1] = R.trunc(' P                ---------------\xf69\xb3#-####.#-----~\xb3####-########', 64);
  fp[(21) - 1] = R.trunc('####                ####00000000000\xb3#\xb3-----------~\xb3#K----------K', 64);
  fp[(22) - 1] = R.trunc('###==================###----------0\xb3#.#########--~\xb3####-########', 64);
  fp[(23) - 1] = R.trunc('###==================##############---#K-------0-~-----~DDDDDDLL', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (1) << 16 >> 16;
  sideways = true;
}
function level46() {
  fp[(1) - 1] = R.trunc('###<@@@@@@@@@@@@@@@@@@@@@@@@@#one#@@@@@@@@@@@@@@@@@@@@@@@@@FK###', 64);
  fp[(2) - 1] = R.trunc('K\xf6###@@@@@@@@@@@@@@@@@@@@@@@@@;!:@@@@@@@@@@@@@@@@@@@@@@@@@@###$[', 64);
  fp[(3) - 1] = R.trunc('\xf6\xf6((###@@@@@@@@@@@@@@@@@@@@@@@:::@@@@@@@@@@@@@@@@@@@@@@@@###$$$$', 64);
  fp[(4) - 1] = R.trunc('((((((###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@###$$$$$$', 64);
  fp[(5) - 1] = R.trunc('(((((((2###222222222222222222222222222222222222222222###2$$$$$$$', 64);
  fp[(6) - 1] = R.trunc('(((((((2((###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@###$$2$$$$$$$', 64);
  fp[(7) - 1] = R.trunc('(((((((2((((###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@###$$$$2$$$$$$$', 64);
  fp[(8) - 1] = R.trunc('(((((((2((((((###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@###$$$$$$2$$$$$$$', 64);
  fp[(9) - 1] = R.trunc('DD##(((2((((((((###@@@@@@@@@@@@@@@@@@@@@@@@@@###$$$$$$$$2$$$####', 64);
  fp[(10) - 1] = R.trunc('DD#f(((2(((((((((##############77##############$$$$$$$$$2$$$##CC', 64);
  fp[(11) - 1] = R.trunc('DD#o(((2((((((((\xf6##2------------------------2##\xf4$$$$$$$$2$$$t#\xe0\xe0', 64);
  fp[(12) - 1] = R.trunc('DD#u(((2((((((((\xf6----------F---P----S--------88\xf4$$$$$$$$2$$$w#MM', 64);
  fp[(13) - 1] = R.trunc('&&#r(((2((((((((\xf6##2------------------------2##\xf4$$$$$$$$2$$$o#MM', 64);
  fp[(14) - 1] = R.trunc('LL##(((2(((((((((##############99##############$$$$$$$$$2$$$##MM', 64);
  fp[(15) - 1] = R.trunc('####(((2((((((((###)))))))))))\xf5\xf5\xf5\xf5)))))))))))###$$$$$$$$2$$$##\xe0\xe0', 64);
  fp[(16) - 1] = R.trunc('(((((((2((((((###))))))))))))))))))))))))))))))###$$$$$$2$$$$$$$', 64);
  fp[(17) - 1] = R.trunc('(((((((2((((###))))))))))))))))))))))))))))))))))###$$$$2$$$$$$$', 64);
  fp[(18) - 1] = R.trunc('(((((((2((###))))))))))))))))))))))))))))))))))))))###$$2$$$$$$$', 64);
  fp[(19) - 1] = R.trunc('(((((((2###))))))))))))))))))))))))))))))))))))))))))###2$$$$$$$', 64);
  fp[(20) - 1] = R.trunc('((((((###2222222222222222222222222222222222222222222222###$$$$$$', 64);
  fp[(21) - 1] = R.trunc('((((###))))))))))))))))))))))))))))))))))))))))))))))))))###$$\xf4\xf4', 64);
  fp[(22) - 1] = R.trunc('"(###))))))))))))))))))))))))))))))))))))))))))))))))))))))###\xf4K', 64);
  fp[(23) - 1] = R.trunc('###K\xf5)))))))))))))))))))))))#three#))))))))))))))))))))))))F|###', 64);
  fast = '\xea';
  convert_format();
}
function level48() {
  fp[(1) - 1] = R.trunc('##################RRRRRRRRRRR#the#swamp#RRRRRRR-\\\\\xfc\\\\\\\\/\\\\\\\\\\\\\\C', 64);
  fp[(2) - 1] = R.trunc('LL\x96D\x91D\x93D--VVVV--44----------------------------RR-\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\', 64);
  fp[(3) - 1] = R.trunc('LL\x91D\x94D\x91D--VVVV--44--RRRRRRRRRRRRRRRRRRRRRRRR--RRR-/\\\\\\\\\\\\\\\\\\U\\\\\\', 64);
  fp[(4) - 1] = R.trunc('##################RRRR-------------------------RRR-\\\\\\\\/\\\\\\\\\\\\\\\\', 64);
  fp[(5) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRR--RRRRRRRRRRRRRRRRRRRRK))RRRR--\\\\\\\\\\\\\\\\\\\\\\', 64);
  fp[(6) - 1] = R.trunc('R-----RRR-------R----)))RR)))))))3)3)3)3)3)3)3)3)3RRR--\\\\\\\\\\\\\\\\\\', 64);
  fp[(7) - 1] = R.trunc('R-RRR\x93RR-RRRRRRR-RRR-RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR--/\\\\\\/\\\xfc', 64);
  fp[(8) - 1] = R.trunc('R-RR-RR-RRR\\\\\\RRR-RRR--------------------------\x95-------RR--\\\\\\\\\\', 64);
  fp[(9) - 1] = R.trunc('R-RRRR-RR\\\\\\K\\\\RRR-RR-RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR--\\\\\\', 64);
  fp[(10) - 1] = R.trunc('R-RRR-RRRR\\\\\\\\\\\\RRR-RR------------Z-8\x92-999999999999\xf6--RRRRRRR--\\', 64);
  fp[(11) - 1] = R.trunc('R-RR-RRRR\\\\\\\\\\\\\xfc\\RR-RRR-RRRRRRRRRRRRR8-111111111111RRR-----RRRR-', 64);
  fp[(12) - 1] = R.trunc('R---RRRRRR-\\\\\\RRRR-RRRRRFRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR-RRRR', 64);
  fp[(13) - 1] = R.trunc('RRRR-RRRRR-RRRRRR-RRRS(((((+((((((((((((((((((K++(3RRRRRRRRR-RRR', 64);
  fp[(14) - 1] = R.trunc('RRRRR-RRRR\xe3\xe3RRRR-RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR*R.R*RRR-RR', 64);
  fp[(15) - 1] = R.trunc('RRRRRRTRRR1R-RR-RRR@@@@@@@RRRRRRRRRRRRRRRRRR-----------\x92-\xf3RRR\xf1RR', 64);
  fp[(16) - 1] = R.trunc('###RRRRRR11RR--RRRR@@RRRRFRR-66----H----------RRRRRRR*R.R*RRRRRR', 64);
  fp[(17) - 1] = R.trunc('77###RRR111RR--RR*F@@@22@WRR-RR-RRORRRRRRRRRRRRRRRRRRRRRRRRRRR  ', 64);
  fp[(18) - 1] = R.trunc('7777###RR11RR--RR*F@@@22@WRR-RR-RRORR                          P', 64);
  fp[(19) - 1] = R.trunc('77777###RR1RR--RR*F@@@22@WRR-RR-RRORR  RRRRRRRRR-RRRRRRRRRRRRR  ', 64);
  fp[(20) - 1] = R.trunc('77!777###RRRR--RR*F@@@22@WRR-RR-RR>RRFSRRRRRRRRR\xe0RRRRRRRRRRRRRRR', 64);
  fp[(21) - 1] = R.trunc('7777777##RRRR--RR*F@@@22@WRR-RR-RRRRR\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe03333333333C\xe0\xe0\xe0\xe0\xe0\xe0', 64);
  fp[(22) - 1] = R.trunc('77777777##RRR--RRRRFFRRRRRRR-RR-RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR--', 64);
  fp[(23) - 1] = R.trunc('U7777777##RRR----------------RR---------------------------------', 64);
  fast = '\xea';
  convert_format();
}
function level52() {
  fp[(1) - 1] = R.trunc('\x91  ]  \x91]\x91   ]\x91\x91] \x94]]\x96  \x91\x91\x91]\x91\x91\x94 ] \x96 \x91    \x91]\x91\x91         \x96]\x91\x94\x91] \x91---', 64);
  fp[(2) - 1] = R.trunc(' \x91\x96 \x91] \x91 \x94\x91] \x91\x96 \x91 ]\x91 \x91\x91 ]\x94\x91\x96] \x91 \x91 \x91 ]\x91\x91\x94 ]\x96 \x91\x91]\x91\x91\x96]\x91\x94 \x91]\x91\x91 \x91 -P-', 64);
  fp[(3) - 1] = R.trunc('  \x96\x91\x91]\x91 \x94\x91] \x96\x91 \x91] \x91 \x91\x91]\x94\xf1 \x96\x91] \x91\x91\x91]\x91\x96\x94]\x91\x91 \x91 ]\x91\x91    \x96] \x91\x94\x91] \x91\x91\x91---', 64);
  fp[(4) - 1] = R.trunc('\x96\x91 \x91]\x94\x91\x91]\x91 \x91\x96]\x91 \x91\x94 ]\x91\x91\x91]\x96\x91 \x91]\x91   \x94\x91]\x91\x91\x96  ] \x91\x91 \x91]\x94\x91  \x91]\x91\x96\x91] \x91\x91\x94]\x91', 64);
  fp[(5) - 1] = R.trunc('\x91]\x96  \x91\x91]\x91\x91\x94 ]\x91 \x96\x91]\x91\x91  \x91]\x91\x94 \x91]\x96\x91\x91] \x91\x91\x91] \x94\x91\x96 ]\x91\x91   \x91]\x91\x91\x94]\x91\x96\x91]  \x91\x91\x91', 64);
  fp[(6) - 1] = R.trunc('\x91\x91\x96]\x94 \x91\x91]\x91\x91\x91 ]\x91 \x96\x94  ]\x91  \x91\x91] \x91\x91\x91] \x96\x91\x94  ]\x91\x91\x91 ]\x91\x91\x96]\x94 \x91\x91]   \x91\x91\x91]\x91 \x96\x91', 64);
  fp[(7) - 1] = R.trunc('\x94\x91\x91] \x91\x91\x91  ]\x96\x91  \x94] \x91\x91\x91]\x91\x91 \x96]\x91 \x91\x91 ]\x94\x91 \x91]\x91\x91\x96]\x91 \x91\x94]\x91\x91 \x91] \x91\x96\x91 ]\x91\x91\x94] \x91', 64);
  fp[(8) - 1] = R.trunc('\x91]\x91 \x96\x91  ]\x91 \x91\x94]\x91\x91 \x91]\x96  \x91\x91] \x91\x94\x91  ]\x91\x91 \x91\x96]\x91\x91\x94]\x91\x91  \x91]\x91\x91  \x96]  \x91\x94\x91]\x91\x91\x91 ', 64);
  fp[(9) - 1] = R.trunc('\x96\x91 ]\x91 \x94\x91]\x91\x91     \x91]\x91 \x96\x91 ]\x94\x91 \x91]\x91\x91\x96] \x91\x91     \x91]\x94\x91\x91 ]\x91\x91\x96]\x91 \x91\x94]\x91  \x91\x91 ]', 64);
  fp[(10) - 1] = R.trunc('\x91 \x96] \x91\x91\x91 ]\x94\x91\x91]\x91\x96\x91] \x91\x91\x94] \x91\x91\x91 ]\x96\x91\x91 ]\x91 \x91\x94]\x91\x91 \x91\x96]\x91\x91 \x91\x91]\x94 \x91\x91]\x91 \x96\x91 ]\x91 ', 64);
  fp[(11) - 1] = R.trunc(' \x91\x94 ]\x91\x91 \x91 \x96 ] \x91 \x91\x91] \x91\x94\x91] \x91\x96\x91\xf3]\x91\x91 \x91]\x91 \x94\x91]\x96\x91 \x91]\x91\x91\xf2\x91]\x94 \x91\x96]\x91\x91 \x91] \x91 \x91', 64);
  fp[(12) - 1] = R.trunc(']  \x94\x96\x91 ]\x91\x91 \x91 ] \x91   \x91\x96]\x94\x91\x91   ]\x91\x91\x91]   \x91\x96\x94]\x91\x91\x91    ]\x91\x91\x91]     \x91\x96\x94] \x91\x91', 64);
  fp[(13) - 1] = R.trunc('#####444############follow#the#bread#crumbs#####################', 64);
  fp[(14) - 1] = R.trunc('\xe0\xe0\xe0\xe0#555#&\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMK##LL', 64);
  fp[(15) - 1] = R.trunc('\xe0\xe0\xe0\xe066666\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##\x93\x91', 64);
  fp[(16) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##``', 64);
  fp[(17) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##\x91\x93', 64);
  fp[(18) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0!\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##``', 64);
  fp[(19) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##\x93\x91', 64);
  fp[(20) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##--', 64);
  fp[(21) - 1] = R.trunc('\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##--', 64);
  fp[(22) - 1] = R.trunc('00\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM##--', 64);
  fp[(23) - 1] = R.trunc('K0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0\xe0@MMMMMMMMM66--', 64);
  fast = '\xea';
  convert_format();
  makefloor('\xfa', 6, 7, 0, 0);
  hidecreate = true;
  hidemblock = true;
}
function level53() {
  fp[(1) - 1] = R.trunc('U----------; 55555------------------------\x92--##-U-##            ', 64);
  fp[(2) - 1] = R.trunc('XXXXXXXXX\xbb-; ##\xb3############################-##---## ##\xb3\xb3\xb3\xb3\xb3\xb3##\xb9', 64);
  fp[(3) - 1] = R.trunc('-----------; #2\xb32#K--B-----------------------##---## ##\xb3\xb3\xb3\xb3\xb3\xb3##-', 64);
  fp[(4) - 1] = R.trunc('-----------; ##\xb3##-############################-I-## ##W\xb3\xb3\xb3\xb3W##-', 64);
  fp[(5) - 1] = R.trunc('-----------; #2\xb32#      M   M   M   M   M    ##-W-## ##-W\xb3\xb3W-##-', 64);
  fp[(6) - 1] = R.trunc('-----------; ##\xb3############################-##--W## ##::WW::##-', 64);
  fp[(7) - 1] = R.trunc('XX\xbaXXXX----; #2\xb32#\xb3------------------K-------##-W-## ##2 22 2##-', 64);
  fp[(8) - 1] = R.trunc('------;----; ##\xb3##\xb3####################-----:##W--## ##########-', 64);
  fp[(9) - 1] = R.trunc('------;----; #2\xb32#\xb3-----------------------:::##-W-## C--\x927;-;---', 64);
  fp[(10) - 1] = R.trunc('------;----; ##\xb3##\xb3---------------------::-::##--W## ##########-', 64);
  fp[(11) - 1] = R.trunc('[-----;----; #2\xb32#--------------------:::::-:##-\xf3-## -1--1--\xf1##-', 64);
  fp[(12) - 1] = R.trunc('------;----; ##\xb3##XXXXXXXXXXXX\xbd-----::::::::-##W--## ##########-', 64);
  fp[(13) - 1] = R.trunc('------;----; #2\xb3|#-------------XXX::::::::::"##-W-## -------C##-', 64);
  fp[(14) - 1] = R.trunc('------;----; ##\xb3##--------------\xbd##############--W##4##########-', 64);
  fp[(15) - 1] = R.trunc('------;----; #2\xb32#---------------#####-\xbc----C##-W-##--------K##-', 64);
  fp[(16) - 1] = R.trunc('------;----; ##\xb3##`::::::::::::::##\xbc##XOXXXXX##W--##4##########-', 64);
  fp[(17) - 1] = R.trunc('------;----; #2\xb32#--`---\x93---`LL# \xf2-----------66\xf5\xf5\xf5##--------<##-', 64);
  fp[(18) - 1] = R.trunc('------;--\xbb-; ##\xb3################ ::\xb3::;;;;;;;##888##4##########-', 64);
  fp[(19) - 1] = R.trunc('------#3333#     F               ##H##3333333##VVV##--------\xba##-', 64);
  fp[(20) - 1] = R.trunc('------######XXXXXXXXXXXXXXXXXXXXX###################4##########-', 64);
  fp[(21) - 1] = R.trunc('-------------------------I--------------------------------------', 64);
  fp[(22) - 1] = R.trunc('XX\xb9XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(23) - 1] = R.trunc('                                P                               ', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level54() {
  fp[(1) - 1] = R.trunc('  P  ##-U--------##-------##\xba\xf1------------------##--DDDD-\xf2-KKKKK', 64);
  fp[(2) - 1] = R.trunc('II#II##----------##\xb3#####-##--------------777---##\xbb5555555555555', 64);
  fp[(3) - 1] = R.trunc('M   M###########-##\xb3-----\x93###########X##\xba##\x92######-##LLLLLLLLLLL', 64);
  fp[(4) - 1] = R.trunc('M   M##---;---------------##K---------##-##7-<[|##-#############', 64);
  fp[(5) - 1] = R.trunc('M   M###-#########################---###-######X##-----\x91----\x92-C"', 64);
  fp[(6) - 1] = R.trunc('M   M##----------------\x94----------7\x917-44--------##-#############', 64);
  fp[(7) - 1] = R.trunc('M   M##-######################################\xba-##-\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3\xb3', 64);
  fp[(8) - 1] = R.trunc('M   M##---------------------------------D--K##--##-]]]]]]]]]]?]]', 64);
  fp[(9) - 1] = R.trunc('M   M######################################-##--##-abcdefghijklm', 64);
  fp[(10) - 1] = R.trunc('M   M##K\xb3`\xb3:\xb3-\xb3-\xb3-\xb3:\xb3-\xb3:\xb3:\xb3-\xb3:\xb3-\xb3-\xb3-\xb3:\xb3:\xb3##-##--##-#############', 64);
  fp[(11) - 1] = R.trunc('M   M##-\xb3`\xb3-\xb3:\xb3-\xb3:\xb3:\xb3:\xb3-\xb3-\xb3:\xb3-\xb3:\xb3-\xb3:\xb3:\xb3-\xb3##-##--##-##---------\xf5!', 64);
  fp[(12) - 1] = R.trunc('M   M##-\xb3`\xb3:\xb3:\xb3-\xb3:\xb3-\xb3:\xb3:\xb3-\xb3:\xb3:\xb3-\xb3-\xb3:\xb3:\xb3:\xb3##-##--##-##\xb3##########', 64);
  fp[(13) - 1] = R.trunc('M   M##-\xb3`\xb3:\xb3:\xb3-\xb3:\xb3-\xb3:\xb3-\xb3W\xb3:\xb3-\xb3:\xb3-\xb3:\xb3:\xb3:\xb3##-##--##-##-----------', 64);
  fp[(14) - 1] = R.trunc('M   M##-\xb3`\xb3:\xb3-\xb3-\xb3:\xb3:\xb3-\xb3:\xb3-\xb3:\xb3:\xb3:\xb3-\xb3:\xb3-\xb3:\xb3##-##--##-########\xb3####', 64);
  fp[(15) - 1] = R.trunc('M   M##-\xb3`\xb3:\xb3-\xb3W\xb3:\xb3-\xb3:\xb3:\xb37\xb3:\xb3:\xb3:\xb3-\xb3:\xb3:\xb3-\xb3##-##--##-##-----------', 64);
  fp[(16) - 1] = R.trunc('M   M##-\xb3`\xb3-\xb3:\xb3-\xb3:\xb3:\xb3:\xb3:\xb3\x94\xb3:\xb3-\xb3:\xb3-\xb3:\xb3-\xb3:\xb3##-##-.##-####\xb3########', 64);
  fp[(17) - 1] = R.trunc('M   M##-\xb3-\xb3-\xb3:\xb3-\xb3:\xb3:\xb3-\xb3-\xb3-\xb3:\xb3:\xb3-\xb3W\xb3:\xb3-\xb3:\xb3##-##--##-##-----------', 64);
  fp[(18) - 1] = R.trunc('M   M##:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3:\xb3-\xb3:\xb3:\xb3:\xb3\xb3\xb3\xb3##--##-############\xb3', 64);
  fp[(19) - 1] = R.trunc('M   M##---                       ;          ##--##\xf588----------\xb3', 64);
  fp[(20) - 1] = R.trunc('M   M##-##VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV##--##0############\xb3', 64);
  fp[(21) - 1] = R.trunc('M   M##D######################################--##~------------\xb3', 64);
  fp[(22) - 1] = R.trunc('M K M##K-\xb91\xb9\xb91\xb9\xb91\xb911\xb91\xb9\xb911\xb911\xb91\xb911\xb9\xb91\xb9\xb91\xb9\xb911\xb9-\xba-44\xbb------------\xb3', 64);
  fp[(23) - 1] = R.trunc('M U M##K--\xb911\xb911\xb91\xb9\xb91\xb911\xb9\xb91\xb9\xb91\xb91\xb9\xb911\xb911\xb911\xb9\xb91\xb9--44--------------', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level55() {
  fp[(1) - 1] = R.trunc('\x93 P          ;           1   \x95#diary\xb7#day#five\xb8#################', 64);
  fp[(2) - 1] = R.trunc('#######################XXXX#####################################', 64);
  fp[(3) - 1] = R.trunc('VVVYVVVVVVVVVVVVVVVVVVV----VVV#you\xb6ve#traveled#deeper#into#kroz#', 64);
  fp[(4) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVYYVV-\x96--VVVV##################################', 64);
  fp[(5) - 1] = R.trunc('VVVVVVVYYVVVVVVVVVVYVV----VVYV#than#ever#before\xb4##where#will####', 64);
  fp[(6) - 1] = R.trunc('YVVVVVVVYVVVVYVVVVVVV----VVVVV##################################', 64);
  fp[(7) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVV--\x93-VVVVVV#the#many#chambers#lead#to\xb5##and##', 64);
  fp[(8) - 1] = R.trunc('VVVYVVVVVVYVVVVVVVV----VVYYVVV##################################', 64);
  fp[(9) - 1] = R.trunc('VVVYVVVVVVVVVVVVVVV-\x95--VVVYVVV#what#do#they#protect#below\xb5######', 64);
  fp[(10) - 1] = R.trunc('VVVVVVVVVVVVYVVVVVVV----VVVVVV##################################', 64);
  fp[(11) - 1] = R.trunc('VVVVVVVYVVVVYYVVVVVV----VVVVYV#you#have#a#good#feeling#these####', 64);
  fp[(12) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVV--\x93-VVVVVVV##################################', 64);
  fp[(13) - 1] = R.trunc('VVYYYVVVVVVVVVVVVV----VVVVVVVV#questions#might#finally#be#######', 64);
  fp[(14) - 1] = R.trunc('VVVVVVVVYVVVYVVVV----VVVYYYVVV##################################', 64);
  fp[(15) - 1] = R.trunc('VVVVVVVVYVVVVVVV--\x96-VVVVVVVVVV#answered#during#this#expedition\xb4#', 64);
  fp[(16) - 1] = R.trunc('VVVVVVVVYVVVVVVV----VVVYYVVVVV##################################', 64);
  fp[(17) - 1] = R.trunc('YYVVVYVVVVVVVVV----VVVVYVVVVVV#but#can#you#survive#to#learn#the#', 64);
  fp[(18) - 1] = R.trunc('VYVVVVVVVVVVVV--\x93-VVVVVVVVVVYV##################################', 64);
  fp[(19) - 1] = R.trunc('VVVVVVVVYVVVV----VVVYVVVVVVVVV#answers\xb5##a#deep#lava#pit#lies###', 64);
  fp[(20) - 1] = R.trunc('VVYVVVVVVVVV----VVVYYVVVVVVVVV##################################', 64);
  fp[(21) - 1] = R.trunc('VVYYVVVVVVV-\x95--VVVVVVVVVVYYYVV#before#you#forbidding#your#######', 64);
  fp[(22) - 1] = R.trunc('VVVVVVVYVV----VVYYVVVVVVVVVVVV##################################', 64);
  fp[(23) - 1] = R.trunc('VVVVVVVVVLLLLVVVVYVVVVVYVVVVVV#progress\xb4\xb4\xb4it#doesn\xb6t#work\xb4\xb4\xb4\xc3###', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (1) << 16 >> 16;
  sideways = true;
  hidestairs = true;
}
function level56() {
  fp[(1) - 1] = R.trunc('YVV P VVVYVVVVVYVVVVVVYVVYVVVVVXXVVVVVVVVV#U#VVVVVV\xb9-----7\x92--!~+', 64);
  fp[(2) - 1] = R.trunc('VVV---VVVVVYVVVVVVVYVVVVYVVVYVVXXVVVVVVVVVV-VVVVVVVO#########X##', 64);
  fp[(3) - 1] = R.trunc('VYV--WVVYVVVVVYVVVVVVYVVVVYVVVVXXVVVVVVVVV---VVVVVVOVVVVVVVVVRVV', 64);
  fp[(4) - 1] = R.trunc('VVVV---VVVYVVVVVYVYVVVVVYVVVVYVXXVVVVVVVVV---VVVVVVOVVVVVVVVVRVV', 64);
  fp[(5) - 1] = R.trunc('VVYV---VYVVVVYVVVVVVVYVVVVVYVVVXXVVVVVVVVV--VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(6) - 1] = R.trunc('VVVVV---VVVVVVVYVVVVVVVYVVVVVYVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(7) - 1] = R.trunc('VVYVVV---VVYVYVVVVYVVVYVVVVYVVVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(8) - 1] = R.trunc('VYVVYVV-W-VVVVVYVVVVYVVVVYVVVYVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(9) - 1] = R.trunc('VVYVVVV---VVYVVVVYVVVVYVVVVYVVVXXVVVVVVVVVVVHHVVVVVOVVVVVVVVVRVV', 64);
  fp[(10) - 1] = R.trunc('VYVVYVVV---VVVYVVVVYVVVVYVVVYVVXXVVVVVVVVVVV--VVVVVOVVVVVVVVVRVV', 64);
  fp[(11) - 1] = R.trunc('VVVYVVYVV---VYVVYVVVVYVVVVYVVVVXXVVVVVVVVVVV--VVVVVOVVVVVVVVVRVV', 64);
  fp[(12) - 1] = R.trunc('VYVVYVVVV---VVVVVVVYVVVYVVVVVYVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(13) - 1] = R.trunc('VVVVVVVYVV-W-VVYVVYVVVVVVVYVYVVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(14) - 1] = R.trunc('VVYVYVVVV---VVVVYVVVVYVVYVVVVVVXXVVVVVVVVVV--VVVVVVOVVVVVVVVVRVV', 64);
  fp[(15) - 1] = R.trunc('YVVVVVVYVV---VVYVVYVVVVVVVVYVVVXXVVVVVVVVV--VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(16) - 1] = R.trunc('VVYVVYVVVVV-W-VVVYVVVVVYVVVVVYVXXVVVVVVVVV\xb9-VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(17) - 1] = R.trunc('VYVVVVVVYVV---VVYVVVVYVVVVVYVVVXXVVVVVVVVV--VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(18) - 1] = R.trunc('VVVVYVYVVVYV---VVVVYVVVVYVVVYVVXXVVVVVVVVV--VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(19) - 1] = R.trunc('VYVVVVVYVVVVV---VVYVVVYVVVYVVVVXXVVVVVVVV--VVVVVVVVOVVVVVVVVVRVV', 64);
  fp[(20) - 1] = R.trunc('VVVYVVVVVVYVVV-W-VVVYVVVYVVVVYVXXVVVVVVVV--VVVVVVVVOVVVVVVVVVRVV', 64);
  fp[(21) - 1] = R.trunc('YVVVVVVVYVVVYVV---VVVVYVVVYVVVVXXVVVVVVVV--VVVVVVVVOVVVVVVVVVRVV', 64);
  fp[(22) - 1] = R.trunc('VVVYVYVVVVYVVVV---VVYVVVYVVVVYVXXVVVVVVVVV--VVVVVVVOVVVVVVVVVRVV', 64);
  fp[(23) - 1] = R.trunc('VYVVVVYVVVVVYVV#U#VVVVYVVVYVYVVXXVVVVVVVVV----------VVVVVVVVLLLV', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (1) << 16 >> 16;
  sideways = true;
}
function level59() {
  fp[(1) - 1] = R.trunc('##########K]K-WWWW\xf1D          00%00         D\x92D\x94D\x91&&LL##########', 64);
  fp[(2) - 1] = R.trunc('##VVVVVV############          00000    .    ############VVVVVV##', 64);
  fp[(3) - 1] = R.trunc('##VVVVVV44                                            44VVVVVV##', 64);
  fp[(4) - 1] = R.trunc('##VVVVVV44      .      .                        .     44VVVVVV##', 64);
  fp[(5) - 1] = R.trunc('#####44444                               )            44444#####', 64);
  fp[(6) - 1] = R.trunc('MMMM(                           P  .                       )MMMM', 64);
  fp[(7) - 1] = R.trunc('MMMM(                   (                                  )MMMM', 64);
  fp[(8) - 1] = R.trunc('MMMM(         .                                   (        )MMMM', 64);
  fp[(9) - 1] = R.trunc('MMMM(                                 .                    )MMMM', 64);
  fp[(10) - 1] = R.trunc('MMMM(                      44444444444                 .   )MMMM', 64);
  fp[(11) - 1] = R.trunc('MMMM(                      44VVVVVVV44                     )MMMM', 64);
  fp[(12) - 1] = R.trunc('CMMM(   .                  44VVVGVVV44       .             )MMMC', 64);
  fp[(13) - 1] = R.trunc('MMMM(          )       .   44VVVVVVV44                     )MMMM', 64);
  fp[(14) - 1] = R.trunc('MMMM(                      44444444444                     )MMMM', 64);
  fp[(15) - 1] = R.trunc('MMMM(                                           )          )MMMM', 64);
  fp[(16) - 1] = R.trunc('MMMM(                                   .                  )MMMM', 64);
  fp[(17) - 1] = R.trunc('MMMM(     .       .                                .       )MMMM', 64);
  fp[(18) - 1] = R.trunc('MMMM(                                                      )MMMM', 64);
  fp[(19) - 1] = R.trunc('#####44444                     .            .         44444#####', 64);
  fp[(20) - 1] = R.trunc('##VVVVVV44         (                     (            44VVVVVV##', 64);
  fp[(21) - 1] = R.trunc('##VVVVVV44                 )                          44VVVVVV##', 64);
  fp[(22) - 1] = R.trunc('##VVVVVV############          00000  .      ############VVVVVV##', 64);
  fp[(23) - 1] = R.trunc('##########K]-WWWWWW\xf1          00C00         D-D--K-K]K##########', 64);
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (140) << 16 >> 16;
  hidecreate = true;
  hideopenwall = true;
  hidetrap = true;
  hidemblock = true;
}
function level61() {
  fp[(1) - 1] = R.trunc('     U--2--U--2--U--2--U--2--U--55-====-===--=====-===--==--=--=', 64);
  fp[(2) - 1] = R.trunc(' #######-#####-#####-#####-#######=-==-=-=-==--==-=-=-==--==-==-', 64);
  fp[(3) - 1] = R.trunc(' ######-B-###-B-###-B-###-B-######==--===-=====--===W==========-', 64);
  fp[(4) - 1] = R.trunc(' ########chamber#of#horror########======================-------=', 64);
  fp[(5) - 1] = R.trunc(' ##22222222222222222222222222##\xf3##=---=-=-=-==--==--=---========', 64);
  fp[(6) - 1] = R.trunc(' ##22222222222222222222222222222##-===-=-=-=--==-=-=-=====-----=', 64);
  fp[(7) - 1] = R.trunc(' ##22222222222222222222222########=-============-=-===----=====-', 64);
  fp[(8) - 1] = R.trunc(' ##2222222222222222222222266"0LL##-==-=-=-W-====-==---======---=', 64);
  fp[(9) - 1] = R.trunc(' ####-############################=--=-=-===-===-========---====', 64);
  fp[(10) - 1] = R.trunc('      ##---##\xe3OOOOOOOOO33333333!##=========-====-====----===-===', 64);
  fp[(11) - 1] = R.trunc('########---##H####################==----====-====-\x94--========--\xf2', 64);
  fp[(12) - 1] = R.trunc('<F  22##111##\xe3\xe3333333##3333333-[##=-====-==-============--======', 64);
  fp[(13) - 1] = R.trunc('FF  22##\xe2\xe2\xe2##\xe3\xe3333333##3333333--##-===-==-==------=====-==-=--==', 64);
  fp[(14) - 1] = R.trunc('    22##YYY##\xe3\xe3333333##333333333##-==-=-==-=======-===-====-==-=', 64);
  fp[(15) - 1] = R.trunc(' P  22##\xe1\xe1\xe1##\xe3#########444444444##=--==-==W======-===-========-=', 64);
  fp[(16) - 1] = R.trunc('    22##111##        ##         ##=====-===------===-==---=-===-', 64);
  fp[(17) - 1] = R.trunc('    22##\xe0\xe0\xe0######### ##   ##\x91   ##=--==-============-=-===-=---=', 64);
  fp[(18) - 1] = R.trunc('    22##             ##   \x91##   ##-==W==-=====---===-==--=======', 64);
  fp[(19) - 1] = R.trunc('    22##   ~~~~~  ## ##   ##\x96   ##=-==-==-===-===--==-===W=----=', 64);
  fp[(20) - 1] = R.trunc('    22##   ~~%~~  ## ##   \x95##   ##==-==-==---==-===--==-==-====-', 64);
  fp[(21) - 1] = R.trunc('    22##   ~~0~~  ## ##   ##\x91   ##===-=-======-=--====-=-=====-=', 64);
  fp[(22) - 1] = R.trunc('    22##\xf4  ~~0~~  ## ##   \x91##   ##=-=-==-=-==-==-=--==-=-==-===-', 64);
  fp[(23) - 1] = R.trunc('      77\xf4  ~~     ##      ##\x93   44-=-====-=--==|====--===--=---=', 64);
  fast = '\x01';
  convert_format();
}
function level64() {
  fp[(1) - 1] = R.trunc('3333333333333333333333333333333333333333333333333333##C33\xe0)))F\xe0\xf3', 64);
  fp[(2) - 1] = R.trunc('4444444444444444444444444444444444444444444444444444##333\xe0))F)\xe0\xe0', 64);
  fp[(3) - 1] = R.trunc('LL@@@@;@@@@@@@F@@;@@@@@@@@F@@@;@@@@@@@@@F@@@@@@@@@@@##333\xe0))))F)', 64);
  fp[(4) - 1] = R.trunc('LL@;@@@@F@@;@@@@@@@@F@@;@@@@F@@@@@F@@@;@@@@@F@@@;@F@##333\xe0)F))))', 64);
  fp[(5) - 1] = R.trunc('#########################@@@;@@@F@@;@@F@@@@F@@@F@@@@##333\xe0)))F))', 64);
  fp[(6) - 1] = R.trunc('  \xe6        \xe1\xe1\xe1      YY>##&@@@@F@;@@@F@@@F@@;@F@\x94\x94\x94\x94\x94##333\xe0)F))))', 64);
  fp[(7) - 1] = R.trunc('88~  \xe6\xe6##-##3\xe1      YYY#########################\xf1\xf1\xf1\xf1##333\xe0))))F)', 64);
  fp[(8) - 1] = R.trunc('M\xf5~  \xe63## ##3\xe1              D\x91\x91F\x91\x91D77777777777##6666#####\xe0FFFFFF', 64);
  fp[(9) - 1] = R.trunc('M\xf5~  \xe63##S##3\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1 P  #######77777777777##\xe3\xe3\xe3\xe3\xe233##T\xe0\xe0\xe0\xe0\xe0\xe0', 64);
  fp[(10) - 1] = R.trunc('M\xf5~  \xe63##F##33333333333\xe1   +##\x92K\x92##77777777777##\xe3\xe3\xe3\xe3\xe2\xe2\xe2####YYY##', 64);
  fp[(11) - 1] = R.trunc('M\xf5~\xe6\xe6\xe6\xe6#######################(((##77777777777--\xe3\xe3\xe3\xe3\xe3\xe3\xe3\xe3\xe3\xe3\xe2\xe3\xe3\xe3\xe3\xe3', 64);
  fp[(12) - 1] = R.trunc('M\xf5~    \xe4333333333WWW\xe4  \xe4\xe4999##\x92\x92\x92###############################', 64);
  fp[(13) - 1] = R.trunc('M\xf5~    \xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4\xe4  ##MMM##(((##33333333333333333333333333333', 64);
  fp[(14) - 1] = R.trunc('M\xf5~                   \x92##MOM##(((##33333333333333333333333333333', 64);
  fp[(15) - 1] = R.trunc('M\xf5~           \x97     #####OMO##\x92\x92\x92##33333333333333333333333333333', 64);
  fp[(16) - 1] = R.trunc('M\xf5~               \xe4\xe4##K##MOM##(((##(((((((((((((((((((((((((((((', 64);
  fp[(17) - 1] = R.trunc('M\xf5~   \x97          \xe4\xe43##\xe4##OMO##((((((((((((((((((((((((((((((((((', 64);
  fp[(18) - 1] = R.trunc('M\xf5~             \xe4\xe433##-##MOM##(YY++YY((YYYYY+((+YYYY+(YYYYYYY(((', 64);
  fp[(19) - 1] = R.trunc('XX~            \xe4\xe4333##-##OMO##(YY+YY+((YY++YY((YY++YY(++++YY+(((', 64);
  fp[(20) - 1] = R.trunc('XX~ \xe7\xe7\xe7\xe7\xe7\xe7 \x97  \xe4\xe43333##\x92##MOM##(YYYY++((YYYYY+((YY++YY(+++YY++(((', 64);
  fp[(21) - 1] = R.trunc('XX~ \xe73333\xe7    \xe43333C##-##OUO##(YYYY++((YY+YY+((YY++YY(++YY+++(((', 64);
  fp[(22) - 1] = R.trunc('XX~ ##################-#######(YY+YY+((YY++YY((YY++YY(+YY++++(((', 64);
  fp[(23) - 1] = R.trunc('X!~     \xe7\xe7\xe7\xe7\xe7          \xe4\xe4\xe4~H##(YY++YY((YY++YY((+YYYY+(YYYYYYY((U', 64);
  fast = '\x01';
  convert_format();
}
function level66() {
  fp[(1) - 1] = R.trunc('--------------------#figurit\xb6s#revenge#ii#-----\xbd-----!-------4U#', 64);
  fp[(2) - 1] = R.trunc(' P  \xb9666666666666---------------------K------+\xf6-9999999999999#-#', 64);
  fp[(3) - 1] = R.trunc('     66           -------\xbd-----------\xb39999999#####\xba####5####-#2#', 64);
  fp[(4) - 1] = R.trunc('     66 +\xf4 WWWWWWW ------------------------------------\xf1##YYY#-#', 64);
  fp[(5) - 1] = R.trunc('   ; 668888888888888888888888888888888888888\xbb------YY---##YYY#2#', 64);
  fp[(6) - 1] = R.trunc('000~ 66---------------------------\xf5\xf5\xf5\xf5\xf5\xf5\xf5---------------##YYY#-#', 64);
  fp[(7) - 1] = R.trunc('VVV~ 66-------------------------------------------------##YYY#B#', 64);
  fp[(8) - 1] = R.trunc('-<-~ 66-------------------------------------------0----\x94##YYY#-#', 64);
  fp[(9) - 1] = R.trunc('-[-~ 66---------.U.-----------------.\xbb.---------#####\xb3#-##YYY#2#', 64);
  fp[(10) - 1] = R.trunc('-|-~ 66----------------------------------------------\xb3#Y##YYY#-#', 64);
  fp[(11) - 1] = R.trunc('-"-~\xb9 --+++.+++.+++.+++.+++--------------------------\xb3#\xba##KY\xf2#2#', 64);
  fp[(12) - 1] = R.trunc('-\x92-~-7777777777777777777777777--###########----------\xb3#-##-###-#', 64);
  fp[(13) - 1] = R.trunc('---~662222222222222222222222266-DDVVLLLVVDD 2              2    ', 64);
  fp[(14) - 1] = R.trunc('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4', 64);
  fp[(15) - 1] = R.trunc('#diary\xb7#day#six\xb8################################################', 64);
  fp[(16) - 1] = R.trunc('################################################################', 64);
  fp[(17) - 1] = R.trunc('#it\xb6s#becoming#more#and#more#difficult#to#survive\xc3##the#idea#of#', 64);
  fp[(18) - 1] = R.trunc('################################################################', 64);
  fp[(19) - 1] = R.trunc('#turning#back#now#hangs#heavy#on#your#thoughts\xb4##how#much#can###', 64);
  fp[(20) - 1] = R.trunc('################################################################', 64);
  fp[(21) - 1] = R.trunc('#any#adventurer#take#before#adversity#wins\xb4##but#your#will#and##', 64);
  fp[(22) - 1] = R.trunc('################################################################', 64);
  fp[(23) - 1] = R.trunc('#courage#guide#you#now\xb7#and#they#refuse#to#let#you#give#up\xb4\xb4\xb4###', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level68() {
  fp[(1) - 1] = R.trunc('----W---I------:--"0|0[0<0--:----------------:------------------', 64);
  fp[(2) - 1] = R.trunc('\xbcYYYYYYYY------:--666666666\xbd:----------\xbd####-#LL-DDD------------', 64);
  fp[(3) - 1] = R.trunc('---------------:------------:------\xbd########-#9999999\xb3----------', 64);
  fp[(4) - 1] = R.trunc('---------------:---------------\xbd############\xb3########\xb3##--------', 64);
  fp[(5) - 1] = R.trunc('---------------:--YYYYYYYYY-########C-;22;--]---------##--------', 64);
  fp[(6) - 1] = R.trunc('-:----------\xf2-----YYYYYYYYY-############################\xb9::::::;', 64);
  fp[(7) - 1] = R.trunc('-~\xb3~-~------U-----YYYYYYYYY-##--\xb3------------------------:------', 64);
  fp[(8) - 1] = R.trunc('-~\xb3~-~------------YYYYKYYYY-##!##--------******0---------:------', 64);
  fp[(9) - 1] = R.trunc('-~\xb3~9~------------\xf6\xf6\xf6\xf6\xf6\xf6\xf6\xf6--##-##YYYY::::YYYYYYYYYYYYYYY-------K', 64);
  fp[(10) - 1] = R.trunc('-~\xb3~\x92~----------------------##K##------------------------------U', 64);
  fp[(11) - 1] = R.trunc('\xbc~-9-9-------------------------##VVVVVVVVVVVVVVVVVV##-----------', 64);
  fp[(12) - 1] = R.trunc('#########################piece#o\xb6#cake\xc3##############4444444####', 64);
  fp[(13) - 1] = R.trunc('-: P :-------------------:-\xbb\xbb\xbb\xbb\xbb\xbb--:----------------------------', 64);
  fp[(14) - 1] = R.trunc('-:   :-\xb3############MMMMM#-X77777#-#--\xb388888#######0-----######\xba', 64);
  fp[(15) - 1] = R.trunc('-:   :-\xb3-----------#MMMMM#-\xb3:::::#I#--\xb3--------0CC~------#\xf1....-', 64);
  fp[(16) - 1] = R.trunc('-: W :-\xb3-----------#MMMMM#-X-----#-#--\xb388888##5#########Y######-', 64);
  fp[(17) - 1] = R.trunc('-:   :-\xb3-----------#MMMMM#-\xb3-----#F#--\xb3-----##K##---------------', 64);
  fp[(18) - 1] = R.trunc('-: W :-\xb3-----------#MM\xbaMM#-X-]+++#\xf4#--\xb3-----##\xbd##               ', 64);
  fp[(19) - 1] = R.trunc('-:   :---\xf5---------#::::;#-\xb3-YYYY#;#--\xb3------                   ', 64);
  fp[(20) - 1] = R.trunc('T     -7777777777\xb3    2       -       2     -      2    -     2 ', 64);
  fp[(21) - 1] = R.trunc(';;;;;;;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX;XXXXXXXX~~~~~~~XXXX', 64);
  fp[(22) - 1] = R.trunc('                                                        \xb9       ', 64);
  fp[(23) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV#-#VVVVVV', 64);
  fast = '\xea';
  convert_format();
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level70() {
  fp[(1) - 1] = R.trunc('----------\xe0HT66-;K-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)-- 66111\xf1111--', 64);
  fp[(2) - 1] = R.trunc('-66666666666666-66))))))))))))))))))))))))))))))))66 6611111116-', 64);
  fp[(3) - 1] = R.trunc('----------66----662222222222222222222222222222222266 6611111116\x91', 64);
  fp[(4) - 1] = R.trunc('66\xe0\xe0\xe0\xe0\xe066-66-66-66((((((((((((((((((((((((((((((((66 66666-6666-', 64);
  fp[(5) - 1] = R.trunc('661111166-66\x9466--(22222222222222222222222222222222--       YY\xae6<', 64);
  fp[(6) - 1] = R.trunc('666666666-66-666666666666666666666666666666666666666 66666-66666', 64);
  fp[(7) - 1] = R.trunc('----\x95--------66666>;S---622222222222222222222222662YWY2666-66666', 64);
  fp[(8) - 1] = R.trunc('I6666666666666666666666-6@@@@@@@@@@@@@@@@@@@@@@@662YPY266W6666//', 64);
  fp[(9) - 1] = R.trunc('O:OO:::O:OO:66\x92-\x96-\x9266K@@@@                      662YWY26W666///\\', 64);
  fp[(10) - 1] = R.trunc(':O::O:O:O::O66-LLL-666666@@@@@@@@@@@@@@@@@@@@   6666 666666//\\"\\', 64);
  fp[(11) - 1] = R.trunc(':::::O::::O:66DDDDD6666662222222222222222222@        66666//\\\\\\\\', 64);
  fp[(12) - 1] = R.trunc(':OOO::::O::O66DDDDD6666666666666666666666666666666666666///\\\\\\\\\\', 64);
  fp[(13) - 1] = R.trunc('O:::O:OO:O:O664444466666666666666666666666666666---6666///\\\\\\U\\\\', 64);
  fp[(14) - 1] = R.trunc(':O[66O66::O:6666666-1-1-1-1-1-1-1-1-1-1-1-1-1-1--U-666///\\\\\\\\\\\\\\', 64);
  fp[(15) - 1] = R.trunc('RRRR6-6RRRRRRR6666666666666666666666666666666666---66////\\\\\\\\\\\\\\', 64);
  fp[(16) - 1] = R.trunc('RRRR6-6RRRRRRRRRRRRRRRRRRRRRRRRRQX.X.X.X.X.X.X.X6666////\\\\\\\\\\\\\\\\', 64);
  fp[(17) - 1] = R.trunc('?]]66-66]]RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR66-66\\', 64);
  fp[(18) - 1] = R.trunc('-------------------$$$$$$$$\x95RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR6-6RR', 64);
  fp[(19) - 1] = R.trunc('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$\x95RRRRR6-6RR', 64);
  fp[(20) - 1] = R.trunc('WWWWWWWWWW$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$66-66+', 64);
  fp[(21) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(22) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(23) - 1] = R.trunc('KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM|MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fast = '\xea';
  convert_format();
}
function level72() {
  fp[(1) - 1] = R.trunc('----------------------?##2--------;;TTTT#-\xbd-------\xbc------\xbb------', 64);
  fp[(2) - 1] = R.trunc('\xb3~~~~~~~~~~~~~~~~~~~~~-P##\xba##############----------------------\xb3', 64);
  fp[(3) - 1] = R.trunc('\xb30-\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf\xaf-K# +##--:-\xf6;-&-\x92-\x94-\x91-\x94----------------------\xb3', 64);
  fp[(4) - 1] = R.trunc('\xb3###\xb9################ ##----#mystery#ramp#----I----------------\xb3', 64);
  fp[(5) - 1] = R.trunc('\xb3\xb9##-82-2-2-2-2-2-8Q#  ##2----------\x95---:-------|----[-----I---\xb3', 64);
  fp[(6) - 1] = R.trunc('\xb3###-################  T##-############-:---"--------I---------\xb3', 64);
  fp[(7) - 1] = R.trunc('\xb32##---Y-Y-Y-Y-Y-Y-C# +##---D\xb3\xb3\xb3\xb3\xb3--.##\x96:-----------------<----\xb3', 64);
  fp[(8) - 1] = R.trunc('\xb3###-################ ##---##VVVVV##-##-:----------------------\xb3', 64);
  fp[(9) - 1] = R.trunc('\xb32##-F\xe2;;***++++++\xe22#  ##2-##-----##*##::-\xbd-------\xbc------\xbb-----\xb3', 64);
  fp[(10) - 1] = R.trunc('\xb3###-################  T##-##::::;##*##------------------------\xb3', 64);
  fp[(11) - 1] = R.trunc('\xb32##-0-\x96-\x96-\x96-\x96-\x96-\x96-C# +##--##\x93-!--##*##VVVVVVVVVVVVVVVVVVVVVV##\xb3', 64);
  fp[(12) - 1] = R.trunc('\xb3###-################ ##---#######-#-##########################\xb3', 64);
  fp[(13) - 1] = R.trunc('\xb32##----2----2-----\x93#  ##2-::CWWWW:-\x92-----7---D.##.------------\xb3', 64);
  fp[(14) - 1] = R.trunc('\xb3#################\xb3##  T##-::;:::##\xb3###########-##-#######99999\xb3', 64);
  fp[(15) - 1] = R.trunc('\xb32##]-------;------\x93# +##--:-------\xb3-##WWW------##-##88---#####\xb3', 64);
  fp[(16) - 1] = R.trunc('\xb3###-################ ##---:-\xb3\xb3\xb3\xb3\xb3\xb3\xb3-##########-##-##\x92#########\xb3', 64);
  fp[(17) - 1] = R.trunc('\xb32##11111111111111-C#  ##2---\xaf-----Y-:2222222222##K##-------88#\xb3', 64);
  fp[(18) - 1] = R.trunc('\xb3#########Y##########  T##---\x94-------#X###########X##########\x92#\xb3', 64);
  fp[(19) - 1] = R.trunc('\xb32##-------\x93## 8 2   -+##--::::-:::--#-----`--LL##---K---7----#\xb3', 64);
  fp[(20) - 1] = R.trunc('\xb3###-#########  ~00000##-------+-----#############---##########\xb3', 64);
  fp[(21) - 1] = R.trunc('\xb32##\xf1           ~      ##2--------------\x91-\x91-\x91-\x91-\x91-\x91------------\xb3', 64);
  fp[(22) - 1] = R.trunc('\xb3###            ~      T##X###########0XXXXXXXXXXXXXXX---------\xb3', 64);
  fp[(23) - 1] = R.trunc('C2-2-2-2-2-2-2-2~ YYY-\xae44--\xe0\xe0\xe0\xe0\xe0M\xe0M\xba##\xaf-2222222222222XWWWWWWWWWW', 64);
  fast = '\xea';
  convert_format();
  magicewalls = true;
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level74() {
  fp[(1) - 1] = R.trunc('    0             #heat#wave\xc3#    @\xf2RRRRR22222222222222222244\x96`L', 64);
  fp[(2) - 1] = R.trunc(';;===00  99999F                   @@@RRRRR2222222222222222244\x96::', 64);
  fp[(3) - 1] = R.trunc('$===00   99\xf699.             F  .      RRRRRR22222222222222244444', 64);
  fp[(4) - 1] = R.trunc('W====00  99999        F .         \x94\x94\x94   RRRRR2222222222222222222', 64);
  fp[(5) - 1] = R.trunc('WW====0            .    77777            RRRRRR22222222222222222', 64);
  fp[(6) - 1] = R.trunc('WWW===00        F       77\xf477.    F     F RRRRRR2222222222222222', 64);
  fp[(7) - 1] = R.trunc('\xaf$====0   F             77777            .  RRRRRR22222222222222', 64);
  fp[(8) - 1] = R.trunc('\xaf=====00  $$$$$$$$$$$ F      F@@@@@@@@@      RRRRRR2222222222222', 64);
  fp[(9) - 1] = R.trunc('====000   $222222222$         @2222222@   F    RRRRR222222222222', 64);
  fp[(10) - 1] = R.trunc('==000     ##############################        RRRRRR2222222222', 64);
  fp[(11) - 1] = R.trunc('00\x96 \x96 \x96 \x96Z##2-U-<##2-U-[##2-U-|##2-U-"##Z .   P   RRRRRR22222222', 64);
  fp[(12) - 1] = R.trunc('#############################################\xe0\xe0    RRRRRRR222222', 64);
  fp[(13) - 1] = R.trunc('K88------\x91##\x91-----88K##K88-----\x91##\x91-----88K##2\xe0 F    RRRRRRR2222', 64);
  fp[(14) - 1] = R.trunc('#########-##-##################-##-##########2\xe0   .    RRRRRRR22', 64);
  fp[(15) - 1] = R.trunc('Q002222222222222222222222222222222222222222##2\xe0      F   RRRRRRR', 64);
  fp[(16) - 1] = R.trunc('0002222222222222222222222222222222222222222##2\xe0            RRRRR', 64);
  fp[(17) - 1] = R.trunc('0002222222222222222222222222222222222222222##\xe0\xe0  F       F   RRR', 64);
  fp[(18) - 1] = R.trunc('666666666666666666666666666666666666666666688        .     .    ', 64);
  fp[(19) - 1] = R.trunc(')))))))))))))))))))))))))))))))))))))))))))##5#######\xe1\xe1      :  ', 64);
  fp[(20) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM##-:-\x92-:\xf362\xe1    :::  ', 64);
  fp[(21) - 1] = R.trunc('(((((((((((((((((((((((((((((((((((((((((((##-:-:-:\xe0#2\xe1 F ::>:: ', 64);
  fp[(22) - 1] = R.trunc('####-########################################-:-:-:-#2\xe1    :;:  ', 64);
  fp[(23) - 1] = R.trunc('\xaf00---22222222222222222-<[|"D-\x91-D-\x91-D-\x92-\xf1\xf5!##-\x92-:-\x92-#2\xe1    :   U', 64);
  fast = '\xea';
  convert_format();
  hidemblock = true;
}
function level75() {
  fp[(1) - 1] = R.trunc('\xf1\xf622222229       &#the#sacred#chamber#of#kroz#&2      82222222\xf5\xf2', 64);
  fp[(2) - 1] = R.trunc('\xf6\xf622222999      F       $\xae$$$$$$$$$$$\xaf$ 2    .    F   88822222\xf5\xf5', 64);
  fp[(3) - 1] = R.trunc('22222999     2\x95 .   \x94   $$$333333333$$$         \x95    2  88822222', 64);
  fp[(4) - 1] = R.trunc('222999   \x94   ###        $$3=========3$$   ]    ###        888222', 64);
  fp[(5) - 1] = R.trunc('2999   .     #K#       $$3==\xfa\xfa\xfa\xf9\xfa\xfa\xfa==3$$       #\xf3# .        8882', 64);
  fp[(6) - 1] = R.trunc('99   F  ]    #K#  2   $$3==\xfa\xfa\xf9VVV\xf9\xfa\xfa==3$$   2  #2#    \x94    2  88', 64);
  fp[(7) - 1] = R.trunc('RRRRRRR      #0#      $3==\xfa\xf9\xef\xfaVAV\xfa\xef\xf9\xfa==3$      #2#       RRRRRRR', 64);
  fp[(8) - 1] = R.trunc('22222RR.     #0# .    $3==\xfa\xf9\xf9\xfaVVV\xfa\xf9\xf9\xfa==3$ .    #2#  2   .RR22222', 64);
  fp[(9) - 1] = R.trunc('22222RR  2   #0#      $$3==\xfa\xfa\xf9\xfa6\xfa\xf9\xfa\xfa==3$$      #2#       RR22222', 64);
  fp[(10) - 1] = R.trunc('22222RR      #D#   2   $$3==\xfa\xfa\xf9&\xf9\xfa\xfa==3$$    \x91  #D#     2 RR22222', 64);
  fp[(11) - 1] = R.trunc('22222RR                 $$3==\xfa\xfa0\xfa\xfa==3$$                  RR22222', 64);
  fp[(12) - 1] = R.trunc('22222RR     2        ]   $3==\xfa\xfaG\xfa\xfa==3$    \x94    .   2   . RR22222', 64);
  fp[(13) - 1] = R.trunc('22222RR  .     \x94     .   $$3==\xfaD\xfa==3$$                ]  RR22222', 64);
  fp[(14) - 1] = R.trunc('22222RR    F              $$3=====3$$   2      2    \x94    RR22222', 64);
  fp[(15) - 1] = R.trunc('RRRRRRR 2         2        $$33333$$       ]      F     2RRRRRRR', 64);
  fp[(16) - 1] = R.trunc('444444444444444\x92            $$$$$$$   .      .  H444444444444444', 64);
  fp[(17) - 1] = R.trunc('77777777777777###   \x91 .        P           2   ###YYYYYYYYYYYYYY', 64);
  fp[(18) - 1] = R.trunc('77777777777777#U#       2                      #U#YYXXXXXXXXXXXX', 64);
  fp[(19) - 1] = R.trunc('77777777777777#-#  2       .   T      2        #0#YYXXYYYYYYYYYY', 64);
  fp[(20) - 1] = R.trunc('77777777777777#<#   ]          \x94 2       \x94    2#0#YYXXYYOOOOOOOO', 64);
  fp[(21) - 1] = R.trunc('77777777777777#[#        2  5555555 N     .    #0#YYXXYYOOYYYYYY', 64);
  fp[(22) - 1] = R.trunc('77777777777777#|#          55DDDDD55 2      F  #0#YYXXYYOOYYXXXX', 64);
  fp[(23) - 1] = R.trunc('K777777777777C#"#E  2     555D]!]D555     2    40#CYXXYYOOYYXX]K', 64);
  fast = '\xea';
  convert_format();
  magicewalls = true;
  hidecreate = true;
  evaporate = (22) << 16 >> 16;
}
function title() {
  let startgame = false;
  let $61, $62, $63, $64, $65, $66, $67, $68, $69;
  R.nosound();
  clearkeys();
  cur(3);
  col(15, 15);
  bak(0, 0);
  R.clrscr();
  cur(3);
  R.gotoxy(28, 2);
  R.write('Apogee Software Presents' + '\r\n');
  clearkeys();
  do {
    R.gotoxy(1, 5);
    col((R.random(15) + 1), 7);
    R.write('     \xdb\xdb\xdb     \xdb\xdb\xdb     \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb         \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb        \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb  (R)' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1  \xdb\xdb\xdb\xb1\xb1\xb1   \xdb\xdb\xdb\xb1\xb1\xb1\xb1\xb1\xdb\xdb\xdb\xb1      \xdb\xdb\xdb\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xdb\xdb\xdb\xb1        \xb1\xb1\xb1\xb1\xb1\xb1\xdb\xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1 \xdb\xdb\xdb\xb1\xb1\xb1    \xdb\xdb\xdb\xb1\xb1   \xdb\xdb\xdb\xb1\xb1     \xdb\xdb\xdb\xb1\xb1     \xdb\xdb\xdb\xb1\xb1            \xdb\xdb\xdb\xb1\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1\xdb\xdb\xdb\xb1\xb1\xb1     \xdb\xdb\xdb\xb1\xb1   \xdb\xdb\xdb\xb1\xb1    \xdb\xdb\xdb\xb1\xb1\xb1      \xdb\xdb\xdb\xb1           \xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xdb\xdb\xdb\xb1\xb1\xb1      \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xb1\xb1\xb1    \xdb\xdb\xdb\xb1\xb1       \xdb\xdb\xdb\xb1\xb1         \xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xdb\xdb\xdb\xb1\xb1\xb1       \xdb\xdb\xdb\xb1\xb1\xdb\xdb\xdb\xb1\xb1\xb1\xb1     \xdb\xdb\xdb\xb1\xb1       \xdb\xdb\xdb\xb1\xb1        \xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xdb\xdb\xdb\xb1        \xdb\xdb\xdb\xb1\xb1 \xdb\xdb\xdb\xb1        \xdb\xdb\xdb\xb1      \xdb\xdb\xdb\xb1\xb1\xb1       \xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1\xdb\xdb\xdb\xb1       \xdb\xdb\xdb\xb1\xb1  \xdb\xdb\xdb\xb1       \xdb\xdb\xdb\xb1\xb1     \xdb\xdb\xdb\xb1\xb1      \xdb\xdb\xdb\xdb\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1 \xdb\xdb\xdb\xb1      \xdb\xdb\xdb\xb1\xb1   \xdb\xdb\xdb\xb1       \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xb1\xb1\xb1     \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1  \xdb\xdb\xdb\xb1       \xb1\xb1\xb1     \xb1\xb1\xb1        \xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1        \xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1   \xdb\xdb\xdb\xb1' + '\r\n');
    R.write('     \xdb\xdb\xdb\xb1\xb1    \xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb\xdb' + '\r\n');
    R.write('       \xb1\xb1\xb1      \xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1\xb1' + '\r\n');
    R.write('' + '\r\n');
    R.write('' + '\r\n');
    col(14, 15);
    R.gotoxy(9, R.wherey());
    R.write('THE LOST ADVENTURES OF KROZ -- VOLUME SEVEN OF THE KROZ SERIES' + '\r\n');
    R.write('' + '\r\n');
    R.gotoxy(24, R.wherey());
    col(14, 7);
    R.write('Copyright (C) 1990 Scott Miller' + '\r\n');
    R.write('' + '\r\n');
    R.write('' + '\r\n');
    col(11, 7);
    R.gotoxy(27, 25);
    R.write('Press any key to continue.');
    R.delay(300);
  } while (!(R.keypressed()));
  clearkeys();
  bak(1, 0);
  bor(4);
  R.clrscr();
  cur(3);
  R.gotoxy(25, 1);
  col(4, 7);
  bak(1, 0);
  R.write('\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc');
  R.gotoxy(25, 3);
  R.write('\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf');
  R.gotoxy(25, 5);
  col(15, 15);
  R.write('An Apogee Software Production');
  R.gotoxy(28, 7);
  R.write('Created by Scott Miller');
  R.gotoxy(1, 9);
  col(11, 7);
  R.write('  Revitalized from the Fountain of Youth you uncovered in your last adventure' + '\r\n');
  R.write('  through Kroz,  you decide it\'s time once again to explore the vast mystical' + '\r\n');
  R.write('  kingdom.  From your last journey through the underground world of Kroz, you' + '\r\n');
  R.write('  noticed a new tunnel that requires further investigation.  What new mystery' + '\r\n');
  R.write('  awaits below?  Your adrenaline level rises as you decend the secret tunnels' + '\r\n');
  R.write('               that lead into the heart of Kroz.  One more time...' + '\r\n');
  R.gotoxy(1, 17);
  col(10, 7);
  R.write('         Use the cursor keys to move yourself (');
  col(14, 15);
  R.write('\x02');
  col(10, 7);
  R.write(') through the kingdom.' + '\r\n');
  R.write('            Use your whip (press W) to destroy all nearby creatures.' + '\r\n');
  R.write('       You are on your own to discover what other mysteries await--some' + '\r\n');
  R.write('                           helpful, others deadly...' + '\r\n');
  col(14, 7);
  R.gotoxy(13, 22);
  R.write('Are you a ');
  col(15, 15);
  R.write('N');
  col(14, 7);
  R.write('ovice, an ');
  col(15, 15);
  R.write('E');
  col(14, 7);
  R.write('xperienced or an ');
  col(15, 15);
  R.write('A');
  col(14, 7);
  R.write('dvanced player?');
  col(28, 16);
  R.write('\xdb');
  R.sound(220);
  R.delay(100);
  R.nosound();
  bak(4, 7);
  do {
    do {
      R.gotoxy(25, 2);
      col(R.random(16), 0);
      R.write(' THE LOST ADVENTURES OF KROZ ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($61 = R.upcase(ch).charCodeAt(0), $61 === 13 || $61 === 78 || $61 === 32 || $61 === 69 || $61 === 65 || $61 === 33)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x = 1; $62 = 28;
  if (x <= $62) for (;;) {
    R.write('  ');
    if (x >= $62) break;
    x++;
  }
  col(30, 31);
  bak(1, 0);
  $63 = R.upcase(ch);
  if ($63 === 'N' || $63 === ' ' || $63 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($63 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($63 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($63 === '!') {
    difficulty = (9) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('SECRET MODE');
  }
  clearkeys();
  R.gotoxy(33, 25);
  col(7, 7);
  R.write('Press any key.');
  bak(4, 7);
  do {
    R.gotoxy(25, 2);
    col(R.random(16), 0);
    R.write(' THE LOST ADVENTURES OF KROZ ');
    R.delay(50);
  } while (!(R.keypressed()));
  clearkeys();
  shareware(true);
  startgame = false;
  do {
    bor(1);
    bak(0, 0);
    R.clrscr();
    cur(3);
    col(15, 9);
    R.gotoxy(26, 2);
    R.write('THE LOST ADVENTURES OF KROZ');
    R.gotoxy(17, 4);
    col(6, 7);
    R.write('Copyright (c) 1990 Apogee Software Productions');
    R.gotoxy(25, 6);
    R.write('Version 1.0 -- by Scott Miller');
    R.gotoxy(4, 8);
    col(2, 7);
    R.write('THIS GAME MAY NOT BE DISTRIBUTED BY SHAREWARE OR PUBLIC DOMAIN LIBRARIES,' + '\r\n');
    R.gotoxy(6, 9);
    R.write('NOR BULLETIN BOARD SYSTEMS.  ONLY ');
    col(10, 15);
    R.write('RETURN TO KROZ');
    col(2, 7);
    R.write(' MAY BE FREELY SHARED.' + '\r\n');
    R.gotoxy(1, 10);
    col(4, 7);
    x = 1; $64 = 80;
    if (x <= $64) for (;;) {
      R.write('\xc4');
      if (x >= $64) break;
      x++;
    }
    col(14, 15);
    R.gotoxy(28, 12);
    R.write('B');
    col(11, 7);
    R.write('egin your descent into Kroz...');
    col(14, 15);
    R.gotoxy(28, 14);
    R.write('I');
    col(11, 7);
    R.write('nstructions');
    col(14, 15);
    R.gotoxy(28, 16);
    R.write('M');
    col(11, 7);
    R.write('arketing Kroz');
    col(14, 15);
    R.gotoxy(28, 18);
    R.write('S');
    col(11, 7);
    R.write('tory Behind Kroz');
    col(14, 15);
    R.gotoxy(28, 20);
    R.write('O');
    col(11, 7);
    R.write('riginal Kroz Games');
    col(14, 15);
    R.gotoxy(28, 22);
    R.write('A');
    col(11, 7);
    R.write('bout the Author');
    R.gotoxy(26, 24);
    col(15, 0);
    bak(1, 7);
    R.write('Your choice (B/I/M/S/O/A)? B');
    R.gotoxy((R.wherex() - 1), R.wherey());
    cur(2);
    clearkeys();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'R')) {
      mixup = true;
    } else {
      mixup = false;
    }
    clearkeys();
    cur(3);
    $65 = R.upcase(ch);
    if ($65 === 'B') {
      x = 100; $66 = 20;
      if (x >= $66) for (;;) {
        y = 10; $67 = 1;
        if (y >= $67) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $67) break;
          y--;
        }
        if (x <= $66) break;
        x--;
      }
      R.nosound();
      startgame = true;
    } else if ($65 === 'I') {
      bak(1, 0);
      bor(4);
      R.clrscr();
      cur(3);
      clearkeys();
      R.gotoxy(32, 2);
      col(14, 7);
      R.write('THE INSTRUCTIONS' + '\r\n');
      R.gotoxy(32, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   Lost Adventures is a game of exploration and survival.  Your journey will' + '\r\n');
      R.write(' take you through 75 very dangerous chambers, each riddled with diabolical' + '\r\n');
      R.write(' traps and hideous creatures.   Hidden in the deepest chamber lies a hidden' + '\r\n');
      R.write(' treasure of immense value. Use the cursor pad to move 8 directions.' + '\r\n');
      R.write('   The chambers contain dozens of treasures, spells, traps and other unknowns.' + '\r\n');
      R.write(' Touching an object for the first time will reveal a little of its identity,' + '\r\n');
      R.write(' but it will be left to you to decide how best to use it--or avoid it.' + '\r\n');
      R.write('   When a creature touches you it will vanish, taking with it a few of your' + '\r\n');
      R.write(' gems that you have collected. If you have no gems then the creature will' + '\r\n');
      R.write(' instead take your life!  Whips can be used to kill nearby creatures, but' + '\r\n');
      R.write(' they\'re better used to smash through "breakable walls" and other terrain.' + '\r\n');
      R.write('   PCjr players can use' + '\r\n');
      R.write(' the alternate cursor                 U I O      ( NW N NE )' + '\r\n');
      R.write(' pad instead of the cursor             J K       (   W E   )' + '\r\n');
      R.write(' keys to move your man, and           N M ,      ( SW S SE )' + '\r\n');
      R.write(' the four normal cursor keys.' + '\r\n');
      R.write('   It\'s a good idea to save your game at every new level, therefore, if you die' + '\r\n');
      R.write(' you can easily restore the game at that level and try again.' + '\r\n');
      R.write('   Registered users will receive a "Hidden Tricks and Hints" sheet.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
      bak(1, 0);
      R.clrscr();
      cur(3);
      clearkeys();
      R.gotoxy(32, 2);
      col(14, 7);
      R.write('THE INSTRUCTIONS' + '\r\n');
      R.gotoxy(32, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   Lost Adventures will present you with many challenges. You will venture deep' + '\r\n');
      R.write(' underground and probably not make it out alive!' + '\r\n');
      R.write('' + '\r\n');
      R.write(' Hints:  \xfe Don\'t forget to use the Home, End, PgUp, and PgDn keys to move your' + '\r\n');
      R.write('           on-screen character diagonally (along with the marked cursor keys).' + '\r\n');
      R.write('         \xfe Use your player to touch each new object to find out about it.  When' + '\r\n');
      R.write('           you first touch an object a message appears at the bottom of the' + '\r\n');
      R.write('           screen that describes it.' + '\r\n');
      R.write('         \xfe Collect keys to unlock doors, which usually block the stairs.' + '\r\n');
      R.write('         \xfe The faster monsters are the most dangerous to touch--they will knock' + '\r\n');
      R.write('           off three of your valuable gems.  The slowest creatures only take a' + '\r\n');
      R.write('           single gem from you, and the medium speed monsters take two.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Some levels have a Magical Gravity that will pull you downward!  On these' + '\r\n');
      R.write(' "gravity" levels only YOU are affected, not creatures!  Also, some levels will' + '\r\n');
      R.write(' be played as if viewed from the side. On these levels you can only move upward' + '\r\n');
      R.write(' by using a rope, tunnel or teleportation.  "Sideways" levels are similar to' + '\r\n');
      R.write(' levels with gravity except that you cannot move upward.  At the beginning of' + '\r\n');
      R.write(' "sideways" level a message at the bottom of the screen will notify you.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
      bak(1, 0);
      R.clrscr();
      cur(3);
      clearkeys();
      R.gotoxy(32, 2);
      col(14, 7);
      R.write('THE INSTRUCTIONS' + '\r\n');
      R.gotoxy(32, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      col(15, 7);
      R.write('   Here are some brief descriptions of the most common objects that you are' + '\r\n');
      R.write(' likely to find in the kingdom of Kroz:' + '\r\n');
      R.write('' + '\r\n');
      R.write('      ');
      col(14, 15);
      R.write('\x02');
      col(15, 7);
      R.write(' - this is you, a dauntless archaeologist without peer' + '\r\n');
      R.write('      ');
      col(12, 7);
      R.write('\x8e');
      col(15, 7);
      R.write(' - red creatures move slow and only knock off 1 gem when touched' + '\r\n');
      R.write('      ');
      col(10, 7);
      R.write('\x99');
      col(15, 7);
      R.write(' - green creatures move faster and knock off 2 gems when touched' + '\r\n');
      R.write('      ');
      col(9, 7);
      R.write('\xea');
      col(15, 7);
      R.write(' - blue creatures move fastest and knock off 3 gems when touched' + '\r\n');
      R.write('      ');
      col((R.random(13) + 2), 7);
      R.write('\x04');
      col(15, 7);
      R.write(' - collect all the gems you can to survive creature attacks' + '\r\n');
      R.write('      ');
      R.write('\xf4');
      R.write(' - whips are used to wipe out creatures and smash certain walls' + '\r\n');
      R.write('      ');
      col(13, 7);
      R.write('\x18');
      col(15, 7);
      R.write(' - teleport spells will magically transport you to a random place' + '\r\n');
      R.write('      ');
      col(14, 7);
      bak(4, 0);
      R.write('C');
      bak(1, 0);
      col(15, 7);
      R.write(' - chests contain a random number of gems and whips' + '\r\n');
      R.write('      ');
      col(12, 15);
      R.write('\x8c');
      col(15, 7);
      R.write(' - collect keys to go through doors (');
      col(3, 0);
      bak(5, 7);
      R.write('\xec');
      col(15, 7);
      bak(1, 0);
      R.write(')' + '\r\n');
      R.write('      ');
      R.write('\x09');
      R.write(' - collect these power rings to make your whips more powerful' + '\r\n');
      R.write('      ');
      col(9, 7);
      R.write('\xfe');
      col(15, 7);
      R.write(' - these tablets will give you clues, advice and warnings' + '\r\n');
      R.write('      ');
      R.write('?');
      R.write(' - this might be anything, including a big pouch of gems!' + '\r\n');
      R.write('      ');
      col(16, 16);
      bak(7, 7);
      R.write('\xf0');
      col(15, 7);
      bak(1, 0);
      R.write(' - stairs take you to the next level deeper in Kroz' + '\r\n');
      R.write('' + '\r\n');
      R.write('   There are dozens and dozens of other objects to discover.  The best way' + '\r\n');
      R.write(' to learn the usefulness of any new object is to touch it and read the brief' + '\r\n');
      R.write(' message that appears at the bottom of the screen.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
      bak(1, 0);
      R.clrscr();
      cur(3);
      clearkeys();
      R.gotoxy(33, 2);
      col(14, 7);
      R.write('MISCELLANEOUS' + '\r\n');
      R.gotoxy(33, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('  \xfe Hidden in many locations throughout this game is a secret message that' + '\r\n');
      R.write('    you might find.  If you are one of the first 100 players to find this' + '\r\n');
      R.write('    message you can report it to Apogee Software (attention:  Scott Miller)' + '\r\n');
      R.write('    for a "Master Kroz Adventurer" certificate.  Only registered players can' + '\r\n');
      R.write('    qualify for this contest.  The message will be obvious if you find it!' + '\r\n');
      R.write('' + '\r\n');
      R.write('  \xfe You can now save three different levels during a single game.  When you' + '\r\n');
      R.write('    select the "save" command you will also be asked to enter a letter, either' + '\r\n');
      R.write('    A, B or C.  If you just hit the space bar then A is the default selection.' + '\r\n');
      R.write('    These letters do not refer to disk drives!  They actually refer to the file' + '\r\n');
      R.write('    names used by the game.  The restore command lets use pick from A, B or C.' + '\r\n');
      R.write('' + '\r\n');
      R.write('  \xfe Sideways levels can be recognized by the pause message that appears at' + '\r\n');
      R.write('    the bottom of the screen, which states that it\'s a "sideways" level.' + '\r\n');
      R.write('' + '\r\n');
      R.write('  \xfe If you are tired of seeing the descriptions at the bottom of the screen' + '\r\n');
      R.write('    that appear whenever you touch a new object, you can disable most of the' + '\r\n');
      R.write('    messages by pressing the minus (-) key.  The plus key (+) resets messages.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($65 === 'M') {
      bor(10);
      bak(1, 0);
      R.clrscr();
      clearkeys();
      cur(3);
      R.gotoxy(29, 2);
      col(14, 7);
      R.write('THE MARKETING OF KROZ' + '\r\n');
      R.gotoxy(29, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   Lost Adventures is a user-supported game.  This means that the creator of' + '\r\n');
      R.write(' this program relies on the appreciation of honest players to pay the game\'s' + '\r\n');
      R.write(' registration fee--$20.' + '\r\n');
      R.write('   Payment of this fee entitles you to all the free help and hints you might' + '\r\n');
      R.write(' need to enjoy the game.  All letters from registered users are answered' + '\r\n');
      R.write(' within two days.  (Try to get this kind of support from commercial games!)' + '\r\n');
      R.write('   Also, players can order the other Kroz sequels ONLY if this registration' + '\r\n');
      R.write(' fee is paid.  ($7.50 each or $35 for all six other Kroz games.)' + '\r\n');
      R.write('   Everyone who orders (or registers) any of the other six Kroz games will also' + '\r\n');
      R.write(' get a "Hints, Tricks and Scoring Secrets" guide, and "The Domain of Kroz" map.' + '\r\n');
      R.write('   A single Kroz game takes several months to create, up to 200 hours per game!' + '\r\n');
      R.write(' I can\'t afford to devote this much time without receiving something in return.' + '\r\n');
      R.write(' That is why I ask for this small fee, which is only necessary if you enjoy' + '\r\n');
      R.write(' this game.  In other words, try before you buy.' + '\r\n');
      R.write('   Even if you buy this game from a public domain or shareware library, I don\'t' + '\r\n');
      R.write(' receive any of that money.  You\'re simply paying for "storage, distribution,' + '\r\n');
      R.write(' disk, and handling."' + '\r\n');
      R.write('   Note:  The current Apogee Software address will ALWAYS BE VALID.  Foreign' + '\r\n');
      R.write(' orders are always welcome, please send U.S. funds/money orders only.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($65 === 'S') {
      bor(13);
      bak(1, 0);
      R.clrscr();
      clearkeys();
      cur(3);
      R.gotoxy(29, 2);
      col(14, 7);
      R.write('THE STORY BEHIND KROZ' + '\r\n');
      R.gotoxy(29, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   The original Kroz Trilogy (consisting of Caverns of Kroz, Dungeons of Kroz,' + '\r\n');
      R.write(' and Kingdom of Kroz) was developed after I spent many hours playing another' + '\r\n');
      R.write(' explore-the-levels type game titled Rogue.  I never could finish Rogue,' + '\r\n');
      R.write(' though, because the game relied too much on luck and random occurrences.' + '\r\n');
      R.write('   The name "Kroz" is actually Zork (an Infocom text adventure) spelled in' + '\r\n');
      R.write(' reverse.  Many players still inquire about this bit of trivia.  The game was' + '\r\n');
      R.write(' first designed without predefined level layouts, meaning every level was a' + '\r\n');
      R.write(' random placement of creatures and play field objects.  New objects, like' + '\r\n');
      R.write(' spells, lava, doors, etc., were added quickly as the first Kroz game took' + '\r\n');
      R.write(' shape, including the ability to have predefined level floor plans.' + '\r\n');
      R.write('   My main objective was to create a game that wasn\'t all fast paced action,' + '\r\n');
      R.write(' but also included strategy and puzzle solving.  Kingdom of Kroz was entered' + '\r\n');
      R.write(' in a national programming contest in 1988 and took top honors in the game' + '\r\n');
      R.write(' category, and number two overall (beaten by a spreadsheet program.)' + '\r\n');
      R.write('   The latest Kroz games have been greatly re-designed and re-programmed, but' + '\r\n');
      R.write(' the familiar appearance has been mostly maintained.  You will discover new' + '\r\n');
      R.write(' dangers, creatures and objects in your adventures below.' + '\r\n');
      R.write('   Thanks to all the players of Kroz who contributed dozens of suggestions,' + '\r\n');
      R.write(' ideas and improvements that were incorporated in later versions of Kroz.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
      bak(1, 0);
      R.clrscr();
      cur(3);
      clearkeys();
      R.gotoxy(29, 2);
      col(14, 7);
      R.write('THE STORY BEHIND KROZ' + '\r\n');
      R.gotoxy(29, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   Kroz is a hobby that\'s gotten out of control!' + '\r\n');
      R.write('   Kroz is truly a phenomenon in the user-supported software market.  The' + '\r\n');
      R.write(' overwhelming success of the original Kroz games was completely unexpected.' + '\r\n');
      R.write(' Most (probably 99%) of all "shareware" games are not profitable for their' + '\r\n');
      R.write(' creator.  This is a well-known fact among the community of shareware game' + '\r\n');
      R.write(' authors, and one that I\'ve verified by speaking to many other games de-' + '\r\n');
      R.write(' signers.  Most people simply don\'t register games.' + '\r\n');
      R.write('   Through my research the Kroz games are the only user-supported games that' + '\r\n');
      R.write(' generate a substantial amount of registrations and orders for it\'s creator,' + '\r\n');
      R.write(' namely, Scott Miller (me).  I don\'t know what cord I\'ve struck with players,' + '\r\n');
      R.write(' but everyday I receive fascinating and appreciative letters from players' + '\r\n');
      R.write(' telling me how much they enjoy the Kroz games.' + '\r\n');
      R.write('   Thanks to Kroz I now know what a mutual fund is, but on the downside my' + '\r\n');
      R.write(' taxes require a book two inches thick to figure out.' + '\r\n');
      R.write('   Will Kroz ever end?  I thought that THE FINAL CRUSADE would be the closing' + '\r\n');
      R.write(' chapter--but a flood of letters demanding more proved that I\'m a pushover.' + '\r\n');
      R.write(' I guess as long as the letters keep coming, I\'ll continue to make Kroz games.' + '\r\n');
      R.write(' After all, Kroz is like my second home now, one that I like to visit often...' + '\r\n');
      R.write('                                                        -- Scott Miller' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($65 === 'O') {
      bor(15);
      bak(1, 0);
      R.clrscr();
      clearkeys();
      cur(3);
      R.gotoxy(28, 2);
      col(14, 7);
      R.write('THE ORIGINAL KROZ GAMES' + '\r\n');
      R.gotoxy(28, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   The Lost Adventures of Kroz is the latest addition to the Kroz family of' + '\r\n');
      R.write(' games.  Before this game there are six more Kroz volumes, separated into two' + '\r\n');
      R.write(' triligies:  The Kroz Trilogy and The Super Kroz Trilogy.' + '\r\n');
      R.write('   The original Kroz Trilogy was such a surprising success that I decided to' + '\r\n');
      R.write(' created a second "Super Kroz" trilogy.  The first three original Kroz' + '\r\n');
      R.write(' games are:   \xfe Kingdom of Kroz  \xfe Caverns of Kroz  \xfe Dungeons of Kroz.' + '\r\n');
      R.write(' All three are still available and are constantly being updated and improved.' + '\r\n');
      R.write('   The original Kroz Trilogy games can be purchased for $7.50 each, or all 3' + '\r\n');
      R.write(' for $20 (these prices include postage, disks, and handling).' + '\r\n');
      R.write('   Only Kingdom of Kroz can be placed in a shareware library for distribution,' + '\r\n');
      R.write(' and the other two can only be ordered from Apogee Software Productions.' + '\r\n');
      R.write('   The Super Kroz Trilogy volumes are revamped and greatly improved.  They are' + '\r\n');
      R.write(' \xfe Return to Kroz  \xfe Temple of Kroz  \xfe The Final Crusade of Kroz.  The last' + '\r\n');
      R.write(' three volumes were supposed to be the end of Kroz, but the mail kept coming' + '\r\n');
      R.write(' and again I was impelled to create another Kroz adventure.' + '\r\n');
      R.write('   All Kroz games work on all monitors, either graphics or monochrome systems.' + '\r\n');
      R.write(' Plus, they only rely on keyboard control, and have slow-down routines that' + '\r\n');
      R.write(' permit them to function correctly on any speed IBM PC compatible computer.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($65 === 'A') {
      bor(6);
      bak(1, 0);
      R.clrscr();
      clearkeys();
      cur(3);
      R.gotoxy(32, 2);
      col(14, 7);
      R.write('ABOUT THE AUTHOR' + '\r\n');
      R.gotoxy(32, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      col(15, 7);
      R.write('   Scott Miller, the creator of all the Kroz games, along with Supernova, Trek' + '\r\n');
      R.write(' Trivia and Beyond the Titanic (all shareware games) began programming in high' + '\r\n');
      R.write(' school in 1975.  Since then he\'s created over 100 games and has had dozens' + '\r\n');
      R.write(' publishered by BIG BLUE DISK, I.B.Magazette and Keypunch Software.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   For over three years he wrote two weekly computer columns for the Dallas' + '\r\n');
      R.write(' Morning News, one of the nation\'s largest newspapers.  He also co-authored' + '\r\n');
      R.write(' a video game strategy book titled, "Shootout: Beating the Video Games."' + '\r\n');
      R.write(' Scott has written articles for COMPUTE!\'s PC and PCjr Magazine and is a' + '\r\n');
      R.write(' software reviewer with COMPUTE! Publications.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Hobbies include softball, running, tennis, karate (1st degree black belt),' + '\r\n');
      R.write(' drumming, rock music, science fiction, and creating new computer games.' + '\r\n');
      R.write(' Favorite computer games are M.U.L.E., Jumpman, Planetfall, Enchanter, Zork,' + '\r\n');
      R.write(' Spelunker, and Archon.  All are games of strategy, with action secondary.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Scott creates all Apogee Software programs on an AST Premium 80386 (20 Mhz)' + '\r\n');
      R.write(' equipped with VGA graphics, a NEC MultiSync II and an HP LaserJet series II.' + '\r\n');
      R.write(' The cost to market each Kroz game to the many shareware libraries and BBS\'s' + '\r\n');
      R.write(' is over $2000 per game.  All of the appreciative letters make it worth it!' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else {
      x = 100; $68 = 20;
      if (x >= $68) for (;;) {
        y = 10; $69 = 1;
        if (y >= $69) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $69) break;
          y--;
        }
        if (x <= $68) break;
        x--;
      }
      R.nosound();
      startgame = true;
    }
  } while (!(startgame));
  bak(0, 0);
  R.clrscr();
  bor(4);
}
function screen() {
  clearkeys();
  color = true;
  bak(0, 0);
  R.clrscr();
  bor(3);
  cur(3);
  col(9, 9);
  R.gotoxy(26, 2);
  R.write('THE LOST ADVENTURES OF KROZ');
  R.gotoxy(18, 10);
  col(15, 7);
  R.write('Is your screen Color or Monochrome (C/M)? C');
  R.gotoxy((R.wherex() - 1), R.wherey());
  cur(2);
  ch = R.readKbd();
  R.sound(500);
  R.delay(30);
  R.nosound();
  if ((R.upcase(ch) === 'M')) {
    R.textmode(2);
    color = false;
  } else {
    color = true;
  }
  bak(0, 0);
  R.gotoxy(18, 10);
  R.delline();
  R.gotoxy(9, 17);
  R.textcolor(7);
  R.write('If you have an older PC (like an XT model) choose "S" for Slow.');
  R.gotoxy(10, 19);
  R.write('If you have a PC AT, 80386 chip, etc., choose "F" for Fast.');
  R.gotoxy(32, 21);
  R.write('(Default = Slow)');
  col(15, 15);
  R.gotoxy(28, 14);
  R.write('Slow or Fast PC (S/F)? S');
  R.gotoxy((R.wherex() - 1), R.wherey());
  ch = R.readKbd();
  R.sound(300);
  R.delay(30);
  R.nosound();
  if ((R.upcase(ch) === 'F')) {
    fastpc = true;
  } else {
    fastpc = false;
  }
  R.clrscr();
}
function init_screen() {
  let $70, $71;
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  restart = false;
  score = (0) | 0;
  level = (1) << 16 >> 16;
  whips = (0) << 16 >> 16;
  teleports = (0) << 16 >> 16;
  keys = (0) << 16 >> 16;
  whippower = (2) << 16 >> 16;
  $70 = difficulty;
  if ($70 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($70 === 8) {
    gems = (20) << 16 >> 16;
  } else if ($70 === 5) {
    gems = (15) << 16 >> 16;
  } else if ($70 === 2) {
    gems = (10) << 16 >> 16;
  }
  floorpattern = false;
  replacement = (0) << 16 >> 16;
  bonus = (0) << 16 >> 16;
  lavaflow = false;
  lavarate = (0) << 16 >> 16;
  evaporate = (0) << 16 >> 16;
  magicewalls = false;
  gravon = false;
  gravrate = (20) << 16 >> 16;
  gravcounter = (0) << 16 >> 16;
  treerate = (-(1)) << 16 >> 16;
  hiderock = false;
  hidestairs = false;
  hidelevel = false;
  hidecreate = false;
  hideopenwall = false;
  hidetrap = false;
  hidegems = false;
  hidemblock = false;
  foundset = R.EMPTY;
  if ((difficulty === 2 || difficulty === 9)) {
    foundset = R.setOf(0, 255);
  }
  gennum = (0) << 16 >> 16;
  sideways = false;
  onemove = false;
  if (fastpc) {
    genfactor = (28) << 16 >> 16;
  } else {
    genfactor = (17) << 16 >> 16;
  }
  if (mixup) {
    gems = (60) << 16 >> 16;
    whips = (30) << 16 >> 16;
    teleports = (15) << 16 >> 16;
    keys = (2) << 16 >> 16;
    foundset = R.setOf(0, 83);
  }
  px = ((R.random(64) + 2)) << 16 >> 16;
  py = ((R.random(23) + 2)) << 16 >> 16;
  if (fastpc) {
    btime = (9) << 16 >> 16;
  } else {
    btime = (2) << 16 >> 16;
  }
  if (fastpc) {
    stime = (10) << 16 >> 16;
  } else {
    stime = (3) << 16 >> 16;
  }
  if (fastpc) {
    mtime = (8) << 16 >> 16;
  } else {
    mtime = (2) << 16 >> 16;
  }
  if (fastpc) {
    ftime = (6) << 16 >> 16;
  } else {
    ftime = (1) << 16 >> 16;
  }
  skiptime = (0) << 16 >> 16;
  x = 1; $71 = 9;
  if (x <= $71) for (;;) {
    t[(x) - 1] = -(1);
    if (x >= $71) break;
    x++;
  }
  t[(1) - 1] = 5;
  t[(2) - 1] = 6;
  t[(3) - 1] = 7;
  t[(8) - 1] = 6;
  if (color) {
    R.window(67, 1, 80, 25);
    bak(1, 0);
    R.clrscr();
    R.window(1, 1, 80, 25);
  }
  col(14, 7);
  print(71, 1, 'Score');
  print(71, 4, 'Level');
  print(71, 7, 'Gems');
  print(71, 10, 'Whips');
  print(69, 13, 'Teleports');
  print(71, 16, 'Keys');
  col(11, 7);
  bak(4, 0);
  print(70, 19, 'OPTIONS');
  bak(1, 0);
  R.gotoxy(70, 20);
  col(15, 15);
  R.write('W');
  col(7, 7);
  R.write('hip');
  R.gotoxy(70, 21);
  col(15, 15);
  R.write('T');
  col(7, 7);
  R.write('eleport');
  R.gotoxy(70, 22);
  col(15, 15);
  R.write('P');
  col(7, 7);
  R.write('ause');
  R.gotoxy(70, 23);
  col(15, 15);
  R.write('Q');
  col(7, 7);
  R.write('uit');
  R.gotoxy(70, 24);
  col(15, 15);
  R.write('S');
  col(7, 7);
  R.write('ave');
  R.gotoxy(70, 25);
  col(15, 15);
  R.write('R');
  col(7, 7);
  R.write('estore');
}
function parse_field() {
  let slot = 0;
  let counter$2 = 0;
  let test = 0;
  let fetch = '';
  let $72;
  slot = (1) << 16 >> 16;
  counter$2 = (1) << 16 >> 16;
  do {
    fetch = R.trunc(R.copy((df[(level) - 1] ?? ''), slot, 3), 4);
    if ((R.charAt(fetch, 1) === ' ')) {
      fetch = R.trunc((R.charAt(fetch, 2) + R.charAt(fetch, 3)), 4);
    }
    if ((R.charAt(fetch, 1) === ' ')) {
      fetch = R.trunc(R.charAt(fetch, 2), 4);
    }
    ($72 = R.val(fetch), parsed[(counter$2) - 1] = $72[0], test = ($72[1]) << 16 >> 16);
    slot = ((slot + 3)) << 16 >> 16;
    counter$2 = ((counter$2 + 1)) << 16 >> 16;
  } while (!((counter$2 > 83)));
}
function create_playfield() {
  let x$9 = 0;
  let y$3 = 0;
  let obj = 0;
  let loop$2 = 0;
  let xspot = 0;
  let yspot = 0;
  let $73, $74, $75, $76, $77, $78, $79;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$9 = 1; $73 = 999;
  if (x$9 <= $73) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    if (x$9 >= $73) break;
    x$9++;
  }
  x$9 = 1; $74 = 1300;
  if (x$9 <= $74) for (;;) {
    bx[(x$9) - 1] = 0;
    by[(x$9) - 1] = 0;
    if (x$9 >= $74) break;
    x$9++;
  }
  new_gem_color();
  x$9 = 2; $75 = 65;
  if (x$9 <= $75) for (;;) {
    y$3 = 2; $76 = 24;
    if (y$3 <= $76) for (;;) {
      pf[(x$9) * 25 + (y$3) - 26] = 0;
      if (y$3 >= $76) break;
      y$3++;
    }
    if (x$9 >= $75) break;
    x$9++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $77 = 83;
  if (obj <= $77) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $78 = parsed[(obj) - 1];
      if (loop$2 <= $78) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $79 = obj;
            if ($79 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($79 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($79 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            } else if ($79 === 36) {
              gennum = ((gennum + 1)) << 16 >> 16;
            } else if ($79 === 38) {
              bnum = ((bnum + 1)) << 16 >> 16;
              bx[(bnum) - 1] = xspot;
              by[(bnum) - 1] = yspot;
            } else if ($79 === 46) {
              t[(9) - 1] = 32000;
            }
          }
        } while (!(done));
        if (loop$2 >= $78) break;
        loop$2++;
      }
    }
    if (obj >= $77) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $80, $81, $82;
  xloop$2 = 2; $80 = 65;
  if (xloop$2 <= $80) for (;;) {
    yloop$2 = 2; $81 = 24;
    if (yloop$2 <= $81) for (;;) {
      if ((((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0) || floorpattern) && !(hidelevel))) {
        R.gotoxy(xloop$2, yloop$2);
        $82 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($82 === 0) {
          col(cf1, cf2);
          bak(bf1, bf2);
          R.write(tile);
          bak(0, 0);
        } else if ($82 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($82 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($82 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($82 === 4) {
          if ((level !== 71)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($82 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($82 === 6) {
          if (!(hidestairs)) {
            bak(7, 7);
            col(16, 16);
            R.write('\xf0');
            bak(0, 0);
          }
        } else if ($82 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($82 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($82 === 9) {
          if (!(hidegems)) {
            col(gemcolor, 7);
            R.write('\x04');
          }
        } else if ($82 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($82 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($82 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($82 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($82 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($82 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($82 === 16) {
          if (!(hidetrap)) {
            col(7, 7);
            R.write('\xf9');
          }
        } else if ($82 === 17) {
          if ((level === 56)) {
            col(12, 16);
            bak(4, 7);
            R.write('\xb2');
            bak(0, 0);
          } else {
            col(9, 0);
            bak(1, 7);
            R.write('\xf7');
            bak(0, 0);
          }
        } else if ($82 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x09');
          }
        } else if ($82 === 19) {
          col(2, 7);
          R.write('\xdb');
          bak(0, 0);
        } else if ($82 === 20 || $82 === 252) {
          col(6, 0);
          bak(2, 7);
          R.write('\x05');
          bak(0, 0);
        } else if ($82 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($82 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($82 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($82 === 24) {
          col(31, 31);
          bak(5, 0);
          R.write('\xfe');
          bak(0, 0);
        } else if ($82 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($82 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($82 === 27) {
          col(artcolor, 7);
          R.write('\x0f');
        } else if ($82 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($82 === 29) {

        } else if ($82 === 30) {

        } else if ($82 === 31) {

        } else if ($82 === 32) {

        } else if ($82 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($82 === 35) {
          if (!(hidecreate)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($82 === 36) {
          col(30, 31);
          R.write('\x06');
        } else if ($82 === 38) {
          if (!(hidemblock)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($82 === 33 || $82 === 37 || $82 === 39 || $82 === 67 || ($82 >= 224 && $82 <= 231)) {

        } else if ($82 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($82 === 41) {

        } else if ($82 === 42) {
          col(9, 7);
          R.write('\xfe');
        } else if ($82 === 43) {
          col(6, 7);
          R.write('\xb2');
        } else if ($82 === 44) {

        } else if ($82 === 45) {
          col(15, 7);
          R.write('?');
        } else if ($82 === 46) {
          col(31, 23);
          R.write('\x01');
        } else if ($82 === 48) {
          col(14, 15);
          R.write('K');
        } else if ($82 === 49) {
          col(14, 15);
          R.write('R');
        } else if ($82 === 50) {
          col(14, 15);
          R.write('O');
        } else if ($82 === 51) {
          col(14, 15);
          R.write('Z');
        } else if ($82 === 52 || $82 === 53) {
          col(6, 7);
          R.write('\xdb');
        } else if ($82 === 54) {
          col(7, 7);
          R.write('\xdb');
        } else if (($82 >= 55 && $82 <= 57)) {

        } else if (($82 >= 58 && $82 <= 60)) {
          if (!(hideopenwall)) {
            col(11, 7);
            R.write('\x7f');
          }
        } else if (($82 >= 61 && $82 <= 63)) {

        } else if (($82 >= 68 && $82 <= 74)) {

        } else if ($82 === 64) {
          col(7, 7);
          R.write('\xb2');
        } else if ($82 === 65) {
          if (!(hiderock)) {
            col(7, 7);
            R.write('O');
          }
        } else if ($82 === 66) {
          col(12, 0);
          bak(4, 7);
          R.write('X');
          bak(0, 0);
        } else if ($82 === 47) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {

          }
        } else if ($82 === 75) {
          col(7, 7);
          R.write('\xb3');
        } else if (($82 >= 76 && $82 <= 80)) {
          col(7, 7);
          R.write('\x19');
        } else if ($82 === 82) {
          col(7, 7);
          R.write('\x1a');
        } else if ($82 === 83) {
          col(7, 7);
          R.write('\x1b');
        } else if ($82 === 81) {
          col(31, 31);
          R.write('\x0c');
        } else if ($82 === 180) {
          col(15, 0);
          bak(6, 7);
          R.write('.');
          bak(0, 0);
        } else if ($82 === 181) {
          col(15, 0);
          bak(6, 7);
          R.write('?');
          bak(0, 0);
        } else if ($82 === 182) {
          col(15, 0);
          bak(6, 7);
          R.write('\'');
          bak(0, 0);
        } else if ($82 === 183) {
          col(15, 0);
          bak(6, 7);
          R.write(',');
          bak(0, 0);
        } else if ($82 === 184) {
          col(15, 0);
          bak(6, 7);
          R.write(':');
          bak(0, 0);
        } else if ($82 === 195) {
          col(15, 0);
          bak(6, 7);
          R.write('!');
          bak(0, 0);
        } else {
          col(15, 0);
          bak(6, 7);
          R.write(R.upcase(String.fromCharCode((pf[(xloop$2) * 25 + (yloop$2) - 26]) & 255)));
          bak(0, 0);
        }
      }
      if (yloop$2 >= $81) break;
      yloop$2++;
    }
    if (xloop$2 >= $80) break;
    xloop$2++;
  }
  floorpattern = false;
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $83;
    R.sound(540);
    R.delay(40);
    x = 1; $83 = 4;
    if (x <= $83) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x >= $83) break;
      x++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $84, $85;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($84 = key.charCodeAt(0), $84 === 72 || $84 === 80 || $84 === 77 || $84 === 75 || $84 === 71 || $84 === 79 || $84 === 73 || $84 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $85 = key.charCodeAt(0);
      if ($85 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($85 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($85 === 43) {
        foundset = R.EMPTY;
        flash(13, 25, 'Newly found object desciptions are reset.');
      } else if ($85 === 45) {
        foundset = R.setOf(0, 255);
        flash(10, 25, 'References to new objects will not be displayed.');
      } else if ($85 === 119 || $85 === 87) {
        $result = (87) & 255;
      } else if ($85 === 116 || $85 === 84) {
        $result = (84) & 255;
      } else if ($85 === 112 || $85 === 80) {
        $result = (80) & 255;
      } else if ($85 === 113 || $85 === 81) {
        $result = (81) & 255;
      } else if ($85 === 115 || $85 === 83) {
        $result = (83) & 255;
      } else if ($85 === 114 || $85 === 82) {
        $result = (82) & 255;
      } else if ($85 === 117 || $85 === 85) {
        $result = (171) & 255;
      } else if ($85 === 105 || $85 === 73) {
        $result = (172) & 255;
      } else if ($85 === 111 || $85 === 79) {
        $result = (173) & 255;
      } else if ($85 === 106 || $85 === 74) {
        $result = (175) & 255;
      } else if ($85 === 107 || $85 === 75) {
        $result = (177) & 255;
      } else if ($85 === 110 || $85 === 78) {
        $result = (179) & 255;
      } else if ($85 === 109 || $85 === 77) {
        $result = (180) & 255;
      } else if ($85 === 44) {
        $result = (181) & 255;
      } else {
        badkeysound();
        $result = (0) & 255;
      }
    }
  } else {
    $result = (0) & 255;
  }
  return $result;
}
function hit(x$10, y$4, ch$3) {
  let i$3 = 0;
  let thing = '\x00';
  let $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96;
  thing = String.fromCharCode(pf[(x$10) * 25 + (y$4) - 26]);
  bak(0, 0);
  i$3 = 1; $86 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $86) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$10, y$4);
    R.write(ch$3);
    if (i$3 >= $86) break;
    i$3++;
  }
  R.gotoxy(x$10, y$4);
  $87 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($87 >= 1 && $87 <= 3)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($87 === 4 || $87 === 19 || $87 === 20 || $87 === 252) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $88 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($88 === 4) {
      thing = '\xb2';
    } else if ($88 === 19) {
      thing = '\xdb';
    } else if ($88 === 20 || $88 === 252) {
      thing = '\x05';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $89 = 20;
      if (i$3 >= $89) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $89) break;
        i$3--;
      }
      R.sound(90);
    } else {
      R.sound(130);
      R.delay(25);
      R.sound(90);
      col(6, 7);
      if ((thing === '\x05')) {
        col(6, 0);
        bak(2, 7);
      } else if ((thing === '\xdb')) {
        col(2, 7);
      }
      R.write(thing);
      if ((thing === '\x05')) {
        bak(0, 0);
      }
    }
  } else if ($87 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($87 === 10 || $87 === 15 || $87 === 16 || $87 === 18 || $87 === 36 || ($87 >= 48 && $87 <= 51)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $90 = 20;
      if (i$3 >= $90) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $90) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($87 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($87 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($87 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($87 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($87 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($87 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($87 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($87 === 14 || $87 === 52 || $87 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($87 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($87 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($87 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($87 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($87 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($87 === 24) {
    col(31, 31);
    bak(5, 0);
    R.write('\xfe');
    bak(0, 0);
  } else if ($87 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($87 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($87 === 27) {
    col(artcolor, 7);
    R.write('\x0f');
  } else if (($87 >= 28 && $87 <= 31) || $87 === 33 || $87 === 37 || $87 === 39 || $87 === 41 || $87 === 44 || $87 === 67 || ($87 >= 224 && $87 <= 231)) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($87 === 32) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
  } else if ($87 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($87 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($87 === 42) {
    col(9, 7);
    R.write('\xfe');
  } else if ($87 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($87 >= 58 && $87 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($87 === 66) {
    col(12, 0);
    bak(4, 7);
    R.write('X');
    bak(0, 0);
  } else if ($87 === 47 || ($87 >= 55 && $87 <= 57) || ($87 >= 61 && $87 <= 63) || ($87 >= 68 && $87 <= 74)) {
    R.write(' ');
  } else if (($87 >= 76 && $87 <= 80)) {
    col(7, 7);
    R.write('\x19');
  } else if ($87 === 75) {
    col(7, 7);
    R.write('\xb3');
  } else if ($87 === 81) {
    col(31, 31);
    R.write('\x0c');
  } else if ($87 === 82) {
    col(7, 7);
    R.write('\x1a');
  } else if ($87 === 83) {
    col(7, 7);
    R.write('\x1b');
  } else if ($87 === 46) {
    i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $91 = 20;
    if (i$3 >= $91) for (;;) {
      R.sound(R.random(i$3));
      if (i$3 <= $91) break;
      i$3--;
    }
    R.sound(90);
    if ((R.random(50) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = 1; $92 = 32000;
      if (i$3 <= $92) for (;;) {
        R.sound(R.random(5000));
        if (i$3 >= $92) break;
        i$3++;
      }
      i$3 = 18900; $93 = 20;
      if (i$3 >= $93) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $93) break;
        i$3--;
      }
      R.nosound();
      score = ((score + 10)) | 0;
      t[(9) - 1] = -(1);
      update_info();
      clearkeys();
      flash(7, 25, 'You\'ve destroyed the Statue!  Your Gems are now safe.');
      R.sound(90);
    } else {
      col(31, 23);
      R.write('\x01');
    }
  } else if ($87 === 65) {
    if ((R.random(30) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 8700) + (+(!(fastpc)) * 5300)); $94 = 20;
      if (i$3 >= $94) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $94) break;
        i$3--;
      }
      R.sound(90);
      score = ((score + 100)) | 0;
      update_info();
    } else {
      i$3 = ((+(fastpc) * 4700) + (+(!(fastpc)) * 2300)); $95 = 20;
      if (i$3 >= $95) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $95) break;
        i$3--;
      }
      R.sound(90);
      col(7, 7);
      R.write('O');
    }
  } else if ($87 === 38 || $87 === 43 || $87 === 64) {
    if ((R.random(7) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $96 = 20;
      if (i$3 >= $96) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $96) break;
        i$3--;
      }
      R.sound(90);
      addscore(38);
    } else {
      R.sound(130);
      R.delay(25);
      R.sound(90);
      if (((thing.charCodeAt(0)) << 16 >> 16 === 64)) {
        col(7, 7);
      } else {
        col(6, 7);
      }
      R.write('\xb2');
    }
  } else if ($87 === 0) {
    R.write(' ');
  } else {
    col(15, 0);
    bak(6, 7);
    R.write(R.upcase(String.fromCharCode((pf[(x$10) * 25 + (y$4) - 26]) & 255)));
    bak(0, 0);
  }
}
function secret_message() {
  let $97;
  x = 20; $97 = 8000;
  if (x <= $97) for (;;) {
    R.sound(x);
    if (x >= $97) break;
    x++;
  }
  R.nosound();
  clearkeys();
  flash(4, 25, 'You notice a secret message carved into the old tree...');
  flash(14, 25, '"Goodness of Heart Overcomes Adversity."');
  flash(7, 25, 'Reveal that you found this message to Scott Miller...');
  flash(3, 25, 'And receive a "MASTER KROZ CERTIFICATE" to hang on your wall!!');
  flash(12, 25, 'Only the first 100 players to report this...');
  flash(9, 25, 'Will be awarded the certificate.  Congratulations!');
}
function shoot_right(xway$4, yway$4, human$3) {
  let $98, $99, $100, $101, $102;
  go({ get v() { return xway$4; }, set v($v) { xway$4 = $v; } }, { get v() { return yway$4; }, set v($v) { yway$4 = $v; } }, human$3);
  x = (px) << 16 >> 16;
  R.sound((x + 30));
  x = (x + 1) << 16 >> 16;
  while (((x < 66) && !(($98 = pf[(x) * 25 + (py) - 26], $98 === 4 || $98 === 6 || $98 === 13 || $98 === 14 || $98 === 22 || $98 === 25 || $98 === 31 || $98 === 36 || $98 === 38 || $98 === 42 || $98 === 43 || $98 === 46 || ($98 >= 52 && $98 <= 54) || ($98 >= 64 && $98 <= 66) || $98 === 81)))) {
    b = 1; $99 = 60;
    if (b <= $99) for (;;) {
      R.gotoxy(x, py);
      col(R.random((15 + 1)), 15);
      R.write('\xc4');
      if (b >= $99) break;
      b++;
    }
    R.gotoxy(x, py);
    col(15, 15);
    R.write('\xc4');
    if (!(($100 = pf[(x) * 25 + (py) - 26], $100 === 0 || $100 === 17 || $100 === 23 || ($100 >= 28 && $100 <= 30) || $100 === 32 || $100 === 33 || $100 === 37 || $100 === 39 || $100 === 41 || $100 === 44 || $100 === 47 || ($100 >= 55 && $100 <= 57) || ($100 >= 61 && $100 <= 63) || ($100 >= 67 && $100 <= 75)))) {
      R.sound(300);
      R.delay(10);
      if (($101 = pf[(x) * 25 + (py) - 26], ($101 >= 1 && $101 <= 3))) {
        pf[(x) * 25 + (py) - 26] = 32;
      } else {
        pf[(x) * 25 + (py) - 26] = 0;
      }
    }
    R.sound((x + 30));
    R.gotoxy(x, py);
    col(7, 7);
    $102 = pf[(x) * 25 + (py) - 26];
    if ($102 === 17) {
      col(9, 0);
      bak(1, 7);
      R.write('\xf7');
      bak(0, 0);
    } else if ($102 === 23) {
      R.write('\xb0');
    } else if ($102 === 75) {
      R.write('\xb3');
    } else {
      R.write(' ');
    }
    x = (x + 1) << 16 >> 16;
  }
  R.nosound();
  if (!(R.inSet(foundset, 82))) {
    foundset = R.union(foundset, R.setOf(82, 82));
    flash(20, 25, 'You triggered a Magic Spear!');
  } else {
    clearkeys();
  }
}
function shoot_left(xway$5, yway$5, human$4) {
  let $103, $104, $105, $106, $107;
  go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  x = (px) << 16 >> 16;
  R.sound((x + 30));
  x = (x - 1) << 16 >> 16;
  while (((x > 1) && !(($103 = pf[(x) * 25 + (py) - 26], $103 === 4 || $103 === 6 || $103 === 13 || $103 === 14 || $103 === 22 || $103 === 25 || $103 === 31 || $103 === 36 || $103 === 38 || $103 === 42 || $103 === 43 || $103 === 46 || ($103 >= 52 && $103 <= 54) || ($103 >= 64 && $103 <= 66) || $103 === 81)))) {
    b = 1; $104 = 60;
    if (b <= $104) for (;;) {
      R.gotoxy(x, py);
      col(R.random((15 + 1)), 15);
      R.write('\xc4');
      if (b >= $104) break;
      b++;
    }
    R.gotoxy(x, py);
    col(15, 15);
    R.write('\xc4');
    if (!(($105 = pf[(x) * 25 + (py) - 26], $105 === 0 || $105 === 17 || $105 === 23 || ($105 >= 28 && $105 <= 30) || $105 === 32 || $105 === 33 || $105 === 37 || $105 === 39 || $105 === 41 || $105 === 44 || $105 === 47 || ($105 >= 55 && $105 <= 57) || ($105 >= 61 && $105 <= 63) || ($105 >= 67 && $105 <= 75)))) {
      R.sound(300);
      R.delay(10);
      if (($106 = pf[(x) * 25 + (py) - 26], ($106 >= 1 && $106 <= 3))) {
        pf[(x) * 25 + (py) - 26] = 32;
      } else {
        pf[(x) * 25 + (py) - 26] = 0;
      }
    }
    R.sound((x + 30));
    R.gotoxy(x, py);
    col(7, 7);
    $107 = pf[(x) * 25 + (py) - 26];
    if ($107 === 17) {
      col(9, 0);
      bak(1, 7);
      R.write('\xf7');
      bak(0, 0);
    } else if ($107 === 23) {
      R.write('\xb0');
    } else if ($107 === 75) {
      R.write('\xb3');
    } else {
      R.write(' ');
    }
    x = (x - 1) << 16 >> 16;
  }
  R.nosound();
  if (!(R.inSet(foundset, 83))) {
    foundset = R.union(foundset, R.setOf(83, 83));
    flash(20, 25, 'You triggered a Magic Spear!');
  } else {
    clearkeys();
  }
}
function tome_message() {
  flash(9, 25, 'You reach out to grab the Tome--an ancient book...');
  flash(8, 25, 'that you hope will reveal the many secrets of Kroz.');
  flash(5, 25, 'Suddenly, you feel a surge of electricity as you grasp...');
  flash(8, 25, 'the Tome.  Your skin crawls and your vision blurrs!');
  flash(17, 25, 'You decide to put the Tome back...');
  flash(11, 25, 'You slowly raise it over it\'s pedestal and...');
  flash(7, 25, 'tenderly place it on the sacred resting place, then...');
  flash(5, 25, 'saddened, you slowly turn to walk away.......forever......');
  flash(30, 25, ' BUT... ');
  flash(6, 25, 'then you remember why you came here in the first place!');
  flash(7, 25, 'So you grab the book and stick it in you duffel bag...');
}
function tome_effects() {
  let $108, $109, $110;
  bak(0, 0);
  b = 7; $108 = 0;
  if (b >= $108) for (;;) {
    x = 2; $109 = 65;
    if (x <= $109) for (;;) {
      y = 2; $110 = 24;
      if (y <= $110) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 0)) {
          R.sound(((x * y) * (b + 1)));
          R.gotoxy(x, y);
          col((b * 2), ((+(((b & 1) !== 0)) * 7) + (+(!(((b & 1) !== 0))) * 0)));
          R.write('\xdb');
        }
        if (y >= $110) break;
        y++;
      }
      if (x >= $109) break;
      x++;
    }
    if (b <= $108) break;
    b--;
  }
  R.nosound();
}
function prayer() {
  flash(8, 25, 'On the Ancient Tablet is a short Mantra, a prayer...');
  flash(8, 25, 'You take a deep breath and speak the words aloud...');
}
function tablet_message(level$2) {
  let $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130;
  $111 = level$2;
  if ($111 === 1) {
    flash(5, 25, 'Once again you uncover the hidden tunnel leading to Kroz!');
  } else if ($111 === 2) {
    flash(7, 25, 'Warning to all Adventurers:  No one returns from Kroz!');
  } else if ($111 === 4) {
    flash(8, 25, 'Adventurer, try the top right corner if you desire.');
  } else if ($111 === 6) {
    flash(6, 25, 'A strange magical gravity force is tugging you downward!');
  } else if ($111 === 8) {
    flash(10, 25, 'Play this level as if viewing it from the side.');
  } else if ($111 === 9) {
    flash(10, 25, 'Explorer, you fell into a trap with no way out!');
  } else if ($111 === 10) {
    flash(3, 25, 'A magical forest grows out of control in this region of Kroz!');
  } else if ($111 === 11) {
    flash(14, 25, 'The tunnel below contains a magic spell.');
  } else if ($111 === 18) {
    flash(14, 25, 'Adventurer, check the "Valley of the M"!');
  } else if ($111 === 22) {
    flash(16, 25, 'These walls will seek to entrap you!');
  } else if ($111 === 24) {
    flash(12, 25, 'You have choosen the greedy path Adventurer!');
  } else if ($111 === 26) {
    flash(13, 25, 'No one has ever made it to the 26th level!');
    flash(7, 25, 'You have shown exceptional skills to reach this far...');
    flash(13, 25, 'Therefore I grant you the power to see...');
    bak(0, 0);
    x = 2; $112 = 65;
    if (x <= $112) for (;;) {
      y = 2; $113 = 24;
      if (y <= $113) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 30)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 54;
          R.gotoxy(x, y);
          col(7, 7);
          R.write('\xdb');
        }
        if (y >= $113) break;
        y++;
      }
      if (x >= $112) break;
      x++;
    }
    R.nosound();
    flash(20, 25, 'Behold...your path awaits...');
  } else if ($111 === 30) {
    prayer();
    flash(6, 25, '"If goodness is in my heart, that which flows shall..."');
    bak(0, 0);
    x = 2; $114 = 65;
    if (x <= $114) for (;;) {
      y = 2; $115 = 24;
      if (y <= $115) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 17)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 27;
          R.gotoxy(x, y);
          artcolor = (14) << 16 >> 16;
          col(artcolor, 7);
          R.write('\x0f');
          R.delay(1);
        }
        if (y >= $115) break;
        y++;
      }
      if (x >= $114) break;
      x++;
    }
    R.nosound();
    flash(25, 25, '"...Turn to Gold!"');
  } else if ($111 === 32) {
    flash(14, 25, 'Adventurer, your path will be cleared...');
    pf[(px) * 25 + (py) - 26] = 44;
    move(0, 0, false);
  } else if ($111 === 37) {
    prayer();
    flash(4, 25, '"Useless bits of rock, rubble and boulders, shall become..."');
    bak(0, 0);
    x = 2; $116 = 65;
    if (x <= $116) for (;;) {
      y = 2; $117 = 24;
      if (y <= $117) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 65)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 9;
          R.gotoxy(x, y);
          col(gemcolor, 7);
          R.write('\x04');
          R.delay(4);
        }
        if (y >= $117) break;
        y++;
      }
      if (x >= $116) break;
      x++;
    }
    R.nosound();
    flash(20, 25, '"...Precious Gems of value!"');
  } else if ($111 === 40) {
    flash(5, 25, 'You\'ll need two keys from level 38 to complete this level!');
  } else if ($111 === 42) {
    prayer();
    flash(4, 25, '"Barriers of water, like barriers in life, can always be..."');
    bak(0, 0);
    x = 2; $118 = 65;
    if (x <= $118) for (;;) {
      y = 2; $119 = 24;
      if (y <= $119) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 17)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 43;
          R.gotoxy(x, y);
          col(6, 7);
          R.write('\xb2');
          R.delay(4);
        }
        if (y >= $119) break;
        y++;
      }
      if (x >= $118) break;
      x++;
    }
    R.nosound();
    flash(26, 25, '"...Overcome!"');
  } else if ($111 === 46) {
    flash(9, 25, 'Follow the sequence if you wish to be successful.');
  } else if ($111 === 48) {
    prayer();
    flash(9, 25, '"A gift can be granted to those who are worthy..."');
    bak(0, 0);
    x = 2; $120 = 65;
    if (x <= $120) for (;;) {
      y = 2; $121 = 24;
      if (y <= $121) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 55)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 9;
          R.gotoxy(x, y);
          col(gemcolor, 7);
          R.write('\x04');
          R.delay(4);
        }
        if (y >= $121) break;
        y++;
      }
      if (x >= $120) break;
      x++;
    }
    R.nosound();
    flash(13, 25, '"...And you are found worthy, Adventurer!"');
  } else if ($111 === 52) {
    flash(18, 25, 'Up 4 steps, then left 16 steps.');
  } else if ($111 === 54) {
    flash(24, 25, 'K stands from Kroz!');
  } else if ($111 === 56) {
    bak(0, 0);
    x = 2; $122 = 65;
    if (x <= $122) for (;;) {
      y = 2; $123 = 24;
      if (y <= $123) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 17)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 32;
          R.gotoxy(x, y);
          col(7, 7);
          R.write(' ');
          R.delay(4);
        }
        if (y >= $123) break;
        y++;
      }
      if (x >= $122) break;
      x++;
    }
    R.nosound();
    flash(17, 25, 'The Lava parts to give you access!');
  } else if ($111 === 61) {
    flash(9, 25, 'Walls that block your progress shall be removed...');
    pf[(px) * 25 + (py) - 26] = 58;
    move(0, 0, false);
  } else if ($111 === 64) {
    prayer();
    flash(10, 25, '"Tnarg yna rerutnevda ohw sevivrus siht raf..."');
    bak(0, 0);
    x = 2; $124 = 65;
    if (x <= $124) for (;;) {
      y = 2; $125 = 24;
      if (y <= $125) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 55)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 27;
          R.gotoxy(x, y);
          artcolor = (14) << 16 >> 16;
          col(artcolor, 7);
          R.write('\x0f');
          R.delay(6);
        }
        if (y >= $125) break;
        y++;
      }
      if (x >= $124) break;
      x++;
    }
    R.nosound();
    flash(29, 25, '"...Dlog!"');
  } else if ($111 === 66) {
    flash(5, 25, '"Figurit\'s Revenge" appeared in the popular game Jumpman!');
  } else if ($111 === 68) {
    flash(11, 25, 'Suddendly, the lava begins to bubble and flow!');
    lavaflow = true;
    lavarate = (75) << 16 >> 16;
  } else if ($111 === 71) {
    prayer();
    flash(19, 25, '"Those not blinded by hate..."');
    bak(0, 0);
    x = 2; $126 = 65;
    if (x <= $126) for (;;) {
      y = 2; $127 = 24;
      if (y <= $127) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 4)) {
          R.sound((x * y));
          R.gotoxy(x, y);
          col(6, 7);
          R.write('\xb2');
        }
        if (y >= $127) break;
        y++;
      }
      if (x >= $126) break;
      x++;
    }
    R.nosound();
    flash(20, 25, '"...will be allowed to see!"');
  } else if ($111 === 72) {
    flash(6, 25, 'You feel the entire chamber shiver for a brief moment...');
    flash(9, 25, 'then a message magically appears on the tablet...');
    flash(3, 25, '"Find the Sacred Tome of Kroz, use it\'s wisdom to free us..."');
    b = 1; $128 = 25000;
    if (b <= $128) for (;;) {
      R.sound((R.random(5000) + 3000));
      if (b >= $128) break;
      b++;
    }
    R.nosound();
    flash(12, 25, 'The the tablet disentagrates in your hands!');
    flash(9, 25, 'You wonder for a moment what the message meant...');
    flash(6, 25, 'And resume you journey no more enlightened than before.');
  } else if ($111 === 74) {
    evaporate = (30) << 16 >> 16;
    flash(4, 25, 'Suddenly an intense heat sweeps over this entire chamber...');
    flash(5, 25, 'You begin to sweat profusely and drink some of your water!');
  } else if ($111 === 75) {
    prayer();
    flash(18, 25, '"Ttocs Rellim Setalutargnoc Uoy!"');
    flash(5, 25, 'Your palms sweat as the words echo through the chamber...');
    bak(0, 0);
    x = 2; $129 = 65;
    if (x <= $129) for (;;) {
      y = 2; $130 = 24;
      if (y <= $130) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 23)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 65;
          R.gotoxy(x, y);
          col(7, 7);
          R.write('O');
          R.delay(7);
        }
        if (y >= $130) break;
        y++;
      }
      if (x >= $129) break;
      x++;
    }
    R.nosound();
    flash(16, 25, '...Your eyes widen with anticipation!');
  }
}
function next_level() {
  let $131;
  $131 = level;
  if ($131 === 1) {
    level1();
  } else if ($131 === 2) {
    level2();
  } else if ($131 === 4) {
    level4();
  } else if ($131 === 6) {
    level6();
  } else if ($131 === 8) {
    level8();
  } else if ($131 === 9) {
    level9();
  } else if ($131 === 11) {
    level11();
  } else if ($131 === 13) {
    level13();
  } else if ($131 === 14) {
    level14();
  } else if ($131 === 15) {
    level15();
  } else if ($131 === 18) {
    level18();
  } else if ($131 === 20) {
    level20();
  } else if ($131 === 22) {
    level22();
  } else if ($131 === 24) {
    level24();
  } else if ($131 === 26) {
    level26();
  } else if ($131 === 28) {
    level28();
  } else if ($131 === 30) {
    level30();
  } else if ($131 === 32) {
    level32();
  } else if ($131 === 33) {
    level33();
  } else if ($131 === 34) {
    level34();
  } else if ($131 === 35) {
    level35();
  } else if ($131 === 37) {
    level37();
  } else if ($131 === 40) {
    level40();
  } else if ($131 === 42) {
    level42();
  } else if ($131 === 44) {
    level44();
  } else if ($131 === 46) {
    level46();
  } else if ($131 === 48) {
    level48();
  } else if ($131 === 52) {
    level52();
  } else if ($131 === 53) {
    level53();
  } else if ($131 === 54) {
    level54();
  } else if ($131 === 55) {
    level55();
  } else if ($131 === 56) {
    level56();
  } else if ($131 === 59) {
    level59();
  } else if ($131 === 61) {
    level61();
  } else if ($131 === 64) {
    level64();
  } else if ($131 === 66) {
    level66();
  } else if ($131 === 68) {
    level68();
  } else if ($131 === 70) {
    level70();
  } else if ($131 === 72) {
    level72();
  } else if ($131 === 74) {
    level74();
  } else if ($131 === 75) {
    level75();
  } else {
    create_playfield();
  }
}
function move(xway$6, yway$6, human$5) {
  let killed = 0;
  let rxway = 0;
  let ryway = 0;
  let trycounter = 0;
  let spot = 0;
  let original = 0;
  let nogo = false;
  let $132, $133, $134, $135, $136, $137, $138, $139, $140, $141, $142, $143, $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155, $156, $157, $158, $159, $160, $161, $162, $163, $164, $165, $166, $167, $168, $169, $170, $171, $172, $173, $174, $175, $176, $177, $178, $179, $180, $181, $182, $183, $184, $185, $186, $187, $188, $189, $190, $191, $192, $193, $194, $195, $196, $197, $198, $199, $200, $201, $202, $203, $204, $205, $206, $207, $208, $209, $210, $211, $212, $213, $214, $215, $216, $217, $218, $219, $220, $221, $222, $223, $224, $225, $226, $227, $228, $229, $230, $231, $232, $233, $234, $235;
  L2_jump_end: {
  if ((((sideways && (yway$6 === -(1))) && (replacement !== 75)) && !(($132 = pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26], ($132 >= 75 && $132 <= 80))))) {
    break L2_jump_end;
  }
  if ((((((px + xway$6) < 2) || ((px + xway$6) > 65)) || ((py + yway$6) < 2)) || ((py + yway$6) > 24))) {
    if (human$5) {
      static_();
      addscore(20);
      clearkeys();
      if (!(R.inSet(foundset, 0))) {
        foundset = R.union(foundset, R.setOf(0, 0));
        flash(16, 25, 'An Electrified Wall blocks your way.');
      }
    }
    return;
  }
  $133 = pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26];
  if ($133 === 0) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
  } else if (($133 >= 1 && $133 <= 3)) {
    gems = ((gems - pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26])) << 16 >> 16;
    if ((gems < 0)) {
      dead(true);
    }
    addscore(pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]);
    R.sound((200 + (200 * pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26])));
    R.delay(25);
    R.nosound();
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    if (R.keypressed()) {
      ch = R.readKbd();
      if ((ch === '\x1b')) {
        ch = R.readKbd();
      }
    }
  } else if ($133 === 4 || $133 === 43 || $133 === 64) {
    if (human$5) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 4))) {
        foundset = R.union(foundset, R.setOf(4, 4));
        flash(17, 25, 'A Breakable Wall blocks your way.');
      }
    }
  } else if ($133 === 5) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($133 === 6) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    clearkeys();
    if ((level === 75)) {
      end_routine();
    }
    if (mixup) {
      level = ((R.random(73) + 2)) << 16 >> 16;
    } else {
      level = ((level + 1)) << 16 >> 16;
    }
    addscore(6);
    if (!(R.inSet(foundset, 6))) {
      foundset = R.union(foundset, R.setOf(6, 6));
      flash(14, 25, 'Stairs take you to the next lower level.');
      clearkeys();
    }
    footstep();
    t[(1) - 1] = 5;
    t[(2) - 1] = 6;
    t[(3) - 1] = 7;
    t[(8) - 1] = 7;
    t[(4) - 1] = 0;
    t[(5) - 1] = 0;
    t[(6) - 1] = 0;
    foundset = R.diff(foundset, R.setOf(0, 0, 8, 8, 15, 15, 17, 17, 19, 21, 22, 22, 26, 26, 28, 28, 36, 36, 66, 66));
    gennum = (0) << 16 >> 16;
    treerate = (-(1)) << 16 >> 16;
    lavaflow = false;
    evaporate = (0) << 16 >> 16;
    magicewalls = false;
    hidelevel = false;
    hideopenwall = false;
    hiderock = false;
    hidestairs = false;
    hidegems = false;
    hidemblock = false;
    hidetrap = false;
    hidecreate = false;
    gravon = false;
    gravrate = (0) << 16 >> 16;
    gravcounter = (0) << 16 >> 16;
    bonus = (0) << 16 >> 16;
    sideways = false;
    replacement = (0) << 16 >> 16;
    next_level();
    if ((level === 10)) {
      treerate = (40) << 16 >> 16;
    }
    if ((level === 31)) {
      treerate = (15) << 16 >> 16;
    }
    if ((level === 45)) {
      lavaflow = true;
      lavarate = (30) << 16 >> 16;
    }
    if ((level === 56)) {
      foundset = R.union(foundset, R.setOf(44, 44));
    }
    if ((level === 62)) {
      hidemblock = true;
    }
    footstep();
    bak(gemcolor, 7);
    x = 1; $134 = 30;
    if (x <= $134) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      if (x >= $134) break;
      x++;
    }
    bak(0, 0);
    x = 1; $135 = 30;
    if (x <= $135) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      R.sound((x * 45));
      if (x >= $135) break;
      x++;
    }
    R.nosound();
    R.window(1, 1, 80, 25);
    cur(3);
    R.window(2, 2, 65, 24);
    R.clrscr();
    R.window(1, 1, 80, 25);
    cur(3);
    border();
    footstep();
    display_playfield();
    footstep();
    x = 1; $136 = 600;
    if (x <= $136) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x / 2));
      if (x >= $136) break;
      x++;
    }
    R.gotoxy(px, py);
    col(14, 15);
    bak(0, 0);
    R.write('\x02');
    R.nosound();
    i_score = (score) | 0;
    i_gems = (gems) | 0;
    i_whips = (whips) | 0;
    i_teleports = (teleports) | 0;
    i_keys = (keys) | 0;
    i_whippower = (whippower) | 0;
    i_difficulty = (difficulty) | 0;
    i_px = (px) | 0;
    i_py = (py) | 0;
    i_foundset = foundset;
    if ((level === 75)) {
      flash(9, 25, 'You\'ve finally reached the deepest chamber of Kroz!');
    } else if (sideways) {
      flash(13, 25, 'Press any key to begin this SIDEWAYS level.');
    } else {
      flash(17, 25, 'Press any key to begin this level.');
    }
  } else if ($133 === 7) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    xb = 3; $137 = 42;
    if (xb <= $137) for (;;) {
      yb = 3; $138 = 42;
      if (yb <= $138) for (;;) {
        R.sound((xb * yb));
        R.delay(1);
        if (yb >= $138) break;
        yb++;
      }
      if (xb >= $137) break;
      xb++;
    }
    R.nosound();
    x = ((R.random(3) + 2)) << 16 >> 16;
    i = ((R.random(difficulty) + 2)) << 16 >> 16;
    whips = ((whips + x)) << 16 >> 16;
    gems = ((gems + i)) << 16 >> 16;
    addscore(7);
    bak(0, 0);
    clearkeys();
    do {
      col((R.random(2) + 14), 15);
      R.gotoxy(11, 25);
      R.write('You found ' + String(i) + ' gems and ' + String(x) + ' whips inside the chest!');
    } while (!(R.keypressed()));
    restore_border();
  } else if ($133 === 8) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(5);
    x = 7; $139 = 1;
    if (x >= $139) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x <= $139) break;
      x--;
    }
    R.nosound();
    if (fastpc) {
      t[(4) - 1] = 100;
    } else {
      t[(4) - 1] = 70;
    }
    t[(6) - 1] = 0;
    if (!(R.inSet(foundset, 8))) {
      foundset = R.union(foundset, R.setOf(8, 8));
      flash(18, 25, 'You activated a Slow Creature spell.');
    }
  } else if ($133 === 9) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($133 === 10) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(10);
    x = 1; $140 = 4;
    if (x <= $140) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x >= $140) break;
      x++;
    }
    R.nosound();
    R.gotoxy(px, py);
    R.write(' ');
    if (fastpc) {
      t[(5) - 1] = 120;
    } else {
      t[(5) - 1] = 35;
    }
    if (!(R.inSet(foundset, 10))) {
      foundset = R.union(foundset, R.setOf(10, 10));
      flash(16, 25, 'Oh no, a temporary Blindness Potion!');
    }
  } else if ($133 === 11) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($133 === 12) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($133 === 13) {
    if (human$5) {
      if ((keys < 1)) {
        x = 1; $141 = 15;
        if (x <= $141) for (;;) {
          R.sound((R.random(99) + 30));
          R.delay(15);
          R.nosound();
          R.delay(15);
          if (x >= $141) break;
          x++;
        }
        flash(18, 25, 'To pass the Door you need a Key.');
      } else {
        keys = ((keys - 1)) << 16 >> 16;
        addscore(11);
        x = 10; $142 = 90;
        if (x <= $142) for (;;) {
          R.sound(x);
          R.delay(15);
          if (x >= $142) break;
          x++;
        }
        go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
        clearkeys();
        if (!(R.inSet(foundset, 13))) {
          foundset = R.union(foundset, R.setOf(13, 13));
          flash(12, 25, 'The Door opens!  (One of your Keys is used.)');
        } else {
          clearkeys();
        }
        if ((((level === 75) && (px === 33)) && (py === 14))) {
          flash(13, 25, 'You unlock the door to the Sacred Temple!');
        }
      }
    }
  } else if ($133 === 14 || $133 === 17) {
    if (human$5) {
      if ((pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26] === 14)) {
        blocksound();
      } else {
        x = 1; $143 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
        if (x <= $143) for (;;) {
          R.sound((R.random(((x * 2) + 200)) + x));
          if (x >= $143) break;
          x++;
        }
        R.nosound();
      }
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26], pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]));
        $144 = pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26];
        if ($144 === 14) {
          flash(20, 25, 'A Solid Wall blocks your way.');
        } else if ($144 === 17) {
          flash(18, 25, 'You cannot travel through Water.');
        }
      }
    }
  } else if ($133 === 15) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(15);
    x = 1; $145 = 7;
    if (x <= $145) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x >= $145) break;
      x++;
    }
    R.nosound();
    if (fastpc) {
      t[(6) - 1] = 80;
    } else {
      t[(6) - 1] = 50;
    }
    t[(4) - 1] = 0;
    if (!(R.inSet(foundset, 15))) {
      foundset = R.union(foundset, R.setOf(15, 15));
      flash(18, 25, 'You activated a Speed Creature spell.');
    }
  } else if ($133 === 16) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(16);
    x = 1; $146 = 500;
    if (x <= $146) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $146) break;
      x++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $147 = 1;
    if (yb >= $147) for (;;) {
      x = 550; $148 = 20;
      if (x >= $148) for (;;) {
        R.sound((yb * x));
        if (x <= $148) break;
        x--;
      }
      if (yb <= $147) break;
      yb--;
    }
    R.nosound();
    pf[(px) * 25 + (py) - 26] = 0;
    px = (0) << 16 >> 16;
    do {
      x = ((R.random(64) + 2)) << 16 >> 16;
      y = ((R.random(23) + 2)) << 16 >> 16;
      if ((pf[(x) * 25 + (y) - 26] === 0)) {
        px = (x) << 16 >> 16;
        py = (y) << 16 >> 16;
        pf[(px) * 25 + (py) - 26] = 40;
      }
    } while (!((px !== 0)));
    x = 1; $149 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $149) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $149) break;
      x++;
    }
    if ((t[(5) - 1] < 1)) {
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
      bak(0, 0);
    } else {
      R.gotoxy(px, py);
      bak(0, 0);
      R.write(' ');
    }
    clearkeys();
    if (!(R.inSet(foundset, 16))) {
      foundset = R.union(foundset, R.setOf(16, 16));
      flash(19, 25, 'You activated a Teleport trap!');
    }
  } else if ($133 === 18) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    whippower = ((whippower + 1)) << 16 >> 16;
    x = 3; $150 = 35;
    if (x <= $150) for (;;) {
      y = 45; $151 = 52;
      if (y <= $151) for (;;) {
        R.sound((x * y));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y >= $151) break;
        y++;
      }
      if (x >= $150) break;
      x++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    addscore(15);
    flash(9, 25, 'A Power Ring--your whip is now a little stronger!');
  } else if ($133 === 19 || $133 === 20) {
    if (human$5) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26], pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]));
        $152 = pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26];
        if ($152 === 19) {
          flash(14, 25, 'You cannot travel through forest terrain.');
        } else if ($152 === 20) {
          flash(24, 25, 'A tree blocks your way.');
        }
      }
    }
  } else if ($133 === 21) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i = 70; $153 = 600;
    if (i <= $153) for (;;) {
      R.sound((i * 2));
      R.delay(3);
      if (i >= $153) break;
      i++;
    }
    bor(15);
    i = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $154 = 20;
    if (i >= $154) for (;;) {
      R.sound(R.random(i));
      if (i <= $154) break;
      i--;
    }
    width = 1; $155 = 4;
    if (width <= $155) for (;;) {
      R.sound(30);
      if (((px - width) > 1)) {
        xl = (width) << 16 >> 16;
      }
      if (((px + width) < 66)) {
        xr = (width) << 16 >> 16;
      }
      if (((py - width) > 1)) {
        yl = (width) << 16 >> 16;
      }
      if (((py + width) < 25)) {
        yr = (width) << 16 >> 16;
      }
      x = (px - xl); $156 = (px + xr);
      if (x <= $156) for (;;) {
        y = (py - yl); $157 = (py + yr);
        if (y <= $157) for (;;) {
          if (($158 = pf[(x) * 25 + (y) - 26], ($158 >= 0 && $158 <= 4) || $158 === 13 || $158 === 16 || $158 === 19 || ($158 >= 28 && $158 <= 32) || $158 === 33 || $158 === 35 || ($158 >= 36 && $158 <= 39) || $158 === 43 || $158 === 45 || ($158 >= 48 && $158 <= 51) || $158 === 64 || $158 === 67 || ($158 >= 68 && $158 <= 74) || ($158 >= 224 && $158 <= 231))) {
            R.gotoxy(x, y);
            col(12, 15);
            R.write('\xdb');
          }
          if (y >= $157) break;
          y++;
        }
        if (x >= $156) break;
        x++;
      }
      if (width >= $155) break;
      width++;
    }
    R.delay(100);
    width = 1; $159 = 4;
    if (width <= $159) for (;;) {
      if (((px - width) > 1)) {
        xl = (width) << 16 >> 16;
      }
      if (((px + width) < 66)) {
        xr = (width) << 16 >> 16;
      }
      if (((py - width) > 1)) {
        yl = (width) << 16 >> 16;
      }
      if (((py + width) < 25)) {
        yr = (width) << 16 >> 16;
      }
      x = (px - xl); $160 = (px + xr);
      if (x <= $160) for (;;) {
        y = (py - yl); $161 = (py + yr);
        if (y <= $161) for (;;) {
          if (($162 = pf[(x) * 25 + (y) - 26], ($162 >= 0 && $162 <= 4) || $162 === 13 || $162 === 16 || $162 === 19 || ($162 >= 28 && $162 <= 32) || $162 === 33 || $162 === 35 || ($162 >= 36 && $162 <= 39) || $162 === 43 || $162 === 45 || ($162 >= 48 && $162 <= 51) || $162 === 64 || $162 === 67 || ($162 >= 68 && $162 <= 74) || ($162 >= 224 && $162 <= 231))) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            if (($163 = pf[(x) * 25 + (y) - 26], ($163 >= 1 && $163 <= 3))) {
              score = ((score + pf[(x) * 25 + (y) - 26])) | 0;
            }
            pf[(x) * 25 + (y) - 26] = 0;
          }
          if (y >= $161) break;
          y++;
        }
        if (x >= $160) break;
        x++;
      }
      if (width >= $159) break;
      width++;
    }
    R.nosound();
    bor(4);
    update_info();
    clearkeys();
    if (!(R.inSet(foundset, 21))) {
      foundset = R.union(foundset, R.setOf(21, 21));
      flash(20, 25, 'You activated a Magic Bomb!');
    }
  } else if ($133 === 22) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    gems = ((gems - 10)) << 16 >> 16;
    x = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $164 = 20;
    if (x >= $164) for (;;) {
      y = 9; $165 = 2;
      if (y >= $165) for (;;) {
        R.sound((R.random(((y * x) + 100)) + (y * x)));
        if (y <= $165) break;
        y--;
      }
      if (x <= $164) break;
      x--;
    }
    R.nosound();
    if ((gems < 0)) {
      gems = (0) << 16 >> 16;
      addscore(22);
      dead(true);
    } else {
      addscore(22);
    }
    clearkeys();
    if (!(R.inSet(foundset, 22))) {
      foundset = R.union(foundset, R.setOf(22, 22));
      flash(8, 25, 'Oooooooooooooooooooh!  Lava hurts!  (Lose 10 Gems.)');
    }
  } else if ($133 === 23) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    clearkeys();
    flash(22, 25, 'Oh no, a Bottomless Pit!');
    bak(6, 7);
    R.window(2, 2, 65, 24);
    R.clrscr();
    bak(0, 0);
    R.window(32, 2, 36, 24);
    R.clrscr();
    R.window(1, 1, 80, 25);
    cur(3);
    x = (3000) << 16 >> 16;
    col(14, 15);
    i = 1; $166 = 16;
    if (i <= $166) for (;;) {
      if ((i === 8)) {
        col(15, 15);
        bak(6, 7);
        R.gotoxy(38, 12);
        R.write('<--- HALF WAY!!!');
        bak(0, 0);
        col(14, 15);
      } else if ((i === 9)) {
        bak(6, 7);
        R.gotoxy(38, 12);
        R.write('                ');
        bak(0, 0);
        col(14, 15);
      }
      y = 2; $167 = 24;
      if (y <= $167) for (;;) {
        x = ((x - 8)) << 16 >> 16;
        R.sound(x);
        R.gotoxy(34, y);
        R.write('\x02');
        R.delay((52 - (3 * i)));
        R.gotoxy(34, y);
        R.write(' ');
        if (y >= $167) break;
        y++;
      }
      R.nosound();
      if (i >= $166) break;
      i++;
    }
    R.gotoxy(34, 24);
    R.write('_');
    i = 8000; $168 = 20;
    if (i >= $168) for (;;) {
      R.sound(R.random(i));
      if (i <= $168) break;
      i--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT!! *');
    dead(false);
  } else if ($133 === 24) {
    tome_message();
    i = 1; $169 = 3;
    if (i <= $169) for (;;) {
      tome_effects();
      if (i >= $169) break;
      i++;
    }
    bak(0, 0);
    x = 1; $170 = 24;
    if (x <= $170) for (;;) {
      y = 5; $171 = 1;
      if (y >= $171) for (;;) {
        R.sound(((x * 45) + (y * 10)));
        R.delay((y * 3));
        R.nosound();
        R.delay(40);
        R.gotoxy(33, 8);
        col(R.random(16), R.random(16));
        R.write('\xfe');
        if (y <= $171) break;
        y--;
      }
      if (x >= $170) break;
      x++;
    }
    R.gotoxy(33, 8);
    col(16, 16);
    bak(2, 7);
    R.write('\xf0');
    bak(0, 0);
    pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26] = 6;
    score = ((score + 5000)) | 0;
    update_info();
    clearkeys();
    flash(6, 25, 'The Sacred Tome of Kroz is finally yours--50,000 points!');
    flash(9, 25, 'Congratualtions, Adventurer, you finally did it!!!');
  } else if ($133 === 25) {
    pxold = (px) << 16 >> 16;
    pyold = (py) << 16 >> 16;
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    R.delay(350);
    footstep();
    R.delay(500);
    footstep();
    pf[(px) * 25 + (py) - 26] = 25;
    R.gotoxy(px, py);
    col(15, 7);
    R.write('\xef');
    do {
      R.sound((R.random(3000) + 100));
      x = ((R.random(64) + 2)) << 16 >> 16;
      y = ((R.random(23) + 2)) << 16 >> 16;
    } while (!(((pf[(x) * 25 + (y) - 26] === 25) && (((pxold + xway$6) !== x) || ((pyold + yway$6) !== y)))));
    done = false;
    i = 1; $172 = 100;
    if (i <= $172) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($173 = pf[((x + a)) * 25 + ((y + b)) - 26], $173 === 0 || $173 === 32 || $173 === 33 || $173 === 37 || $173 === 39 || ($173 >= 55 && $173 <= 57) || $173 === 67 || ($173 >= 224 && $173 <= 231)) && (done === false))) {
        if (!((((((x + a) < 2) || ((x + a) > 65)) || ((y + b) < 2)) || ((y + b) > 24)))) {
          done = true;
          x = ((x + a)) << 16 >> 16;
          y = ((y + b)) << 16 >> 16;
        }
      }
      if (i >= $172) break;
      i++;
    }
    R.nosound();
    if ((done === false)) {
      x = (pxold) << 16 >> 16;
      y = (pyold) << 16 >> 16;
    }
    px = (x) << 16 >> 16;
    py = (y) << 16 >> 16;
    if (($174 = pf[(px) * 25 + (py) - 26], ($174 >= 55 && $174 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x = 1; $175 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x <= $175) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x >= $175) break;
      x++;
    }
    R.nosound();
    if ((t[(5) - 1] < 1)) {
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
    } else {
      R.gotoxy(px, py);
      bak(0, 0);
      col(0, 0);
      R.write(' ');
    }
    clearkeys();
    if (!(R.inSet(foundset, 25))) {
      foundset = R.union(foundset, R.setOf(25, 25));
      flash(16, 25, 'You passed through a secret Tunnel!');
    }
  } else if ($133 === 26) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(11);
    grabsound();
    x = 1; $176 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x <= $176) for (;;) {
      R.sound(((R.random(1000) + x) + 200));
      if (x >= $176) break;
      x++;
    }
    R.nosound();
    if (fastpc) {
      t[(7) - 1] = 60;
    } else {
      t[(7) - 1] = 55;
    }
    if (!(R.inSet(foundset, 26))) {
      foundset = R.union(foundset, R.setOf(26, 26));
      flash(13, 25, 'You have activated a Freeze Creature spell!');
    }
  } else if ($133 === 27) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($133 === 28) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    i = 1; $177 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i <= $177) for (;;) {
      R.sound(R.random(i));
      if (i >= $177) break;
      i++;
    }
    R.nosound();
    i = 1; $178 = 50;
    if (i <= $178) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($179 = pf[(x) * 25 + (y) - 26], ($179 >= 0 && $179 <= 3) || $179 === 5 || ($179 >= 7 && $179 <= 11) || ($179 >= 15 && $179 <= 16) || $179 === 26 || $179 === 32 || $179 === 33 || $179 === 37 || $179 === 39 || $179 === 67 || ($179 >= 224 && $179 <= 231))) {
          done = true;
          pf[(x) * 25 + (y) - 26] = 65;
          R.gotoxy(x, y);
          col(7, 7);
          R.write('O');
        }
      } while (!(((R.random(100) === 0) || done)));
      x = 1; $180 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x <= $180) for (;;) {
        R.sound(R.random(200));
        if (x >= $180) break;
        x++;
      }
      R.nosound();
      if (i >= $178) break;
      i++;
    }
    i = 2500; $181 = 20;
    if (i >= $181) for (;;) {
      R.sound(R.random(i));
      if (i <= $181) break;
      i--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($133 === 29) {
    R.gotoxy((px + xway$6), (py + yway$6));
    col(6, 7);
    R.write('\xb2');
    pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26] = 4;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 29))) {
      foundset = R.union(foundset, R.setOf(29, 29));
      flash(13, 25, 'An Invisible Crumbled Wall blocks your way.');
    }
  } else if ($133 === 30) {
    R.gotoxy((px + xway$6), (py + yway$6));
    col(6, 7);
    R.write('\xdb');
    pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26] = 14;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 30))) {
      foundset = R.union(foundset, R.setOf(30, 30));
      flash(17, 25, 'An Invisible Wall blocks your way.');
    }
  } else if ($133 === 31) {
    R.gotoxy((px + xway$6), (py + yway$6));
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
    pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26] = 13;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 31))) {
      foundset = R.union(foundset, R.setOf(31, 31));
      flash(17, 25, 'An Invisible Door blocks your way.');
    }
  } else if ($133 === 32) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
  } else if ($133 === 33) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $182 = 65;
    if (x <= $182) for (;;) {
      y = 2; $183 = 24;
      if (y <= $183) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 33)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $183) break;
        y++;
      }
      if (x >= $182) break;
      x++;
    }
  } else if ($133 === 34) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    killed = (0) << 16 >> 16;
    trycounter = (0) << 16 >> 16;
    do {
      trycounter = ((trycounter + 1)) << 16 >> 16;
      $184 = (R.random(3) + 1);
      if ($184 === 1) {
        if ((snum > 1)) {
          i = ((R.random(snum) + 1)) << 16 >> 16;
          if ((sx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $185 = 3;
            if (x >= $185) for (;;) {
              R.sound((x * 5));
              R.gotoxy(sx[(i) - 1], sy[(i) - 1]);
              col(R.random(16), 15);
              R.write(slow);
              if (x <= $185) break;
              x--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(sx[(i) - 1], sy[(i) - 1]);
            R.write(' ');
            pf[(sx[(i) - 1]) * 25 + (sy[(i) - 1]) - 26] = 0;
            sx[(i) - 1] = 0;
          }
        }
      } else if ($184 === 2) {
        if ((mnum > 1)) {
          i = ((R.random(mnum) + 1)) << 16 >> 16;
          if ((mx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $186 = 3;
            if (x >= $186) for (;;) {
              R.sound((x * 5));
              R.gotoxy(mx[(i) - 1], my[(i) - 1]);
              col(R.random(16), 15);
              R.write(medium);
              if (x <= $186) break;
              x--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(mx[(i) - 1], my[(i) - 1]);
            R.write(' ');
            pf[(mx[(i) - 1]) * 25 + (my[(i) - 1]) - 26] = 0;
            mx[(i) - 1] = 0;
          }
        }
      } else if ($184 === 3) {
        if ((fnum > 1)) {
          i = ((R.random(fnum) + 1)) << 16 >> 16;
          if ((fx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $187 = 3;
            if (x >= $187) for (;;) {
              R.sound((x * 5));
              R.gotoxy(fx[(i) - 1], fy[(i) - 1]);
              col(R.random(16), 15);
              R.write(fast);
              if (x <= $187) break;
              x--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(fx[(i) - 1], fy[(i) - 1]);
            R.write(' ');
            pf[(fx[(i) - 1]) * 25 + (fy[(i) - 1]) - 26] = 0;
            fx[(i) - 1] = 0;
          }
        }
      }
    } while (!(((killed === 40) || (trycounter === 500))));
    clearkeys();
    score = (((score + Math.trunc(killed / 3)) + 2)) | 0;
    update_info();
    if (!(R.inSet(foundset, 34))) {
      clearkeys();
      flash(25, 25, 'A Creature Zap Spell!');
      foundset = R.union(foundset, R.setOf(34, 34));
    }
  } else if ($133 === 35) {
    if (!(sideways)) {
      go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
      if ((snum < 945)) {
        i = 1; $188 = 45;
        if (i <= $188) for (;;) {
          done = false;
          do {
            x = ((R.random(64) + 2)) << 16 >> 16;
            y = ((R.random(23) + 2)) << 16 >> 16;
            if (($189 = pf[(x) * 25 + (y) - 26], $189 === 0 || $189 === 224)) {
              done = true;
              pf[(x) * 25 + (y) - 26] = 1;
              R.gotoxy(x, y);
              col(12, 7);
              R.write(slow);
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = x;
              sy[(snum) - 1] = y;
              x = 5; $190 = 50;
              if (x <= $190) for (;;) {
                R.sound((x * 12));
                R.delay(1);
                if (x >= $190) break;
                x++;
              }
              R.nosound();
            }
          } while (!(((R.random(120) === 0) || done)));
          if (i >= $188) break;
          i++;
        }
      }
      addscore(35);
      clearkeys();
      if (!(R.inSet(foundset, 35))) {
        flash(21, 25, 'A Creature Creation Trap!');
        foundset = R.union(foundset, R.setOf(35, 35));
      }
    } else if ((gems > 13)) {
      go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
      gems = ((gems - 3)) << 16 >> 16;
      x = 6000; $191 = 3000;
      if (x >= $191) for (;;) {
        R.sound((R.random(x) + 999));
        if (x <= $191) break;
        x--;
      }
      R.nosound();
      update_info();
      if ((R.random(2) === 0)) {
        flash(12, 25, 'A strong wind blows away three of your Gems!');
      } else {
        flash(11, 25, 'Three of your Gems dissolve before your eyes!');
      }
    } else {
      flash(4, 25, 'You find nothing here!');
    }
  } else if ($133 === 36) {
    if (human$5) {
      blocksound();
      if (!(R.inSet(foundset, 36))) {
        flash(14, 25, 'You have discovered a Creature Generator!');
        foundset = R.union(foundset, R.setOf(36, 36));
      }
    }
  } else if ($133 === 37) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $192 = 65;
    if (x <= $192) for (;;) {
      y = 2; $193 = 24;
      if (y <= $193) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 37)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $193) break;
        y++;
      }
      if (x >= $192) break;
      x++;
    }
  } else if ($133 === 38) {
    if (human$5) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 38))) {
        foundset = R.union(foundset, R.setOf(38, 38));
        flash(19, 25, 'A Moving Wall blocks your way.');
      }
    }
  } else if ($133 === 39) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $194 = 65;
    if (x <= $194) for (;;) {
      y = 2; $195 = 24;
      if (y <= $195) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 39)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $195) break;
        y++;
      }
      if (x >= $194) break;
      x++;
    }
  } else if ($133 === 41) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    i = 1; $196 = ((+(fastpc) * 120) + (+(!(fastpc)) * 70));
    if (i <= $196) for (;;) {
      x = 7; $197 = 1;
      if (x >= $197) for (;;) {
        R.sound((i * x));
        if (x <= $197) break;
        x--;
      }
      if (i >= $196) break;
      i++;
    }
    R.nosound();
    i = 1; $198 = ((difficulty * 2) + 5);
    if (i <= $198) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if ((pf[(x) * 25 + (y) - 26] === 0)) {
          R.sound((R.random(1200) + 110));
          done = true;
          pf[(x) * 25 + (y) - 26] = 9;
          R.gotoxy(x, y);
          col(gemcolor, 7);
          R.write('\x04');
          R.delay(7);
          R.nosound();
          R.delay(99);
        }
      } while (!(((R.random(100) === 0) || done)));
      if (i >= $198) break;
      i++;
    }
    clearkeys();
    flash(11, 25, 'Yah Hoo! You discovered a Reveal Gems Scroll!');
  } else if ($133 === 42) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    score = (((score + level) + 250)) | 0;
    update_info();
    if (!(R.inSet(foundset, 42))) {
      foundset = R.union(foundset, R.setOf(42, 42));
      flash(7, 25, 'You found an Ancient Tablet of Wisdom...2,500 points!');
    }
    clearkeys();
    tablet_message(level);
  } else if ($133 === 44) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $199 = 65;
    if (x <= $199) for (;;) {
      y = 2; $200 = 24;
      if (y <= $200) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 43)) {
          R.sound(200);
          pf[(x) * 25 + (y) - 26] = 0;
          i = 1; $201 = 20;
          if (i <= $201) for (;;) {
            R.gotoxy(x, y);
            col(R.random(16), 15);
            R.write('\xb2');
            R.delay(3);
            if (i >= $201) break;
            i++;
          }
          R.gotoxy(x, y);
          col(0, 0);
          R.write(' ');
          R.nosound();
        }
        if (y >= $200) break;
        y++;
      }
      if (x >= $199) break;
      x++;
    }
    x = 2; $202 = 65;
    if (x <= $202) for (;;) {
      y = 2; $203 = 24;
      if (y <= $203) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 44)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $203) break;
        y++;
      }
      if (x >= $202) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, 44))) {
      foundset = R.union(foundset, R.setOf(44, 44));
      flash(19, 25, 'You triggered Exploding Walls!');
    } else {
      clearkeys();
    }
  } else if ($133 === 45) {
    a = ((R.random(difficulty) + 13)) << 16 >> 16;
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    score = ((score + 100)) | 0;
    gems = ((gems + a)) << 16 >> 16;
    update_info();
    clearkeys();
    b = (14) << 16 >> 16;
    do {
      b = ((b + 1)) << 16 >> 16;
      if ((b > 15)) {
        b = (13) << 16 >> 16;
      }
      col(b, 15);
      R.delay(20);
      R.gotoxy(15, 25);
      R.write('You found a Pouch containing ' + String(a) + ' Gems!');
    } while (!(R.keypressed()));
    restore_border();
  } else if ($133 === 46) {
    if (human$5) {
      blocksound();
      clearkeys();
      flash(9, 25, 'Statues are very dangerous...they drain your Gems!');
    }
  } else if ($133 === 47) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    i = 1; $204 = 75;
    if (i <= $204) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($205 = pf[(x) * 25 + (y) - 26], $205 === 4 || $205 === 14)) {
          R.sound((R.random(2500) + 999));
          done = true;
          $206 = pf[(x) * 25 + (y) - 26];
          if ($206 === 4) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 29;
          } else if ($206 === 14) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 30;
          }
          R.delay(5);
          R.nosound();
        }
      } while (!(((R.random(200) === 0) || done)));
      if (i >= $204) break;
      i++;
    }
    clearkeys();
    flash(4, 25, 'Yikes!  A trap has made many of the wall sections invisible!');
  } else if ($133 === 48) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    if ((bonus === 0)) {
      bonus = (1) << 16 >> 16;
    }
  } else if ($133 === 49) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    if ((bonus === 1)) {
      bonus = (2) << 16 >> 16;
    }
  } else if ($133 === 50) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    if ((bonus === 2)) {
      bonus = (3) << 16 >> 16;
    }
  } else if ($133 === 51) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    grabsound();
    if ((bonus === 3)) {
      clearkeys();
      x = 10; $207 = 45;
      if (x <= $207) for (;;) {
        y = 1; $208 = 13;
        if (y <= $208) for (;;) {
          R.sound(((x * x) * y));
          R.delay((y + 1));
          if (y >= $208) break;
          y++;
        }
        if (x >= $207) break;
        x++;
      }
      R.nosound();
      score = ((score + 1000)) | 0;
      update_info();
      flash(17, 25, 'Super Kroz Bonus -- 10,000 points!');
    }
  } else if (($133 >= 52 && $133 <= 54)) {
    if (human$5) {
      blocksound();
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, 14))) {
        foundset = R.union(foundset, R.setOf(14, 14));
        flash(20, 25, 'A Solid Wall blocks your way.');
      }
    }
  } else if (($133 >= 55 && $133 <= 57)) {
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
  } else if (($133 >= 58 && $133 <= 60)) {
    original = (pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]) & 255;
    $209 = original;
    if ($209 === 58) {
      spot = (52) & 255;
    } else if ($209 === 59) {
      spot = (53) & 255;
    } else if ($209 === 60) {
      spot = (54) & 255;
    }
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $210 = 65;
    if (x <= $210) for (;;) {
      y = 2; $211 = 24;
      if (y <= $211) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === spot)) {
          pf[(x) * 25 + (y) - 26] = 0;
          i = 1; $212 = 30;
          if (i <= $212) for (;;) {
            R.gotoxy(x, y);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i >= $212) break;
            i++;
          }
          a = 60; $213 = 1;
          if (a >= $213) for (;;) {
            R.sound((a * 40));
            R.delay(1);
            if (a <= $213) break;
            a--;
          }
          R.nosound();
          col(15, 15);
          R.gotoxy(x, y);
          R.write('\xdb');
          R.delay(8);
          R.gotoxy(x, y);
          col(0, 0);
          R.write(' ');
        }
        if (y >= $211) break;
        y++;
      }
      if (x >= $210) break;
      x++;
    }
    x = 2; $214 = 65;
    if (x <= $214) for (;;) {
      y = 2; $215 = 24;
      if (y <= $215) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === original)) {
          pf[(x) * 25 + (y) - 26] = 0;
          R.gotoxy(x, y);
          R.write(' ');
        }
        if (y >= $215) break;
        y++;
      }
      if (x >= $214) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, original))) {
      foundset = R.union(foundset, R.setOf(original, original));
      flash(14, 25, 'Magic has been released is this chamber!');
    }
  } else if (($133 >= 61 && $133 <= 63)) {
    original = (pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]) & 255;
    $216 = original;
    if ($216 === 61) {
      spot = (55) & 255;
    } else if ($216 === 62) {
      spot = (56) & 255;
    } else if ($216 === 63) {
      spot = (57) & 255;
    }
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $217 = 65;
    if (x <= $217) for (;;) {
      y = 2; $218 = 24;
      if (y <= $218) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === spot)) {
          pf[(x) * 25 + (y) - 26] = 14;
          i = 1; $219 = 30;
          if (i <= $219) for (;;) {
            R.gotoxy(x, y);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i >= $219) break;
            i++;
          }
          a = 20; $220 = 80;
          if (a <= $220) for (;;) {
            R.sound((a * 50));
            R.delay(1);
            if (a >= $220) break;
            a++;
          }
          R.nosound();
          col(15, 15);
          R.gotoxy(x, y);
          R.write('\xdb');
          R.delay(8);
          R.gotoxy(x, y);
          col(6, 7);
          R.write('\xdb');
        }
        if (y >= $218) break;
        y++;
      }
      if (x >= $217) break;
      x++;
    }
    x = 2; $221 = 65;
    if (x <= $221) for (;;) {
      y = 2; $222 = 24;
      if (y <= $222) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === original)) {
          pf[(x) * 25 + (y) - 26] = 0;
          R.gotoxy(x, y);
          R.write(' ');
        }
        if (y >= $222) break;
        y++;
      }
      if (x >= $221) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, original))) {
      foundset = R.union(foundset, R.setOf(original, original));
      flash(18, 25, 'New Walls have magically appeared!');
    }
  } else if ($133 === 65) {
    if (human$5) {
      rxway = (0) << 16 >> 16;
      ryway = (0) << 16 >> 16;
      nogo = false;
      if ((xway$6 === 1)) {
        rxway = (2) << 16 >> 16;
      }
      if ((xway$6 === -(1))) {
        rxway = (-(2)) << 16 >> 16;
      }
      if ((yway$6 === 1)) {
        ryway = (2) << 16 >> 16;
      }
      if ((yway$6 === -(1))) {
        ryway = (-(2)) << 16 >> 16;
      }
      rx = ((px + rxway)) << 16 >> 16;
      ry = ((py + ryway)) << 16 >> 16;
      if (((xway$6 === 1) && (rx > 65))) {
        nogo = true;
      }
      if (((xway$6 === -(1)) && (rx < 2))) {
        nogo = true;
      }
      if (((yway$6 === 1) && (ry > 24))) {
        nogo = true;
      }
      if (((yway$6 === -(1)) && (ry < 2))) {
        nogo = true;
      }
      clearkeys();
      if (!(nogo)) {
        $223 = pf[(rx) * 25 + (ry) - 26];
        if ($223 === 0 || $223 === 32 || $223 === 33 || $223 === 37 || $223 === 39 || $223 === 41 || $223 === 44 || $223 === 47 || ($223 >= 55 && $223 <= 57) || ($223 >= 61 && $223 <= 63) || $223 === 67 || ($223 >= 68 && $223 <= 74) || ($223 >= 224 && $223 <= 231)) {
          if (((replacement !== 75) || ((replacement === 75) && (yway$6 === 0)))) {
            moverock({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } });
          } else {
            blocksound();
          }
        } else if (($223 >= 1 && $223 <= 3)) {
          score = ((score + pf[(rx) * 25 + (ry) - 26])) | 0;
          moverock({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } });
          R.sound(600);
          R.delay(20);
          R.nosound();
        } else if ($223 === 4 || $223 === 13 || $223 === 14 || $223 === 17 || $223 === 19 || $223 === 20 || $223 === 22 || $223 === 24 || $223 === 25 || ($223 >= 29 && $223 <= 31) || $223 === 36 || $223 === 38 || $223 === 43 || $223 === 46 || ($223 >= 52 && $223 <= 54) || $223 === 64 || $223 === 65 || $223 === 75) {
          blocksound();
        } else if ($223 === 5 || ($223 >= 7 && $223 <= 12) || $223 === 16 || $223 === 18 || $223 === 21 || $223 === 26 || $223 === 27 || $223 === 34 || $223 === 35 || $223 === 42 || $223 === 45 || ($223 >= 48 && $223 <= 51) || ($223 >= 58 && $223 <= 60) || ($223 >= 76 && $223 <= 80) || $223 === 82 || $223 === 83) {
          moverock({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } });
          grabsound();
        } else if ($223 === 66) {
          moverock({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } });
          pf[(rx) * 25 + (ry) - 26] = 0;
          R.sound(90);
          clearkeys();
          i = 1; $224 = 20;
          if (i <= $224) for (;;) {
            R.gotoxy(rx, ry);
            col((R.random(15) + 1), 15);
            bak(R.random(8), 0);
            R.write('X');
            bor((R.random(15) + 1));
            if (i >= $224) break;
            i++;
          }
          bor(4);
          bak(0, 0);
          R.gotoxy(rx, ry);
          col(0, 0);
          R.write(' ');
          i = 30000; $225 = 20;
          if (i >= $225) for (;;) {
            R.sound(R.random(i));
            if (i <= $225) break;
            i--;
          }
          R.nosound();
          if (!(R.inSet(foundset, 0))) {
            foundset = R.union(foundset, R.setOf(0, 0));
            clearkeys();
            flash(21, 25, 'The Boulder is vaporized!');
          }
        } else if ($223 === 6 || $223 === 23) {
          i = 1; $226 = ((+(fastpc) * 500) + (+(!(fastpc)) * 330));
          if (i <= $226) for (;;) {
            R.sound((R.random(100) + 20));
            R.delay(1);
            if (i >= $226) break;
            i++;
          }
          R.nosound();
          R.gotoxy((px + xway$6), (py + yway$6));
          col(0, 0);
          R.write(' ');
          go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
          i = 130; $227 = 5;
          if (i >= $227) for (;;) {
            R.sound((i * 8));
            R.delay(3);
            if (i <= $227) break;
            i--;
          }
          R.nosound();
        }
      } else {
        blocksound();
      }
      if (!(R.inSet(foundset, 65))) {
        foundset = R.union(foundset, R.setOf(65, 65));
        clearkeys();
        flash(21, 25, 'You pushed a big Boulder!');
      }
    }
  } else if ($133 === 66) {
    if (human$5) {
      gems = ((gems - 1)) << 16 >> 16;
      if ((gems < 0)) {
        dead(true);
      }
      addscore(20);
      static_();
      if (!(R.inSet(foundset, 66))) {
        foundset = R.union(foundset, R.setOf(66, 66));
        clearkeys();
        flash(11, 25, 'You hit a Electrified Wall!  You lose one Gem.');
      } else {
        clearkeys();
      }
    }
  } else if ($133 === 67 || ($133 >= 224 && $133 <= 231)) {
    a = (pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]) << 16 >> 16;
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $228 = 65;
    if (x <= $228) for (;;) {
      y = 2; $229 = 24;
      if (y <= $229) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === a)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $229) break;
        y++;
      }
      if (x >= $228) break;
      x++;
    }
  } else if (($133 >= 68 && $133 <= 74)) {
    a = (pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]) << 16 >> 16;
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    $230 = a;
    if ($230 === 68) {
      i = (4) << 16 >> 16;
      col(6, 7);
      ch = '\xb2';
    } else if ($230 === 69) {
      i = (65) << 16 >> 16;
      col(7, 7);
      ch = 'O';
    } else if ($230 === 70) {
      i = (9) << 16 >> 16;
      col(gemcolor, 7);
      ch = '\x04';
    } else if ($230 === 71) {
      i = (10) << 16 >> 16;
      col(2, 7);
      ch = '\xad';
    } else if ($230 === 72) {
      i = (5) << 16 >> 16;
      col(15, 7);
      ch = '\xf4';
    } else if ($230 === 73) {
      i = (27) << 16 >> 16;
      col(artcolor, 7);
      ch = '\x0f';
    } else if ($230 === 74) {
      i = (20) << 16 >> 16;
      col(6, 7);
      bak(2, 7);
      ch = '\x05';
    }
    b = 1; $231 = 10;
    if (b <= $231) for (;;) {
      bak(R.random(8), R.random(8));
      R.sound((((b + 25) * b) * 2));
      trigger_trap(false, i, ch);
      R.delay(5);
      if (b >= $231) break;
      b++;
    }
    R.nosound();
    if ((i === 20)) {
      bak(2, 7);
    } else {
      bak(0, 0);
    }
    trigger_trap(true, i, ch);
    bak(0, 0);
    clearkeys();
  } else if ($133 === 75) {
    if (human$5) {
      onemove = true;
      go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
      if (!(R.inSet(foundset, 75))) {
        foundset = R.union(foundset, R.setOf(75, 75));
        clearkeys();
        flash(24, 25, 'You grabbed a Rope.');
      } else {

      }
    } else {

    }
  } else if ($133 === 252) {
    secret_message();
  } else if ($133 === 82) {
    shoot_right(xway$6, yway$6, human$5);
  } else if ($133 === 83) {
    shoot_left(xway$6, yway$6, human$5);
  } else if (($133 >= 76 && $133 <= 80)) {
    a = (pf[((px + xway$6)) * 25 + ((py + yway$6)) - 26]) << 16 >> 16;
    if (human$5) {
      onemove = true;
    }
    go({ get v() { return xway$6; }, set v($v) { xway$6 = $v; } }, { get v() { return yway$6; }, set v($v) { yway$6 = $v; } }, human$5);
    x = 2; $232 = 65;
    if (x <= $232) for (;;) {
      y = 2; $233 = 24;
      if (y <= $233) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === a)) {
          i = (y) << 16 >> 16;
          do {
            if ((pf[(x) * 25 + (i) - 26] === 40)) {
              replacement = (75) << 16 >> 16;
            } else {
              pf[(x) * 25 + (i) - 26] = 75;
            }
            b = 20; $234 = 40;
            if (b <= $234) for (;;) {
              R.gotoxy(x, i);
              col(R.random(16), 7);
              R.write('\x19');
              R.sound(((i * b) * 3));
              R.delay(4);
              if (b >= $234) break;
              b++;
            }
            R.nosound();
            if ((pf[(x) * 25 + (i) - 26] !== 75)) {
              R.gotoxy(x, i);
              col(14, 15);
              R.write('\x02');
            } else {
              R.gotoxy(x, i);
              col(7, 7);
              R.write('\xb3');
            }
            i = (i + 1) << 16 >> 16;
          } while (!(((i > 23) || ($235 = pf[(x) * 25 + ((i + 1)) - 26], $235 === 4 || $235 === 13 || $235 === 14 || $235 === 17 || ($235 >= 19 && $235 <= 25) || ($235 >= 29 && $235 <= 31) || $235 === 42 || $235 === 43 || ($235 >= 52 && $235 <= 60) || ($235 >= 64 && $235 <= 66) || $235 === 75 || ($235 >= 100 && $235 <= 223) || ($235 >= 232 && $235 <= 254)))));
        }
        if (y >= $233) break;
        y++;
      }
      if (x >= $232) break;
      x++;
    }
  } else if ($133 === 81) {
    got_amulet(xway$6, yway$6, human$5);
  } else {
    if (human$5) {
      blocksound();
    }
  }
  }
  onemove = false;
}
function player_move() {
  let $236, $237, $238, $239, $240, $241, $242, $243, $244;
  $236 = getkey();
  if ($236 === 0) {

  } else if ($236 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(18, 25, ' Press any key to resume game. ');
    restore_border();
  } else if ($236 === 81) {
    play(600, 600, 100);
    play(450, 450, 100);
    play(300, 300, 100);
    play(99, 99, 99);
    clearkeys();
    flash(15, 25, ' Are you sure you want to quit (Y/N)? ');
    ch = R.readKbd();
    if ((R.upcase(ch) === 'Y')) {
      sign_off();
    } else {
      restore_border();
    }
  } else if ($236 === 82) {
    L3_abort_restore: {
    flash(14, 25, ' Are you sure you want to RESTORE (Y/N)? ');
    restore_border();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'N')) {
      return;
    }
    bak(0, 0);
    col(15, 15);
    clearkeys();
    print(8, 25, ' Pick which letter to RESTORE from: A, B or C?  A  ');
    cur(2);
    R.gotoxy(56, 25);
    ch = R.readKbd();
    cur(3);
    restore_border();
    col(15, 15);
    bak(0, 0);
    $237 = R.upcase(ch);
    if ($237 === '\x1b') {
      break L3_abort_restore;
    } else if ($237 === 'B' || $237 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    print(20, 25, (('  Restoring from file ' + ch) + '...  '));
    R.assign(savefile, (('LOST-' + ch) + '.SAV'));
    R.reset(savefile);
    if ((R.ioresult() !== 0)) {
      restore_border();
      R.sound(300);
      R.delay(250);
      R.nosound();
      flash(14, 25, ((' The SAVE file "' + ch) + '" is not on this disk. '));
    } else {
      R.reset(savefile);
      savestuff = R.clone(R.fread(savefile));
      R.close(savefile);
      $238 = savestuff;
      level = ($238.s_level) << 16 >> 16;
      score = ($238.s_score) | 0;
      gems = ($238.s_gems) << 16 >> 16;
      whips = ($238.s_whips) << 16 >> 16;
      teleports = ($238.s_teleports) << 16 >> 16;
      keys = ($238.s_keys) << 16 >> 16;
      whippower = ($238.s_whippower) << 16 >> 16;
      difficulty = ($238.s_difficulty) << 16 >> 16;
      px = ($238.s_px) << 16 >> 16;
      py = ($238.s_py) << 16 >> 16;
      foundset = $238.s_foundset;
      mixup = $238.s_mixup;
      i_score = (score) | 0;
      i_gems = (gems) | 0;
      i_whips = (whips) | 0;
      i_teleports = (teleports) | 0;
      i_keys = (keys) | 0;
      i_whippower = (whippower) | 0;
      i_difficulty = (difficulty) | 0;
      i_px = (px) | 0;
      i_py = (py) | 0;
      i_foundset = foundset;
      update_info();
      R.delay(1000);
      sideways = false;
      evaporate = (0) << 16 >> 16;
      gennum = (0) << 16 >> 16;
      hidelevel = false;
      hidecreate = false;
      hidestairs = false;
      hidetrap = false;
      hiderock = false;
      hidegems = false;
      hidemblock = false;
      hideopenwall = false;
      bonus = (0) << 16 >> 16;
      gravon = false;
      gravcounter = (0) << 16 >> 16;
      treerate = (-(1)) << 16 >> 16;
      t[(1) - 1] = 5;
      t[(2) - 1] = 6;
      t[(3) - 1] = 7;
      t[(8) - 1] = 7;
      t[(4) - 1] = 0;
      t[(5) - 1] = 0;
      t[(6) - 1] = 0;
      replacement = (0) << 16 >> 16;
      next_level();
      if ((level === 10)) {
        treerate = (40) << 16 >> 16;
      }
      if ((level === 31)) {
        treerate = (15) << 16 >> 16;
      }
      if ((level === 45)) {
        lavaflow = true;
        lavarate = (30) << 16 >> 16;
      }
      if ((level === 56)) {
        foundset = R.union(foundset, R.setOf(44, 44));
      }
      if ((level === 62)) {
        hidemblock = true;
      }
      R.window(2, 2, (64 + 1), (23 + 1));
      bak(0, 0);
      R.clrscr();
      cur(3);
      R.window(1, 1, 80, 25);
      border();
      display_playfield();
      x = 1; $239 = 600;
      if (x <= $239) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x / 2));
        if (x >= $239) break;
        x++;
      }
      R.nosound();
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
      bak(0, 0);
    }
    if (sideways) {
      flash(13, 25, 'Press any key to begin this SIDEWAYS level.');
    } else {
      flash(17, 25, 'Press any key to begin this level.');
    }
    }
    restore_border();
  } else if ($236 === 83) {
    L4_abort_save: {
    flash(15, 25, ' Are you sure you want to SAVE (Y/N)? ');
    restore_border();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'N')) {
      return;
    }
    bak(0, 0);
    col(15, 15);
    clearkeys();
    print(11, 25, ' Pick which letter to SAVE to: A, B or C?  A  ');
    cur(2);
    R.gotoxy(54, 25);
    ch = R.readKbd();
    cur(3);
    restore_border();
    col(15, 15);
    bak(0, 0);
    $240 = R.upcase(ch);
    if ($240 === '\x1b') {
      break L4_abort_save;
    } else if ($240 === 'B' || $240 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    $241 = savestuff;
    $241.s_level = (level) | 0;
    $241.s_score = (i_score) | 0;
    $241.s_gems = (i_gems) | 0;
    $241.s_whips = (i_whips) | 0;
    $241.s_teleports = (i_teleports) | 0;
    $241.s_keys = (i_keys) | 0;
    $241.s_whippower = (i_whippower) | 0;
    $241.s_difficulty = (i_difficulty) | 0;
    $241.s_px = (i_px) | 0;
    $241.s_py = (i_py) | 0;
    $241.s_foundset = i_foundset;
    $241.s_mixup = mixup;
    print(22, 25, (('  Saving to file ' + ch) + '...  '));
    R.assign(savefile, (('LOST-' + ch) + '.SAV'));
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    }
    restore_border();
  } else if ($236 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x = 1; $242 = 250;
    if (x <= $242) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $242) break;
      x++;
    }
    R.gotoxy(px, py);
    if ((replacement === 75)) {
      bak(0, 0);
      col(7, 7);
      R.write('\xb3');
    } else {
      bak(0, 0);
      col(0, 0);
      R.write(' ');
    }
    i = (0) << 16 >> 16;
    col(14, 15);
    R.sound(20);
    do {
      i = (i + 1) << 16 >> 16;
      x = ((R.random(64) + 2)) << 16 >> 16;
      y = ((R.random(23) + 2)) << 16 >> 16;
      if (($243 = pf[(x) * 25 + (y) - 26], $243 === 0 || $243 === 32 || $243 === 33 || $243 === 37 || $243 === 39 || $243 === 41 || $243 === 44 || $243 === 47 || ($243 >= 55 && $243 <= 57) || ($243 >= 61 && $243 <= 63) || $243 === 67 || ($243 >= 68 && $243 <= 74) || ($243 >= 224 && $243 <= 231))) {
        R.gotoxy(x, y);
        R.write('\x01');
        R.delay(3);
        R.gotoxy(x, y);
        R.write(' ');
      }
    } while (!((i > 700)));
    xb = (0) & 255;
    do {
      xb = ((xb + 2)) & 255;
      yb = (0) & 255;
      do {
        yb = ((yb + 1)) & 255;
        R.sound((xb * yb));
      } while (!((yb > 220)));
    } while (!((xb > 90)));
    R.nosound();
    pf[(px) * 25 + (py) - 26] = replacement;
    px = (0) << 16 >> 16;
    do {
      x = ((R.random(64) + 2)) << 16 >> 16;
      y = ((R.random(23) + 2)) << 16 >> 16;
      if ((pf[(x) * 25 + (y) - 26] === 0)) {
        px = (x) << 16 >> 16;
        py = (y) << 16 >> 16;
        pf[(px) * 25 + (py) - 26] = 40;
      }
    } while (!((px !== 0)));
    replacement = (0) << 16 >> 16;
    clearkeys();
    x = 1; $244 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $244) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $244) break;
      x++;
    }
    if ((t[(5) - 1] < 1)) {
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
    } else {
      R.gotoxy(px, py);
      bak(0, 0);
      col(0, 0);
      R.write(' ');
    }
  } else if ($236 === 87) {
    if ((whips < 1)) {
      nonesound();
      return;
    }
    whips = ((whips - 1)) << 16 >> 16;
    R.sound(70);
    if (((py > 2) && (px > 2))) {
      hit((px - 1), (py - 1), '\\');
    }
    if ((px > 2)) {
      hit((px - 1), py, '\xc4');
    }
    if (((py < 24) && (px > 2))) {
      hit((px - 1), (py + 1), '/');
    }
    if ((py < 24)) {
      hit(px, (py + 1), '\xb3');
    }
    if (((py < 24) && (px < 65))) {
      hit((px + 1), (py + 1), '\\');
    }
    if ((px < 65)) {
      hit((px + 1), py, '\xc4');
    }
    if (((py > 2) && (px < 65))) {
      hit((px + 1), (py - 1), '/');
    }
    if ((py > 2)) {
      hit(px, (py - 1), '\xb3');
    }
    R.nosound();
    update_info();
    clearkeys();
  } else if ($236 === 172) {
    move(0, -(1), true);
  } else if ($236 === 180) {
    move(0, 1, true);
  } else if ($236 === 177) {
    move(1, 0, true);
  } else if ($236 === 175) {
    move(-(1), 0, true);
  } else if ($236 === 171) {
    move(-(1), -(1), true);
  } else if ($236 === 173) {
    move(1, -(1), true);
  } else if ($236 === 179) {
    move(-(1), 1, true);
  } else if ($236 === 181) {
    move(1, 1, true);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $245, $246;
  if ((t[(6) - 1] > 0)) {
    if (fastpc) {
      t[(1) - 1] = 3;
    } else {
      t[(1) - 1] = 0;
    }
  } else if ((t[(4) - 1] < 1)) {
    t[(1) - 1] = stime;
  } else {
    t[(1) - 1] = (stime * 5);
  }
  if ((snum < 1)) {
    return;
  }
  loop$3 = 1; $245 = snum;
  if (loop$3 <= $245) for (;;) {
    L5_continue: {
    if ((sx[(loop$3) - 1] === 0)) {
      break L5_continue;
    }
    if ((pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] !== 1)) {
      sx[(loop$3) - 1] = 0;
      break L5_continue;
    }
    pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
    R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
    R.write(' ');
    xdir = (0) << 16 >> 16;
    ydir = (0) << 16 >> 16;
    if ((px < sx[(loop$3) - 1])) {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] - 1);
      xdir = (1) << 16 >> 16;
    } else if ((px > sx[(loop$3) - 1])) {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + 1);
      xdir = (-(1)) << 16 >> 16;
    }
    if (!(sideways)) {
      if ((py < sy[(loop$3) - 1])) {
        sy[(loop$3) - 1] = (sy[(loop$3) - 1] - 1);
        ydir = (1) << 16 >> 16;
      } else if ((py > sy[(loop$3) - 1])) {
        sy[(loop$3) - 1] = (sy[(loop$3) - 1] + 1);
        ydir = (-(1)) << 16 >> 16;
      }
    }
    R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
    $246 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($246 === 0 || ($246 >= 68 && $246 <= 74)) {
      col(12, 7);
      if ((R.random(2) === 0)) {
        slow = '\x8e';
      } else {
        slow = 'A';
      }
      R.write(slow);
      R.sound(20);
      R.nosound();
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
    } else if (($246 >= 1 && $246 <= 3) || $246 === 6 || $246 === 13 || $246 === 14 || $246 === 17 || ($246 >= 19 && $246 <= 25) || ($246 >= 28 && $246 <= 37) || $246 === 39 || $246 === 41 || $246 === 42 || ($246 >= 44 && $246 <= 47) || ($246 >= 52 && $246 <= 56) || ($246 >= 58 && $246 <= 63) || $246 === 65 || $246 === 66 || $246 === 67 || ($246 >= 75 && $246 <= 80) || ($246 >= 224 && $246 <= 231)) {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + xdir);
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + ydir);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
      col(12, 7);
      if ((R.random(2) === 0)) {
        slow = '\x8e';
      } else {
        slow = 'A';
      }
      R.write(slow);
    } else if ($246 === 4 || $246 === 38 || $246 === 43 || $246 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($246 === 40) {
      R.sound(400);
      R.delay(25);
      R.nosound();
      sx[(loop$3) - 1] = 0;
      gems = ((gems - 1)) << 16 >> 16;
      if ((gems < 0)) {
        dead(true);
      }
      if ((gems > 9)) {
        col(4, 7);
      } else {
        col(20, 23);
      }
      bak(7, 0);
      R.gotoxy(71, 8);
      R.write('     ');
      strval = R.trunc(R.fmt(gems, 0), 222);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($246 === 5 || ($246 >= 7 && $246 <= 12) || $246 === 15 || $246 === 16 || $246 === 18 || $246 === 26 || $246 === 27 || ($246 >= 48 && $246 <= 51) || $246 === 82 || $246 === 83) {
      col(12, 7);
      if ((R.random(2) === 0)) {
        slow = '\x8e';
      } else {
        slow = 'A';
      }
      R.write(slow);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      grabsound();
    } else {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + xdir);
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + ydir);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
      col(12, 7);
      if ((R.random(2) === 0)) {
        slow = '\x8e';
      } else {
        slow = 'A';
      }
      R.write(slow);
    }
    }
    if ((R.random(8) === 1)) {
      player_move();
    }
    if (loop$3 >= $245) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $247, $248;
  if ((t[(6) - 1] > 0)) {
    if (fastpc) {
      t[(2) - 1] = 3;
    } else {
      t[(2) - 1] = 0;
    }
  } else if ((t[(4) - 1] < 1)) {
    t[(2) - 1] = mtime;
  } else {
    t[(2) - 1] = (mtime * 5);
  }
  if ((mnum < 1)) {
    return;
  }
  loop$4 = 1; $247 = mnum;
  if (loop$4 <= $247) for (;;) {
    L6_continue: {
    if ((mx[(loop$4) - 1] === 0)) {
      break L6_continue;
    }
    if ((pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] !== 2)) {
      mx[(loop$4) - 1] = 0;
      break L6_continue;
    }
    pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
    R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
    R.write(' ');
    xdir = (0) << 16 >> 16;
    ydir = (0) << 16 >> 16;
    if ((px < mx[(loop$4) - 1])) {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] - 1);
      xdir = (1) << 16 >> 16;
    } else if ((px > mx[(loop$4) - 1])) {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + 1);
      xdir = (-(1)) << 16 >> 16;
    }
    if (!(sideways)) {
      if ((py < my[(loop$4) - 1])) {
        my[(loop$4) - 1] = (my[(loop$4) - 1] - 1);
        ydir = (1) << 16 >> 16;
      } else if ((py > my[(loop$4) - 1])) {
        my[(loop$4) - 1] = (my[(loop$4) - 1] + 1);
        ydir = (-(1)) << 16 >> 16;
      }
    }
    R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
    $248 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($248 === 0 || ($248 >= 68 && $248 <= 74)) {
      col(10, 7);
      if ((R.random(2) === 0)) {
        medium = '\x94';
      } else {
        medium = '\x99';
      }
      R.write(medium);
      R.sound(20);
      R.nosound();
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
    } else if (($248 >= 1 && $248 <= 3) || $248 === 6 || $248 === 13 || $248 === 14 || $248 === 17 || ($248 >= 19 && $248 <= 25) || ($248 >= 28 && $248 <= 37) || $248 === 39 || $248 === 41 || $248 === 42 || ($248 >= 44 && $248 <= 47) || ($248 >= 52 && $248 <= 56) || ($248 >= 58 && $248 <= 63) || $248 === 65 || $248 === 66 || $248 === 67 || ($248 >= 75 && $248 <= 80) || ($248 >= 224 && $248 <= 231)) {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + xdir);
      my[(loop$4) - 1] = (my[(loop$4) - 1] + ydir);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
      col(10, 7);
      if ((R.random(2) === 0)) {
        medium = '\x94';
      } else {
        medium = '\x99';
      }
      R.write(medium);
    } else if ($248 === 4 || $248 === 38 || $248 === 43 || $248 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($248 === 40) {
      R.sound(600);
      R.delay(25);
      R.nosound();
      mx[(loop$4) - 1] = 0;
      gems = ((gems - 2)) << 16 >> 16;
      if ((gems < 0)) {
        dead(true);
      }
      if ((gems > 9)) {
        col(4, 7);
      } else {
        col(20, 23);
      }
      bak(7, 0);
      R.gotoxy(71, 8);
      R.write('     ');
      strval = R.trunc(R.fmt(gems, 0), 222);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($248 === 5 || ($248 >= 7 && $248 <= 12) || $248 === 15 || $248 === 16 || $248 === 18 || $248 === 26 || $248 === 27 || ($248 >= 48 && $248 <= 51) || $248 === 82 || $248 === 83) {
      col(10, 7);
      if ((R.random(2) === 0)) {
        medium = '\x94';
      } else {
        medium = '\x99';
      }
      R.write(medium);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      grabsound();
    } else {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + xdir);
      my[(loop$4) - 1] = (my[(loop$4) - 1] + ydir);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
      col(10, 7);
      if ((R.random(2) === 0)) {
        medium = '\x94';
      } else {
        medium = '\x99';
      }
      R.write(medium);
    }
    }
    if ((R.random(7) === 1)) {
      player_move();
    }
    if (loop$4 >= $247) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $249, $250;
  if ((t[(6) - 1] > 0)) {
    if (fastpc) {
      t[(3) - 1] = 3;
    } else {
      t[(3) - 1] = 0;
    }
  } else if ((t[(4) - 1] < 1)) {
    t[(3) - 1] = ftime;
  } else {
    t[(3) - 1] = (ftime * 5);
  }
  if ((fnum < 1)) {
    return;
  }
  loop$5 = 1; $249 = fnum;
  if (loop$5 <= $249) for (;;) {
    L7_continue: {
    if ((fx[(loop$5) - 1] === 0)) {
      break L7_continue;
    }
    if ((pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] !== 3)) {
      fx[(loop$5) - 1] = 0;
      break L7_continue;
    }
    pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
    R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
    R.write(' ');
    xdir = (0) << 16 >> 16;
    ydir = (0) << 16 >> 16;
    if ((px < fx[(loop$5) - 1])) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] - 1);
      xdir = (1) << 16 >> 16;
    } else if ((px > fx[(loop$5) - 1])) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + 1);
      xdir = (-(1)) << 16 >> 16;
    }
    if (!(sideways)) {
      if ((py < fy[(loop$5) - 1])) {
        fy[(loop$5) - 1] = (fy[(loop$5) - 1] - 1);
        ydir = (1) << 16 >> 16;
      } else if ((py > fy[(loop$5) - 1])) {
        fy[(loop$5) - 1] = (fy[(loop$5) - 1] + 1);
        ydir = (-(1)) << 16 >> 16;
      }
    }
    R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
    $250 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($250 === 0 || ($250 >= 68 && $250 <= 74)) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($250 >= 1 && $250 <= 3) || $250 === 6 || $250 === 13 || $250 === 14 || $250 === 17 || ($250 >= 19 && $250 <= 25) || ($250 >= 28 && $250 <= 37) || $250 === 39 || $250 === 41 || $250 === 42 || ($250 >= 44 && $250 <= 47) || ($250 >= 52 && $250 <= 56) || ($250 >= 58 && $250 <= 63) || $250 === 65 || $250 === 66 || $250 === 67 || ($250 >= 75 && $250 <= 80) || ($250 >= 224 && $250 <= 231)) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($250 === 4 || $250 === 38 || $250 === 43 || $250 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($250 === 40) {
      R.sound(800);
      R.delay(25);
      R.nosound();
      fx[(loop$5) - 1] = 0;
      gems = ((gems - 3)) << 16 >> 16;
      if ((gems < 0)) {
        dead(true);
      }
      if ((gems > 9)) {
        col(4, 7);
      } else {
        col(20, 23);
      }
      bak(7, 0);
      R.gotoxy(71, 8);
      R.write('     ');
      strval = R.trunc(R.fmt(gems, 0), 222);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($250 === 5 || ($250 >= 7 && $250 <= 12) || $250 === 15 || $250 === 16 || $250 === 18 || $250 === 26 || $250 === 27 || ($250 >= 48 && $250 <= 51) || $250 === 82 || $250 === 83) {
      col(9, 7);
      R.write(fast);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      grabsound();
    } else {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    }
    }
    if ((R.random(6) === 1)) {
      player_move();
    }
    if (loop$5 >= $249) break;
    loop$5++;
  }
}
function move_mblock() {
  let loop$6 = 0;
  let $251, $252;
  t[(8) - 1] = btime;
  if ((bnum < 1)) {
    return;
  }
  loop$6 = 1; $251 = bnum;
  if (loop$6 <= $251) for (;;) {
    L8_continue: {
    if ((bx[(loop$6) - 1] === 0)) {
      break L8_continue;
    }
    if ((pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26] !== 38)) {
      bx[(loop$6) - 1] = 0;
      break L8_continue;
    }
    pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26] = 0;
    xdir = (0) << 16 >> 16;
    ydir = (0) << 16 >> 16;
    if ((px < bx[(loop$6) - 1])) {
      bx[(loop$6) - 1] = (bx[(loop$6) - 1] - 1);
      xdir = (1) << 16 >> 16;
    } else if ((px > bx[(loop$6) - 1])) {
      bx[(loop$6) - 1] = (bx[(loop$6) - 1] + 1);
      xdir = (-(1)) << 16 >> 16;
    }
    if (!(sideways)) {
      if ((py < by[(loop$6) - 1])) {
        by[(loop$6) - 1] = (by[(loop$6) - 1] - 1);
        ydir = (1) << 16 >> 16;
      } else if ((py > by[(loop$6) - 1])) {
        by[(loop$6) - 1] = (by[(loop$6) - 1] + 1);
        ydir = (-(1)) << 16 >> 16;
      }
    }
    $252 = pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26];
    if ($252 === 0) {
      R.gotoxy((bx[(loop$6) - 1] + xdir), (by[(loop$6) - 1] + ydir));
      R.write(' ');
      R.gotoxy(bx[(loop$6) - 1], by[(loop$6) - 1]);
      col(6, 7);
      R.write('\xb2');
      R.sound(20);
      R.delay(1);
      R.nosound();
      pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26] = 38;
    } else {
      bx[(loop$6) - 1] = (bx[(loop$6) - 1] + xdir);
      by[(loop$6) - 1] = (by[(loop$6) - 1] + ydir);
      pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26] = 38;
    }
    }
    if ((R.random(7) === 1)) {
      player_move();
    }
    if (loop$6 >= $251) break;
    loop$6++;
  }
}

export function main() {
  let $253, $254, $255, $256, $257, $258, $259, $260, $261, $262, $263, $264, $265, $266, $267, $268;






  screen();
  L9_newgame: for (;;) {
  title();
  border();
  init_screen();
  update_info();
  define_levels();
  level1();
  display_playfield();
  i_score = (score) | 0;
  i_gems = (gems) | 0;
  i_whips = (whips) | 0;
  i_teleports = (teleports) | 0;
  i_keys = (keys) | 0;
  i_whippower = (whippower) | 0;
  i_difficulty = (difficulty) | 0;
  i_px = (px) | 0;
  i_py = (py) | 0;
  i_foundset = foundset;
  x = 1; $253 = 800;
  if (x <= $253) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x / 2));
    if (x >= $253) break;
    x++;
  }
  R.gotoxy(px, py);
  col(14, 15);
  bak(0, 0);
  R.write('\x02');
  R.nosound();
  bak(0, 0);
  clearkeys();
  flash(17, 25, 'Press any key to begin this level.');
  do {
    player_move();
    if (R.keypressed()) {
      skiptime = (801) << 16 >> 16;
    } else {
      skiptime = ((skiptime + 1)) << 16 >> 16;
    }
    if ((skiptime > 800)) {
      x = 1; $254 = 9;
      if (x <= $254) for (;;) {
        t[(x) - 1] = (t[(x) - 1] - 1);
        if (x >= $254) break;
        x++;
      }
      if ((skiptime > 3000)) {
        x = 1; $255 = 9;
        if (x <= $255) for (;;) {
          t[(x) - 1] = (t[(x) - 1] - 5);
          if (x >= $255) break;
          x++;
        }
      }
      if (fastpc) {
        skiptime = (-(150)) << 16 >> 16;
      } else {
        skiptime = (0) << 16 >> 16;
      }
      if ((t[(7) - 1] < 1)) {
        if ((t[(1) - 1] < 1)) {
          move_slow();
        }
        if ((t[(2) - 1] < 1)) {
          move_medium();
        }
        if ((t[(3) - 1] < 1)) {
          move_fast();
        }
      }
      if ((t[(8) - 1] < 1)) {
        move_mblock();
      }
      if (((t[(9) - 1] > 0) && (R.random(18) === 0))) {
        gems = ((gems - 1)) << 16 >> 16;
        if ((gems < 0)) {
          dead(true);
        }
        R.sound(3800);
        R.delay(20);
        R.nosound();
        bak(7, 0);
        col(20, 7);
        printnum(8, gems);
      }
      col(4, 7);
      bak(7, 0);
      R.gotoxy(70, 2);
      strval = R.trunc(R.fmt(score, 0), 222);
      if ((score > 0)) {
        strval = R.trunc((strval + '0'), 222);
      }
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 2);
      R.write(strval);
      if ((t[(5) - 1] < 1)) {
        bak(0, 0);
        col(14, 15);
        R.gotoxy(px, py);
        R.write('\x02');
      }
      bak(0, 0);
      if ((((gennum > 0) && (snum < 995)) && (R.random(genfactor) === 0))) {
        done = false;
        do {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 0)) {
            done = true;
            pf[(x) * 25 + (y) - 26] = 1;
            R.gotoxy(x, y);
            col(15, 15);
            R.write(slow);
            snum = ((snum + 1)) << 16 >> 16;
            sx[(snum) - 1] = x;
            sy[(snum) - 1] = y;
            x = 5; $256 = 70;
            if (x <= $256) for (;;) {
              R.sound((x * 8));
              R.delay(1);
              if (x >= $256) break;
              x++;
            }
            R.nosound();
          }
        } while (!(((R.random(50) === 0) || done)));
      }
      if ((lavaflow && (R.random(10) === 0))) {
        i = 1; $257 = lavarate;
        if (i <= $257) for (;;) {
          done = false;
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if (($258 = pf[(x) * 25 + (y) - 26], ($258 >= 0 && $258 <= 4) || $258 === 5 || ($258 >= 7 && $258 <= 11) || $258 === 15 || $258 === 16 || ($258 >= 18 && $258 <= 21) || ($258 >= 26 && $258 <= 28) || ($258 >= 32 && $258 <= 35) || ($258 >= 37 && $258 <= 39) || $258 === 41 || ($258 >= 42 && $258 <= 44) || $258 === 45 || ($258 >= 47 && $258 <= 51) || $258 === 57 || $258 === 60 || $258 === 64 || ($258 >= 67 && $258 <= 74) || ($258 >= 77 && $258 <= 83))) {
            if ((pf[((x + 1)) * 25 + (y) - 26] === 22)) {
              done = true;
            } else if ((pf[((x - 1)) * 25 + (y) - 26] === 22)) {
              done = true;
            } else if ((pf[(x) * 25 + ((y + 1)) - 26] === 22)) {
              done = true;
            } else if ((pf[(x) * 25 + ((y - 1)) - 26] === 22)) {
              done = true;
            }
            if (done) {
              pf[(x) * 25 + (y) - 26] = 22;
              R.gotoxy(x, y);
              col(12, 16);
              bak(4, 7);
              R.write('\xb2');
              bak(0, 0);
            }
          }
          if (i >= $257) break;
          i++;
        }
      }
      if ((gravon && (replacement !== 75))) {
        gravcounter = ((gravcounter + 1)) << 16 >> 16;
        if ((gravcounter > gravrate)) {
          move(0, 1, false);
          gravcounter = (0) << 16 >> 16;
        }
      }
      if ((magicewalls && (R.random(8) === 0))) {
        i = 1; $259 = 100;
        if (i <= $259) for (;;) {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 55)) {
            pf[(x) * 25 + (y) - 26] = 66;
            R.gotoxy(x, y);
            col(12, 0);
            bak(4, 7);
            R.write('X');
            bak(0, 0);
          }
          if (i >= $259) break;
          i++;
        }
        i = 1; $260 = 100;
        if (i <= $260) for (;;) {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 66)) {
            pf[(x) * 25 + (y) - 26] = 55;
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
          }
          if (i >= $260) break;
          i++;
        }
      }
      if (((evaporate > 0) && (R.random(10) === 0))) {
        i = 1; $261 = evaporate;
        if (i <= $261) for (;;) {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 17)) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 0;
            b = 1; $262 = ((+(fastpc) * 1000) + (+(!(fastpc)) * 250));
            if (b <= $262) for (;;) {
              R.sound((R.random(((x * 2) + 200)) + x));
              if (b >= $262) break;
              b++;
            }
            R.nosound();
          }
          if (i >= $261) break;
          i++;
        }
      }
      if (((treerate > 0) && (R.random(10) === 0))) {
        i = 1; $263 = treerate;
        if (i <= $263) for (;;) {
          done = false;
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if (($264 = pf[(x) * 25 + (y) - 26], $264 === 0 || $264 === 16 || $264 === 27 || $264 === 28 || $264 === 32 || $264 === 33 || $264 === 37 || $264 === 39)) {
            if (($265 = pf[((x + 1)) * 25 + (y) - 26], $265 === 19 || $265 === 20)) {
              done = true;
            } else if (($266 = pf[((x - 1)) * 25 + (y) - 26], $266 === 19 || $266 === 20)) {
              done = true;
            } else if (($267 = pf[(x) * 25 + ((y + 1)) - 26], $267 === 19 || $267 === 20)) {
              done = true;
            } else if (($268 = pf[(x) * 25 + ((y - 1)) - 26], $268 === 19 || $268 === 20)) {
              done = true;
            }
            if (done) {
              if ((R.random(4) === 0)) {
                pf[(x) * 25 + (y) - 26] = 20;
              } else {
                pf[(x) * 25 + (y) - 26] = 19;
              }
              R.gotoxy(x, y);
              if ((pf[(x) * 25 + (y) - 26] === 19)) {
                col(2, 7);
                R.write('\xdb');
              } else {
                col(6, 0);
                bak(2, 7);
                R.write('\x05');
                bak(0, 0);
              }
            }
          }
          if (i >= $263) break;
          i++;
        }
      }
    }
  } while (!(restart));
  continue L9_newgame;
    break;
  }
}

export const state = () => [px, py];
