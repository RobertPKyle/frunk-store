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
let df = new Array(30).fill('');
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
  strval = R.trunc(R.fmt(num, 0), 150);
  if (((ypos$2 === 2) && (score > 0))) {
    strval = R.trunc((strval + '0'), 150);
  }
  if ((ypos$2 === 11)) {
    $1 = whippower;
    if (($1 >= 0 && $1 <= 2)) {

    } else if (($1 >= 3 && $1 <= 9)) {
      tempstr = R.trunc(R.fmt((whippower - 2), 0), 150);
      strval = R.trunc(((strval + '+') + tempstr), 150);
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
  R.gotoxy(31, 2);
  R.write('DUNGEONS OF KROZ II');
  R.gotoxy(26, 3);
  R.write('An Apogee Software Production' + '\r\n');
  R.write('' + '\r\n');
  R.write('Other great games available from Scott Miller:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 15);
  R.write('\xfe The six Kroz games!  CAVERNS OF KROZ, KINGDOM OF KROZ, DUNGEONS OF KROZ,' + '\r\n');
  R.write('     RETURN TO KROZ, TEMPLE OF KROZ and THE FINAL CRUSADE OF KROZ.' + '\r\n');
  R.write('     Each volume is just $7.50, or order all six for $35!' + '\r\n');
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
  col(15, 15);
  R.write('\xfe THE LOST ADVENTURES OF KROZ - All-new seventh Kroz game with 75 of the best' + '\r\n');
  R.write('     levels yet!  Built-in contest!  New features galore.  ($20)');
  cur(2);
  col(7, 7);
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
  R.gotoxy(21, 1);
  R.write('DUNGEONS OF KROZ II \xc4 HOW TO REGISTER' + '\r\n');
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
  R.write('amount of $7.50 to Apogee Software.' + '\r\n');
  R.write('  This registration fee will qualify you to order any of the other Kroz' + '\r\n');
  R.write('volumes available:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 7);
  R.write('  \xfe Caverns of Kroz   - the first discovery of Kroz' + '\r\n');
  R.write('  \xfe Dungeons of Kroz  - the dark side of Kroz, fast-paced action' + '\r\n');
  R.write('  \xfe Kingdom of Kroz   - the national contest winner ("Best Game" in 1988)' + '\r\n');
  R.write('  \xfe Return to Kroz    - the discovery of entirely new underground chambers' + '\r\n');
  R.write('  \xfe Temple of Kroz    - the bizarre side of Kroz, nothing is what it seems' + '\r\n');
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
  col(15, 15);
  R.write('Address always valid!');
  R.gotoxy(31, 22);
  col(14, 7);
  R.write('   Garland, TX 75043  (USA)' + '\r\n');
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
  col(15, 31);
  bak(bb, 0);
  print(5, 1, 'YOUR QUEST FOR THE MAGICAL STAFF OF KROZ WAS SUCCESSFUL!!');
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
  R.assign(hsfile, 'DUNGEON2.HS');
  R.reset(hsfile);
  if ((R.ioresult() !== 0)) {
    R.rewrite(hsfile);
    x$8 = 1; $22 = 15;
    if (x$8 <= $22) for (;;) {
      $23 = (hslist[(x$8) - 1] || { name: '', highscore: 0, highlevel: 0 });
      $24 = x$8;
      if ($24 === 1) {
        $23.name = R.trunc('Scott Miller', 15);
        $23.highscore = (13640) | 0;
        $23.highlevel = (16) | 0;
      } else if ($24 === 2) {
        $23.name = R.trunc('Indy J.', 15);
        $23.highscore = (8574) | 0;
        $23.highlevel = (14) | 0;
      } else if ($24 === 3) {
        $23.name = R.trunc('J. T. Kirk', 15);
        $23.highscore = (6995) | 0;
        $23.highlevel = (11) | 0;
      } else if ($24 === 4) {
        $23.name = R.trunc('Neil Peart', 15);
        $23.highscore = (3501) | 0;
        $23.highlevel = (8) | 0;
      } else if ($24 === 5) {
        $23.name = R.trunc('Ttocs Rellim', 15);
        $23.highscore = (1228) | 0;
        $23.highlevel = (5) | 0;
      } else {
        $23.name = R.trunc('Adventurer', 15);
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
  R.gotoxy(25, 3);
  R.write('DUNGEONS OF KROZ II');
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
      R.write('You\'ve completed DUNGEONS OF KROZ II!' + '\r\n');
    } else {
      R.gotoxy(17, 2);
      R.write('DUNGEONS OF KROZ II' + '\r\n');
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
  strval = R.trunc(R.fmt(gems, 0), 150);
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
  let $33;
  i = 1; $33 = 30;
  if (i <= $33) for (;;) {
    df[(i) - 1] = R.trunc('', 150);
    if (i >= $33) break;
    i++;
  }
  df[(2) - 1] = R.trunc('200  5   100     2  1  1 40        1    50     5                                                ', 150);
  df[(4) - 1] = R.trunc('   200       38  2                                                                              ', 150);
  df[(6) - 1] = R.trunc('      180 50     2       75                                                                     ', 150);
  df[(8) - 1] = R.trunc('             20  2  1    40 35  2              5         990              3                     ', 150);
  df[(10) - 1] = R.trunc('   400           1       20                 1                                     35            ', 150);
  df[(12) - 1] = R.trunc('100 75 50100 10  1  1  1 30     1  1                          5                     100         ', 150);
  df[(14) - 1] = R.trunc('      170     5  1  1    25500  1       50 50 50     1        1          28        1            ', 150);
  df[(16) - 1] = R.trunc('    60           1     6 30 20              1                  550        4     5  2            ', 150);
  df[(18) - 1] = R.trunc('100           3  1  1    20     2              5              1           4    20   850         ', 150);
  df[(20) - 1] = R.trunc('   550   650  5  1  1     5     1  1           1              1                20  8            ', 150);
  df[(22) - 1] = R.trunc('      300        1         300            150150              1               300               ', 150);
  df[(24) - 1] = R.trunc('   305        5  1  1     5     1           1                             2     5            999', 150);
  df[(26) - 1] = R.trunc('   100 20    25  2  1  2 20  1  2             10     1        5   785    10    15               ', 150);
  df[(28) - 1] = R.trunc('133133133        3  3    80420  1  1                                           10  5            ', 150);
}
function convert_format() {
  let xloop = 0;
  let yloop = 0;
  let tempstr$2 = '';
  let $34, $35, $36, $37, $38, $39;
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
  x = 1; $34 = 66;
  if (x <= $34) for (;;) {
    y = 1; $35 = 25;
    if (y <= $35) for (;;) {
      pf[(x) * 25 + (y) - 26] = 0;
      if (y >= $35) break;
      y++;
    }
    if (x >= $34) break;
    x++;
  }
  x = 1; $36 = 999;
  if (x <= $36) for (;;) {
    sx[(x) - 1] = 0;
    sy[(x) - 1] = 0;
    mx[(x) - 1] = 0;
    my[(x) - 1] = 0;
    fx[(x) - 1] = 0;
    fy[(x) - 1] = 0;
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
      } else if ($39 === '!') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 222;
      } else if ($39 === 'P') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 40;
        px = ((xloop + 1)) << 16 >> 16;
        py = ((yloop + 1)) << 16 >> 16;
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

}
function trigger_trap(place$2, i$2, ch$2) {

}
function end_routine() {
  let $41, $42, $43, $44, $45, $46, $47, $48, $49;
  footstep();
  R.delay(300);
  footstep();
  R.delay(300);
  footstep();
  x = 1; $41 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
  if (x <= $41) for (;;) {
    R.sound((R.random(3000) + x));
    R.gotoxy(px, py);
    bak(R.random(8), 0);
    col(14, 15);
    R.write('\x02');
    col(R.random(16), R.random(16));
    bak(0, 0);
    print(15, 25, 'Oh no, something strange is happening!');
    if (x >= $41) break;
    x++;
  }
  i = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $42 = 20;
  if (i >= $42) for (;;) {
    R.sound(R.random(i));
    if (i <= $42) break;
    i--;
  }
  col(14, 15);
  bak(0, 0);
  x = 1; $43 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
  if (x <= $43) for (;;) {
    R.sound((x * 3));
    R.gotoxy(px, py);
    R.write(String.fromCharCode(((220 + R.random(4))) & 255));
    if (x >= $43) break;
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
  i = 1; $44 = gems;
  if (i <= $44) for (;;) {
    R.sound(((i * 8) + 100));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $44) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(15, 25, 'Your Whips are worth 100 points each...');
  i = 1; $45 = whips;
  if (i <= $45) for (;;) {
    R.sound(((i * 10) + 200));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $45) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
  i = 1; $46 = teleports;
  if (i <= $46) for (;;) {
    R.sound(((i * 12) + 300));
    score = ((score + 20)) | 0;
    update_info();
    R.delay(30);
    if (i >= $46) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(14, 25, 'Your Keys are worth 10,000 points each...');
  i = 1; $47 = keys;
  if (i <= $47) for (;;) {
    R.sound(((i * 30) + 100));
    score = ((score + 1000)) | 0;
    update_info();
    R.delay(50);
    if (i >= $47) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  bak(gemcolor, 7);
  x = 1; $48 = 30;
  if (x <= $48) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    if (x >= $48) break;
    x++;
  }
  bak(0, 0);
  x = 1; $49 = 30;
  if (x <= $49) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    R.sound((x * 45));
    if (x >= $49) break;
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
  R.write('   For years you\'ve waited for such a wonderful archaeological' + '\r\n');
  R.write(' discovery. And now you possess one of the greatest finds ever!' + '\r\n');
  R.write('   The Magical Staff will bring you even more recognition than' + '\r\n');
  R.write(' the Priceless Amulet you previously found in the depths of' + '\r\n');
  R.write(' Kroz.  However, Kroz is still mostly unexplored, and you have' + '\r\n');
  R.write(' reason to believe that even more fabulous treasures lie below.' + '\r\n');
  R.write('   Therefore, it doesn\'t take much to convince you that another' + '\r\n');
  R.write(' expedition is in order.  You must leave no puzzle unsolved, no' + '\r\n');
  R.write(' treasure unfound--to quit now would be a coward\'s choice.' + '\r\n');
  R.write('   So you plan for a good night\'s rest, and think ahead to' + '\r\n');
  R.write(' tomorrow\'s new journey.  What does the mysterious Kingdom of' + '\r\n');
  R.write(' Kroz have waiting for you, what type of new creatures will' + '\r\n');
  R.write(' try for your blood, and what new brilliant treasure does' + '\r\n');
  R.write(' Kroz protect.  Tomorrow will tell...' + '\r\n');
  R.write('' + '\r\n');
  col(14, 15);
  R.write('                        KINGDOM OF KROZ' + '\r\n');
  col(15, 7);
  R.write('        ( Now available -- $7.50 or write for details. )');
  clearkeys();
  R.window(1, 1, 80, 25);
  bak(0, 0);
  flash(21, 25, 'Press any key, Adventurer.');
  won();
}
function level1() {
  fp[(1) - 1] = R.trunc('        1    1     1  1     1     1   1      1        1         ', 64);
  fp[(2) - 1] = R.trunc('   ---#######   1        1     1          1      1#######---   1', 64);
  fp[(3) - 1] = R.trunc('   #        #1      1     1        1    1      1  #+ + + + #    ', 64);
  fp[(4) - 1] = R.trunc('1  #   TT   #     1   1      1   1          1     # + + + +#1   ', 64);
  fp[(5) - 1] = R.trunc('   #        #  1        1       1     1         1 #+ + + + #    ', 64);
  fp[(6) - 1] = R.trunc('   ##########       1     1         1     1   1   ##########  1 ', 64);
  fp[(7) - 1] = R.trunc('1   1       1     1    1      1         1       1      1       1', 64);
  fp[(8) - 1] = R.trunc('  1      1      1                         1       1     1    1  ', 64);
  fp[(9) - 1] = R.trunc('   1    1   1      1   XXXXXXXXXXXXXXX     1   1     1        1 ', 64);
  fp[(10) - 1] = R.trunc('      1      1   1     XXXXX  I  XXXXX   1      1   1    1      ', 64);
  fp[(11) - 1] = R.trunc('1   1    1    1    1   XXXX+     +XXXX    1   1       1        1', 64);
  fp[(12) - 1] = R.trunc(' 1      1  1    1      XXXX+  P  +XXXX   1      1      1    1   ', 64);
  fp[(13) - 1] = R.trunc('    1     1  1     1   XXXX+     +XXXX     1      1  1    1    1', 64);
  fp[(14) - 1] = R.trunc(' 1   1     1     1     XXXXX  S  XXXXX   1    1       1      1  ', 64);
  fp[(15) - 1] = R.trunc('1      1 1    1        XXXXXXXXXXXXXXX      1   1       1     1 ', 64);
  fp[(16) - 1] = R.trunc('  1     1  1      1                      1     1    1      1    ', 64);
  fp[(17) - 1] = R.trunc('    1       1    1     1     1     1    1     1       1 1      1', 64);
  fp[(18) - 1] = R.trunc('1  ##########1    1   1    1    1     1      1   1########## 1  ', 64);
  fp[(19) - 1] = R.trunc(' 1 # W W W W# 1        1    1     1      1 1      #        #    ', 64);
  fp[(20) - 1] = R.trunc('1  #W W W W #   1   1    1     1     1         1  #   LL   #  1 ', 64);
  fp[(21) - 1] = R.trunc('   # W W W W#1       1    1        1   1     1    #        #    ', 64);
  fp[(22) - 1] = R.trunc('1  ---#######    1     1    1 1     1     1     1 #######---    ', 64);
  fp[(23) - 1] = R.trunc('        1    1     1            1  1     1     1        1      1', 64);
  convert_format();
}
function level3() {
  fp[(1) - 1] = R.trunc('+++##############RRRRRRR###         ##sm######TVVVVT##K-        ', 64);
  fp[(2) - 1] = R.trunc('+C+D       +    K#RRRRRRR##    C    ##was#### VVVVVV ###      # ', 64);
  fp[(3) - 1] = R.trunc('+++######## ####1#RRRRRRR##         ##here## VVV++VVV ##333333# ', 64);
  fp[(4) - 1] = R.trunc('########### #####1#RRRRRRR#####T########### VVV++++VVV1######## ', 64);
  fp[(5) - 1] = R.trunc('         +# #2####1#RRRRRRR######+# #K# #3#1VVV++++VVV       2KC', 64);
  fp[(6) - 1] = R.trunc(' # ######## ##+####+#RRRRRRR###....# # # ### VVV++VVVV #X###### ', 64);
  fp[(7) - 1] = R.trunc('3# #######  ###+#####RRRRRRR## ############## VVVVVVV ##X##C### ', 64);
  fp[(8) - 1] = R.trunc(' # ###### # ####+#####RRRRRRR##  ##+:   :+#### VVVVV ###X##X### ', 64);
  fp[(9) - 1] = R.trunc('.# #T### ## #####+####XRRRRRRRX## #   :  :#####     ###TTT#X### ', 64);
  fp[(10) - 1] = R.trunc('.# # ##+### ######+###XXXXXXXXX# ## ::::: ####### # #######X### ', 64);
  fp[(11) - 1] = R.trunc('.# # # ###                          :+K+:         # #XXXXXXX###+', 64);
  fp[(12) - 1] = R.trunc('.# # C###   P  ###### ###XXXXXXXXX# ::;:: ####### # #XXXXXX####D', 64);
  fp[(13) - 1] = R.trunc('.# #3#### ////####### ###XRRRRRRRX#:: :   ###VW## # #XXXXX##WWWW', 64);
  fp[(14) - 1] = R.trunc('.# ###////\\\\\\//###### ####RRRRRRR##+ :  :+###TV## # #XXXX##KWWWW', 64);
  fp[(15) - 1] = R.trunc('.# ##//\\\\\\\\C\\//////## ##T##RRRRRRR###########V+## #     ####WWWW', 64);
  fp[(16) - 1] = R.trunc('.# ##///\\\\\\1\\////###+ #+-+##RRRRRRR##cavern## V## ###///########', 64);
  fp[(17) - 1] = R.trunc(' # ###///\\\\\\//#####+# #---###RRRRRRR##of#####V ## #222222222\\###', 64);
  fp[(18) - 1] = R.trunc(' #  Q###//// #####+## #-C-#Z#RRRRRRR#tunnels# V## #222222222\\1 #', 64);
  fp[(19) - 1] = R.trunc(' ########### ####+### #---#3##RRRRRRR########V ## #222222222\\#D#', 64);
  fp[(20) - 1] = R.trunc('          I  ###2#### #2-2# ##RRRRRRR####  ## V## #222222222##D#', 64);
  fp[(21) - 1] = R.trunc('##################### ##/## ###RRRRRRR## ## #V ## #222222222##D#', 64);
  fp[(22) - 1] = R.trunc('22222222222222222222#       ####RRRRRRR# ###X V## #222222222##D#', 64);
  fp[(23) - 1] = R.trunc('K + + + + + + + + +   ###########RRRRRRR#++##V    \\---------##L#', 64);
  convert_format();
}
function level5() {
  fp[(1) - 1] = R.trunc('//1////////\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\11111\\C\\1111111\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\XXCCC', 64);
  fp[(2) - 1] = R.trunc('/////////1//\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\111\\\\\\111111\\\\XXX\\\\\\1\\\\\\\\\\\\\\/1XXCCC', 64);
  fp[(3) - 1] = R.trunc('///RRR///////\\\\\\\\\\\\\\\\\\\\\\\\\\\\Z\\\\111111111\\\\\\\\XLX\\\\\\\\\\\\\\\\\\\\///XXXXX', 64);
  fp[(4) - 1] = R.trunc('//RRRRRR//////\\\\\\\\\\\\U\\\\\\\\1\\\\\\\\\\\\11111\\\\\\\\\\\\XXX\\\\\\\\\\/////////////', 64);
  fp[(5) - 1] = R.trunc('///RRRR///////\\\\\\1\\W W\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\//////1//////////', 64);
  fp[(6) - 1] = R.trunc('/1//RR//XXXX/1//\\\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\//1/////////////////1////', 64);
  fp[(7) - 1] = R.trunc('////////XCCX1//1////\\\\\\\\\\\\\\\\\\\\\\\\///////////////1////////////////', 64);
  fp[(8) - 1] = R.trunc('////////XXXX/////////////////1////////////////////////XXXXXXXXXX', 64);
  fp[(9) - 1] = R.trunc('XXXX///////////////1///////////////XXXXXXXXXXXXXXXXXXXX=========', 64);
  fp[(10) - 1] = R.trunc('===XXXXXXXXXXX/////////XXXXXXXXXXXXX============================', 64);
  fp[(11) - 1] = R.trunc('=============XXXXXXXXXXX========================================', 64);
  fp[(12) - 1] = R.trunc('======================================================  1     ; ', 64);
  fp[(13) - 1] = R.trunc('K11 111===============================W       1  W        W   : ', 64);
  fp[(14) - 1] = R.trunc('1 1111 11 1    1       W        1         RR                  : ', 64);
  fp[(15) - 1] = R.trunc('111 1111 11 1              W            RRRRR       W         : ', 64);
  fp[(16) - 1] = R.trunc('1 1111 1111       1               W      +RRRRR               : ', 64);
  fp[(17) - 1] = R.trunc('111 1111 1   1            1              RRRRRRRR1         W  : ', 64);
  fp[(18) - 1] = R.trunc('1 1111 1111   B         W                 +RRRRRRR           1: ', 64);
  fp[(19) - 1] = R.trunc('111 1111 111 1                      W     RRRRRRR    W        : ', 64);
  fp[(20) - 1] = R.trunc('11 11 1111       1          W        1   RRRRRR         1     : ', 64);
  fp[(21) - 1] = R.trunc(' 111111 1    1      W                     RRR1           W    : ', 64);
  fp[(22) - 1] = R.trunc('111 11 111 1    1         P                      W            :`', 64);
  fp[(23) - 1] = R.trunc('1 11111 111  1       W            W                   W      I:U', 64);
  convert_format();
}
function level7() {
  fp[(1) - 1] = R.trunc(' I                3+             3+             3+             3', 64);
  fp[(2) - 1] = R.trunc('PI                3+             3+             3+             3', 64);
  fp[(3) - 1] = R.trunc(' I                3+             3+             3+             3', 64);
  fp[(4) - 1] = R.trunc('############################################################### ', 64);
  fp[(5) - 1] = R.trunc('+      ;K ##33333 33333##2 222 22222##111111 1111##..  ..     . ', 64);
  fp[(6) - 1] = R.trunc(';;; ;; ;; ##3 33333 333##222222 2222##1 111111 11##  .. .....   ', 64);
  fp[(7) - 1] = R.trunc('U;;  ;  ; ##33 33U333 3## 2222U22 22##11111U1111 ## ....########', 64);
  fp[(8) - 1] = R.trunc('  ;; ;; ; ##3333 333333##222 2222222##11 1111 111##. .. U    3..', 64);
  fp[(9) - 1] = R.trunc('; I  ;;   ##3 3333333 3## 2222222 22##1 11 111111##.    #     .C', 64);
  fp[(10) - 1] = R.trunc(' ###############################################################', 64);
  fp[(11) - 1] = R.trunc('                     W;33333333333333333333333333333333333333333', 64);
  fp[(12) - 1] = R.trunc('  ###########################################W         K    ++++', 64);
  fp[(13) - 1] = R.trunc('Z                                T                             1', 64);
  fp[(14) - 1] = R.trunc('  ##############################################################', 64);
  fp[(15) - 1] = R.trunc('    # #+# #1# #+# #1# # #E#+# # #1# # #1# #;# #1# # # #+# #;# ##', 64);
  fp[(16) - 1] = R.trunc('  ## # #E# # #1# # # #;# # # # # # #E# #+#1# # #;# #1# #1#E# #T#', 64);
  fp[(17) - 1] = R.trunc('  # # # #;# # # #1# #+#1# # #1# # # # #1# # # # # #E# # # #;#Q##', 64);
  fp[(18) - 1] = R.trunc('  ## #1# #+# # # #E# # # #1#;# #+# # #;# # #1#E#+# # #;# # #E#T#', 64);
  fp[(19) - 1] = R.trunc('    # # # # #1# # # #1# # # # # # #1# # #E# # #1# #1# # #1# # ##', 64);
  fp[(20) - 1] = R.trunc('  ##############################################################', 64);
  fp[(21) - 1] = R.trunc('  ###K     ;      3    +:    3     :+3       +: 3    :+     +  3', 64);
  fp[(22) - 1] = R.trunc('  ##########  ##   :+  3  +    :+      :+     3  +:+     3  ::::', 64);
  fp[(23) - 1] = R.trunc('              ##3         3 +:    3 +   3  :+      3   :+  :D`DL', 64);
  convert_format();
}
function level9() {
  fp[(1) - 1] = R.trunc('K            3-      33333VVVVVVVVVVVV    .         .       .  Z', 64);
  fp[(2) - 1] = R.trunc('     3-     ---     33VVVVVVVVVVVVVVZ          .                ', 64);
  fp[(3) - 1] = R.trunc('3-  ---           333VVVVVVVVVVVVVVVVVV  .        U   .      .  ', 64);
  fp[(4) - 1] = R.trunc('--              333VVVVVVVVVVVVVVVVVVVVVW    .           .      ', 64);
  fp[(5) - 1] = R.trunc('          3-   33VVVVVVVV\\\\\\\\\\\\\\\\VVVVVVVVVV         .        VVV', 64);
  fp[(6) - 1] = R.trunc('   3-    ---  33VVVVVVV\\\\++++W+++\\\\VVVVVVVVVV   .    ZVVVVVVVVVV', 64);
  fp[(7) - 1] = R.trunc('  ---        33VVVVVVV\\++\\\\RRRR\\\\+++\\\\VVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(8) - 1] = R.trunc('3-       U  33VVVVVV\\\\+\\\\RRRRRRRRRR\\++\\\\VVVVVVVVVVVVVVVVVVVVVVVC', 64);
  fp[(9) - 1] = R.trunc('--         33VVVVVV\\\\+\\RRRRRR////RRRR\\+\\\\\\VVVVVVVVVVVVVVV1111111', 64);
  fp[(10) - 1] = R.trunc('      333333VVVVVV\\\\+\\RRRR////11///RRR\\++\\\\VVVVVVVVV111111111111', 64);
  fp[(11) - 1] = R.trunc('  33333VVVVVVVVVV\\\\+\\\\RRR///11   1//RRRR\\+\\\\VVVV1111111111111111', 64);
  fp[(12) - 1] = R.trunc('333VVVVVVVVVVVVV\\\\\\W\\RRR//C111 P 11//RRR\\W\\\\\\VVV1111111---111111', 64);
  fp[(13) - 1] = R.trunc('VVVVVVVVVVVVVVVVV\\\\\\+\\RRR//111   11//RRR\\+\\\\VVVV1111111-B-111111', 64);
  fp[(14) - 1] = R.trunc('VVVVVVVVVVVVVVVVVV\\\\\\+\\RRR//111U11//RRR\\\\+\\VVVVVV111111---111111', 64);
  fp[(15) - 1] = R.trunc('VVVVV3 .  3  VVVVVVV\\\\+\\RRR////////RRRR\\+\\\\VVVVV1111111111111111', 64);
  fp[(16) - 1] = R.trunc('3-.     -- .  VVVVVV\\\\\\+RRRR//////RRRR\\+\\\\VVVVV11111111111111---', 64);
  fp[(17) - 1] = R.trunc('--   - .3- --- VVVVVVV\\\\+\\RRRRRRRRRRR\\+\\\\VVVVV111111111111111- U', 64);
  fp[(18) - 1] = R.trunc('  - 3-  --.-3-. VVVVVVVV\\++\\RRRRRR\\\\++\\VVVVVV1111111111111111---', 64);
  fp[(19) - 1] = R.trunc(' 3.        ---   VVVVVVVVV\\++++W++++\\\\VVVVVV111111---11111111111', 64);
  fp[(20) - 1] = R.trunc('       U  3   3-  .VVVVVVVV\\\\\\\\\\\\\\\\VVVVVVVV1111111-B-11111111111', 64);
  fp[(21) - 1] = R.trunc('.  --.      - --.  - VVVVVVVVVVVVVVVVVVVVV11111111---11111111111', 64);
  fp[(22) - 1] = R.trunc('   3 --    3   -- 3-  ##VVVVVVVVVVVVVVVVV11111111111111111111111', 64);
  fp[(23) - 1] = R.trunc(' .   3  .    . 3-   . D+DLVVTTCCCTTVVVCC11111111111111111111111K', 64);
  convert_format();
}
function level11() {
  fp[(1) - 1] = R.trunc('                                                        WWWW  3S', 64);
  fp[(2) - 1] = R.trunc('U################# #################################`###########', 64);
  fp[(3) - 1] = R.trunc(' :3; \\3+#3 W    K#3  #  W  W  W  W  W  W  W  W  W  #   3     3  ', 64);
  fp[(4) - 1] = R.trunc('Z:+: \\3+# 3      #3  #  /////////////////////////  #      3     ', 64);
  fp[(5) - 1] = R.trunc(' :3; \\3+#    3   #3  #  /+//////+/////T///////+//  #            ', 64);
  fp[(6) - 1] = R.trunc(' :+: \\3+#        #3  #  ////T/////////////+////// 3#  3 ::;:  3 ', 64);
  fp[(7) - 1] = R.trunc(' :3; \\3+# 3  3   #3  # 3//////////W//////////////  #    :CC:    ', 64);
  fp[(8) - 1] = R.trunc(' :+: \\3+# W      #3  #  //+//////////////////+///  #    ;:::    ', 64);
  fp[(9) - 1] = R.trunc(' :3; \\3+#      3 #3  #  ///////+///////+/////////3 #3         3 ', 64);
  fp[(10) - 1] = R.trunc(' :+: \\3+#3       #3  #3 /////////////////////////  #       3    ', 64);
  fp[(11) - 1] = R.trunc(' :3; \\3+#W   3   #3  #  ///+//////XXXXX////W/////  #  3       3 ', 64);
  fp[(12) - 1] = R.trunc('P:C: \\3K#       3#3  #  ////////+/XXKXX+/////////  #############', 64);
  fp[(13) - 1] = R.trunc(' :3; \\3+# 3      #3  #  //////////XXXXX////////+/ 3#3         ++', 64);
  fp[(14) - 1] = R.trunc(' :+: \\3+#     3  #3  # 3/+////////+///////T//////  #3+        ++', 64);
  fp[(15) - 1] = R.trunc(' :3; \\3+#  3W    #3  #  /////////////////////////  #3+          ', 64);
  fp[(16) - 1] = R.trunc(' :+: \\3+#        #3  #  /////T//////+////////+///  #3+      ::::', 64);
  fp[(17) - 1] = R.trunc(' :3; \\3+# 3    3 #3  #3 /////////////////////////3 #3+      ```L', 64);
  fp[(18) - 1] = R.trunc(' :+: \\3+#        #3  #  //W//////////////+///////  #3+      ::::', 64);
  fp[(19) - 1] = R.trunc(' :3; \\3+#W   3   #3  #  /////+////+///////////+//  #3+          ', 64);
  fp[(20) - 1] = R.trunc('S:+: \\3+#3       #3  #  /////////////////////////  #3+        ++', 64);
  fp[(21) - 1] = R.trunc(' :3; \\3+#        #3 K#                             #3         ++', 64);
  fp[(22) - 1] = R.trunc('U### ####I########################## ###############E###########', 64);
  fp[(23) - 1] = R.trunc('                                                        ++++  3S', 64);
  convert_format();
}
function level13() {
  fp[(1) - 1] = R.trunc('KKKKDE EI .  I  E    2  I   E  RRCC211///////// ////////////T//K', 64);
  fp[(2) - 1] = R.trunc('VVVVVE     2    I    .     .   RR22211//////// / ///////////2// ', 64);
  fp[(3) - 1] = R.trunc('  E  I .    E  .     E  .    2 RR11111///   / ///      /////2// ', 64);
  fp[(4) - 1] = R.trunc('2  . 2  E .     E2  . I    I   RR//////// // ////////// ////2// ', 64);
  fp[(5) - 1] = R.trunc('  I   .    I   I .        .    RR//////// /////222////// ///2// ', 64);
  fp[(6) - 1] = R.trunc('E .   I E  .2  E    E .    E   RR/////T// /////2P2/   /// //2// ', 64);
  fp[(7) - 1] = R.trunc(' 2   E  . I    .   I   I .    ERRC/////// /////222/ // /// / // ', 64);
  fp[(8) - 1] = R.trunc('I   .    2 E.  E     .      I  RR//////// ////// // // ////  // ', 64);
  fp[(9) - 1] = R.trunc('.E I    .    I    2   E     .2 RR//////// ///////  ///I///// // ', 64);
  fp[(10) - 1] = R.trunc('   . 2     .      . I          RR//      1/ ////////// ////// / ', 64);
  fp[(11) - 1] = R.trunc('2I   . E   I  2.I  E      I.  \\\\\\\\ /////// /           ///////  ', 64);
  fp[(12) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR\\ZZ\\RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(13) - 1] = R.trunc('22--2-2--2--2-+--22----2-2---2\\\\\\\\VVVVVVVVVVVTVVV W VVVVVVTVVVVV', 64);
  fp[(14) - 1] = R.trunc('--2-2--2-2-2---2---2-2-+2---2--RR   .VVVVVVVVV + VVVTVVVV V VVVV', 64);
  fp[(15) - 1] = R.trunc('+2-2--2---2-2---22---2---2----2RRV     . VVVVVVVVVVVV VV VVV   V', 64);
  fp[(16) - 1] = R.trunc('2--+-2--2--+--22---2--+-2---2-+RRVV.  .     .VVVVVVVV V VVVVVV V', 64);
  fp[(17) - 1] = R.trunc('-2--2-2--2---2-+-22----2--2----RRVVVV    .       .VVVV  VVVV TVV', 64);
  fp[(18) - 1] = R.trunc('2-2--2--2-+2--B-2---2-+-2--+-2-RRVVVVVV  .   .      VVVVVVV VVVV', 64);
  fp[(19) - 1] = R.trunc('2+-2---2--2--2-2--2---2--2-----RRVVVVVVVV         .   .VVVVV VVV', 64);
  fp[(20) - 1] = R.trunc('-22-+-2--2-2---22--+-2--2-2-2--RRVVVVVVVVVV .            .V VVVV', 64);
  fp[(21) - 1] = R.trunc('2---2---2-2--2-+-2----2----2--+RRVVVVLDVVVVVV  .    .     . VVVV', 64);
  fp[(22) - 1] = R.trunc('VVVV2--2-+-2-2----2--2-2-2-2---RRCCVVVVDVDDVD                VVV', 64);
  fp[(23) - 1] = R.trunc('KKKD-2---2-2--2-2---2-+-2--2--2RRCCVVVVVDVVDVV222222222222222DKK', 64);
  convert_format();
}
function level15() {
  fp[(1) - 1] = R.trunc('+*****#3#L#+ \\    2    \\ 2   2   W#CCCC#=C;=====    ====        ', 64);
  fp[(2) - 1] = R.trunc('+**Q**# #D#     \\/  2 \\\\     //   ##33##=;;===== === == ======= ', 64);
  fp[(3) - 1] = R.trunc('+*****# #D#\\\\  //\\/   \\     \\\\// 2#\\33\\#===I=.  === ==== ===== =', 64);
  fp[(4) - 1] = R.trunc('2###### #X#2  2 ///     2    //   #\\33\\#====  .=== ====== === ==', 64);
  fp[(5) - 1] = R.trunc('2D33V  ##X#\\\\       2   \\/     2  #\\33\\#===. .=== ======= == ===', 64);
  fp[(6) - 1] = R.trunc('2#33#C##X##\\/\\  2 /\\     2   /\\   #\\33\\#==.  ==== ==  S  == ====', 64);
  fp[(7) - 1] = R.trunc('2#33#.##X#W\\/\\\\      2  \\\\\\   //  #\\;;\\#== ====== == ======11111', 64);
  fp[(8) - 1] = R.trunc('2#33#.##X#/\\B      \\/  \\\\/   2  2 #\\  \\#== ====== === =====11111', 64);
  fp[(9) - 1] = R.trunc('2#33#.###X\\///  ///   2 \\\\        #X  X#=== ===== ==== ====11111', 64);
  fp[(10) - 1] = R.trunc('2#33#.#####+\\//2/\\//         \\\\ 2 #X  X#=    ==== ===== =======;', 64);
  fp[(11) - 1] = R.trunc('2#33#.##X##++\\////   2\\  \\  //\\\\  #X  X#= ======= W  : ======= =', 64);
  fp[(12) - 1] = R.trunc('2#33#.##XX##         \\/\\ 2   \\\\2  #X  X#== ====== 2    ====== ==', 64);
  fp[(13) - 1] = R.trunc('2#XX#.##XXX######## 2          ---#X  X#= ================ W ===', 64);
  fp[(14) - 1] = R.trunc('2#XX#.##XRRRRRRRRR##########2  - U#X  X# ====    ===1==== ======', 64);
  fp[(15) - 1] = R.trunc(';#XX#.##XRRRRRRRRRRRRRRRRRR########X  X#= == ==== == ==== ======', 64);
  fp[(16) - 1] = R.trunc(' #XX#.##XXRRRRRRRRRRRRRRRRRRRRRRRR#X  X#=K==    ==   =====   ===', 64);
  fp[(17) - 1] = R.trunc(' #XX#.##X##11RRRRRRRRRRRRRRRRRRRRR##  ########== ==== ======= ==', 64);
  fp[(18) - 1] = R.trunc('Z#XX#.####11111111111111RRRRRRRRR##  ##RRRRRR###= ==== ======= =', 64);
  fp[(19) - 1] = R.trunc(' #XX#.###11111111111111111111RRR##  ##RRRRRRRRR#== === ======== ', 64);
  fp[(20) - 1] = R.trunc(' #XX#.##11111111111111111111111##  ##RRRRRRRRRR##== == ======== ', 64);
  fp[(21) - 1] = R.trunc(' #CK#.##11111111B111111111B11111111##RRRRRRRRRRR#   == ======= =', 64);
  fp[(22) - 1] = R.trunc('P####X##111111111111111111111111111111RRRRRRRRRRU#====   ==== ==', 64);
  fp[(23) - 1] = R.trunc('       /-------------C----------------URRRRRRRRRRR#======      T', 64);
  convert_format();
}
function level17() {
  fp[(1) - 1] = R.trunc('     2    KRR++                P RRRRRRRRRRRR                   ', 64);
  fp[(2) - 1] = R.trunc(' RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR      -         RRRRRRRRRRRRRRR  ', 64);
  fp[(3) - 1] = R.trunc('                    ++++++C 3RR  RRRRR1 RRRRR  RRCE             ', 64);
  fp[(4) - 1] = R.trunc(' RRRRRRRRRRRRRRRRRRRRRRRRRR  RR  RRC1RRRR 1RR  RRRRRRRRRRRRRRRRR', 64);
  fp[(5) - 1] = R.trunc('2222222222           ZRRTRRRRRR  RR  -     -       XXXXXXXXXXXKR', 64);
  fp[(6) - 1] = R.trunc('--RRRR--RRRRRRRRRRRRRRRR     RR33RRRRRRRRRRRR  RR  RRRRRRRRRRRRR', 64);
  fp[(7) - 1] = R.trunc('  RR-----------..*****RRRRR    **         +RR  RR             RR', 64);
  fp[(8) - 1] = R.trunc('  RR--RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR--RRRRRRRRRRRRR  RR', 64);
  fp[(9) - 1] = R.trunc('  RR--RR11111111----------D+DWD+DWD+DWLLRR333          2CBRR  RR', 64);
  fp[(10) - 1] = R.trunc('  RR--RR11111111RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR  RR', 64);
  fp[(11) - 1] = R.trunc('  RR--RR--RRRRRRRR  DT+*W*+TCRRZ1                             RR', 64);
  fp[(12) - 1] = R.trunc('  RR--RR--RRII.KRR  RRRRRRRRRRRRRRRRRRRR  RRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(13) - 1] = R.trunc('  RR--RR--RRIIRRRR                        RRU1-------XXXXXXXXX  ', 64);
  fp[(14) - 1] = R.trunc('  RR--RR--RRIIRRRRRRRRRRRRRRRRRRRRRR  RR  RRRRRRRRRRRRRRRRRRRR  ', 64);
  fp[(15) - 1] = R.trunc('  RR--RR--RR..RR 1RR 1RR 1RRR         RR                        ', 64);
  fp[(16) - 1] = R.trunc('  RR--RR--RRIIRR  -   -   -    RRRRRRRRR  RRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(17) - 1] = R.trunc('  RR------RRIIRR  RRRRRRRRRRR  RR  ;W;W;           22222222CRRK ', 64);
  fp[(18) - 1] = R.trunc('  RRRRRRRRRRIIRR         2KRRWWRR  RRRRRRRRRRRRRRRRRRRRRRRRRRR--', 64);
  fp[(19) - 1] = R.trunc('         -    RRRRRRRRRRRRRRRRRRR  RRXXXXXXXXXXXXXC3333333333333', 64);
  fp[(20) - 1] = R.trunc('  RRRRR 1RRR          1            RR--RRRRRRRRRRRRRRRRRRRRRRR- ', 64);
  fp[(21) - 1] = R.trunc('  X  RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR--URRCCRRCCRRXXXXXX333333  ', 64);
  fp[(22) - 1] = R.trunc('--RR              RRRRRRRR    2   KRR- RRR..RR..RR**RR**RR**RR  ', 64);
  fp[(23) - 1] = R.trunc('33RRRRRRRRRRRRRR   *    *   RRRRRRRRR--E.E******RRK*RR**RR**RR  ', 64);
  convert_format();
}
function level19() {
  fp[(1) - 1] = R.trunc('1  C  1      +   1   +        +  1      +     + 1 RRR++++++RRRRL', 64);
  fp[(2) - 1] = R.trunc('--   ---  1     ---        1    ---  1         ---RRRR++++++RRRD', 64);
  fp[(3) - 1] = R.trunc(' 1       ---RRRRRR    1   ---       ---    W      RRRR;;;;;;RRR1', 64);
  fp[(4) - 1] = R.trunc('---  *  1 RRRRRRRRRR1---       1       1       1  RRRR111111RRR1', 64);
  fp[(5) - 1] = R.trunc('1      RRRRR#####RRRRRR 1     ---     ---   1 ---RRRRR111111RRR1', 64);
  fp[(6) - 1] = R.trunc('--1   RRRRRR#U K#RRRRR ---  1      T       ---  RRRRRR11111RRRR1', 64);
  fp[(7) - 1] = R.trunc(' ---   RRRRR#####RRR       ---           1    #RRRRRR#11111RRRR1', 64);
  fp[(8) - 1] = R.trunc('    1    RRRRRRRRRR  1           1      ---   ########11111RRRR1', 64);
  fp[(9) - 1] = R.trunc(' * ---    RRRRRRRR  ---         ---   1       D--Z---`11B11RRRR1', 64);
  fp[(10) - 1] = R.trunc('      1    RRRRR            W        ---      ########111111RRR1', 64);
  fp[(11) - 1] = R.trunc('     ---                                      #RRRRRR#111111RRR1', 64);
  fp[(12) - 1] = R.trunc('               ;;;;;;;;;;;;;;;;;;;;;;;;;;;;; FFRRRRRR1111111RRR1', 64);
  fp[(13) - 1] = R.trunc('#############################################;;;RRRRR11111111RR1', 64);
  fp[(14) - 1] = R.trunc('    #++#W3#* #  # *##::::::+::::K:::::::::::#1111RRRRR1111111RR1', 64);
  fp[(15) - 1] = R.trunc(' #  #3 #3 #        ##:3::::::::-::::::3:::::#11111RRRRR111111RR1', 64);
  fp[(16) - 1] = R.trunc('P#  #  #  #3 #  #  ##:::::::::-:::3:::::::::#11111RRRRR111111RR1', 64);
  fp[(17) - 1] = R.trunc(' #3 #  K  #  #  #3 ##::::::::-::::::::::::::#11111RRRRR11B111RR1', 64);
  fp[(18) - 1] = R.trunc('I#  #  #  #  # 3#  ##:::3:::-:::::::::::3:::#11111RRRRR11111RRR1', 64);
  fp[(19) - 1] = R.trunc(' #  #  #  #  #  #  ##::::::;::::::::*:::::::#1111RRRRRR11111RRR1', 64);
  fp[(20) - 1] = R.trunc('Z#  #  # 3# 3#  #  ##///////////////////////#1111RRRRR11111RRRR1', 64);
  fp[(21) - 1] = R.trunc(' #     #  #  #3 #                           #EEERRRRRR11111RRRR1', 64);
  fp[(22) - 1] = R.trunc('C# 3#  #  #  #**#  ##\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#+++RRRRR;;;;;;RRRR ', 64);
  fp[(23) - 1] = R.trunc('3#+ #3*#3    #**#+3##33333333333333333333333#CCRRRRRRR*-U-*RRRRU', 64);
  convert_format();
}
function level21() {
  fp[(1) - 1] = R.trunc('LVVVVVVVVVVVVVVVVVVVVVV333333333333333333VVVVVVVVVVVVVVVVVVVVVVK', 64);
  fp[(2) - 1] = R.trunc('DVVVVVVVVVVVVVVVVVVVV333                333VVVVVVVVVVVVVVVVVVVVI', 64);
  fp[(3) - 1] = R.trunc('.VVVVVVVVVVVVVVVVVV333         ***        333VVVVVVVVVVVVVVVVVV-', 64);
  fp[(4) - 1] = R.trunc('DVVVVVVVVVVVVVVVV333         *******        333VVVVVVVVVVVVVVVV-', 64);
  fp[(5) - 1] = R.trunc('.VV+VVVVVVVVVVV333          ****F****         333VVVVVVVVVVV+VV-', 64);
  fp[(6) - 1] = R.trunc('DVQ+VVVVVVVVV333   +         *******         +  333VVVVVVVVV+CV-', 64);
  fp[(7) - 1] = R.trunc('-VV+VVVVVVV333        +        ***        +       333VVVVVVV+VV-', 64);
  fp[(8) - 1] = R.trunc('-VVVVVVVV333             +             +            333VVVVVVVV-', 64);
  fp[(9) - 1] = R.trunc('-VVVVVV333      Z                              T      333VVVVVV-', 64);
  fp[(10) - 1] = R.trunc('-VVVV333                     -------                    333VVVV-', 64);
  fp[(11) - 1] = R.trunc('-VV333                      ---------                     333VV-', 64);
  fp[(12) - 1] = R.trunc('E33C3         +    +    +  -----P-----  +    +    +        3C33E', 64);
  fp[(13) - 1] = R.trunc('-VV333                      ---------                     333VV-', 64);
  fp[(14) - 1] = R.trunc('-VVVV333                     -------                    333VVVV-', 64);
  fp[(15) - 1] = R.trunc('-VVVVVV333      T                              Z      333VVVVVV-', 64);
  fp[(16) - 1] = R.trunc('-VVVVVVVV333             +             +            333VVVVVVVV-', 64);
  fp[(17) - 1] = R.trunc('-VV+VVVVVVV333        +        ***        +       333VVVVVVV+VV-', 64);
  fp[(18) - 1] = R.trunc('-VC+VVVVVVVVV333   +         *******         +  333VVVVVVVVV+CV-', 64);
  fp[(19) - 1] = R.trunc('-VV+VVVVVVVVVVV333          ****F****         333VVVVVVVVVVV+VV-', 64);
  fp[(20) - 1] = R.trunc('-VVVVVVVVVVVVVVVV333         *******        333VVVVhelp!VVVVVVV-', 64);
  fp[(21) - 1] = R.trunc('-VVVVVVVVVVVVVVVVVV333         ***        333VVVVVVVVVVVVVVVVVV-', 64);
  fp[(22) - 1] = R.trunc('.VVVVVVVVVVVVVVVVVVVV333                333VVVVVVVVVVVVVVVVVVVVF', 64);
  fp[(23) - 1] = R.trunc('KVVVVVVVVVVVVVVVVVVVVVV333333333333333333VVVVVVVVVVVVVVVVVVVVVVK', 64);
  convert_format();
}
function level23() {
  fp[(1) - 1] = R.trunc('L UD*D*D*D*D------------------------;;;;;;;;;;;;;;;;;;;;;;;;;;;;', 64);
  fp[(2) - 1] = R.trunc('############-----------------##-####                           S', 64);
  fp[(3) - 1] = R.trunc('+2222K2222+#11111111111111111##-22X# XXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(4) - 1] = R.trunc('+222222222+#-----------------##-22X# XXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(5) - 1] = R.trunc('+222222222+#22222222222222222##-2XX#                            ', 64);
  fp[(6) - 1] = R.trunc('2/////////2#-----------------##-2XK#----------------------------', 64);
  fp[(7) - 1] = R.trunc('2/W--W--W/2#33333333333333333##-22X#2222222222222222222222222222', 64);
  fp[(8) - 1] = R.trunc('2/-------/2#-----------------##-22X#2222222222222222222222222222', 64);
  fp[(9) - 1] = R.trunc('2/---P---/2#22222222222222222##-2XX#2222222222222222222222222222', 64);
  fp[(10) - 1] = R.trunc('2/---B---/2#-----------------##-2X+#----------------------------', 64);
  fp[(11) - 1] = R.trunc('2/-------/2#1111111-K-1111111##-22X#3333333333333333333333333---', 64);
  fp[(12) - 1] = R.trunc('2/-------/2####################-22X#333333333333333333333333----', 64);
  fp[(13) - 1] = R.trunc('2/W--W--W/2#--1111111111111-+##-2XX#3333------33333-------------', 64);
  fp[(14) - 1] = R.trunc('2/////////2#Q-------------------2X+#333--------333----------I--3', 64);
  fp[(15) - 1] = R.trunc('2222#Z#2222################# ##-22X#33----------3--------------3', 64);
  fp[(16) - 1] = R.trunc('2222#-#2222#=------======K==-##-22X#3-----33---------33333333333', 64);
  fp[(17) - 1] = R.trunc('#####-######*-=====-====-=-=-##-2XX#3----3333-------333333333333', 64);
  fp[(18) - 1] = R.trunc('C222/-/2222#==----==--==-==--##-2X+#3---333333-----3333333333333', 64);
  fp[(19) - 1] = R.trunc('2222/-/////#=====-====-=-====##-22X#3---3333333333333333--------', 64);
  fp[(20) - 1] = R.trunc('2222/-;;;;;;-==---==--==-=---##-22X#3---333333333333333--*+*+*+K', 64);
  fp[(21) - 1] = R.trunc('///////////#=-=-===-=====-==-##-2XX#---------------------#######', 64);
  fp[(22) - 1] = R.trunc('C2222222222#W---====-----===S##-2XC#+--------------------##22222', 64);
  fp[(23) - 1] = R.trunc('####################################:::::::::::::;:::::::##X222U', 64);
  convert_format();
}
function level25() {
  fp[(1) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV VVVVVVVVVVVVVVVVVVVVVVVCC', 64);
  fp[(2) - 1] = R.trunc('VRRRRRVVVVVVVVV VVVVV VVVVVVVVVVVVVVV V VVV**VVVVVV*****VVVVVVCC', 64);
  fp[(3) - 1] = R.trunc('VRU KRVVV**VVV V VVV VIVVV*****VVVVV VVV V**VVVVVV V*****VVVVVVV', 64);
  fp[(4) - 1] = R.trunc('VRRRRRVVVV**V VVV V VVV V*****V VVV VVVVV VVVVVVV VVV*****VVVVVV', 64);
  fp[(5) - 1] = R.trunc('VVVVVVVVVVVV VVVVV VVVVV*****VVV V VVVVVVV V V V VVV VVVVVVVVVVV', 64);
  fp[(6) - 1] = R.trunc('VVVVVVVVVVV VVVVVVV**VVVVVVVVVVVV VVVVVVVVV V3V VVV VVVVVVVVVVVV', 64);
  fp[(7) - 1] = R.trunc('VVVV VVVVV VVVVVVVVV**VVVVVVVVVVVVVVVVVVVVVVVVVVVVVV VVRRRRRVVVV', 64);
  fp[(8) - 1] = R.trunc('VVV V VVV3V VVV VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV VVVRU KRVVVV', 64);
  fp[(9) - 1] = R.trunc('***VVV V VVV V V VVVV##########XX##########VVVVVVV VVVVRRRRRVVVV', 64);
  fp[(10) - 1] = R.trunc('V***VVV VVVVV VVV VVVl#IIIIIIIIIIIIIIIIII##VVVVVV V**VVVVVVVV**V', 64);
  fp[(11) - 1] = R.trunc('VVVVVVTVVVV**VVVVV VVa#I#####IIIIII#####I#pVVVVV VVV**VVVV V**VV', 64);
  fp[(12) - 1] = R.trunc('VVVVV VVVV**VVVVV VVVv#I#LD+DIIIIIID-PU#I#iVVVV VVVVVVVVV V VVVV', 64);
  fp[(13) - 1] = R.trunc('VVVVVV VVVVVVVVV VVVVa#I#####IIIIII#####I#tV***VVVVVVVVVTVVV VVV', 64);
  fp[(14) - 1] = R.trunc('VVVVVVV VVVV*****VVVV##IIIIIIIIIIIIIIIIII#!VV***VVVVVVV VVVVV VV', 64);
  fp[(15) - 1] = R.trunc('VVVVVV VVVVVV*****VVV##########XX##########VVV***VVVVV VVVVVVV V', 64);
  fp[(16) - 1] = R.trunc('VVVVV VVVVVVVV*****VVVVVVVVVVVVVVVVVVVVVVVVVVVV***VVV VVV VVVVV ', 64);
  fp[(17) - 1] = R.trunc('VVVVVV****VVVV VVVVVVVVVVVVVVVVVVVVVVVVVV VVVVVVVV V VVV V VVV V', 64);
  fp[(18) - 1] = R.trunc('VVVVV****VVVV VVVVVVVV***VVV V V V VVVVV V VVVVVVVV VVV VVV V VV', 64);
  fp[(19) - 1] = R.trunc('VVVV****VVVVVV3VVVVVVVV***V V V V V VVVIVVV3VVVVVVVVVV VVVVV VVV', 64);
  fp[(20) - 1] = R.trunc('VVVVVVVVVVVVVVV V VVVVV VV VVVRRRRRV V VVVVV VVVVVVVV VVVV**VVVV', 64);
  fp[(21) - 1] = R.trunc('VVVVVVVVVVVVVVVV V VVV VVVVVVVRU KRVV VVVVVVV VVV****VVVV**VVVVV', 64);
  fp[(22) - 1] = R.trunc('VVVVVVVVVVVVVV**VVV V VVVVVVVVRRRRRVVV**VVVVVV V****VVVVVVVVVVVC', 64);
  fp[(23) - 1] = R.trunc('CCCCVVVVVVVVV**VVVVV VVVVVVVVVVVVVVVVVV**VVVVVV****VVVVVVVVVVVCC', 64);
  convert_format();
}
function level27() {
  fp[(1) - 1] = R.trunc('3     +=     =+=    =  1=  =+=  =     -   -2   -    -2    -  Z-2', 64);
  fp[(2) - 1] = R.trunc('3 P =   =   =   1==  =    =   = 1=    -2  -    -2   -    K-2  - ', 64);
  fp[(3) - 1] = R.trunc('##################################   ###########################', 64);
  fp[(4) - 1] = R.trunc('3 3 3 3 3**********************K##   ##LVSDCD++D*D++D##D1****DDC', 64);
  fp[(5) - 1] = R.trunc('   K C############################   ##VV+DCD########**######D#D', 64);
  fp[(6) - 1] = R.trunc('          V V  V  V V V   VV   V V   ##ITFD##---D*DID###**DCD*D-', 64);
  fp[(7) - 1] = R.trunc('VXVVVVVVVVS  VV V    V V V  V V V    ##ZW*.+D-2-D*###WWD**DCD*D-', 64);
  fp[(8) - 1] = R.trunc('V+VVV   +VVVVVVVVVVVVVVVVVVVVVVVVVV  ##########################D', 64);
  fp[(9) - 1] = R.trunc('VV  +VVV VVCCXXXXXXXKXXXXXXCXXXXXXV  #K    3C/////////////3 ZX  ', 64);
  fp[(10) - 1] = R.trunc('VVVVVVVV+VVXXXX+XXXXXXXXXXXXXXXXXXV  #########################  ', 64);
  fp[(11) - 1] = R.trunc('+  V +  VVVXXXXXXXXXXXXXXXXXXXXX+XV  R2 ==+ ==C/1111111/+ 2== 1 ', 64);
  fp[(12) - 1] = R.trunc('V V+VVVVVVVXXXXXXXXXXXXX+XXXXXXXXXV  R  +==. ==/1111111/ ==+  . ', 64);
  fp[(13) - 1] = R.trunc('+VVVV + VVVXXXXXXX+XXXXXXXXXXXXXXXV  R ===== 2=/111B111/1 ====  ', 64);
  fp[(14) - 1] = R.trunc('V  + VVV+VV+XXXXXXXXXXXXXXXXXXX+XXV  R  ==  ===/1111111/   ==   ', 64);
  fp[(15) - 1] = R.trunc('VVVVVVV-VVVXXXXXXXXXXXXXXXXXXXXXXXV  R 1   == ./1111111/       1', 64);
  fp[(16) - 1] = R.trunc('111111-11V#WWW---=   ===   =-------  R===    1 /1111111/  1  ==+', 64);
  fp[(17) - 1] = R.trunc('11111-111V#WWW-3-= = =B= = =222222;  R+= .  =  /////////    ====', 64);
  fp[(18) - 1] = R.trunc('1111-1111V#-----3= = = = = =222222;  R  2  ===   .  +== .=   == ', 64);
  fp[(19) - 1] = R.trunc('111-11111B#3-3-3-= = = = = =222222;  R ==   == 2   ====  ===2  1', 64);
  fp[(20) - 1] = R.trunc('11-111111V#-3-3-3= = = = = =222222;  R ===  1+==   === 2 +===   ', 64);
  fp[(21) - 1] = R.trunc('1-1111111V#----3-= = = = = =222222;  RK ===  ==== 1   .    1    ', 64);
  fp[(22) - 1] = R.trunc('-11111111V#+++--3= =+   += =222222;  RRRRRRRRRRRRRRRRRRRRRRRRR-X', 64);
  fp[(23) - 1] = R.trunc('T-------KV#+++-3-- =======I ------- ZU2 U2 U2 U2 UK U2 U2 U2 U2X', 64);
  convert_format();
}
function level29() {
  fp[(1) - 1] = R.trunc('P-----------:333333333333333:---------:C:::::::::::K:-----------', 64);
  fp[(2) - 1] = R.trunc('-:-:-::;:::-:---------------;-:::-:::-:1-1-1-1-1-1-1:-:::::::::-', 64);
  fp[(3) - 1] = R.trunc('-:-:--:2:C;-:-:#############:-:U:-:U:-:-1-1-1-1-1-1-:-:   C   :-', 64);
  fp[(4) - 1] = R.trunc('-:-::::2:X:-:-2#invisimaze!#2-: :3:-:-:1-1-1-1-1-::::-:::::::::-', 64);
  fp[(5) - 1] = R.trunc('-:---B:2:X:-:-:#############:-:-:-:-:-:::::-::::::---------::-:-', 64);
  fp[(6) - 1] = R.trunc('-::::::2:X:-:-:.K-----------:-:-:Z:-:-:S----;------:::::::-::-:-', 64);
  fp[(7) - 1] = R.trunc('-:K-2222:X:-:-:::::::::::::-:-:-:::-:-:::::-::::::::-----:----:-', 64);
  fp[(8) - 1] = R.trunc('-::::::::X:-:+++++++++++++++:-:K::--:-:---:-:---:----:::-::::::-', 64);
  fp[(9) - 1] = R.trunc('-XXXXXXXXX:-:::::::::::::::::-::::-::-:-:-:-:-:-:-::::::--------', 64);
  fp[(10) - 1] = R.trunc(':::::::::::---------W---------::---::-:-:---:-:-:-::---:-:::::::', 64);
  fp[(11) - 1] = R.trunc('--------::::::::::::::::::::::::-:-::-:-:::::-:-:-:C-:-:-::-----', 64);
  fp[(12) - 1] = R.trunc('-::::::-------------W------------:----:-------:-:-::::-:-::-:::-', 64);
  fp[(13) - 1] = R.trunc('--:::::::::::::::::::::::::::::::::::::::::::-:-:----:-:-::---:-', 64);
  fp[(14) - 1] = R.trunc(':-:-----33333333333----------+----------------:-::::-:-:-::::-:-', 64);
  fp[(15) - 1] = R.trunc('--:-::::;;;;;;;;;;;::::::::::::::::::::::-:::-:----:-:-:-3::3-:-', 64);
  fp[(16) - 1] = R.trunc('-::K::::----------------------------------:Z;-:-::-:-:T--::::-:-', 64);
  fp[(17) - 1] = R.trunc('--::::::::::::::::::::::::::1:1:1:1:1:1:1::-:-:-::-:-:::::3:3-:-', 64);
  fp[(18) - 1] = R.trunc(':-:W:----------------------::::::::::::::::-:-:-::-:-------::-:`', 64);
  fp[(19) - 1] = R.trunc('--:-:-:11111111:Z:;:::::::-:K-XXXXXXX3333333:1:-::-:::::::-:3-:`', 64);
  fp[(20) - 1] = R.trunc('-::-:-::::::::::::*******:-::::::::::::::::-:-:W::-------:-::-:`', 64);
  fp[(21) - 1] = R.trunc('--:-:-:CI`-------:*******:-:::EWWWWW--------:T::::::::::-:-:3-:`', 64);
  fp[(22) - 1] = R.trunc(':-:-:-::::::::::-:::::::::---::::::::::::::::::3333333:--:-::-:`', 64);
  fp[(23) - 1] = R.trunc('------------------+:Z-----------------------------------::----:L', 64);
  convert_format();
}
function level30() {
  fp[(1) - 1] = R.trunc('K1VXXXXXXXXXXXXXXXX3333333333333K#333##Q...\\2-2-2-2-2-2-2-2-2-:R', 64);
  fp[(2) - 1] = R.trunc('-1V  +++++++++++++3333333333333333333#######-2-2-2-2-2-2-2-2-2;R', 64);
  fp[(3) - 1] = R.trunc('-1V  #########################------+##-2-2-2-2-2-2-2-2-2-2-2-:R', 64);
  fp[(4) - 1] = R.trunc('-1V  F-----------------------I-------##2-2-2-2---2-2-2-2-2-2-2RR', 64);
  fp[(5) - 1] = R.trunc('-1V--##################################-2-2-2--C--2-2-2-2-2-2ZRR', 64);
  fp[(6) - 1] = R.trunc('-1V2-2-2-2VV++K++VV2-2-2-2-2-2-2-2-2-2-2-2-2-2---2-2-2-2-2-RRRRR', 64);
  fp[(7) - 1] = R.trunc('-1V-2-2-2-VV++S++VV-2-2-2-2-2-----2-2-2-2-2-2-2-2-2-2RRRRRRRRRRR', 64);
  fp[(8) - 1] = R.trunc('-1V2-2-2-2VVDVVVDVV2-2-2-2-2-2-K-2-2-2-2-2-2-2-2-RRRRRRRRRRRRRRR', 64);
  fp[(9) - 1] = R.trunc('-1V-2-2-2-2-2-2-2-2-2-2-2-2-2-----2-2-2-2-2-2-RRRRRRRRRRRRRRRRRR', 64);
  fp[(10) - 1] = R.trunc('-1V///////-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-RRRRR##333333333XXR', 64);
  fp[(11) - 1] = R.trunc('--XXXXXX//2-VVVVV-2-2-2==================-2-RRRRRE##3333333333XR', 64);
  fp[(12) - 1] = R.trunc('P X 33ZX//-2V+B+V2-2-2C==UDCDXDXDXDXDXDCD2-2RRRREAED3333B33333UR', 64);
  fp[(13) - 1] = R.trunc('--XXXXXX//2-VVVVV-2-2-2==================-2-RRRRRE##3333333333XR', 64);
  fp[(14) - 1] = R.trunc('-1V///////-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-2-RRRRR##333333333XXR', 64);
  fp[(15) - 1] = R.trunc('-1V-2-2-2-2-2-2-2-2-2-2-2-2-2-----2-2-2-2-2-2-RRRRRRRRRRRRRRRRRR', 64);
  fp[(16) - 1] = R.trunc('-1V2-2-2-2VVDVVVDVV2-2-2-2-2-2-K-2-2-2-2-2-2-2-2-RRRRRRRRRRRRRRR', 64);
  fp[(17) - 1] = R.trunc('-1V-2-2-2-VV++S++VV-2-2-2-2-2-----2-2-2-2-2-2-2-2-2-2RRRRRRRRRRR', 64);
  fp[(18) - 1] = R.trunc('-1V2-2-2-2VV++K++VV2-2-2-2-2-2-2-2-2-2-2-2-2-2---2-2-2-2-2-RRRRR', 64);
  fp[(19) - 1] = R.trunc('-1V;##################2-2-2-2-2-2-2-2-2-2-2-2--C--2-2-2-2-2-2ZRR', 64);
  fp[(20) - 1] = R.trunc('-1V1EEEEE1EEEEEE11EE###################2-2-2-2---2-2-2-2-2-2-2RR', 64);
  fp[(21) - 1] = R.trunc('-1V1EEEE1E1EEEE1EE1E##C+++++++3KKD***##-2-2-2-2-2-2-2-2-2-2-2-:R', 64);
  fp[(22) - 1] = R.trunc('-1VE1E11+EE11E1EEEE1##############***##2-2-2-2-2-2-2-2-2-2-2-2;R', 64);
  fp[(23) - 1] = R.trunc('K1V+E1EEEEEEE1E+EEEE+*W*+C+*W*+K##S-----2-2-2-2-2-2-2-2-2-2-2-:R', 64);
  convert_format();
}
function title() {
  let startgame = false;
  let $50, $51, $52, $53, $54, $55, $56, $57, $58;
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
    col(14, 15);
    R.gotoxy(11, R.wherey());
    R.write('DUNGEONS OF KROZ II -- UPDATED VOLUME TWO OF THE KROZ SERIES' + '\r\n');
    R.write('' + '\r\n');
    R.gotoxy(24, R.wherey());
    col(14, 7);
    R.write('Copyright (C) 1990 Scott Miller' + '\r\n');
    R.write('' + '\r\n');
    R.write('           User-Supported Software -- $7.50 Registration Fee Required' + '\r\n');
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
  R.gotoxy(29, 1);
  col(4, 7);
  bak(1, 0);
  R.write('\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc');
  R.gotoxy(29, 3);
  R.write('\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf');
  R.gotoxy(25, 5);
  col(15, 15);
  R.write('An Apogee Software Production');
  R.gotoxy(28, 7);
  R.write('Created by Scott Miller');
  R.gotoxy(1, 9);
  col(11, 7);
  R.write('  Dungeons of Kroz is a game of adventure, exploration and survival.  You are' + '\r\n');
  R.write('  an intrepid archaeologist in search of the Magical Staff,  hidden somewhere' + '\r\n');
  R.write('  deep in the vast and dangerous underground dungeons. You enter the dungeons' + '\r\n');
  R.write('  through a secret tunnel and ignite your brass lantern. Your only protection' + '\r\n');
  R.write('  is a worn leather whip and your ingenuity.  Sweat beading on your forehead,' + '\r\n');
  R.write('                you embark on a journey that may be your last...' + '\r\n');
  R.gotoxy(1, 17);
  col(10, 7);
  R.write('         Use the cursor keys to move yourself (');
  col(14, 15);
  R.write('\x02');
  col(10, 7);
  R.write(') through the dungeons.' + '\r\n');
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
      R.gotoxy(29, 2);
      col(R.random(16), 0);
      R.write(' DUNGEONS OF KROZ II ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($50 = R.upcase(ch).charCodeAt(0), $50 === 13 || $50 === 78 || $50 === 32 || $50 === 69 || $50 === 65 || $50 === 88)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x = 1; $51 = 28;
  if (x <= $51) for (;;) {
    R.write('  ');
    if (x >= $51) break;
    x++;
  }
  col(30, 31);
  bak(1, 0);
  $52 = R.upcase(ch);
  if ($52 === 'N' || $52 === ' ' || $52 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($52 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($52 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($52 === 'X') {
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
    R.gotoxy(29, 2);
    col(R.random(16), 0);
    R.write(' DUNGEONS OF KROZ II ');
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
    R.gotoxy(31, 2);
    R.write('DUNGEONS OF KROZ II');
    R.gotoxy(17, 4);
    col(6, 7);
    R.write('Copyright (c) 1990 Apogee Software Productions');
    R.gotoxy(25, 6);
    R.write('Version 2.0 -- by Scott Miller');
    R.gotoxy(4, 8);
    col(2, 7);
    R.write('THIS GAME MAY NOT BE DISTRIBUTED BY SHAREWARE OR PUBLIC DOMAIN LIBRARIES,' + '\r\n');
    R.gotoxy(5, 9);
    R.write('OR BULLETIN BOARD SYSTEMS.  ONLY KINGDOM OF KROZ II MAY BE DISTRIBUTED.' + '\r\n');
    R.gotoxy(1, 10);
    col(4, 7);
    x = 1; $53 = 80;
    if (x <= $53) for (;;) {
      R.write('\xc4');
      if (x >= $53) break;
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
    $54 = R.upcase(ch);
    if ($54 === 'B') {
      x = 100; $55 = 20;
      if (x >= $55) for (;;) {
        y = 10; $56 = 1;
        if (y >= $56) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $56) break;
          y--;
        }
        if (x <= $55) break;
        x--;
      }
      R.nosound();
      startgame = true;
    } else if ($54 === 'I') {
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
      R.write('   Dungeons of Kroz is a game of exploration and survival. Your journey will' + '\r\n');
      R.write(' take you through 30 very dangerous chambers, each riddled with diabolical' + '\r\n');
      R.write(' traps and hideous creatures.   Hidden in the deepest chamber lies a hidden' + '\r\n');
      R.write(' treasure of immense value.  Use the cursor pad to move 8 directions.' + '\r\n');
      R.write('   The chambers contain dozens of treasures, spells, traps and other unknowns.' + '\r\n');
      R.write(' Touching an object for the first time will reveal a little of its identity,' + '\r\n');
      R.write(' but it will be left to you to decide how best to use it--or avoid it.' + '\r\n');
      R.write('   When a creature touches you it will vanish, taking with it a few of your' + '\r\n');
      R.write(' gems that you have collected. If you have no gems then the creature will' + '\r\n');
      R.write(' instead take your life!  Whips can be used to kill nearby creatures, but' + '\r\n');
      R.write(' they\'re better used to smash through "breakable walls" and other terrain.' + '\r\n');
      R.write('   Laptop and PCjr players can' + '\r\n');
      R.write(' use the alternate cursor             U I O      ( NW N NE )' + '\r\n');
      R.write(' pad instead of the cursor             J K       (   W E   )' + '\r\n');
      R.write(' keys to move your man, plus          N M ,      ( SW S SE )' + '\r\n');
      R.write(' the four normal cursor keys.' + '\r\n');
      R.write('   It\'s a good idea to save your game at every new level, therefore, if you die' + '\r\n');
      R.write(' you can easily restore the game at that level and try again.' + '\r\n');
      R.write('   Registered users will get a "secret code" that makes this game much easier!' + '\r\n');
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
      R.write('   Dungeons of Kroz will present you with many challenges.  You will venture' + '\r\n');
      R.write(' deep underground and probably not make it out alive!' + '\r\n');
      R.write('' + '\r\n');
      R.write(' Hints:  \xfe Don\'t forget to use the Home, End, PgUp, and PgDn keys to move your' + '\r\n');
      R.write('           on-screen character diagonally (along with the marked cursor keys).' + '\r\n');
      R.write('' + '\r\n');
      R.write('         \xfe Use your player to touch each new object to find out about it.  When' + '\r\n');
      R.write('           you first touch an object a message appears at the bottom of the' + '\r\n');
      R.write('           screen that describes it.' + '\r\n');
      R.write('' + '\r\n');
      R.write('         \xfe Collect keys to unlock doors, which usually block the stairs.' + '\r\n');
      R.write('' + '\r\n');
      R.write('         \xfe The faster monsters are the most dangerous to touch--they will knock' + '\r\n');
      R.write('           off three of your valuable gems.  The slowest creatures only take a' + '\r\n');
      R.write('           single gem from you, and the medium speed monsters take two.' + '\r\n');
      R.write('' + '\r\n');
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
      R.write(' likely to find in the Dungeons of Kroz:' + '\r\n');
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
      R.write('' + '\r\n');
      R.write('  \xfe You can now save three different levels during a single game.  When you' + '\r\n');
      R.write('    select the "save" command you will also be asked to enter a letter, either' + '\r\n');
      R.write('    A, B or C.  If you just hit the space bar then A is the default selection.' + '\r\n');
      R.write('    These letters do not refer to disk drives!  They actually refer to the file' + '\r\n');
      R.write('    names used by the game.  The restore command lets use pick from A, B or C.' + '\r\n');
      R.write('' + '\r\n');
      R.write('  \xfe If you are tired of seeing the descriptions at the bottom of the screen' + '\r\n');
      R.write('    that appear whenever you touch a new object, you can disable most of the' + '\r\n');
      R.write('    messages by pressing the minus (-) key.  The plus key (+) resets messages.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($54 === 'M') {
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
      R.write('   Dungeons of Kroz II is a user-supported game. This means that the creator of' + '\r\n');
      R.write(' this program relies on the appreciation of honest players to pay the game\'s' + '\r\n');
      R.write(' registration fee--$7.50.' + '\r\n');
      R.write('   Payment of this fee entitles you to all the free help and hints you might' + '\r\n');
      R.write(' need to enjoy the game.  All letters from registered users are answered' + '\r\n');
      R.write(' within two days.  (Try to get this kind of support from commercial games!)' + '\r\n');
      R.write('   Also, players can order the other Kroz sequels ONLY if this registration' + '\r\n');
      R.write(' fee is paid.  ($7.50 each or $20 for The Lost Adventures of Kroz.)' + '\r\n');
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
    } else if ($54 === 'S') {
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
    } else if ($54 === 'O') {
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
    } else if ($54 === 'A') {
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
      R.write(' equipped with VGA graphics, a NEC MultiSync II and an HP LaserJet series III.' + '\r\n');
      R.write(' The cost to market each Kroz game to the many shareware libraries and BBS\'s' + '\r\n');
      R.write(' is over $10,000 per game.  All of the appreciative letters make it worth it!' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else {
      x = 100; $57 = 20;
      if (x >= $57) for (;;) {
        y = 10; $58 = 1;
        if (y >= $58) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $58) break;
          y--;
        }
        if (x <= $57) break;
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
  R.gotoxy(31, 2);
  R.write('DUNGEONS OF KROZ II');
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
  let $59, $60;
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
  $59 = difficulty;
  if ($59 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($59 === 8) {
    gems = (20) << 16 >> 16;
    whips = (10) << 16 >> 16;
  } else if ($59 === 5) {
    gems = (15) << 16 >> 16;
  } else if ($59 === 2) {
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
  x = 1; $60 = 9;
  if (x <= $60) for (;;) {
    t[(x) - 1] = -(1);
    if (x >= $60) break;
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
  let $61;
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
    ($61 = R.val(fetch), parsed[(counter$2) - 1] = $61[0], test = ($61[1]) << 16 >> 16);
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
  let $62, $63, $64, $65, $66, $67;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$9 = 1; $62 = 999;
  if (x$9 <= $62) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    if (x$9 >= $62) break;
    x$9++;
  }
  new_gem_color();
  x$9 = 2; $63 = 65;
  if (x$9 <= $63) for (;;) {
    y$3 = 2; $64 = 24;
    if (y$3 <= $64) for (;;) {
      pf[(x$9) * 25 + (y$3) - 26] = 0;
      if (y$3 >= $64) break;
      y$3++;
    }
    if (x$9 >= $63) break;
    x$9++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $65 = 83;
  if (obj <= $65) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $66 = parsed[(obj) - 1];
      if (loop$2 <= $66) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $67 = obj;
            if ($67 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($67 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($67 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            } else if ($67 === 36) {
              gennum = ((gennum + 1)) << 16 >> 16;
            }
          }
        } while (!(done));
        if (loop$2 >= $66) break;
        loop$2++;
      }
    }
    if (obj >= $65) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $68, $69, $70;
  xloop$2 = 2; $68 = 65;
  if (xloop$2 <= $68) for (;;) {
    yloop$2 = 2; $69 = 24;
    if (yloop$2 <= $69) for (;;) {
      if ((((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0) || floorpattern) && !(hidelevel))) {
        R.gotoxy(xloop$2, yloop$2);
        $70 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($70 === 0) {
          col(cf1, cf2);
          bak(bf1, bf2);
          R.write(tile);
          bak(0, 0);
        } else if ($70 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($70 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($70 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($70 === 4) {
          if ((level !== 71)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($70 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($70 === 6) {
          if (!(hidestairs)) {
            bak(7, 7);
            col(16, 16);
            R.write('\xf0');
            bak(0, 0);
          }
        } else if ($70 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($70 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($70 === 9) {
          if (!(hidegems)) {
            col(gemcolor, 7);
            R.write('\x04');
          }
        } else if ($70 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($70 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($70 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($70 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($70 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($70 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($70 === 16) {
          if (!(hidetrap)) {
            col(7, 7);
            R.write('\xf9');
          }
        } else if ($70 === 17) {
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
        } else if ($70 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x09');
          }
        } else if ($70 === 19) {
          col(2, 7);
          R.write('\xdb');
          bak(0, 0);
        } else if ($70 === 20 || $70 === 252) {
          col(6, 0);
          bak(2, 7);
          R.write('\x05');
          bak(0, 0);
        } else if ($70 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($70 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($70 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($70 === 24) {
          col(31, 31);
          bak(5, 0);
          R.write('\xf5');
          bak(0, 0);
        } else if ($70 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($70 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($70 === 27) {
          col(14, 7);
          R.write('\x0f');
        } else if ($70 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($70 === 29) {

        } else if ($70 === 30) {

        } else if ($70 === 31) {

        } else if ($70 === 32) {

        } else if ($70 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($70 === 35) {
          if (!(hidecreate)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($70 === 36) {
          col(30, 31);
          R.write('\x06');
        } else if ($70 === 38) {
          if (!(hidemblock)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($70 === 33 || $70 === 37 || $70 === 39 || $70 === 67 || ($70 >= 224 && $70 <= 231)) {

        } else if ($70 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($70 === 41) {

        } else if ($70 === 43) {
          col(6, 7);
          R.write('\xb2');
        } else if ($70 === 44) {

        } else if ($70 === 45) {
          col(15, 7);
          R.write('?');
        } else if ($70 === 222) {
          col(15, 0);
          bak(6, 7);
          R.write('!');
          bak(0, 0);
        } else if ($70 === 46) {
          col(31, 23);
          R.write('\x01');
        } else {
          col(15, 0);
          bak(6, 7);
          R.write(R.upcase(String.fromCharCode((pf[(xloop$2) * 25 + (yloop$2) - 26]) & 255)));
          bak(0, 0);
        }
      }
      if (yloop$2 >= $69) break;
      yloop$2++;
    }
    if (xloop$2 >= $68) break;
    xloop$2++;
  }
  floorpattern = false;
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $71;
    R.sound(540);
    R.delay(40);
    x = 1; $71 = 4;
    if (x <= $71) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x >= $71) break;
      x++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $72, $73;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($72 = key.charCodeAt(0), $72 === 72 || $72 === 80 || $72 === 77 || $72 === 75 || $72 === 71 || $72 === 79 || $72 === 73 || $72 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $73 = key.charCodeAt(0);
      if ($73 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($73 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($73 === 43) {
        foundset = R.EMPTY;
        flash(13, 25, 'Newly found object desciptions are reset.');
      } else if ($73 === 45) {
        foundset = R.setOf(0, 255);
        flash(10, 25, 'References to new objects will not be displayed.');
      } else if ($73 === 119 || $73 === 87) {
        $result = (87) & 255;
      } else if ($73 === 116 || $73 === 84) {
        $result = (84) & 255;
      } else if ($73 === 112 || $73 === 80) {
        $result = (80) & 255;
      } else if ($73 === 113 || $73 === 81) {
        $result = (81) & 255;
      } else if ($73 === 115 || $73 === 83) {
        $result = (83) & 255;
      } else if ($73 === 114 || $73 === 82) {
        $result = (82) & 255;
      } else if ($73 === 117 || $73 === 85) {
        $result = (171) & 255;
      } else if ($73 === 105 || $73 === 73) {
        $result = (172) & 255;
      } else if ($73 === 111 || $73 === 79) {
        $result = (173) & 255;
      } else if ($73 === 106 || $73 === 74) {
        $result = (175) & 255;
      } else if ($73 === 107 || $73 === 75) {
        $result = (177) & 255;
      } else if ($73 === 110 || $73 === 78) {
        $result = (179) & 255;
      } else if ($73 === 109 || $73 === 77) {
        $result = (180) & 255;
      } else if ($73 === 44) {
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
  let $74, $75, $76, $77, $78, $79;
  thing = String.fromCharCode(pf[(x$10) * 25 + (y$4) - 26]);
  bak(0, 0);
  i$3 = 1; $74 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $74) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$10, y$4);
    R.write(ch$3);
    if (i$3 >= $74) break;
    i$3++;
  }
  R.gotoxy(x$10, y$4);
  $75 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($75 >= 1 && $75 <= 3)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($75 === 4 || $75 === 19 || $75 === 20 || $75 === 252) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $76 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($76 === 4) {
      thing = '\xb2';
    } else if ($76 === 19) {
      thing = '\xdb';
    } else if ($76 === 20 || $76 === 252) {
      thing = '\x05';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $77 = 20;
      if (i$3 >= $77) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $77) break;
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
  } else if ($75 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($75 === 10 || $75 === 15 || $75 === 16 || $75 === 18 || $75 === 36 || ($75 >= 48 && $75 <= 51)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $78 = 20;
      if (i$3 >= $78) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $78) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($75 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($75 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($75 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($75 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($75 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($75 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($75 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($75 === 14 || $75 === 52 || $75 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($75 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($75 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($75 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($75 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($75 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($75 === 24) {
    col(31, 31);
    bak(5, 0);
    R.write('\xf5');
    bak(0, 0);
  } else if ($75 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($75 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($75 === 27) {
    col(14, 7);
    R.write('\x0f');
  } else if (($75 >= 28 && $75 <= 31) || $75 === 33 || $75 === 37 || $75 === 39 || $75 === 41 || $75 === 44 || $75 === 67 || ($75 >= 224 && $75 <= 231)) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($75 === 32) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
  } else if ($75 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($75 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($75 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($75 >= 58 && $75 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($75 === 66) {
    col(12, 0);
    bak(4, 7);
    R.write('X');
    bak(0, 0);
  } else if ($75 === 47 || ($75 >= 55 && $75 <= 57) || ($75 >= 61 && $75 <= 63) || ($75 >= 68 && $75 <= 74)) {
    R.write(' ');
  } else if (($75 >= 76 && $75 <= 80)) {
    col(7, 7);
    R.write('\x19');
  } else if ($75 === 75) {
    col(7, 7);
    R.write('\xb3');
  } else if ($75 === 81) {
    col(31, 31);
    R.write('\x0c');
  } else if ($75 === 82) {
    col(7, 7);
    R.write('\x1a');
  } else if ($75 === 83) {
    col(7, 7);
    R.write('\x1b');
  } else if ($75 === 38 || $75 === 43 || $75 === 64) {
    if ((R.random(7) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $79 = 20;
      if (i$3 >= $79) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $79) break;
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
  } else if ($75 === 0) {
    R.write(' ');
  } else {
    col(15, 0);
    bak(6, 7);
    R.write(R.upcase(String.fromCharCode((pf[(x$10) * 25 + (y$4) - 26]) & 255)));
    bak(0, 0);
  }
}
function secret_message() {

}
function shoot_right(xway$3, yway$3, human$2) {

}
function shoot_left(xway$4, yway$4, human$3) {

}
function tome_message() {
  flash(6, 25, ' You reach out to grab the object of your long quest... ');
  flash(19, 25, ' the Magical Staff of Kroz. ');
  flash(7, 25, ' Your body surges with electricity as you clutch it! ');
}
function tome_effects() {
  let $80, $81, $82;
  bak(0, 0);
  b = 14; $80 = 0;
  if (b >= $80) for (;;) {
    x = 2; $81 = 65;
    if (x <= $81) for (;;) {
      y = 2; $82 = 24;
      if (y <= $82) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 0)) {
          R.sound(((x * y) * (b + 1)));
          R.gotoxy(x, y);
          col((b * 2), ((+(((b & 1) !== 0)) * 7) + (+(!(((b & 1) !== 0))) * 0)));
          R.write('\xdb');
        }
        if (y >= $82) break;
        y++;
      }
      if (x >= $81) break;
      x++;
    }
    if (b <= $80) break;
    b--;
  }
  R.nosound();
}
function prayer() {

}
function tablet_message(level$2) {

}
function next_level() {
  let $83;
  $83 = level;
  if ($83 === 1) {
    level1();
  } else if ($83 === 3) {
    level3();
  } else if ($83 === 5) {
    level5();
  } else if ($83 === 7) {
    level7();
  } else if ($83 === 9) {
    level9();
  } else if ($83 === 11) {
    level11();
  } else if ($83 === 13) {
    level13();
  } else if ($83 === 15) {
    level15();
  } else if ($83 === 17) {
    level17();
  } else if ($83 === 19) {
    level19();
  } else if ($83 === 21) {
    level21();
  } else if ($83 === 23) {
    level23();
  } else if ($83 === 25) {
    level25();
  } else if ($83 === 27) {
    level27();
  } else if ($83 === 29) {
    level29();
  } else if ($83 === 30) {
    level30();
  } else {
    create_playfield();
  }
}
function move(xway$5, yway$5, human$4) {
  let killed = 0;
  let rxway = 0;
  let ryway = 0;
  let trycounter = 0;
  let spot = 0;
  let original = 0;
  let nogo = false;
  let $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131, $132, $133, $134, $135;
  L2_jump_end: {
  if ((((sideways && (yway$5 === -(1))) && (replacement !== 75)) && !(($84 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], ($84 >= 75 && $84 <= 80))))) {
    break L2_jump_end;
  }
  if ((((((px + xway$5) < 2) || ((px + xway$5) > 65)) || ((py + yway$5) < 2)) || ((py + yway$5) > 24))) {
    if (human$4) {
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
  $85 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
  if ($85 === 0) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if (($85 >= 1 && $85 <= 3)) {
    gems = ((gems - pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26])) << 16 >> 16;
    if ((gems < 0)) {
      dead(true);
    }
    addscore(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]);
    R.sound((200 + (200 * pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26])));
    R.delay(25);
    R.nosound();
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    if (R.keypressed()) {
      ch = R.readKbd();
      if ((ch === '\x1b')) {
        ch = R.readKbd();
      }
    }
  } else if ($85 === 4 || $85 === 43 || $85 === 64) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 4))) {
        foundset = R.union(foundset, R.setOf(4, 4));
        flash(17, 25, 'A Breakable Wall blocks your way.');
      }
    }
  } else if ($85 === 5) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($85 === 6) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    clearkeys();
    if ((level === 30)) {
      end_routine();
    }
    if (mixup) {
      level = ((R.random(27) + 2)) << 16 >> 16;
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
    footstep();
    bak(gemcolor, 7);
    x = 1; $86 = 30;
    if (x <= $86) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      if (x >= $86) break;
      x++;
    }
    bak(0, 0);
    x = 1; $87 = 30;
    if (x <= $87) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      R.sound((x * 45));
      if (x >= $87) break;
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
    x = 1; $88 = 600;
    if (x <= $88) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x / 2));
      if (x >= $88) break;
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
    if ((level === 30)) {
      flash(9, 25, 'You have finally reached the last dungeon of Kroz!');
    }
  } else if ($85 === 7) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    xb = 3; $89 = 42;
    if (xb <= $89) for (;;) {
      yb = 3; $90 = 42;
      if (yb <= $90) for (;;) {
        R.sound((xb * yb));
        R.delay(1);
        if (yb >= $90) break;
        yb++;
      }
      if (xb >= $89) break;
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
  } else if ($85 === 8) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(5);
    x = 7; $91 = 1;
    if (x >= $91) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x <= $91) break;
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
      flash(16, 25, 'You activated a Slow Creature spell.');
    }
  } else if ($85 === 9) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($85 === 10) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(10);
    x = 1; $92 = 4;
    if (x <= $92) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x >= $92) break;
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
  } else if ($85 === 11) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($85 === 12) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($85 === 13) {
    if (human$4) {
      if ((keys < 1)) {
        x = 1; $93 = 15;
        if (x <= $93) for (;;) {
          R.sound((R.random(99) + 30));
          R.delay(15);
          R.nosound();
          R.delay(15);
          if (x >= $93) break;
          x++;
        }
        flash(18, 25, 'To pass the Door you need a Key.');
      } else {
        keys = ((keys - 1)) << 16 >> 16;
        addscore(11);
        x = 10; $94 = 90;
        if (x <= $94) for (;;) {
          R.sound(x);
          R.delay(15);
          if (x >= $94) break;
          x++;
        }
        go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
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
  } else if ($85 === 14 || $85 === 17) {
    if (human$4) {
      if ((pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] === 14)) {
        blocksound();
      } else {
        x = 1; $95 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
        if (x <= $95) for (;;) {
          R.sound((R.random(((x * 2) + 200)) + x));
          if (x >= $95) break;
          x++;
        }
        R.nosound();
      }
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $96 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($96 === 14) {
          flash(20, 25, 'A Solid Wall blocks your way.');
        } else if ($96 === 17) {
          flash(18, 25, 'You cannot travel through Water.');
        }
      }
    }
  } else if ($85 === 15) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(15);
    x = 1; $97 = 7;
    if (x <= $97) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x >= $97) break;
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
      flash(16, 25, 'You activated a Speed Creature spell.');
    }
  } else if ($85 === 16) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(16);
    x = 1; $98 = 500;
    if (x <= $98) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $98) break;
      x++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $99 = 1;
    if (yb >= $99) for (;;) {
      x = 550; $100 = 20;
      if (x >= $100) for (;;) {
        R.sound((yb * x));
        if (x <= $100) break;
        x--;
      }
      if (yb <= $99) break;
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
    x = 1; $101 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $101) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $101) break;
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
  } else if ($85 === 18) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    whippower = ((whippower + 1)) << 16 >> 16;
    x = 3; $102 = 35;
    if (x <= $102) for (;;) {
      y = 45; $103 = 52;
      if (y <= $103) for (;;) {
        R.sound((x * y));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y >= $103) break;
        y++;
      }
      if (x >= $102) break;
      x++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    addscore(15);
    flash(9, 25, 'A Power Ring--your whip is now a little stronger!');
  } else if ($85 === 19 || $85 === 20) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $104 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($104 === 19) {
          flash(14, 25, 'You cannot travel through forest terrain.');
        } else if ($104 === 20) {
          flash(24, 25, 'A tree blocks your way.');
        }
      }
    }
  } else if ($85 === 21) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i = 70; $105 = 600;
    if (i <= $105) for (;;) {
      R.sound((i * 2));
      R.delay(3);
      if (i >= $105) break;
      i++;
    }
    bor(15);
    i = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $106 = 20;
    if (i >= $106) for (;;) {
      R.sound(R.random(i));
      if (i <= $106) break;
      i--;
    }
    width = 1; $107 = 4;
    if (width <= $107) for (;;) {
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
      x = (px - xl); $108 = (px + xr);
      if (x <= $108) for (;;) {
        y = (py - yl); $109 = (py + yr);
        if (y <= $109) for (;;) {
          if (($110 = pf[(x) * 25 + (y) - 26], ($110 >= 0 && $110 <= 4) || $110 === 13 || $110 === 16 || $110 === 19 || ($110 >= 28 && $110 <= 32) || $110 === 33 || $110 === 35 || ($110 >= 36 && $110 <= 39) || $110 === 43 || $110 === 45 || ($110 >= 48 && $110 <= 51) || $110 === 64 || $110 === 67 || ($110 >= 68 && $110 <= 74) || ($110 >= 224 && $110 <= 231))) {
            R.gotoxy(x, y);
            col(12, 15);
            R.write('\xdb');
          }
          if (y >= $109) break;
          y++;
        }
        if (x >= $108) break;
        x++;
      }
      if (width >= $107) break;
      width++;
    }
    R.delay(100);
    width = 1; $111 = 4;
    if (width <= $111) for (;;) {
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
      x = (px - xl); $112 = (px + xr);
      if (x <= $112) for (;;) {
        y = (py - yl); $113 = (py + yr);
        if (y <= $113) for (;;) {
          if (($114 = pf[(x) * 25 + (y) - 26], ($114 >= 0 && $114 <= 4) || $114 === 13 || $114 === 16 || $114 === 19 || ($114 >= 28 && $114 <= 32) || $114 === 33 || $114 === 35 || ($114 >= 36 && $114 <= 39) || $114 === 43 || $114 === 45 || ($114 >= 48 && $114 <= 51) || $114 === 64 || $114 === 67 || ($114 >= 68 && $114 <= 74) || ($114 >= 224 && $114 <= 231))) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            if (($115 = pf[(x) * 25 + (y) - 26], ($115 >= 1 && $115 <= 3))) {
              score = ((score + pf[(x) * 25 + (y) - 26])) | 0;
            }
            pf[(x) * 25 + (y) - 26] = 0;
          }
          if (y >= $113) break;
          y++;
        }
        if (x >= $112) break;
        x++;
      }
      if (width >= $111) break;
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
  } else if ($85 === 22) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    gems = ((gems - 10)) << 16 >> 16;
    x = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $116 = 20;
    if (x >= $116) for (;;) {
      y = 9; $117 = 2;
      if (y >= $117) for (;;) {
        R.sound((R.random(((y * x) + 100)) + (y * x)));
        if (y <= $117) break;
        y--;
      }
      if (x <= $116) break;
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
  } else if ($85 === 23) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
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
    i = 1; $118 = 16;
    if (i <= $118) for (;;) {
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
      y = 2; $119 = 24;
      if (y <= $119) for (;;) {
        x = ((x - 8)) << 16 >> 16;
        R.sound(x);
        R.gotoxy(34, y);
        R.write('\x02');
        R.delay((52 - (3 * i)));
        R.gotoxy(34, y);
        R.write(' ');
        if (y >= $119) break;
        y++;
      }
      R.nosound();
      if (i >= $118) break;
      i++;
    }
    R.gotoxy(34, 24);
    R.write('_');
    i = 8000; $120 = 20;
    if (i >= $120) for (;;) {
      R.sound(R.random(i));
      if (i <= $120) break;
      i--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT!! *');
    dead(false);
  } else if ($85 === 24) {
    tome_message();
    i = 1; $121 = 5;
    if (i <= $121) for (;;) {
      tome_effects();
      if (i >= $121) break;
      i++;
    }
    bak(0, 0);
    x = 1; $122 = 24;
    if (x <= $122) for (;;) {
      y = 5; $123 = 1;
      if (y >= $123) for (;;) {
        R.sound(((x * 45) + (y * 10)));
        R.delay((y * 3));
        R.nosound();
        R.delay(40);
        R.gotoxy(51, 13);
        col(R.random(16), R.random(16));
        R.write('\xf5');
        if (y <= $123) break;
        y--;
      }
      if (x >= $122) break;
      x++;
    }
    R.gotoxy(51, 13);
    col(16, 16);
    bak(2, 7);
    R.write('\xf0');
    bak(0, 0);
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 6;
    score = ((score + 5000)) | 0;
    update_info();
    clearkeys();
    flash(5, 25, 'The Magical Staff of Kroz is finally yours--50,000 points!');
    flash(9, 25, 'Congratualtions, Adventurer, you finally did it!!!');
  } else if ($85 === 25) {
    pxold = (px) << 16 >> 16;
    pyold = (py) << 16 >> 16;
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
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
    } while (!(((pf[(x) * 25 + (y) - 26] === 25) && (((pxold + xway$5) !== x) || ((pyold + yway$5) !== y)))));
    done = false;
    i = 1; $124 = 100;
    if (i <= $124) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($125 = pf[((x + a)) * 25 + ((y + b)) - 26], $125 === 0 || $125 === 32 || $125 === 33 || $125 === 37 || $125 === 39 || ($125 >= 55 && $125 <= 57) || $125 === 67 || ($125 >= 224 && $125 <= 231)) && (done === false))) {
        if (!((((((x + a) < 2) || ((x + a) > 65)) || ((y + b) < 2)) || ((y + b) > 24)))) {
          done = true;
          x = ((x + a)) << 16 >> 16;
          y = ((y + b)) << 16 >> 16;
        }
      }
      if (i >= $124) break;
      i++;
    }
    R.nosound();
    if ((done === false)) {
      x = (pxold) << 16 >> 16;
      y = (pyold) << 16 >> 16;
    }
    px = (x) << 16 >> 16;
    py = (y) << 16 >> 16;
    if (($126 = pf[(px) * 25 + (py) - 26], ($126 >= 55 && $126 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x = 1; $127 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x <= $127) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x >= $127) break;
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
  } else if ($85 === 26) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(11);
    grabsound();
    x = 1; $128 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x <= $128) for (;;) {
      R.sound(((R.random(1000) + x) + 200));
      if (x >= $128) break;
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
  } else if ($85 === 27) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($85 === 28) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    i = 1; $129 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i <= $129) for (;;) {
      R.sound(R.random(i));
      if (i >= $129) break;
      i++;
    }
    R.nosound();
    i = 1; $130 = 50;
    if (i <= $130) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($131 = pf[(x) * 25 + (y) - 26], ($131 >= 0 && $131 <= 3) || $131 === 5 || ($131 >= 7 && $131 <= 11) || ($131 >= 15 && $131 <= 16) || $131 === 26 || $131 === 32 || $131 === 33 || $131 === 37 || $131 === 39 || $131 === 67 || ($131 >= 224 && $131 <= 231))) {
          done = true;
          pf[(x) * 25 + (y) - 26] = 4;
          R.gotoxy(x, y);
          col(6, 7);
          R.write('\xb2');
        }
      } while (!(((R.random(100) === 0) || done)));
      x = 1; $132 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x <= $132) for (;;) {
        R.sound(R.random(200));
        if (x >= $132) break;
        x++;
      }
      R.nosound();
      if (i >= $130) break;
      i++;
    }
    i = 2500; $133 = 20;
    if (i >= $133) for (;;) {
      R.sound(R.random(i));
      if (i <= $133) break;
      i--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($85 === 29) {
    R.gotoxy((px + xway$5), (py + yway$5));
    col(6, 7);
    R.write('\xb2');
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 4;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 29))) {
      foundset = R.union(foundset, R.setOf(29, 29));
      flash(13, 25, 'An Invisible Crumbled Wall blocks your way.');
    }
  } else if ($85 === 30) {
    R.gotoxy((px + xway$5), (py + yway$5));
    col(6, 7);
    R.write('\xdb');
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 14;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 30))) {
      foundset = R.union(foundset, R.setOf(30, 30));
      flash(17, 25, 'An Invisible Wall blocks your way.');
    }
  } else if ($85 === 31) {
    R.gotoxy((px + xway$5), (py + yway$5));
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 13;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 31))) {
      foundset = R.union(foundset, R.setOf(31, 31));
      flash(17, 25, 'An Invisible Door blocks your way.');
    }
  } else if ($85 === 32) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if ($85 === 33) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $134 = 65;
    if (x <= $134) for (;;) {
      y = 2; $135 = 24;
      if (y <= $135) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 33)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $135) break;
        y++;
      }
      if (x >= $134) break;
      x++;
    }
  } else {
    if (human$4) {
      blocksound();
    }
  }
  }
  onemove = false;
}
function player_move() {
  let $136, $137, $138, $139, $140, $141, $142, $143, $144;
  $136 = getkey();
  if ($136 === 0) {

  } else if ($136 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(18, 25, ' Press any key to resume game. ');
    restore_border();
  } else if ($136 === 81) {
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
  } else if ($136 === 82) {
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
    $137 = R.upcase(ch);
    if ($137 === '\x1b') {
      break L3_abort_restore;
    } else if ($137 === 'B' || $137 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    print(20, 25, (('  Restoring from file ' + ch) + '...  '));
    R.assign(savefile, (('DUNGEON' + ch) + '.SAV'));
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
      $138 = savestuff;
      level = ($138.s_level) << 16 >> 16;
      score = ($138.s_score) | 0;
      gems = ($138.s_gems) << 16 >> 16;
      whips = ($138.s_whips) << 16 >> 16;
      teleports = ($138.s_teleports) << 16 >> 16;
      keys = ($138.s_keys) << 16 >> 16;
      whippower = ($138.s_whippower) << 16 >> 16;
      difficulty = ($138.s_difficulty) << 16 >> 16;
      px = ($138.s_px) << 16 >> 16;
      py = ($138.s_py) << 16 >> 16;
      foundset = $138.s_foundset;
      mixup = $138.s_mixup;
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
      R.window(2, 2, (64 + 1), (23 + 1));
      bak(0, 0);
      R.clrscr();
      cur(3);
      R.window(1, 1, 80, 25);
      border();
      display_playfield();
      x = 1; $139 = 600;
      if (x <= $139) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x / 2));
        if (x >= $139) break;
        x++;
      }
      R.nosound();
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
      bak(0, 0);
    }
    flash(17, 25, 'Press any key to begin this level.');
    }
    restore_border();
  } else if ($136 === 83) {
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
    $140 = R.upcase(ch);
    if ($140 === '\x1b') {
      break L4_abort_save;
    } else if ($140 === 'B' || $140 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    $141 = savestuff;
    $141.s_level = (level) | 0;
    $141.s_score = (i_score) | 0;
    $141.s_gems = (i_gems) | 0;
    $141.s_whips = (i_whips) | 0;
    $141.s_teleports = (i_teleports) | 0;
    $141.s_keys = (i_keys) | 0;
    $141.s_whippower = (i_whippower) | 0;
    $141.s_difficulty = (i_difficulty) | 0;
    $141.s_px = (i_px) | 0;
    $141.s_py = (i_py) | 0;
    $141.s_foundset = i_foundset;
    $141.s_mixup = mixup;
    print(22, 25, (('  Saving to file ' + ch) + '...  '));
    R.assign(savefile, (('DUNGEON' + ch) + '.SAV'));
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    }
    restore_border();
  } else if ($136 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x = 1; $142 = 250;
    if (x <= $142) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $142) break;
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
      if (($143 = pf[(x) * 25 + (y) - 26], $143 === 0 || $143 === 32 || $143 === 33 || $143 === 37 || $143 === 39 || $143 === 41 || $143 === 44 || $143 === 47 || ($143 >= 55 && $143 <= 57) || ($143 >= 61 && $143 <= 63) || $143 === 67 || ($143 >= 68 && $143 <= 74) || ($143 >= 224 && $143 <= 231))) {
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
    x = 1; $144 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $144) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $144) break;
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
  } else if ($136 === 87) {
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
  } else if ($136 === 172) {
    move(0, -(1), true);
  } else if ($136 === 180) {
    move(0, 1, true);
  } else if ($136 === 177) {
    move(1, 0, true);
  } else if ($136 === 175) {
    move(-(1), 0, true);
  } else if ($136 === 171) {
    move(-(1), -(1), true);
  } else if ($136 === 173) {
    move(1, -(1), true);
  } else if ($136 === 179) {
    move(-(1), 1, true);
  } else if ($136 === 181) {
    move(1, 1, true);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $145, $146;
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
  loop$3 = 1; $145 = snum;
  if (loop$3 <= $145) for (;;) {
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
    $146 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($146 === 0 || ($146 >= 68 && $146 <= 74)) {
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
    } else if (($146 >= 1 && $146 <= 3) || $146 === 6 || $146 === 13 || $146 === 14 || $146 === 17 || ($146 >= 19 && $146 <= 25) || ($146 >= 28 && $146 <= 37) || $146 === 39 || $146 === 41 || $146 === 42 || ($146 >= 44 && $146 <= 47) || ($146 >= 52 && $146 <= 56) || ($146 >= 58 && $146 <= 63) || $146 === 65 || $146 === 66 || $146 === 67 || ($146 >= 75 && $146 <= 80) || ($146 >= 224 && $146 <= 231)) {
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
    } else if ($146 === 4 || $146 === 38 || $146 === 43 || $146 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($146 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 150);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($146 === 5 || ($146 >= 7 && $146 <= 12) || $146 === 15 || $146 === 16 || $146 === 18 || $146 === 26 || $146 === 27 || ($146 >= 48 && $146 <= 51) || $146 === 82 || $146 === 83) {
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
    if (loop$3 >= $145) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $147, $148;
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
  loop$4 = 1; $147 = mnum;
  if (loop$4 <= $147) for (;;) {
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
    $148 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($148 === 0 || ($148 >= 68 && $148 <= 74)) {
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
    } else if (($148 >= 1 && $148 <= 3) || $148 === 6 || $148 === 13 || $148 === 14 || $148 === 17 || ($148 >= 19 && $148 <= 25) || ($148 >= 28 && $148 <= 37) || $148 === 39 || $148 === 41 || $148 === 42 || ($148 >= 44 && $148 <= 47) || ($148 >= 52 && $148 <= 56) || ($148 >= 58 && $148 <= 63) || $148 === 65 || $148 === 66 || $148 === 67 || ($148 >= 75 && $148 <= 80) || ($148 >= 224 && $148 <= 231)) {
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
    } else if ($148 === 4 || $148 === 38 || $148 === 43 || $148 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($148 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 150);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($148 === 5 || ($148 >= 7 && $148 <= 12) || $148 === 15 || $148 === 16 || $148 === 18 || $148 === 26 || $148 === 27 || ($148 >= 48 && $148 <= 51) || $148 === 82 || $148 === 83) {
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
    if (loop$4 >= $147) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $149, $150;
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
  loop$5 = 1; $149 = fnum;
  if (loop$5 <= $149) for (;;) {
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
    $150 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($150 === 0 || ($150 >= 68 && $150 <= 74)) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($150 >= 1 && $150 <= 3) || $150 === 6 || $150 === 13 || $150 === 14 || $150 === 17 || ($150 >= 19 && $150 <= 25) || ($150 >= 28 && $150 <= 37) || $150 === 39 || $150 === 41 || $150 === 42 || ($150 >= 44 && $150 <= 47) || ($150 >= 52 && $150 <= 56) || ($150 >= 58 && $150 <= 63) || $150 === 65 || $150 === 66 || $150 === 67 || ($150 >= 75 && $150 <= 80) || ($150 >= 224 && $150 <= 231)) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($150 === 4 || $150 === 38 || $150 === 43 || $150 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($150 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 150);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($150 === 5 || ($150 >= 7 && $150 <= 12) || $150 === 15 || $150 === 16 || $150 === 18 || $150 === 26 || $150 === 27 || ($150 >= 48 && $150 <= 51) || $150 === 82 || $150 === 83) {
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
    if (loop$5 >= $149) break;
    loop$5++;
  }
}
function move_mblock() {

}

export function main() {
  let $151, $152, $153;





  screen();
  L8_newgame: for (;;) {
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
  x = 1; $151 = 800;
  if (x <= $151) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x / 2));
    if (x >= $151) break;
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
      x = 1; $152 = 9;
      if (x <= $152) for (;;) {
        t[(x) - 1] = (t[(x) - 1] - 1);
        if (x >= $152) break;
        x++;
      }
      if ((skiptime > 3000)) {
        x = 1; $153 = 9;
        if (x <= $153) for (;;) {
          t[(x) - 1] = (t[(x) - 1] - 5);
          if (x >= $153) break;
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
    }
  } while (!(restart));
  continue L8_newgame;
    break;
  }
}

export const state = () => [px, py];
