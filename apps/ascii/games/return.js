// Translated from Turbo Pascal by tools/kroz/pascal.mjs; do not edit.
import * as R from '../runtime.js';
let df = new Array(20).fill('');
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
let t = new Int32Array(9);
let ch = '\x00';
let slow = '\x00';
let medium = '\x00';
let fast = '\x00';
let x = 0;
let y = 0;
let i = 0;
let px = 0;
let py = 0;
let gennum = 0;
let bnum = 0;
let snum = 0;
let mnum = 0;
let fnum = 0;
let lavarate = 0;
let gemcolor = 0;
let artcolor = 0;
let fastpc = false;
let lavaflow = false;
let color = false;
function clearkeys() {
  while (R.keypressed()) {
    ch = R.readKbd();
  }
}
function cur(num) {
  let result = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
  let $1, $2, $3;
  result.ax = (256) & 65535;
  $1 = result;
  if (color) {
    $2 = num;
    if ($2 === 1) {
      $1.cx = (1799) & 65535;
    } else if ($2 === 2) {
      $1.cx = (8) & 65535;
    } else if ($2 === 3) {
      $1.cx = (8192) & 65535;
    }
  } else {
    $3 = num;
    if ($3 === 1) {
      $1.cx = (3085) & 65535;
    } else if ($3 === 2) {
      $1.cx = (14) & 65535;
    } else if ($3 === 3) {
      $1.cx = (8192) & 65535;
    }
  }
  R.intr(16, result);
}
function footstep() {
  let x$2 = 0;
  let $4, $5;
  x$2 = 1; $4 = ((+(fastpc) * 50) + (+(!(fastpc)) * 23));
  if (x$2 <= $4) for (;;) {
    R.sound((R.random(550) + 350));
    if (x$2 >= $4) break;
    x$2++;
  }
  R.nosound();
  R.delay(120);
  x$2 = 1; $5 = ((+(fastpc) * 60) + (+(!(fastpc)) * 30));
  if (x$2 <= $5) for (;;) {
    R.sound((R.random(50) + 150));
    if (x$2 >= $5) break;
    x$2++;
  }
  R.nosound();
}
function grabsound() {
  let x$3 = 0;
  let $6;
  x$3 = 1; $6 = ((+(fastpc) * 160) + (+(!(fastpc)) * 65));
  if (x$3 <= $6) for (;;) {
    R.sound((R.random(1000) + 1000));
    if (x$3 >= $6) break;
    x$3++;
  }
  R.nosound();
}
function blocksound() {
  let x$4 = 0;
  let $7;
  x$4 = 60; $7 = 30;
  if (x$4 >= $7) for (;;) {
    R.sound(x$4);
    R.delay((1 + (+(fastpc) * 2)));
    if (x$4 <= $7) break;
    x$4--;
  }
  R.nosound();
}
function nonesound() {
  let x$5 = 0;
  let $8;
  x$5 = 1; $8 = 5;
  if (x$5 <= $8) for (;;) {
    R.sound(400);
    R.delay(10);
    R.nosound();
    R.delay(10);
    R.sound(700);
    R.delay(10);
    R.nosound();
    R.delay(10);
    if (x$5 >= $8) break;
    x$5++;
  }
}
function static_() {
  let x$6 = 0;
  let y$2 = 0;
  let $9, $10, $11, $12;
  x$6 = 1; $9 = 15;
  if (x$6 <= $9) for (;;) {
    bor(R.random(16));
    if (x$6 >= $9) break;
    x$6++;
  }
  bor(4);
  x$6 = 1; $10 = 33;
  if (x$6 <= $10) for (;;) {
    $11 = R.random(2);
    if ($11 === 0) {
      y$2 = 1; $12 = (R.random(60) + 10);
      if (y$2 <= $12) for (;;) {
        R.sound((R.random(4000) + 3000));
        if (y$2 >= $12) break;
        y$2++;
      }
    } else if ($11 === 1) {
      R.nosound();
      R.delay(R.random(30));
    }
    if (x$6 >= $10) break;
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
function bor(num$2) {
  let result$2 = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
  let $13;
  if (color) {
    $13 = result$2;
    $13.ax = (2816) & 65535;
    $13.bx = (num$2) & 65535;
    R.intr(16, result$2);
  }
}
function sign_off() {
  shareware(false);
  clearkeys();
  col(7, 7);
  bor(0);
  bak(0, 0);
  R.clrscr();
  R.gotoxy(33, 1);
  R.write('RETURN TO KROZ');
  R.gotoxy(26, 2);
  R.write('An Apogee Software Production' + '\r\n');
  R.write('' + '\r\n');
  R.write('Other new games available from Scott Miller:' + '\r\n');
  R.write('' + '\r\n');
  R.write('* SUPERNOVA -- An epic adventure, with 16 colors, graphics and sound effects.' + '\r\n');
  R.write('     Spans an entire galaxy.  Game takes up an entire disk!  ($10)' + '\r\n');
  R.write('' + '\r\n');
  R.write('* BEYOND THE TITANIC -- A fantastic adventure of exploration and survival.' + '\r\n');
  R.write('     What really happened?  Sound effects and 16 color screens.  ($8)' + '\r\n');
  R.write('' + '\r\n');
  R.write('* TREK TRIVIA -- VOLUMES 1 through 10 -  Each volume has 100 Star Trek trivia' + '\r\n');
  R.write('     questions, and is played like a game.  16-colors and sound effects, too.' + '\r\n');
  R.write('     $4 per volume (plus $2 per order for postage and disks), order all 10' + '\r\n');
  R.write('     volumes and pay only $30, a $12 savings!' + '\r\n');
  R.write('' + '\r\n');
  R.write('* Five more Kroz games!  KINGDOM OF KROZ, CAVERNS OF KROZ, DUNGEONS OF KROZ,' + '\r\n');
  R.write('     TEMPLE OF KROZ and THE LAST CRUSADE OF KROZ.  Each $7.50, or order all' + '\r\n');
  R.write('     six for $35!  This is the most popular game series in shareware.' + '\r\n');
  R.write('' + '\r\n');
  R.write('* THE LOST ADVENTURES OF KROZ -- 75 all-new levels packed with new features.' + '\r\n');
  R.write('     The ultimate Kroz game with unique twists.  ($20 + $2 Shipping & Disk)' + '\r\n');
  cur(1);
  clearkeys();
  R.halt();
}
function shareware(wait) {
  let $14, $15, $16;
  bak(1, 0);
  bor(1);
  R.clrscr();
  cur(3);
  col(15, 15);
  R.gotoxy(24, 1);
  R.write('RETURN TO KROZ \xc4 HOW TO REGISTER' + '\r\n');
  R.gotoxy(1, 2);
  x = 1; $14 = 80;
  if (x <= $14) for (;;) {
    R.write('\xc4');
    if (x >= $14) break;
    x++;
  }
  R.gotoxy(1, 3);
  col(7, 7);
  R.write('  This is Volume I of the Super Kroz Trilogy.  Return to Kroz is a shareware' + '\r\n');
  R.write('game, which means it is user supported.  If you enjoy this game you are asked' + '\r\n');
  R.write('by the author to please send an appreciation check of $7.50 to Apogee Software.' + '\r\n');
  R.write('This minimal amount will help compensate the many months of work that went into' + '\r\n');
  R.write('the creation of this game.' + '\r\n');
  R.write('  Also, this registration fee will allow you to order the two non-shareware' + '\r\n');
  R.write('sequels:  ');
  col(15, 9);
  R.write('Temple of Kroz');
  col(7, 7);
  R.write(' (Volume II) and ');
  col(15, 9);
  R.write('The Last Crusade of Kroz');
  col(7, 7);
  R.write(' (Volume III).' + '\r\n');
  R.write('Each sequel can be ordered for $7.50 each, or all three for $20.  Registered' + '\r\n');
  R.write('players will also get a secret code that makes this game easier to complete,' + '\r\n');
  R.write('plus a "Hints, Tricks and Scoring Secrets" guide and "The Domain of Kroz" map.' + '\r\n');
  R.write('  The three original Kroz games are also available and have been updated with' + '\r\n');
  R.write('improved features.  All three of the original Kroz games (');
  col(15, 9);
  R.write('Kingdom of Kroz');
  col(7, 7);
  R.write(',' + '\r\n');
  col(15, 9);
  R.write('Caverns of Kroz');
  col(7, 7);
  R.write(', ');
  col(15, 9);
  R.write('Dungeons of Kroz');
  col(7, 7);
  R.write(') are $7.50 each or $15 for all three. Kingdom' + '\r\n');
  R.write('of Kroz recently won "Best Game" in a national contest.  These first three' + '\r\n');
  R.write('Kroz games feature 95 new levels to explore.' + '\r\n');
  R.write('' + '\r\n');
  R.write('Please make checks payable to:');
  col(14, 7);
  R.write('   Apogee Software    (phone: 214/240-0614)' + '\r\n');
  R.gotoxy(31, 20);
  R.write('   4206 Mayflower' + '\r\n');
  R.gotoxy(31, 21);
  R.write('   Garland, TX 75043' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('Thank you and enjoy the game.  -- Scott Miller (author)' + '\r\n');
  if (wait) {
    R.delay(3333);
  }
  bak((R.random(6) + 1), 7);
  R.gotoxy(1, 25);
  R.insline();
  R.gotoxy(27, 25);
  col(16, 16);
  R.write('Press any key to continue.');
  x = 70; $15 = 10;
  if (x >= $15) for (;;) {
    y = 2; $16 = 12;
    if (y <= $16) for (;;) {
      R.sound((x * y));
      R.delay(1);
      if (y >= $16) break;
      y++;
    }
    if (x <= $15) break;
    x--;
  }
  R.nosound();
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
function define_levels() {
  df[(2) - 1] = R.trunc(('150 10   100  9  2  1  2  9     1             15                                9  1         100                     ' + '                                                                           '), 192);
  df[(4) - 1] = R.trunc(('   333       55  3  1  4 40 40  5       40  1  5                                              70280         280   280' + '                                                                           '), 192);
  df[(6) - 1] = R.trunc(('         999 35  3       30 10     2           5                                                                     ' + '                                                                           '), 192);
  df[(8) - 1] = R.trunc(('999          65  3  1  9                                                     7  5             30                     ' + '                                                                           '), 192);
  df[(10) - 1] = R.trunc(('165130104999 25  1  1    15     2              9                                                                     ' + '                       5                                                   '), 192);
  df[(12) - 1] = R.trunc(('   700           2     2 40 50              3  2                                9            495 50          50    50' + '                          1  1  1  1                                       '), 192);
  df[(14) - 1] = R.trunc(('        2        1  1      400               999                                5  5                            50   ' + '                                                                           '), 192);
  df[(16) - 1] = R.trunc(('150           9  1  2                          2     1        2   200     5    50  1                 2 80  3    90   ' + '     5   200  4  1  1     1  1  1  1 50                 2                  '), 192);
  df[(18) - 1] = R.trunc(('         999     1                                   1        1           3    25 15                   50  2    80   ' + '    10    80     1    12  1  1  1  1                                       '), 192);
}
function convert_format() {
  let xloop = 0;
  let yloop = 0;
  let tempstr = '';
  let $17, $18, $19, $20, $21, $22;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  t[(9) - 1] = -(1);
  lavaflow = false;
  x = 1; $17 = 66;
  if (x <= $17) for (;;) {
    y = 1; $18 = 25;
    if (y <= $18) for (;;) {
      pf[(x) * 25 + (y) - 26] = 0;
      if (y >= $18) break;
      y++;
    }
    if (x >= $17) break;
    x++;
  }
  x = 1; $19 = 999;
  if (x <= $19) for (;;) {
    bx[(x) - 1] = 0;
    by[(x) - 1] = 0;
    sx[(x) - 1] = 0;
    sy[(x) - 1] = 0;
    mx[(x) - 1] = 0;
    my[(x) - 1] = 0;
    fx[(x) - 1] = 0;
    fy[(x) - 1] = 0;
    if (x >= $19) break;
    x++;
  }
  new_gem_color();
  yloop = 1; $20 = 23;
  if (yloop <= $20) for (;;) {
    xloop = 1; $21 = 64;
    if (xloop <= $21) for (;;) {
      tempstr = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
      $22 = R.charAt(tempstr, 1);
      if ($22 === ' ') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 0;
      } else if ($22 === '1') {
        snum = ((snum + 1)) << 16 >> 16;
        sx[(snum) - 1] = (xloop + 1);
        sy[(snum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 1;
      } else if ($22 === '2') {
        mnum = ((mnum + 1)) << 16 >> 16;
        mx[(mnum) - 1] = (xloop + 1);
        my[(mnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 2;
      } else if ($22 === '3') {
        fnum = ((fnum + 1)) << 16 >> 16;
        fx[(fnum) - 1] = (xloop + 1);
        fy[(fnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 3;
      } else if ($22 === 'X') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 4;
      } else if ($22 === 'W') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 5;
      } else if ($22 === 'L') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 6;
      } else if ($22 === 'C') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 7;
      } else if ($22 === 'S') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 8;
      } else if ($22 === '+') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 9;
      } else if ($22 === 'I') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 10;
      } else if ($22 === 'T') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 11;
      } else if ($22 === 'K') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 12;
      } else if ($22 === 'D') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 13;
      } else if ($22 === '#') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 14;
      } else if ($22 === 'F') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 15;
      } else if ($22 === '.') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 16;
      } else if ($22 === 'R') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 17;
      } else if ($22 === 'Q') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 18;
      } else if ($22 === '/') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 19;
      } else if ($22 === '\\') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 20;
      } else if ($22 === 'B') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 21;
      } else if ($22 === 'V') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 22;
      } else if ($22 === '=') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 23;
      } else if ($22 === 'A') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 24;
      } else if ($22 === 'U') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 25;
      } else if ($22 === 'Z') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 26;
      } else if ($22 === '*') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 27;
      } else if ($22 === 'E') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 28;
      } else if ($22 === ';') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 29;
      } else if ($22 === ':') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 30;
      } else if ($22 === '`') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 31;
      } else if ($22 === '-') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 32;
      } else if ($22 === '@') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 33;
      } else if ($22 === '%') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 34;
      } else if ($22 === ']') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 35;
      } else if ($22 === 'G') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 36;
        gennum = ((gennum + 1)) << 16 >> 16;
      } else if ($22 === '(') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 37;
      } else if ($22 === 'M') {
        bnum = ((bnum + 1)) << 16 >> 16;
        bx[(bnum) - 1] = (xloop + 1);
        by[(bnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 38;
      } else if ($22 === ')') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 39;
      } else if ($22 === 'P') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 40;
        px = ((xloop + 1)) << 16 >> 16;
        py = ((yloop + 1)) << 16 >> 16;
      } else if ($22 === '&') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 41;
      } else if ($22 === '!') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 42;
      } else if ($22 === 'O') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 43;
      } else if ($22 === 'H') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 44;
      } else if ($22 === '?') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 45;
      } else if ($22 === '>') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 46;
        t[(9) - 1] = 32000;
      } else if ($22 === 'N') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 47;
      } else if ($22 === '<') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 48;
      } else if ($22 === '[') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 49;
      } else if ($22 === '|') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 50;
      } else if ($22 === '"') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 51;
      } else if ($22 === '4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 52;
      } else if ($22 === '5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 53;
      } else if ($22 === '6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 54;
      } else if ($22 === '7') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 55;
      } else if ($22 === '8') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 56;
      } else if ($22 === '9') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 57;
      } else if ($22 === '\xf1') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 58;
      } else if ($22 === '\xf2') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 59;
      } else if ($22 === '\xf3') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 60;
      } else if ($22 === '\xf4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 61;
      } else if ($22 === '\xf5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 62;
      } else if ($22 === '\xf6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 63;
      } else if ($22 === 'Y') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 64;
      } else {
        tempstr = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = R.charAt(tempstr, 1).charCodeAt(0);
      }
      if (xloop >= $21) break;
      xloop++;
    }
    if (yloop >= $20) break;
    yloop++;
  }
}
function level1() {
  fp[(1) - 1] = R.trunc('1     1                  1     1    +    1    +                1', 64);
  fp[(2) - 1] = R.trunc(' +                   +                          1   +   1   +   ', 64);
  fp[(3) - 1] = R.trunc('       6666-6666                    ##########################  ', 64);
  fp[(4) - 1] = R.trunc('       66*T*T*66       1       +  1 ##1111111111111111111111##1 ', 64);
  fp[(5) - 1] = R.trunc('    +  66T*T*T66 +                  ##----------------------##  ', 64);
  fp[(6) - 1] = R.trunc('  1    666666666         +          ##XXXXX#############  XX## +', 64);
  fp[(7) - 1] = R.trunc('                    1           1   ##8888888888888\xf5K.##  XZ##  ', 64);
  fp[(8) - 1] = R.trunc('       1                            ####################  XX##+ ', 64);
  fp[(9) - 1] = R.trunc('                  +                        1    77\xf4##)))))))##  ', 64);
  fp[(10) - 1] = R.trunc('##### 1    RRRRR            1      1            777##W##1)))## 1', 64);
  fp[(11) - 1] = R.trunc('C::##       &RRRRR   1              +              ##W##)))1##  ', 64);
  fp[(12) - 1] = R.trunc(':-:##       RRRRR              P                   ##W##1)))## +', 64);
  fp[(13) - 1] = R.trunc('::-## 1      RRR                    1          1  +##W##)1))##  ', 64);
  fp[(14) - 1] = R.trunc(':-:##      +               1               +       ##W##)))1##+ ', 64);
  fp[(15) - 1] = R.trunc(':-:##    1         1                            1  ##W##1)))##  ', 64);
  fp[(16) - 1] = R.trunc('-::##                             ######D##     +  ##W##))1)##1 ', 64);
  fp[(17) - 1] = R.trunc('XXX##  +              1         1 ##-----##1       #####))))##  ', 64);
  fp[(18) - 1] = R.trunc('           1               1    + ##--#######    1              ', 64);
  fp[(19) - 1] = R.trunc('                1                 ##-------#####################', 64);
  fp[(20) - 1] = R.trunc('1      ########################D#########-1##------1---+--1-&-LL', 64);
  fp[(21) - 1] = R.trunc('XXXXXXX##T77##77777717777##-----##---------##-##################', 64);
  fp[(22) - 1] = R.trunc('XXXXXXX##777##7777##777777@@@@@@##1-#########D##return#to#kroz##', 64);
  fp[(23) - 1] = R.trunc('WWWWWWW##KK7771777##77W77##11111##------!-----##by#scott#miller#', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
}
function level3() {
  fp[(1) - 1] = R.trunc('OOOO<OOOO[OOOO|OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO-11111-OOOO', 64);
  fp[(2) - 1] = R.trunc('  #############################################################O', 64);
  fp[(3) - 1] = R.trunc('   T 1111111 T        ---##1      1##CC33333333333333       +##O', 64);
  fp[(4) - 1] = R.trunc('  #############      ##++## -  1 - ###################       ##O', 64);
  fp[(5) - 1] = R.trunc('                     ##  ## 1 -   1XXXXXXXXXXXXXXXXXXX       ##O', 64);
  fp[(6) - 1] = R.trunc('#######################  ## -    -                           ##O', 64);
  fp[(7) - 1] = R.trunc('!CX)XTXWXWXWXWXWXWXWXWX            YYYYYYYYYYYYYYYYYYY       ##O', 64);
  fp[(8) - 1] = R.trunc('66666666666666666666666666666666666666666666666666666666666--##O', 64);
  fp[(9) - 1] = R.trunc('I-662-----662-66-W66-266-2662----266C266--662----W662-----2--##O', 64);
  fp[(10) - 1] = R.trunc('K-66--66----------66------66--66--66--66------66--66--66-----##O', 64);
  fp[(11) - 1] = R.trunc('I-2---662-66-W662-----66W-----662---------66W-662-----662----##O', 64);
  fp[(12) - 1] = R.trunc('66666666666666666666666666666666666666666666666666666666666--##O', 64);
  fp[(13) - 1] = R.trunc('  -@1@1@11@1@1@11@1-"6H66+++++++66 1   1 1 1 1 1  1 1   )    ##O', 64);
  fp[(14) - 1] = R.trunc(' 6-@@1@@@1@11@1@@1@--6T661  1  166   1  1 1   1 1       )##**##O', 64);
  fp[(15) - 1] = R.trunc(' 6-@1@1@11@@1@1@11@1@6-66       661  1 1  1 1         )))##11##O', 64);
  fp[(16) - 1] = R.trunc(' 6-@11@1@1@1@1@11@1@@6-66  YYY  66  1    1  1 1     )))2)##11##O', 64);
  fp[(17) - 1] = R.trunc(' 6-@@@1@1@11@11@1@@116-661 YPY 166 1  11 1        ))))2))##11##O', 64);
  fp[(18) - 1] = R.trunc(' 6-@C@11@1@@11@1@1@1@6-66  YYY  66  1  1        ))))2)2)T##11##O', 64);
  fp[(19) - 1] = R.trunc(' 6-6666666666666666666-66       661 1         ))))2########11##O', 64);
  fp[(20) - 1] = R.trunc(' 6---------------------661  1  166666       ))))2))##2222##11##O', 64);
  fp[(21) - 1] = R.trunc(' 666666666666666666666666-------66S66     )))2)))2)##2222##1Q##O', 64);
  fp[(22) - 1] = R.trunc('  2********             (((((((((        ----------##----######O', 64);
  fp[(23) - 1] = R.trunc('+YYYYYYYYYYYYYYYYYYYYYY661+1+1+166                 ------X++++DL', 64);
  slow = '\x9a';
  medium = '\x94';
  fast = '\xea';
  convert_format();
}
function level5() {
  fp[(1) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222222222222', 64);
  fp[(2) - 1] = R.trunc('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', 64);
  fp[(3) - 1] = R.trunc('### =======&      ##*2      2 *    2   I*    I2  I   I I        ', 64);
  fp[(4) - 1] = R.trunc('L##   K=========  ##   2  -----------I    I  I I   I ((## ##### ', 64);
  fp[(5) - 1] = R.trunc('&## =========+    ##     --XXXXXXXXX-- 2 I  I   I I2 (2## ##?##.', 64);
  fp[(6) - 1] = R.trunc('D##   +========== ##  *  -XXXXXXXXXXX-     I II *I II(2##;##@##.', 64);
  fp[(7) - 1] = R.trunc('D##  ==========+  ##     -XXXXXXXXXXX-  I I    I I I (2##C##;##.', 64);
  fp[(8) - 1] = R.trunc('D##               ## 2   -XXXXXXXXXXX-I   * I  II I *(2## ## ##.', 64);
  fp[(9) - 1] = R.trunc('2## ################    --XXXXXKXXXXX-  I I   I  I I2(2## ## ##.', 64);
  fp[(10) - 1] = R.trunc('C##  *)22222222222) * 2--XXXXXXXXXXXXX--   I I  I    (2##2## ##*', 64);
  fp[(11) - 1] = R.trunc('2##   )))))))))))))   --XXXXXXXXXXXXXXX--*  2 I 2 I I((##### ##*', 64);
  fp[(12) - 1] = R.trunc('C###        *         -XXXXXXXXXXXXXXXXX-            *   2   ##*', 64);
  fp[(13) - 1] = R.trunc('2#t#2         )))))*))))XXX#########XXX--      *           * ##*', 64);
  fp[(14) - 1] = R.trunc('W#o#                   --XX##WWCWW##XX--   *     2    *      ##*', 64);
  fp[(15) - 1] = R.trunc('W#o#    * 2             --X####X####X--       *           *  ##*', 64);
  fp[(16) - 1] = R.trunc('W###              *          ## ##              ---2   *   W2##2', 64);
  fp[(17) - 1] = R.trunc('W#h#       *       99999999999# #99999999999    -\xf6############# ', 64);
  fp[(18) - 1] = R.trunc('W#o#    2 ############    V V    VV V    ###########K....   ... ', 64);
  fp[(19) - 1] = R.trunc('W#t#      #2           * VVVVV P  VVVV           2## ... ... .. ', 64);
  fp[(20) - 1] = R.trunc('X###      #-#-#-#-#-#-   VVVVVV!VVVVV*   -#-#-#-#-##.  .. .. . .', 64);
  fp[(21) - 1] = R.trunc('X##       #W#W#W#W#W#W  VVVVVVVVVVVVVVV  W#W#W#W#W####. .. . .. ', 64);
  fp[(22) - 1] = R.trunc('X##2      #W#W#W#W#W#W ####VVVVVVVVV#### W#W#W#W#W W## .. ... . ', 64);
  fp[(23) - 1] = R.trunc('        2 #W#W#W#W#W#W#########?#########W#W#W#W#W#W##     I.. .', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (110) << 16 >> 16;
}
function level7() {
  fp[(1) - 1] = R.trunc('H------OOOOOOOOOOOOOOOOOOOQMMMMMMMMMM*****MMMMMMMMMMMMMMMMXX##DL', 64);
  fp[(2) - 1] = R.trunc('---P---MMM<MMMMMMMMMMMMMMMMMMMMMMMMMM*****MMMMM"MMMTTMMMMMXX#D##', 64);
  fp[(3) - 1] = R.trunc('-------MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM*****MMMMMMMMMTTMMMMMXXD###', 64);
  fp[(4) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMM?MMMMMMMMMMMMMMMMMM)MMMMMMMMMMMMMMMMMMXXXXXX', 64);
  fp[(5) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMMMM---MMMMMMMMMMMMMM)MMMMMMMMMMMMMMMMMMXXXXXX', 64);
  fp[(6) - 1] = R.trunc('MM-MMMM------MMMMMMM-MMM-MMMMMMMMMMMMMM----------------MMMMMMMMM', 64);
  fp[(7) - 1] = R.trunc('MM-MMM-MMMMM-MMMMMMM-MMM-MMMMWWWMMMMMMMMMMMMMMMMMMMMMM----------', 64);
  fp[(8) - 1] = R.trunc('MM-MMMM-MMMM-MMMMMMMMMMMBMMMMWWWMMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMM', 64);
  fp[(9) - 1] = R.trunc('MM-MMM-MMMMMWMMMMMMM-MMMMMMMMWWWMMMMMMMMMMMMMMMMMMMMMM-MMMWWWMMM', 64);
  fp[(10) - 1] = R.trunc('WM-MMMM-MMMM-MMMMMMM-MMMMMMMMMMMMMMMM----MM----MMMMMMM-MMMWWWMMM', 64);
  fp[(11) - 1] = R.trunc('WM-MMM-MMMMM-MMMMMMM-MMMMMMMMMMMMMMMM-MM-MM-MM-MMMMMMM-MMMMMMMMM', 64);
  fp[(12) - 1] = R.trunc('WM-MMM-MMMMM-MMMMMMMMMMMMMMMMMMMMMMMM-MM-MM-MM-MMM|MMM----------', 64);
  fp[(13) - 1] = R.trunc('WMWMMM-MMMMM--------------------------MM----MM-MMMMMMMM-MMMMMMM-', 64);
  fp[(14) - 1] = R.trunc('WM-MMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM--MMMMMMM-MMMCMMM-', 64);
  fp[(15) - 1] = R.trunc('WM-MMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMM-MM-MMMM-', 64);
  fp[(16) - 1] = R.trunc('WM-MMM-----------------------------------W--MMM-----MMM-M-MMMMM-', 64);
  fp[(17) - 1] = R.trunc('MM-MMMMMMMMM-MMMM-MMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMM-MMM--MMMMM-M', 64);
  fp[(18) - 1] = R.trunc('MM-MMMMMMMMM-MMMM+MMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMM-MMMMMMMMM-MM', 64);
  fp[(19) - 1] = R.trunc('MM---MMMMMMM!MMMMMMMMMMMWWWWWWWW@-------MMM-MMM-----MMMMMMMM-MMM', 64);
  fp[(20) - 1] = R.trunc('MMMMM--MMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMM-MM--MMM-MMMMMMMMMMM-MMMM', 64);
  fp[(21) - 1] = R.trunc('MMMMMMM--MMMMMMMMM------------------MMM-MM-MMMM-MMMMMMMMMM-MMMMM', 64);
  fp[(22) - 1] = R.trunc('MMMMMMMMM--MM--MM-M@@@@@@@@@@@@@@@MMMMM-M-MMMMM---M-M-M-M-MMM---', 64);
  fp[(23) - 1] = R.trunc('[MMMMMMMMMM--MM--MM@2222222222222@MMMMM---MMMMMMMM-M-M-M-MMMM--K', 64);
  slow = '\x8e';
  medium = '\x94';
  fast = '\xea';
  convert_format();
  t[(8) - 1] = 75;
}
function level9() {
  fp[(1) - 1] = R.trunc('K                  H66        ]]DWDWD&L66                      !', 64);
  fp[(2) - 1] = R.trunc('     *********      66 66666 666666666666                     6O', 64);
  fp[(3) - 1] = R.trunc('    *VVVVVVVVV*     66 66?66                ////////          6O', 64);
  fp[(4) - 1] = R.trunc('   *VVVVVVVVVVV*    66 66&66          /////////\\////////      6O', 64);
  fp[(5) - 1] = R.trunc('    **VVVVVV***     66 66C66       //////\\\\\\\\\\\\\\\\//\\///////   6"', 64);
  fp[(6) - 1] = R.trunc('      ******  [     66]66]66    //////\\/\\\\\\%\\\\%\\\\/////T\xf58     6O', 64);
  fp[(7) - 1] = R.trunc('C                      66]66     7\xf4T////\\\\\\\\\\\\\\\\///\\/////     6O', 64);
  fp[(8) - 1] = R.trunc('6666666666666666666666666 66   //////\\////\\\\////////////     R6O', 64);
  fp[(9) - 1] = R.trunc('&------M@M@M@M@M@M@M@             ////////////\\//          RRR6O', 64);
  fp[(10) - 1] = R.trunc('6666666666666666666666                   //////          RRRRR6O', 64);
  fp[(11) - 1] = R.trunc('K       ]=====+ ]====]                                 RRRR2-|6O', 64);
  fp[(12) - 1] = R.trunc('   ====+         +====      66666666666              RRRR222--6O', 64);
  fp[(13) - 1] = R.trunc('    +=====  ]==             66222222266    W       RRRR22222226O', 64);
  fp[(14) - 1] = R.trunc('+==]      +====+ ====       66-------66         66RRR6622222226O', 64);
  fp[(15) - 1] = R.trunc('====   ======]              ---Y-Y-YC66         666666222222226O', 64);
  fp[(16) - 1] = R.trunc('+==           +=====+       66-------66            --2222222226O', 64);
  fp[(17) - 1] = R.trunc('    +====+   ====+====      66222222266       66666662222222226O', 64);
  fp[(18) - 1] = R.trunc(']  =======                  66666666666       66RRR662222222226O', 64);
  fp[(19) - 1] = R.trunc('    +      ]====< +====                 Z6666;666RRR622222222K6O', 64);
  fp[(20) - 1] = R.trunc(']]66666666666666666666666666666666666666666+WKW+666666666666666O', 64);
  fp[(21) - 1] = R.trunc('                      TTTTTT222222222222222222222222222222222C6O', 64);
  fp[(22) - 1] = R.trunc(' F6666666666666666666666666666666666666666666666666666666666666C', 64);
  fp[(23) - 1] = R.trunc('P                                                          ] ?6C', 64);
  slow = '\x9a';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (25) << 16 >> 16;
}
function level11() {
  fp[(1) - 1] = R.trunc('1                                                              Z', 64);
  fp[(2) - 1] = R.trunc('#(#(#(#(####################--########################]]#X@@@@@ ', 64);
  fp[(3) - 1] = R.trunc('1#1#1#1###33333--KK##"////////##V--VVV-V---+-+-+-+-+## 2#X@3@+@ ', 64);
  fp[(4) - 1] = R.trunc('#(#(#(#(##333333--K##/////////##-VV-V-V-V##-+-+-+-+-##2 #X@3@+@ ', 64);
  fp[(5) - 1] = R.trunc('(#(#(#(###3333333--##**///////##V-V-V-VV-##+-+-+-+-+## 2#X@3@+@I', 64);
  fp[(6) - 1] = R.trunc('#(#(#(#(##333333333##C*///////##-VVV-VV*V##-+-+-+-+-##2 #X@3@+@ ', 64);
  fp[(7) - 1] = R.trunc('(#(#(#(###-?################]-##]I################]-##2 #X@3@+@ ', 64);
  fp[(8) - 1] = R.trunc('#(#(#(#(##-===*==-=##W-W-W-W-W##;;;;;;;;|##DD DDDD D##N2#X@3@+@ ', 64);
  fp[(9) - 1] = R.trunc('2#2#2#2###-=--==-=-##-W-W-W-W-##;;;;;;;;;##D D  DDD ##2 #X@3@+@ ', 64);
  fp[(10) - 1] = R.trunc('#(#(#(#(##=-=-=-==-##W-W-W-W-W##;;;;;;;;;## DDDD D D##]]#X@3@+@ ', 64);
  fp[(11) - 1] = R.trunc('(#(#(#(###=*==-==-=##-W-W-W-W---......3;K##D  *DD DD##2 #X@3@+@ ', 64);
  fp[(12) - 1] = R.trunc('#(#Q#(#(#########]-########################I]#########2 #X@3@+@I', 64);
  fp[(13) - 1] = R.trunc('(#(#(#(###HOOOOOOOO##1-1-1-1-1`---22222-C##2-22--22*## 2#X@3@+@ ', 64);
  fp[(14) - 1] = R.trunc('#C#C#C#C##OOOOOOOOO##-1-1-1-1-##--2***2--##-22-22-22##2N#X@3@+@ ', 64);
  fp[(15) - 1] = R.trunc('(#(#(#(###OOOOOOOOO##--1-1-1-1##--2***2--##-2-22-2-2## 2#X@3@+@ ', 64);
  fp[(16) - 1] = R.trunc('33333333##OOOOOOOO<##[--1-1-1-##--22222-Z##2-22*222-##&2#X@3@+@ ', 64);
  fp[(17) - 1] = R.trunc('##########]-################]-##]S################-]##2E#X@3@+@ ', 64);
  fp[(18) - 1] = R.trunc('#crazy####::-:::--:##..-..*..-##\\\\\\\\\\\\\\\\!##-M-M-M-M-##DD#X@3@+@ ', 64);
  fp[(19) - 1] = R.trunc('#cubicals#:-:::-::-##.-.-...-.##\\\\\\\\\\\\\\\\\\##M-M-M-M-M##DD#X@3@+@I', 64);
  fp[(20) - 1] = R.trunc('#the######:-:--::-:##-...-.-..##\\\\\\\\\\\\\\\\\\##-M-M-M-M-##DD#X@3@+@ ', 64);
  fp[(21) - 1] = R.trunc('#sequel###::-:::::-`--.*..-..*##\\\\\\\\\\\\\\\\\\--M-M-M-M-K##DD#X@3@+@ ', 64);
  fp[(22) - 1] = R.trunc('################################-#####################LL#X@3@+@ ', 64);
  fp[(23) - 1] = R.trunc('K)))))))))))))))))))))))))))))))))))))))))33333333333#LL#X@3@+@P', 64);
  slow = '\x8e';
  medium = '\x94';
  fast = '\xea';
  convert_format();
  t[(2) - 1] = 30000;
}
function level13() {
  fp[(1) - 1] = R.trunc('----XXVVVVVVV##K-333##     #C\xf6###thank#you#for#playing#kroz####K', 64);
  fp[(2) - 1] = R.trunc('-####VV+++++VV### U3##  P  ##9#################################-', 64);
  fp[(3) - 1] = R.trunc('-###VV+++++++VV##333##                ****3333333C-##  K##W-3) X', 64);
  fp[(4) - 1] = R.trunc('-##VVV+++++++VVV######## ####;#;#;#;# #XX***######`## U ####3) X', 64);
  fp[(5) - 1] = R.trunc('-1##VV+++++++VV####C##* ] *##3#3#3#3#\xf6#XX##H######`##T V##*-3) X', 64);
  fp[(6) - 1] = R.trunc('-#1##VV+++++VV####XXX########W#W#W#W# #XX##K######`#########3) X', 64);
  fp[(7) - 1] = R.trunc('-#11##VVVVVVV#####XXX##/C/########### #CC####KCCTNNN```L##+-3) X', 64);
  fp[(8) - 1] = R.trunc('-##################X##//\\////####  +  ######################3) X', 64);
  fp[(9) - 1] = R.trunc('-::-:::---:---------/\\/\\///\\///## ###666666#K###333333333#*-3) X', 64);
  fp[(10) - 1] = R.trunc('-:-:-:-:::-:#########////\\///\\/   ########6# ####(#(#(#(####3) X', 64);
  fp[(11) - 1] = R.trunc('-:-:-::--:::###OOO###!\\///\\///### #111111#.# ###(#(#K#(#(#T-3) X', 64);
  fp[(12) - 1] = R.trunc(';-:::---::::##ORRROO###//C//###*# ##1111##.#3####(#(#(#(####3) X', 64);
  fp[(13) - 1] = R.trunc('O############ORRRRRRO##########*#+###11###.#.###(#(#(#(#(#*-3) X', 64);
  fp[(14) - 1] = R.trunc('OOO\xf3OOOOOOOOORRRRRRO###########*# ###//###.#.#Z##(#(#(#(####3) X', 64);
  fp[(15) - 1] = R.trunc('#############RRRROO##3333TTTT        II  #.#.# #(#(#(#(#(#+-3) X', 64);
  fp[(16) - 1] = R.trunc('.K-I====II=###GOO#### ################## #.#.# ##E#E#E#E####3) X', 64);
  fp[(17) - 1] = R.trunc('===II==I==I##########-XXXXXXXXXXXXX#   # #.#.# #(#(#(#(#(#*-3) X', 64);
  fp[(18) - 1] = R.trunc('====I=I==I=####   ###--------------- U # #.#.# ##(#(#(#(####3) X', 64);
  fp[(19) - 1] = R.trunc('==II==I===I### ### ##-1111111111111#   #+#.#.# #(#(#(#(#(#W-3) X', 64);
  fp[(20) - 1] = R.trunc('=I===I==II=#### ## ##-################## #.#.# ##(#(#(#(####### ', 64);
  fp[(21) - 1] = R.trunc('I===I==I===##  ## ### XWWWWWWWWWWWW##### #...#                I ', 64);
  fp[(22) - 1] = R.trunc('=II=I=I==I=# ####  ## #WWWWWWWWWWWW##### ###################### ', 64);
  fp[(23) - 1] = R.trunc('===I===II=I-##?` ##   ############V#####          ++++++++++C3  ', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (12) << 16 >> 16;
}
function level15() {
  fp[(1) - 1] = R.trunc('VVVV%%%%%%///2)))2)))2)))2)))2)))2)))2)))2)))2)))2))))))))))\xf47-[', 64);
  fp[(2) - 1] = R.trunc('VVVVVV#############################################XXXXXX)))\xf47U-', 64);
  fp[(3) - 1] = R.trunc('VVVVVVV-----------2222222222222222222222222222222)))))))))))\xf4777', 64);
  fp[(4) - 1] = R.trunc('<VVVVVVVOOOOOOOOO--222222222222222222222))))))--------------\xf4\xf4\xf4\xf4', 64);
  fp[(5) - 1] = R.trunc('666VVVVVVVOOOOOOOO--22222222222222222222)##DD##H++++++++++++++++', 64);
  fp[(6) - 1] = R.trunc('8888VVVVVVVOOOOOOOO--22222222B2222222222)##DD###################', 64);
  fp[(7) - 1] = R.trunc('    2VVVVVVVKOOOOOOO-2222222222222222222)##DD`-----2---C-I--.-]\xf1', 64);
  fp[(8) - 1] = R.trunc(' 666   VVVVVVVVOOOOO-2222222222222222222)##DD###################', 64);
  fp[(9) - 1] = R.trunc(' 6U6    VVVVVVVVOOOO-2222222222222222222)##(((((*(E(4MMMMMMMM444', 64);
  fp[(10) - 1] = R.trunc(' 666  P  VVVVVVVVOOO-2222222222222222222)##((*((((E(4MMMMMMMM4LL', 64);
  fp[(11) - 1] = R.trunc('            VVVVVVVO-----------222222222)##(((((((E*4MMMMMMMM444', 64);
  fp[(12) - 1] = R.trunc('             VVVVVVVVXXXXXXXXX-222222222-#######################', 64);
  fp[(13) - 1] = R.trunc(' 2      2     VVVVVVVVXXXXXXXX-222222222------T------2--2--2-]\xf2K', 64);
  fp[(14) - 1] = R.trunc('###             VVVVVVVV888XXX-222222222-#######################', 64);
  fp[(15) - 1] = R.trunc('22####        2   VVVVVVV"8XXX-222222222))))))-----)))))))))))))', 64);
  fp[(16) - 1] = R.trunc('222C               VVVVVVV8XXX-222222222222222-555-222222222222)', 64);
  fp[(17) - 1] = R.trunc('222C     2           VVVVVVXXX-222222222222222-5K5-222222222222)', 64);
  fp[(18) - 1] = R.trunc('22####       //   2   VVVVVVXX-222222222222222-555-222222222222)', 64);
  fp[(19) - 1] = R.trunc('###        /////      VVVVVVVX-222222222222222-----222222222222)', 64);
  fp[(20) - 1] = R.trunc('!   2     ///>///      VVVVVVV-22222222222222222222222222222222)', 64);
  fp[(21) - 1] = R.trunc('\xf6\xf6\xf6        /////       VVVVVVVV)))))))))))))))))))))))))))))))))', 64);
  fp[(22) - 1] = R.trunc('99\xf6\xf6\xf6\xf6\xf6    * //        VVVVVVVVV)))))######################88###', 64);
  fp[(23) - 1] = R.trunc('|9.....          2     V\xf3VVVVVVVV))))888888888888Q888888888888\xf5K', 64);
  slow = '\x8e';
  medium = '\x94';
  fast = '\xea';
  convert_format();
}
function level17() {
  fp[(1) - 1] = R.trunc('<3333333333333333333333333333333#K#OOOOOOOOOOOOOOOOOOO\xf333333333[', 64);
  fp[(2) - 1] = R.trunc('33333333333333333333333333333333#\xf4#33333333333333333333333333333', 64);
  fp[(3) - 1] = R.trunc('33333333333333333333333333333---#H#33333333333333333333333333333', 64);
  fp[(4) - 1] = R.trunc('33333333336666663333333333333-U-#4#33333333333333333333333333333', 64);
  fp[(5) - 1] = R.trunc('33333333336%W%W63333333333333---#4#33333333333################33', 64);
  fp[(6) - 1] = R.trunc('33333333336W%W%63333333333333333#4#3333333333?#11111111111111#33', 64);
  fp[(7) - 1] = R.trunc('33333333336%W%W63333333333333333#4#-###########/\\//////\\/////##-', 64);
  fp[(8) - 1] = R.trunc('33333333336666663333333333333333#4#-#**********/////\\/\\///\\//\\/-', 64);
  fp[(9) - 1] = R.trunc('33333333333333333333333333333333#4#-#**********\\//\\//////\\/////-', 64);
  fp[(10) - 1] = R.trunc('--3333333333333333333333333333355555###########################-', 64);
  fp[(11) - 1] = R.trunc('K-333333333333333333333333333335T.T5#C-B--------B--------B------', 64);
  fp[(12) - 1] = R.trunc('###############################5.P.5############################', 64);
  fp[(13) - 1] = R.trunc('#chamber#of#horror#3333333333335T.T5XXXXXXXXXXXXXXXXXXXXXXXXXX--', 64);
  fp[(14) - 1] = R.trunc('###################33333333333355555XXXXXXXXXXXXXXXXXXXXXXXXXX-K', 64);
  fp[(15) - 1] = R.trunc('33333333333333333333333333333333#7##############################', 64);
  fp[(16) - 1] = R.trunc('33333333333333333333333333333333#7#K-MMMMMMMXWWWWWWWWWWWWWWWWWWW', 64);
  fp[(17) - 1] = R.trunc('3333---333333333B333333333333333#7#--MMMMMMMX3333333333333333333', 64);
  fp[(18) - 1] = R.trunc('3333-K-3333333333333333333333333#7#MMMMMMMMMX3333333333333333333', 64);
  fp[(19) - 1] = R.trunc('3333---333333333333333###########7#MMMMMMMMMX3333333333333333333', 64);
  fp[(20) - 1] = R.trunc('3333333333333333333333#WWWWWE%%%#7#MMMMMMMMMX3333333333333333333', 64);
  fp[(21) - 1] = R.trunc('3333333333333333333333#WWWWW#####\xf4#MMMMMMMMMX333333333---3333333', 64);
  fp[(22) - 1] = R.trunc('3333###################-#####* !#\xf1#MMMMMMMMMX333333333-U-3333333', 64);
  fp[(23) - 1] = R.trunc('|33388888888888888DDDDD-\xf5DLL#  \xf2#K#MMMMMMMMMX333333333---333333"', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\x09';
  convert_format();
  t[(3) - 1] = 1700;
}
function level19() {
  fp[(1) - 1] = R.trunc('-P     !     CRRRWRRWRRRRRRRRRRR-1--1--1-RRC)))))))RK******2    ', 64);
  fp[(2) - 1] = R.trunc('-RRRRRRRRRRRRRRRR3RR3RR----------RRRRRRRXRRRRRRRRR)RRRRRRRRRRRR-', 64);
  fp[(3) - 1] = R.trunc('-----RRRRRRRRRRRR;RR;RR-RRR RRRR-1RRXXCRXRCXXRRRR)))RRRCCC]-----', 64);
  fp[(4) - 1] = R.trunc('RRRR     *****2        MRRR RRRR-1RRXRRRBRRRXRRRRXXXRRRRRRRRRRR-', 64);
  fp[(5) - 1] = R.trunc('R+RRRRRRRRRRRRRRRRRRRRRRRRR RRRR-1RRXRRXXXRRXRR                M', 64);
  fp[(6) - 1] = R.trunc('R-----]-----\xf1RRRK3333XXXXRRZRW1;-1RRXXXXXXXXXRR-R///RXXXXXXR-RDR', 64);
  fp[(7) - 1] = R.trunc('R-RRRRRRRRRRRRRR-RRRRRRRRRR RRRR-RRRRRRRRRRRRRR-R333RRRRRRRR-R+R', 64);
  fp[(8) - 1] = R.trunc('-----------EDDDD&DDDLLR     RW1;----DWDWDWDWD---R333RRRRRWRR-R+R', 64);
  fp[(9) - 1] = R.trunc('-RRRRRRRRRRRRRRRRRRRRRRIRRRRRRRRRRRRRRRRRRRRRRRRRRRRRKRRR3RR-R+R', 64);
  fp[(10) - 1] = R.trunc('-RR=-*=-==-=*-=-=+RR*]-]]*-]]-]]]--))))22222R3333?RRR-RRR;RR-R+R', 64);
  fp[(11) - 1] = R.trunc('-RRK==-=+-=-==-=--RR]-]]]-]-)]-]-]]R-RRRRRRRR333RRRR;;;RR----R+R', 64);
  fp[(12) - 1] = R.trunc('-RRRRRRRRRRRRRRRR RR-]]-]-]]]]-]]-]R;RR"\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe[RR333RR-RRRR+R', 64);
  fp[(13) - 1] = R.trunc('------------R     RR]--]-]?*--]--]*RKRR\xfe\xfe\xfe\xfethe\xfe\xfe\xfe\xfeRR333RR-R2RR+R', 64);
  fp[(14) - 1] = R.trunc('R-RRRRRRRRR-R RRRRRRRRRRRRRRRRRRRRRRRRR\xfe\xfe\xfewater\xfe\xfe\xfeRR333RR-R+RR+R', 64);
  fp[(15) - 1] = R.trunc('R4444444-UR------R-M                -RR\xfelabyrinth\xfeRR...RR--+RR+R', 64);
  fp[(16) - 1] = R.trunc('RRRRRRRRRRRRRRRR-R-RRRRRRRRRRRRRRRRR-RR\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfeRR...RR-RRRR2R', 64);
  fp[(17) - 1] = R.trunc('-RU-XXXX3333-TKR-R-R*R+3-2-2-1-1-RCR-RR<\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe\xfe|RR...RR-*2RRKR', 64);
  fp[(18) - 1] = R.trunc('-RRRRRRRRRRRRRRR-R-R-R+3-2-2-1-1-R R-RRRRRRR-RRRRRRR   RR-RRRRRR', 64);
  fp[(19) - 1] = R.trunc('-----------------R-R--+3-2-2-1-1-  R-RRMMMMMMMMM       RR-----RR', 64);
  fp[(20) - 1] = R.trunc('-RRRRRRRRRRRRRRRRR-R--+3-2-2-1-1-  R-RRRRRRRRRRRRRRRR RRRRRRR-RR', 64);
  fp[(21) - 1] = R.trunc('-RR3333333333333RR-R-R+3-2-2-1-1-R RM              RR        -RR', 64);
  fp[(22) - 1] = R.trunc('-RR5555555555555RR-RKR+3-2-2-1-1-R-RRRRRRRRRRRRR R-RRRRRRRRRR-RR', 64);
  fp[(23) - 1] = R.trunc('---+--+--+--+--\xf2---RRRRRRRRRRRRRRR-M             R------------RR', 64);
  slow = '\x8f';
  medium = '\x94';
  fast = '\xea';
  convert_format();
}
function level20() {
  fp[(1) - 1] = R.trunc('S  3  23     3    2 3    3  36WWWWWWWWWWWWWWWWWWWWW6   2 3:2222X', 64);
  fp[(2) - 1] = R.trunc('O#@@@@ - 3 - 2  3-   2-3  -2 66666666666666666666666 3  3 :2U22X', 64);
  fp[(3) - 1] = R.trunc('O#+@2@ 3 -2 ######### - 2  -       -       -3  2  3  3 -2 :2222X', 64);
  fp[(4) - 1] = R.trunc('O#+@2@ -   ##K#####"##  -3 - 3)MMMMMMMMM   -   -3 3 -   3 ::::::', 64);
  fp[(5) - 1] = R.trunc('[#+@2@- 3 ##5##&%&##5## 2  2  )M#######M   -  32  -2 3 - 2:T->-:', 64);
  fp[(6) - 1] = R.trunc('O#+@2@ 2-##5##XXXXX##5##  -3  )M##&P!##M   - 2 -3   3   3 ::::;:', 64);
  fp[(7) - 1] = R.trunc('O#+@2@3  ##5##X-A-X##5##2     )M#######M   -3   -3 2- 3 -3 23  X', 64);
  fp[(8) - 1] = R.trunc('O#+@2@ - ##3##XXXXX##3## 3 - 3)MMMMMMMMM   #######sm\xfawas\xfahere# X', 64);
  fp[(9) - 1] = R.trunc('O#+@2@2 3 ##3##EEE##3##2 -   -))   -N   - &##CCC##T]***Q***]T# X', 64);
  fp[(10) - 1] = R.trunc('G#+@2@3  - ##3##D##3## 3- 2-3  -#############777############## #', 64);
  fp[(11) - 1] = R.trunc('O#+@2@ - 2-3##3#D#3##2 - 2  - - 77---------------\xf4;K++++CCC3\xf3#U#', 64);
  fp[(12) - 1] = R.trunc('O#+@2@ 2 3  2##333##3   2 3-2 3-##############################-#', 64);
  fp[(13) - 1] = R.trunc('O#+@2@N -  3- ##3## - 2 -G2  - 3 (2222222222222222222222222(T#C#', 64);
  fp[(14) - 1] = R.trunc('O#+@2@ 3  2 - ##5##- 2 -3 - 3 -  ((((((((((((G((((((((((((((K#C#', 64);
  fp[(15) - 1] = R.trunc('O#+@2@-  -  3 ##5##3 -2  - 2  -  (2222222222222222222222222(T#|#', 64);
  fp[(16) - 1] = R.trunc('K#+@2@3 - 2 - ##5##2- #@@@@@# ################################-#', 64);
  fp[(17) - 1] = R.trunc('O#+@2@ - 3 - 2##5## 3 #MMMMM#2##<)C)))333333)))K##\xf2I=II=IT==I=I=', 64);
  fp[(18) - 1] = R.trunc('O#+@2@3 2 2  -##5## - #MMMMM#2##))))333333)))))T##I=I==I=I=I=I==', 64);
  fp[(19) - 1] = R.trunc('O#+@2@ -2-  3 ##D##3-2#MMMMM#@##))333333)))\xf5\xf5\xf544##I======I=I====', 64);
  fp[(20) - 1] = R.trunc('O#+@2@ -   3-2##H##  -#MMMMM#;##33333))))\xf5\xf5\xf5444V##=II===I===II==', 64);
  fp[(21) - 1] = R.trunc('O#+@2@3 -2- - ##`##- 3#MMMMM#Z##))))))\xf5\xf5\xf5\xf544GVVV##===I=G======I=', 64);
  fp[(22) - 1] = R.trunc(']#+@2@  - 32 -##`## 2 #MMMMM####\xf5\xf5\xf5\xf5\xf5\xf5\xf5\xf5444VVVVV##=I=I=I=II=I=I=', 64);
  fp[(23) - 1] = R.trunc('?#+@2@ -3  -3   -  3- #MMMMM88I\xf1\xf5\xf5\xf5\xf5\xf5\xf5\xf544VVVVVVV##K=I===I==I=I*=', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\x01';
  convert_format();
  lavaflow = true;
  lavarate = (99) << 16 >> 16;
}
let parsed = new Int16Array(64);
let score = 0;
let gems = 0;
let whips = 0;
let teleports = 0;
let keys = 0;
let difficulty = 0;
let level = 0;
let whippower = 0;
let pxold = 0;
let pyold = 0;
let bc = 0;
let bb = 0;
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
let x$7 = 0;
let y$3 = 0;
let i$2 = 0;
let a = 0;
let b = 0;
let xb = 0;
let yb = 0;
let strval = '';
let result$3 = { ax: 0, bx: 0, cx: 0, dx: 0, bp: 0, si: 0, di: 0, ds: 0, es: 0, flags: 0 };
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
function print(xpos, ypos, message) {
  R.gotoxy(xpos, ypos);
  R.write(message);
}
function printnum(ypos$2, num$3) {
  let $23;
  R.gotoxy(70, ypos$2);
  R.write('       ');
  strval = R.trunc(R.fmt(num$3, 0), 192);
  if (((ypos$2 === 2) && (score > 0))) {
    strval = R.trunc((strval + '0'), 192);
  }
  if ((ypos$2 === 11)) {
    $23 = whippower;
    if (($23 >= 0 && $23 <= 3)) {

    } else if (($23 >= 4 && $23 <= 5)) {
      strval = R.trunc((strval + '+'), 192);
    } else {
      strval = R.trunc((strval + '++'), 192);
    }
  }
  R.gotoxy((73 - Math.trunc(strval.length / 2)), ypos$2);
  R.write(strval);
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
function play(start, stop, speed) {
  let x$8 = 0;
  let $24, $25;
  if ((start <= stop)) {
    x$8 = start; $24 = stop;
    if (x$8 <= $24) for (;;) {
      R.sound(x$8);
      R.delay(speed);
      if (x$8 >= $24) break;
      x$8++;
    }
  } else {
    x$8 = start; $25 = stop;
    if (x$8 >= $25) for (;;) {
      R.sound(x$8);
      R.delay(speed);
      if (x$8 <= $25) break;
      x$8--;
    }
  }
  R.nosound();
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
function addscore(what) {
  let $26;
  $26 = what;
  if (($26 >= 1 && $26 <= 3)) {
    score = ((score + what)) | 0;
  } else if ($26 === 4 || $26 === 14) {
    if ((score > 2)) {
      score = ((score - 2)) | 0;
    }
  } else if ($26 === 5) {
    score = ((score + 1)) | 0;
  } else if ($26 === 6) {
    score = ((score + level)) | 0;
  } else if ($26 === 7) {
    score = ((score + 5)) | 0;
  } else if ($26 === 9) {
    score = ((score + 1)) | 0;
  } else if ($26 === 10) {
    score = ((score + 10)) | 0;
  } else if ($26 === 11) {
    score = ((score + 1)) | 0;
  } else if ($26 === 15) {
    score = ((score + 2)) | 0;
  } else if ($26 === 16) {
    if ((score > 5)) {
      score = ((score - 5)) | 0;
    }
  } else if ($26 === 22) {
    score = ((score + 25)) | 0;
  } else if ($26 === 20) {
    if ((score > level)) {
      score = ((score - Math.trunc(level / 2))) | 0;
    }
  } else if ($26 === 27) {
    score = ((score + 50)) | 0;
  } else if ($26 === 35) {
    score = ((score + (level * 2))) | 0;
  } else if ($26 === 36) {
    score = ((score + 50)) | 0;
  } else if ($26 === 38) {
    score = ((score + 1)) | 0;
  }
  update_info();
}
function screen() {
  clearkeys();
  color = true;
  bak(0, 0);
  R.clrscr();
  bor(3);
  cur(3);
  col(9, 9);
  R.gotoxy(33, 3);
  R.write('RETURN TO KROZ');
  R.gotoxy(18, 10);
  col(15, 7);
  R.write('Is your screen Color or Monochrome (C/M)? C');
  R.gotoxy((R.wherex() - 1), R.wherey());
  cur(2);
  ch = R.readKbd();
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
  if ((R.upcase(ch) === 'F')) {
    fastpc = true;
  } else {
    fastpc = false;
  }
  R.clrscr();
}
function border() {
  let $27, $28;
  R.gotoxy(1, 24);
  bc = ((R.random(8) + 8)) << 16 >> 16;
  bb = ((R.random(7) + 1)) << 16 >> 16;
  col(bc, 0);
  bak(bb, 7);
  i$2 = 1; $27 = 66;
  if (i$2 <= $27) for (;;) {
    R.gotoxy(i$2, 25);
    R.write('\xb2');
    R.gotoxy(i$2, 1);
    R.write('\xb2');
    if (i$2 >= $27) break;
    i$2++;
  }
  i$2 = 2; $28 = 24;
  if (i$2 <= $28) for (;;) {
    R.gotoxy(1, i$2);
    R.write('\xb2');
    R.gotoxy(66, i$2);
    R.write('\xb2');
    if (i$2 >= $28) break;
    i$2++;
  }
  bak(0, 0);
}
function restore_border() {
  let $29;
  R.gotoxy(2, 25);
  col(bc, 0);
  bak(bb, 7);
  x$7 = 1; $29 = 64;
  if (x$7 <= $29) for (;;) {
    R.write('\xb2');
    if (x$7 >= $29) break;
    x$7++;
  }
  bak(0, 0);
}
function init_screen() {
  let $30, $31;
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  restart = false;
  score = (0) | 0;
  level = (1) << 16 >> 16;
  whips = (5) << 16 >> 16;
  teleports = (0) << 16 >> 16;
  keys = (0) << 16 >> 16;
  whippower = (2) << 16 >> 16;
  $30 = difficulty;
  if ($30 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($30 === 8) {
    gems = (25) << 16 >> 16;
    whips = (10) << 16 >> 16;
  } else if ($30 === 5) {
    gems = (18) << 16 >> 16;
  } else if ($30 === 2) {
    gems = (10) << 16 >> 16;
  }
  replacement = (0) << 16 >> 16;
  bonus = (0) << 16 >> 16;
  lavaflow = false;
  foundset = R.EMPTY;
  gennum = (0) << 16 >> 16;
  if (fastpc) {
    genfactor = (28) << 16 >> 16;
  } else {
    genfactor = (17) << 16 >> 16;
  }
  if (mixup) {
    gems = (40) << 16 >> 16;
    whips = (20) << 16 >> 16;
    teleports = (5) << 16 >> 16;
    keys = (1) << 16 >> 16;
    foundset = R.setOf(0, 64);
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
  x$7 = 1; $31 = 9;
  if (x$7 <= $31) for (;;) {
    t[(x$7) - 1] = -(1);
    if (x$7 >= $31) break;
    x$7++;
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
function title() {
  let startgame = false;
  let $32, $33, $34, $35, $36, $37, $38, $39, $40;
  R.nosound();
  clearkeys();
  bak(1, 0);
  bor(4);
  R.clrscr();
  cur(3);
  R.gotoxy(32, 1);
  col(4, 7);
  bak(1, 0);
  R.write('\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc');
  R.gotoxy(32, 3);
  R.write('\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf');
  R.gotoxy(25, 5);
  col(15, 15);
  R.write('An Apogee Software Production');
  R.gotoxy(28, 7);
  R.write('Created by Scott Miller');
  R.gotoxy(1, 9);
  col(11, 7);
  R.write('  In your search for the precious Crown within the mysterious kingdom of Kroz' + '\r\n');
  R.write('  you have blundered upon a secret passage leading deep into the Earth.  With' + '\r\n');
  R.write('  your worn lantern you journey downward void of fear,  sweat beading on your' + '\r\n');
  R.write('  forehead as you anticipate great treasures.  Undoubtedly, the Crown must be' + '\r\n');
  R.write('  guarded by unspeakable dangers.  Still, armed with a whip and great courage' + '\r\n');
  R.write('           you decide to continue your quest, and journey downward...' + '\r\n');
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
      R.gotoxy(32, 2);
      col(R.random(16), 0);
      R.write(' RETURN TO KROZ ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($32 = R.upcase(ch).charCodeAt(0), $32 === 13 || $32 === 78 || $32 === 32 || $32 === 69 || $32 === 65 || $32 === 33)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x$7 = 1; $33 = 28;
  if (x$7 <= $33) for (;;) {
    R.write('  ');
    if (x$7 >= $33) break;
    x$7++;
  }
  col(30, 31);
  bak(1, 0);
  $34 = R.upcase(ch);
  if ($34 === 'N' || $34 === ' ' || $34 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($34 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($34 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($34 === '!') {
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
    R.gotoxy(32, 2);
    col(R.random(16), 0);
    R.write(' RETURN TO KROZ ');
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
    R.gotoxy(33, 2);
    R.write('RETURN TO KROZ');
    R.gotoxy(17, 4);
    col(6, 7);
    R.write('Copyright (c) 1990 Apogee Software Productions');
    R.gotoxy(7, 6);
    R.write('Version 1.2 -- Volume I of the Super Kroz Trilogy by Scott Miller');
    R.gotoxy(1, 8);
    col(4, 7);
    x$7 = 1; $35 = 80;
    if (x$7 <= $35) for (;;) {
      R.write('\xc4');
      if (x$7 >= $35) break;
      x$7++;
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
    R.write('riginal Kroz Trilogy');
    R.gotoxy(27, 23);
    col(15, 0);
    bak(1, 7);
    R.write('Your choice (B/I/M/S/O)? B');
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
    $36 = R.upcase(ch);
    if ($36 === 'B') {
      x$7 = 40; $37 = 4;
      if (x$7 >= $37) for (;;) {
        y$3 = 100; $38 = 20;
        if (y$3 >= $38) for (;;) {
          R.sound((x$7 * y$3));
          R.delay(1);
          if (y$3 <= $38) break;
          y$3--;
        }
        if (x$7 <= $37) break;
        x$7--;
      }
      R.nosound();
      startgame = true;
    } else if ($36 === 'I') {
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
      R.write('   Return to Kroz is a game of exploration and survival.  Your journey will' + '\r\n');
      R.write(' take you through 20 very dangerous chambers, each riddled with diabolical' + '\r\n');
      R.write(' traps and hideous creatures.   Hidden in the deepest dungeon lies the' + '\r\n');
      R.write(' priceless Crown of Kroz--your quest. Use the cursor pad to move 8 directions.' + '\r\n');
      R.write('   The chambers contain dozens of treasures, spells, traps and other unknowns.' + '\r\n');
      R.write(' Touching an object for the first time will reveal a little of its identity,' + '\r\n');
      R.write(' but it will be left to you to decide how best to use it--or avoid it.' + '\r\n');
      R.write('   When a creature touches you it will vanish, taking with it a few of your' + '\r\n');
      R.write(' gems that you have collected. If you have no gems then the creature will' + '\r\n');
      R.write(' instead take your life!  Whips can be used to kill nearby creatures, but' + '\r\n');
      R.write(' they\'re better used to smash through "crumbled walls" and other terrain.' + '\r\n');
      R.write('   PCjr players can use' + '\r\n');
      R.write(' the alternate cursor                 U I O      ( NW N NE )' + '\r\n');
      R.write(' pad instead of the cursor             J K       (   W E   )' + '\r\n');
      R.write(' keys to move your man, and           N M ,      ( SW S SE )' + '\r\n');
      R.write(' the four normal cursor keys.' + '\r\n');
      R.write('   It\'s a good idea to save your game at every new level, therefore, if you die' + '\r\n');
      R.write(' you can easily restore the game at that level and try again.' + '\r\n');
      R.write('   Registered users can request a "Hidden Tricks and Hints" sheet if needed.' + '\r\n');
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
      R.write('   Return to Kroz will present you with many challenges.  You will venture deep' + '\r\n');
      R.write(' underground and probably not make it out alive!' + '\r\n');
      R.write('' + '\r\n');
      R.write(' Hints:  \xfe Use your player to touch each new object to find out about it.  When' + '\r\n');
      R.write('           you first touch an object a message appears at the bottom of the' + '\r\n');
      R.write('           screen that describes it.' + '\r\n');
      R.write('       \xfe\xfe> Don\'t forget to use the Home, End, PgUp, and PgDn keys to move your' + '\r\n');
      R.write('           on-screen character diagonally (along with the marked cursor keys).' + '\r\n');
      R.write('         \xfe Collect keys to unlock doors, which usually block the stairs going.' + '\r\n');
      R.write('         \xfe The faster monsters are the most dangerous to touch--they will knock' + '\r\n');
      R.write('           off three of your valuable gems.  The slowest creatures only take a' + '\r\n');
      R.write('           single gem from you, and the medium speed monsters take two.' + '\r\n');
      R.write('         \xfe Nearly every new level presents you with new objects to discover.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   To prove to you that this game CAN be completed, let me say (or brag) that I' + '\r\n');
      R.write(' have finished this game on the "Advanced" skill level, with over 120 gems and' + '\r\n');
      R.write(' 60 whips left to spare.  On the "Novice" level I can play and win one handed!' + '\r\n');
      R.write('   There\'s many secret tricks in this game that can help you (even on Level 1)' + '\r\n');
      R.write(' but even without these hidden maneuvers you can complete Return to Kroz.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($36 === 'M') {
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
      R.write('   Return to Kroz is a user-supported game.  This means that the creator of' + '\r\n');
      R.write(' this program relies on the appreciation of honest players to pay the game\'s' + '\r\n');
      R.write(' minimal registration fee--$7.50.' + '\r\n');
      R.write('   Payment of this fee entitles you to all the free help and hints you might' + '\r\n');
      R.write(' need to enjoy the game.  All letters from registered users are answered' + '\r\n');
      R.write(' within two days.  (Try to get this kind of support from commercial games!)' + '\r\n');
      R.write('   Also, players can order the other Kroz sequels ONLY if this first' + '\r\n');
      R.write(' registration fee is paid.  ($7.50 each or $20 for all three games.)' + '\r\n');
      R.write('   Everyone who orders (or registers) all three of the Super Kroz Trilogy also' + '\r\n');
      R.write(' get a "Hints, Tricks and Scoring Secrets" guide, and "The Domain of Kroz" map.' + '\r\n');
      R.write('   A single Kroz games takes nearly six months to create, or, over 200 hours!' + '\r\n');
      R.write(' I can\'t afford to devote this much time without receiving something in return.' + '\r\n');
      R.write(' That is why I ask for this small fee, which is only necessary if you enjoy' + '\r\n');
      R.write(' this game.  In other words, try before you buy.' + '\r\n');
      R.write('   Even if you buy this game from a public domain or shareware library, I don\'t' + '\r\n');
      R.write(' receive any of that money.  You\'re simply paying for "storage, distribution,' + '\r\n');
      R.write(' disk, and handling".' + '\r\n');
      R.write('' + '\r\n');
      R.write('   -- Scott Miller, President, Apogee Software Productions' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($36 === 'S') {
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
      R.write('   One of my objects was to create a game that wasn\'t all fast paced action,' + '\r\n');
      R.write(' but also included strategy and puzzle solving.  Kingdom of Kroz was entered' + '\r\n');
      R.write(' in a national programming contest in 1988 and took top honors in the game' + '\r\n');
      R.write(' category, and number two overall (beat out by a spreadsheet program).' + '\r\n');
      R.write('   The latest Kroz Trilogy has been greatly re-designed and re-programmed, but' + '\r\n');
      R.write(' the familiar appearance has been mostly maintained.  You will discover new' + '\r\n');
      R.write(' dangers, creatures and objects in your adventures below.  Good luck...' + '\r\n');
      R.write('   The latest Kroz game, The Lost Adventures of Kroz, came about as a direct' + '\r\n');
      R.write(' result of players requesting more, more, more Kroz!  So I delivered the goods.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($36 === 'O') {
      bor(15);
      bak(1, 0);
      R.clrscr();
      clearkeys();
      cur(3);
      R.gotoxy(27, 2);
      col(14, 7);
      R.write('THE ORIGINAL KROZ TRILOGY' + '\r\n');
      R.gotoxy(27, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   The original three Kroz games were such a tremendous success that I was' + '\r\n');
      R.write(' obliged to make this second, and probably final trilogy.  The first three' + '\r\n');
      R.write(' Kroz games are:   \xfe Kingdom of Kroz  \xfe Caverns of Kroz  \xfe Dungeons of Kroz.' + '\r\n');
      R.write(' All three are still available and are constantly being updated and improved.' + '\r\n');
      R.write('   The original Kroz Trilogy games can be purchased for $7.50 each, or all 3' + '\r\n');
      R.write(' for $15 (these prices include postage, disks, and handling).' + '\r\n');
      R.write('   Only Kingdom of Kroz can be placed in a shareware library for distribution,' + '\r\n');
      R.write(' and the other two can only be ordered from Apogee Software Productions.' + '\r\n');
      R.write('   To purchase these games please make checks payable to Apogee Software, and' + '\r\n');
      R.write(' mail to:  4206 Mayflower \xf9 Garland, TX 75043.  Call 214/240-0614 for info.' + '\r\n');
      R.write(' This address will always be valid, but you can call to verify if you need to.' + '\r\n');
      R.write('   These Kroz games feature a total of 95 new, unique levels.  Kingdom of Kroz' + '\r\n');
      R.write(' took the title of "Best Game" in a 1988 national programming competition.' + '\r\n');
      R.write('   All Kroz games work on all monitors, either graphics or monochrome systems.' + '\r\n');
      R.write(' Plus, they only rely on keyboard control, and have slow-down routines that' + '\r\n');
      R.write(' permit them to function correctly on any speed IBM PC compatible computer.' + '\r\n');
      R.write('   ASP also sells an "Adventure FUN-PAK", that contains four games that are' + '\r\n');
      R.write(' similar to the Kroz games in style.  This FUN-PAK (there\'s also a "Puzzle' + '\r\n');
      R.write(' FUN-PAK" avalaible) is sold for $10, which includes shipping.  Thank you.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else {
      x$7 = 40; $39 = 4;
      if (x$7 >= $39) for (;;) {
        y$3 = 100; $40 = 20;
        if (y$3 >= $40) for (;;) {
          R.sound((x$7 * y$3));
          R.delay(1);
          if (y$3 <= $40) break;
          y$3--;
        }
        if (x$7 <= $39) break;
        x$7--;
      }
      R.nosound();
      startgame = true;
    }
  } while (!(startgame));
  bak(0, 0);
  R.clrscr();
  bor(4);
}
function high_score(playagain) {
  let x$9 = 0;
  let place = 0;
  let stop$2 = false;
  let $41, $42, $43, $44, $45, $46, $47, $48, $49, $50;
  clearkeys();
  R.window(2, 2, (64 + 1), (23 + 1));
  bak(0, 0);
  R.clrscr();
  R.window(1, 1, 80, 25);
  cur(3);
  R.assign(hsfile, 'RETURN.HS');
  R.reset(hsfile);
  if ((R.ioresult() !== 0)) {
    R.rewrite(hsfile);
    x$9 = 1; $41 = 15;
    if (x$9 <= $41) for (;;) {
      $42 = (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 });
      $43 = x$9;
      if ($43 === 1) {
        $42.name = R.trunc('Scott Miller', 15);
        $42.highscore = (10963) | 0;
        $42.highlevel = (11) | 0;
      } else if ($43 === 2) {
        $42.name = R.trunc('I. Jones', 15);
        $42.highscore = (4281) | 0;
        $42.highlevel = (5) | 0;
      } else {
        $42.name = R.trunc('-----', 15);
        $42.highscore = (0) | 0;
        $42.highlevel = (0) | 0;
      }
      R.fwrite(hsfile, (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 >= $41) break;
      x$9++;
    }
    R.close(hsfile);
  }
  col(9, 9);
  R.gotoxy(28, 3);
  R.write('RETURN TO KROZ');
  col(11, 7);
  R.gotoxy(16, 5);
  R.write('NAME');
  R.gotoxy(33, 5);
  R.write('HIGH SCORE');
  R.gotoxy(49, 5);
  R.write('LEVEL');
  R.reset(hsfile);
  x$9 = 1; $44 = 15;
  if (x$9 <= $44) for (;;) {
    hslist[(x$9) - 1] = R.clone(R.fread(hsfile));
    if (x$9 >= $44) break;
    x$9++;
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
    x$9 = 15; $45 = place;
    if (x$9 >= $45) for (;;) {
      hslist[(x$9) - 1] = R.clone((hslist[((x$9 - 1)) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 <= $45) break;
      x$9--;
    }
  }
  $46 = (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 });
  $46.name = R.trunc('', 15);
  $46.highscore = (score) | 0;
  $46.highlevel = (level) | 0;
  x$9 = 1; $47 = 15;
  if (x$9 <= $47) for (;;) {
    if (((x$9 & 1) !== 0)) {
      col(12, 7);
    } else {
      col(13, 7);
    }
    $48 = (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 });
    R.gotoxy(13, (x$9 + 6));
    R.write(R.fmt(x$9, 2));
    R.gotoxy(16, (x$9 + 6));
    R.write($48.name);
    R.gotoxy(36, (x$9 + 6));
    R.write(String($48.highscore));
    if (($48.highscore > 0)) {
      R.write('0');
    }
    R.gotoxy(50, (x$9 + 6));
    R.write(String($48.highlevel));
    if (x$9 >= $47) break;
    x$9++;
  }
  R.close(hsfile);
  clearkeys();
  if ((place < 16)) {
    bak(4, 7);
    R.gotoxy(16, (place + 6));
    R.write('               ');
    col(4, 0);
    bak(7, 7);
    R.gotoxy(15, 23);
    R.write('Enter your name then press <enter>.');
    col(15, 15);
    bak(4, 7);
    R.gotoxy(16, (place + 6));
    cur(2);
    (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 }).name = R.trunc(R.readLine(15), 15);
    cur(3);
    R.rewrite(hsfile);
    x$9 = 1; $49 = 15;
    if (x$9 <= $49) for (;;) {
      R.fwrite(hsfile, (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 >= $49) break;
      x$9++;
    }
    R.close(hsfile);
  }
  bak(0, 0);
  R.gotoxy(15, 23);
  R.write('                                   ');
  x$9 = 1; $50 = 999;
  if (x$9 <= $50) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    bx[(x$9) - 1] = 0;
    by[(x$9) - 1] = 0;
    if (x$9 >= $50) break;
    x$9++;
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
      R.write('Congratulations for completing RETURN TO KROZ!' + '\r\n');
    } else {
      R.gotoxy(16, 2);
      R.write('RETURN TO KROZ' + '\r\n');
    }
    sign_off();
  }
}
function won() {
  border();
  clearkeys();
  col(16, 31);
  bak(bb, 0);
  print(10, 1, 'YOUR QUEST FOR THE CROWN OF KROZ WAS SUCCESSFUL!');
  bak(0, 0);
  high_score(false);
}
function dead(deaddot) {
  let $51;
  if ((gems > 9)) {
    col(4, 7);
  } else {
    gems = (0) << 16 >> 16;
    col(20, 23);
  }
  bak(7, 0);
  R.gotoxy(71, 8);
  R.write('     ');
  strval = R.trunc(R.fmt(gems, 0), 192);
  R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
  R.write(strval);
  bak(0, 0);
  if (deaddot) {
    x$7 = 150; $51 = 5;
    if (x$7 >= $51) for (;;) {
      R.gotoxy(px, py);
      col(x$7, x$7);
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound((x$7 * x$7));
      if (x$7 <= $51) break;
      x$7--;
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
function parse_field() {
  let slot = 0;
  let counter$2 = 0;
  let test = 0;
  let fetch = '';
  let $52;
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
    ($52 = R.val(fetch), parsed[(counter$2) - 1] = $52[0], test = ($52[1]) << 16 >> 16);
    slot = ((slot + 3)) << 16 >> 16;
    counter$2 = ((counter$2 + 1)) << 16 >> 16;
  } while (!((counter$2 > 64)));
}
function create_playfield() {
  let x$10 = 0;
  let y$4 = 0;
  let obj = 0;
  let loop$2 = 0;
  let xspot = 0;
  let yspot = 0;
  let $53, $54, $55, $56, $57, $58;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$10 = 1; $53 = 999;
  if (x$10 <= $53) for (;;) {
    bx[(x$10) - 1] = 0;
    by[(x$10) - 1] = 0;
    sx[(x$10) - 1] = 0;
    sy[(x$10) - 1] = 0;
    mx[(x$10) - 1] = 0;
    my[(x$10) - 1] = 0;
    fx[(x$10) - 1] = 0;
    fy[(x$10) - 1] = 0;
    if (x$10 >= $53) break;
    x$10++;
  }
  new_gem_color();
  x$10 = 2; $54 = 65;
  if (x$10 <= $54) for (;;) {
    y$4 = 2; $55 = 24;
    if (y$4 <= $55) for (;;) {
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      if (y$4 >= $55) break;
      y$4++;
    }
    if (x$10 >= $54) break;
    x$10++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $56 = 64;
  if (obj <= $56) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $57 = parsed[(obj) - 1];
      if (loop$2 <= $57) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $58 = obj;
            if ($58 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($58 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($58 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            } else if ($58 === 36) {
              gennum = ((gennum + 1)) << 16 >> 16;
            } else if ($58 === 38) {
              bnum = ((bnum + 1)) << 16 >> 16;
              bx[(bnum) - 1] = xspot;
              by[(bnum) - 1] = yspot;
            } else if ($58 === 46) {
              t[(9) - 1] = 32000;
            }
          }
        } while (!(done));
        if (loop$2 >= $57) break;
        loop$2++;
      }
    }
    if (obj >= $56) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $59, $60, $61;
  xloop$2 = 2; $59 = 65;
  if (xloop$2 <= $59) for (;;) {
    yloop$2 = 2; $60 = 24;
    if (yloop$2 <= $60) for (;;) {
      if ((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0)) {
        R.gotoxy(xloop$2, yloop$2);
        $61 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($61 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($61 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($61 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($61 === 4) {
          col(6, 7);
          R.write('\xb2');
        } else if ($61 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($61 === 6) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($61 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($61 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($61 === 9) {
          col(gemcolor, 7);
          R.write('\x04');
        } else if ($61 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($61 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($61 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($61 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($61 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($61 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($61 === 16) {
          if ((R.random(120) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(7, 7);
            R.write('\xf9');
          }
        } else if ($61 === 17) {
          col(9, 0);
          bak(1, 7);
          R.write('\xf7');
          bak(0, 0);
        } else if ($61 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            bak(0, 0);
            R.write('\x09');
          }
        } else if ($61 === 19) {
          col(6, 0);
          bak(2, 7);
          R.write('\xb0');
          bak(0, 0);
        } else if ($61 === 20) {
          col(6, 0);
          bak(2, 7);
          R.write('\xb1');
          bak(0, 0);
        } else if ($61 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($61 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($61 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($61 === 24) {
          col(15, 15);
          R.write('\x05');
        } else if ($61 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($61 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($61 === 27) {
          col(artcolor, 7);
          R.write('\x0f');
        } else if ($61 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($61 === 29) {

        } else if ($61 === 30) {

        } else if ($61 === 31) {

        } else if ($61 === 32) {

        } else if ($61 === 33) {

        } else if ($61 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($61 === 35) {
          col(15, 7);
          R.write('?');
        } else if ($61 === 36) {
          col(30, 31);
          R.write('\x06');
        } else if ($61 === 37) {

        } else if ($61 === 38) {
          col(6, 7);
          R.write('\xb2');
        } else if ($61 === 39) {

        } else if ($61 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($61 === 41) {

        } else if ($61 === 42) {
          col(9, 7);
          R.write('\xfe');
        } else if ($61 === 43) {
          col(6, 7);
          R.write('\xb2');
        } else if ($61 === 44) {

        } else if ($61 === 45) {
          col(15, 7);
          R.write('?');
        } else if ($61 === 46) {
          col(31, 23);
          R.write('\x01');
        } else if ($61 === 48) {
          col(14, 7);
          R.write('K');
        } else if ($61 === 49) {
          col(14, 7);
          R.write('R');
        } else if ($61 === 50) {
          col(14, 7);
          R.write('O');
        } else if ($61 === 51) {
          col(14, 7);
          R.write('Z');
        } else if ($61 === 52 || $61 === 53) {
          col(6, 7);
          R.write('\xdb');
        } else if ($61 === 54) {
          col(7, 7);
          R.write('\xdb');
        } else if (($61 >= 55 && $61 <= 57)) {

        } else if (($61 >= 58 && $61 <= 60)) {
          col(11, 7);
          R.write('\x7f');
        } else if (($61 >= 61 && $61 <= 63)) {

        } else if ($61 === 64) {
          col(7, 7);
          R.write('\xb2');
        } else if ($61 === 47) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {

          }
        } else {
          col(15, 0);
          bak(6, 7);
          R.write(R.upcase(String.fromCharCode((pf[(xloop$2) * 25 + (yloop$2) - 26]) & 255)));
          bak(0, 0);
        }
      }
      if (yloop$2 >= $60) break;
      yloop$2++;
    }
    if (xloop$2 >= $59) break;
    xloop$2++;
  }
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $62;
    R.sound(540);
    R.delay(40);
    x$7 = 1; $62 = 4;
    if (x$7 <= $62) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x$7 >= $62) break;
      x$7++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $63, $64;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($63 = key.charCodeAt(0), $63 === 72 || $63 === 80 || $63 === 77 || $63 === 75 || $63 === 71 || $63 === 79 || $63 === 73 || $63 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $64 = key.charCodeAt(0);
      if ($64 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($64 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($64 === 119 || $64 === 87) {
        $result = (87) & 255;
      } else if ($64 === 116 || $64 === 84) {
        $result = (84) & 255;
      } else if ($64 === 112 || $64 === 80) {
        $result = (80) & 255;
      } else if ($64 === 113 || $64 === 81) {
        $result = (81) & 255;
      } else if ($64 === 115 || $64 === 83) {
        $result = (83) & 255;
      } else if ($64 === 114 || $64 === 82) {
        $result = (82) & 255;
      } else if ($64 === 117 || $64 === 85) {
        $result = (171) & 255;
      } else if ($64 === 105 || $64 === 73) {
        $result = (172) & 255;
      } else if ($64 === 111 || $64 === 79) {
        $result = (173) & 255;
      } else if ($64 === 106 || $64 === 74) {
        $result = (175) & 255;
      } else if ($64 === 107 || $64 === 75) {
        $result = (177) & 255;
      } else if ($64 === 110 || $64 === 78) {
        $result = (179) & 255;
      } else if ($64 === 109 || $64 === 77) {
        $result = (180) & 255;
      } else if ($64 === 44) {
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
function hit(x$11, y$5, ch$2) {
  let i$3 = 0;
  let thing = '\x00';
  let $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76;
  thing = String.fromCharCode(pf[(x$11) * 25 + (y$5) - 26]);
  bak(0, 0);
  i$3 = 1; $65 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $65) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$11, y$5);
    R.write(ch$2);
    if (i$3 >= $65) break;
    i$3++;
  }
  R.gotoxy(x$11, y$5);
  $66 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($66 >= 1 && $66 <= 3)) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($66 === 4 || $66 === 19 || $66 === 20) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $67 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($67 === 4) {
      thing = '\xb2';
    } else if ($67 === 19) {
      thing = '\xb0';
    } else if ($67 === 20) {
      thing = '\xb1';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $68 = 20;
      if (i$3 >= $68) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $68) break;
        i$3--;
      }
      R.sound(90);
    } else {
      R.sound(130);
      R.delay(25);
      R.sound(90);
      col(6, 7);
      if (($69 = thing.charCodeAt(0), $69 === 176 || $69 === 177)) {
        col(6, 0);
        bak(2, 7);
      }
      R.write(thing);
      if (($70 = thing.charCodeAt(0), $70 === 176 || $70 === 177)) {
        bak(0, 0);
      }
    }
  } else if ($66 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($66 === 10 || $66 === 15 || $66 === 16 || $66 === 18 || $66 === 36 || ($66 >= 48 && $66 <= 51)) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $71 = 20;
      if (i$3 >= $71) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $71) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($66 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($66 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($66 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($66 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($66 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($66 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($66 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($66 === 14 || $66 === 52 || $66 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($66 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($66 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($66 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($66 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($66 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($66 === 24) {
    col(15, 15);
    R.write('\x05');
  } else if ($66 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($66 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($66 === 27) {
    col(artcolor, 7);
    R.write('\x0f');
  } else if (($66 >= 28 && $66 <= 31) || $66 === 33 || $66 === 37 || $66 === 39 || $66 === 41 || $66 === 44) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($66 === 32) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
  } else if ($66 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($66 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($66 === 42) {
    col(9, 7);
    R.write('\xfe');
  } else if ($66 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($66 >= 58 && $66 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($66 === 47 || ($66 >= 55 && $66 <= 57) || ($66 >= 61 && $66 <= 63)) {
    R.write(' ');
  } else if ($66 === 46) {
    i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $72 = 20;
    if (i$3 >= $72) for (;;) {
      R.sound(R.random(i$3));
      if (i$3 <= $72) break;
      i$3--;
    }
    R.sound(90);
    if ((R.random(50) < whippower)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = 1; $73 = 32000;
      if (i$3 <= $73) for (;;) {
        R.sound(R.random(5000));
        if (i$3 >= $73) break;
        i$3++;
      }
      i$3 = 18900; $74 = 20;
      if (i$3 >= $74) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $74) break;
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
  } else if ($66 === 38 || $66 === 43 || $66 === 64) {
    if ((R.random(7) < whippower)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $75 = 20;
      if (i$3 >= $75) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $75) break;
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
  } else if ($66 === 0) {
    R.write(' ');
  } else {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
    i$3 = ((+(fastpc) * 2500) + (+(!(fastpc)) * 1500)); $76 = 20;
    if (i$3 >= $76) for (;;) {
      R.sound(R.random(i$3));
      if (i$3 <= $76) break;
      i$3--;
    }
    R.sound(90);
  }
}
function move(xway, yway) {
  let killed = 0;
  let trycounter = 0;
  let spot = 0;
  let original = 0;
  function go() {
    let $77;
    pf[(px) * 25 + (py) - 26] = replacement;
    R.gotoxy(px, py);
    R.write(' ');
    px = ((px + xway)) << 16 >> 16;
    py = ((py + yway)) << 16 >> 16;
    if (($77 = pf[(px) * 25 + (py) - 26], ($77 >= 55 && $77 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
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
    footstep();
    if (R.keypressed()) {
      ch = R.readKbd();
      if ((ch === '\x1b')) {
        ch = R.readKbd();
      }
    }
  }
  let $78, $79, $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131, $132, $133, $134, $135, $136, $137, $138, $139, $140, $141, $142, $143, $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155, $156, $157, $158, $159, $160, $161, $162, $163, $164, $165, $166, $167, $168, $169, $170, $171;
  if ((((((px + xway) < 2) || ((px + xway) > 65)) || ((py + yway) < 2)) || ((py + yway) > 24))) {
    static_();
    addscore(20);
    clearkeys();
    if (!(R.inSet(foundset, 0))) {
      foundset = R.union(foundset, R.setOf(0, 0));
      flash(16, 25, 'An electrified Wall blocks your way.');
    }
    return;
  }
  $78 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
  if ($78 === 0) {
    go();
  } else if (($78 >= 1 && $78 <= 3)) {
    gems = ((gems - pf[((px + xway)) * 25 + ((py + yway)) - 26])) << 16 >> 16;
    if ((gems < 0)) {
      dead(true);
    }
    addscore(pf[((px + xway)) * 25 + ((py + yway)) - 26]);
    R.sound((200 + (200 * pf[((px + xway)) * 25 + ((py + yway)) - 26])));
    R.delay(25);
    R.nosound();
    go();
    if (R.keypressed()) {
      ch = R.readKbd();
      if ((ch === '\x1b')) {
        ch = R.readKbd();
      }
    }
  } else if ($78 === 4 || $78 === 43 || $78 === 64) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, 4))) {
      foundset = R.union(foundset, R.setOf(4, 4));
      flash(18, 25, 'A Crumbled Wall blocks your way.');
    }
  } else if ($78 === 5) {
    go();
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($78 === 6) {
    go();
    clearkeys();
    if ((level === 20)) {
      footstep();
      R.delay(300);
      footstep();
      R.delay(300);
      footstep();
      x$7 = 1; $79 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
      if (x$7 <= $79) for (;;) {
        R.sound((R.random(3000) + x$7));
        R.gotoxy(px, py);
        bak(R.random(8), 0);
        col(14, 15);
        R.write('\x02');
        col(R.random(16), R.random(16));
        bak(0, 0);
        print(15, 25, 'Oh no, something strange is happening!');
        if (x$7 >= $79) break;
        x$7++;
      }
      i$2 = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $80 = 20;
      if (i$2 >= $80) for (;;) {
        R.sound(R.random(i$2));
        if (i$2 <= $80) break;
        i$2--;
      }
      col(14, 15);
      bak(0, 0);
      x$7 = 1; $81 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
      if (x$7 <= $81) for (;;) {
        R.sound((x$7 * 3));
        R.gotoxy(px, py);
        R.write(String.fromCharCode(((220 + R.random(4))) & 255));
        if (x$7 >= $81) break;
        x$7++;
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
      i$2 = 1; $82 = gems;
      if (i$2 <= $82) for (;;) {
        R.sound(((i$2 * 8) + 100));
        score = ((score + 10)) | 0;
        update_info();
        R.delay(20);
        if (i$2 >= $82) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(15, 25, 'Your Whips are worth 100 points each...');
      i$2 = 1; $83 = whips;
      if (i$2 <= $83) for (;;) {
        R.sound(((i$2 * 10) + 200));
        score = ((score + 10)) | 0;
        update_info();
        R.delay(20);
        if (i$2 >= $83) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
      i$2 = 1; $84 = teleports;
      if (i$2 <= $84) for (;;) {
        R.sound(((i$2 * 12) + 300));
        score = ((score + 20)) | 0;
        update_info();
        R.delay(30);
        if (i$2 >= $84) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(14, 25, 'Your Keys are worth 10,000 points each...');
      i$2 = 1; $85 = keys;
      if (i$2 <= $85) for (;;) {
        R.sound(((i$2 * 30) + 100));
        score = ((score + 1000)) | 0;
        update_info();
        R.delay(50);
        if (i$2 >= $85) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      won();
    }
    if (mixup) {
      level = ((R.random(17) + 2)) << 16 >> 16;
    } else {
      level = ((level + 1)) << 16 >> 16;
    }
    if ((level === 12)) {
      bak(1, 0);
      R.window(2, 2, 65, 24);
      R.clrscr();
      cur(3);
      col(14, 9);
      R.gotoxy(26, 2);
      R.write('RETURN TO KROZ');
      col(11, 7);
      R.gotoxy(1, 4);
      R.write('  This is Volume I of a set of three games that explore the' + '\r\n');
      R.write('  depths of Kroz, an underground kingdom so vast and perilous' + '\r\n');
      R.write('  that no one but you dares venture in its chambers.' + '\r\n');
      R.write('' + '\r\n');
      R.write('  The other two games that continue this adventure are:' + '\r\n');
      R.write('' + '\r\n');
      R.write('          \xfe Temple of Kroz' + '\r\n');
      R.write('          \xfe The Final Crusade of Kroz' + '\r\n');
      R.write('' + '\r\n');
      R.write('  Also available are three more Kroz games that took place' + '\r\n');
      R.write('  in a time before Return to Kroz:' + '\r\n');
      R.write('' + '\r\n');
      R.write('          \xfe Kingdom of Kroz  (a national contest winner)' + '\r\n');
      R.write('          \xfe Caverns of Kroz' + '\r\n');
      R.write('          \xfe Dungeons of Kroz' + '\r\n');
      R.write('' + '\r\n');
      R.write('  Registered players receive a hint sheet and "Domain" map.' + '\r\n');
      col(15, 15);
      R.write('' + '\r\n');
      R.write('  Please hit any key to continue your journey, Adventurer.');
      do {
        x$7 = (R.random(32767)) << 16 >> 16;
      } while (!(R.keypressed()));
      R.window(1, 1, 80, 25);
      cur(3);
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
    foundset = R.diff(foundset, R.setOf(8, 8, 13, 13, 15, 15, 17, 17, 19, 21, 22, 22, 26, 26, 28, 28, 36, 36));
    gennum = (0) << 16 >> 16;
    lavaflow = false;
    bonus = (0) << 16 >> 16;
    $86 = level;
    if ($86 === 1) {
      level1();
    } else if ($86 === 3) {
      level3();
    } else if ($86 === 5) {
      level5();
    } else if ($86 === 7) {
      level7();
    } else if ($86 === 9) {
      level9();
    } else if ($86 === 11) {
      level11();
    } else if ($86 === 13) {
      level13();
    } else if ($86 === 15) {
      level15();
    } else if ($86 === 17) {
      level17();
    } else if ($86 === 19) {
      level19();
    } else if ($86 === 20) {
      level20();
    } else {
      create_playfield();
    }
    footstep();
    bak(gemcolor, 7);
    x$7 = 1; $87 = 30;
    if (x$7 <= $87) for (;;) {
      R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
      R.clrscr();
      if (x$7 >= $87) break;
      x$7++;
    }
    bak(0, 0);
    x$7 = 1; $88 = 30;
    if (x$7 <= $88) for (;;) {
      R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
      R.clrscr();
      R.sound((x$7 * 45));
      if (x$7 >= $88) break;
      x$7++;
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
    x$7 = 1; $89 = 600;
    if (x$7 <= $89) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x$7 / 2));
      if (x$7 >= $89) break;
      x$7++;
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
    if ((level === 20)) {
      flash(10, 25, 'You\'ve finally reached the deepest level of Kroz!');
    } else {
      flash(16, 25, 'Press any key to begin this level.');
    }
  } else if ($78 === 7) {
    go();
    xb = 3; $90 = 42;
    if (xb <= $90) for (;;) {
      yb = 3; $91 = 42;
      if (yb <= $91) for (;;) {
        R.sound((xb * yb));
        R.delay(1);
        if (yb >= $91) break;
        yb++;
      }
      if (xb >= $90) break;
      xb++;
    }
    R.nosound();
    x$7 = ((R.random(3) + 2)) << 16 >> 16;
    i$2 = ((R.random(difficulty) + 2)) << 16 >> 16;
    whips = ((whips + x$7)) << 16 >> 16;
    gems = ((gems + i$2)) << 16 >> 16;
    addscore(7);
    bak(0, 0);
    clearkeys();
    do {
      col((R.random(2) + 14), 15);
      R.gotoxy(10, 25);
      R.write('You found ' + String(i$2) + ' gems and ' + String(x$7) + ' whips inside the chest!');
    } while (!(R.keypressed()));
    restore_border();
  } else if ($78 === 8) {
    go();
    addscore(5);
    x$7 = 7; $92 = 1;
    if (x$7 >= $92) for (;;) {
      R.sound(((x$7 * 50) + 300));
      R.delay(((x$7 * 10) + 40));
      if (x$7 <= $92) break;
      x$7--;
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
  } else if ($78 === 9) {
    go();
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($78 === 10) {
    go();
    addscore(10);
    x$7 = 1; $93 = 4;
    if (x$7 <= $93) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x$7 >= $93) break;
      x$7++;
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
  } else if ($78 === 11) {
    go();
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($78 === 12) {
    go();
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($78 === 13) {
    if ((keys < 1)) {
      x$7 = 1; $94 = 15;
      if (x$7 <= $94) for (;;) {
        R.sound((R.random(99) + 30));
        R.delay(15);
        R.nosound();
        R.delay(15);
        if (x$7 >= $94) break;
        x$7++;
      }
      clearkeys();
      if (!(R.inSet(foundset, 13))) {
        foundset = R.union(foundset, R.setOf(13, 13));
        flash(18, 25, 'To pass the Door you need a Key.');
      }
    } else {
      keys = ((keys - 1)) << 16 >> 16;
      addscore(11);
      x$7 = 10; $95 = 90;
      if (x$7 <= $95) for (;;) {
        R.sound(x$7);
        R.delay(15);
        if (x$7 >= $95) break;
        x$7++;
      }
      clearkeys();
      go();
      if ((((level === 30) && (px === 53)) && (py === 13))) {
        flash(17, 25, 'You have found the magical Staff!');
      }
    }
  } else if ($78 === 14 || $78 === 17) {
    if ((pf[((px + xway)) * 25 + ((py + yway)) - 26] === 14)) {
      blocksound();
    } else {
      x$7 = 1; $96 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
      if (x$7 <= $96) for (;;) {
        R.sound((R.random(((x$7 * 2) + 200)) + x$7));
        if (x$7 >= $96) break;
        x$7++;
      }
      R.nosound();
    }
    addscore(14);
    clearkeys();
    if (!(R.inSet(foundset, pf[((px + xway)) * 25 + ((py + yway)) - 26]))) {
      foundset = R.union(foundset, R.setOf(pf[((px + xway)) * 25 + ((py + yway)) - 26], pf[((px + xway)) * 25 + ((py + yway)) - 26]));
      $97 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
      if ($97 === 14) {
        flash(20, 25, 'A Solid Wall blocks your way.');
      } else if ($97 === 17) {
        flash(18, 25, 'You cannot travel through Water.');
      }
    }
  } else if ($78 === 15) {
    go();
    addscore(15);
    x$7 = 1; $98 = 7;
    if (x$7 <= $98) for (;;) {
      R.sound(((x$7 * 50) + 300));
      R.delay(((x$7 * 10) + 40));
      if (x$7 >= $98) break;
      x$7++;
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
  } else if ($78 === 16) {
    go();
    addscore(16);
    x$7 = 1; $99 = 500;
    if (x$7 <= $99) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $99) break;
      x$7++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $100 = 1;
    if (yb >= $100) for (;;) {
      x$7 = 550; $101 = 20;
      if (x$7 >= $101) for (;;) {
        R.sound((yb * x$7));
        if (x$7 <= $101) break;
        x$7--;
      }
      if (yb <= $100) break;
      yb--;
    }
    R.nosound();
    pf[(px) * 25 + (py) - 26] = 0;
    px = (0) << 16 >> 16;
    do {
      x$7 = ((R.random(64) + 2)) << 16 >> 16;
      y$3 = ((R.random(23) + 2)) << 16 >> 16;
      if ((pf[(x$7) * 25 + (y$3) - 26] === 0)) {
        px = (x$7) << 16 >> 16;
        py = (y$3) << 16 >> 16;
        pf[(px) * 25 + (py) - 26] = 40;
      }
    } while (!((px !== 0)));
    x$7 = 1; $102 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x$7 <= $102) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $102) break;
      x$7++;
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
  } else if ($78 === 18) {
    go();
    whippower = ((whippower + 1)) << 16 >> 16;
    addscore(15);
    x$7 = 3; $103 = 35;
    if (x$7 <= $103) for (;;) {
      y$3 = 45; $104 = 52;
      if (y$3 <= $104) for (;;) {
        R.sound((x$7 * y$3));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y$3 >= $104) break;
        y$3++;
      }
      if (x$7 >= $103) break;
      x$7++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    flash(22, 25, 'An increase Whip Power Ring!');
  } else if ($78 === 19 || $78 === 20) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, pf[((px + xway)) * 25 + ((py + yway)) - 26]))) {
      foundset = R.union(foundset, R.setOf(pf[((px + xway)) * 25 + ((py + yway)) - 26], pf[((px + xway)) * 25 + ((py + yway)) - 26]));
      $105 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
      if ($105 === 19) {
        flash(14, 25, 'You cannot travel through forest terrain.');
      } else if ($105 === 20) {
        flash(24, 25, 'A tree blocks your way.');
      }
    }
  } else if ($78 === 21) {
    go();
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i$2 = 70; $106 = 600;
    if (i$2 <= $106) for (;;) {
      R.sound((i$2 * 2));
      R.delay(3);
      if (i$2 >= $106) break;
      i$2++;
    }
    bor(14);
    i$2 = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $107 = 20;
    if (i$2 >= $107) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $107) break;
      i$2--;
    }
    width = 1; $108 = 4;
    if (width <= $108) for (;;) {
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
      x$7 = (px - xl); $109 = (px + xr);
      if (x$7 <= $109) for (;;) {
        y$3 = (py - yl); $110 = (py + yr);
        if (y$3 <= $110) for (;;) {
          if (($111 = pf[(x$7) * 25 + (y$3) - 26], ($111 >= 0 && $111 <= 4) || $111 === 13 || $111 === 16 || $111 === 19 || ($111 >= 28 && $111 <= 32) || $111 === 35 || ($111 >= 36 && $111 <= 39) || $111 === 42 || $111 === 43 || $111 === 45 || ($111 >= 48 && $111 <= 51) || $111 === 64)) {
            R.gotoxy(x$7, y$3);
            col(12, 15);
            R.write('\xdb');
          }
          if (y$3 >= $110) break;
          y$3++;
        }
        if (x$7 >= $109) break;
        x$7++;
      }
      if (width >= $108) break;
      width++;
    }
    R.delay(100);
    width = 1; $112 = 4;
    if (width <= $112) for (;;) {
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
      x$7 = (px - xl); $113 = (px + xr);
      if (x$7 <= $113) for (;;) {
        y$3 = (py - yl); $114 = (py + yr);
        if (y$3 <= $114) for (;;) {
          if (($115 = pf[(x$7) * 25 + (y$3) - 26], ($115 >= 0 && $115 <= 4) || $115 === 13 || $115 === 16 || $115 === 19 || ($115 >= 28 && $115 <= 32) || $115 === 35 || ($115 >= 36 && $115 <= 39) || $115 === 43)) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            if (($116 = pf[(x$7) * 25 + (y$3) - 26], ($116 >= 1 && $116 <= 3))) {
              score = ((score + pf[(x$7) * 25 + (y$3) - 26])) | 0;
            }
            pf[(x$7) * 25 + (y$3) - 26] = 0;
          }
          if (y$3 >= $114) break;
          y$3++;
        }
        if (x$7 >= $113) break;
        x$7++;
      }
      if (width >= $112) break;
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
  } else if ($78 === 22) {
    go();
    gems = ((gems - 10)) << 16 >> 16;
    x$7 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $117 = 20;
    if (x$7 >= $117) for (;;) {
      y$3 = 9; $118 = 2;
      if (y$3 >= $118) for (;;) {
        R.sound((R.random(((y$3 * x$7) + 100)) + (y$3 * x$7)));
        if (y$3 <= $118) break;
        y$3--;
      }
      if (x$7 <= $117) break;
      x$7--;
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
  } else if ($78 === 23) {
    go();
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
    x$7 = (3000) << 16 >> 16;
    col(14, 15);
    i$2 = 1; $119 = 16;
    if (i$2 <= $119) for (;;) {
      y$3 = 2; $120 = 24;
      if (y$3 <= $120) for (;;) {
        x$7 = ((x$7 - 8)) << 16 >> 16;
        R.sound(x$7);
        R.gotoxy(34, y$3);
        R.write('\x02');
        R.delay((52 - (3 * i$2)));
        R.gotoxy(34, y$3);
        R.write(' ');
        if (y$3 >= $120) break;
        y$3++;
      }
      if (i$2 >= $119) break;
      i$2++;
    }
    R.nosound();
    R.gotoxy(34, 24);
    R.write('_');
    i$2 = 8000; $121 = 20;
    if (i$2 >= $121) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $121) break;
      i$2--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT! *');
    dead(false);
  } else if ($78 === 24) {
    x$7 = 1; $122 = 24;
    if (x$7 <= $122) for (;;) {
      y$3 = 5; $123 = 1;
      if (y$3 >= $123) for (;;) {
        R.sound(((x$7 * 45) + (y$3 * 10)));
        R.delay((y$3 * 3));
        R.nosound();
        R.delay(40);
        R.gotoxy(18, 8);
        col(R.random(16), R.random(16));
        R.write('\x05');
        if (y$3 <= $123) break;
        y$3--;
      }
      if (x$7 >= $122) break;
      x$7++;
    }
    R.gotoxy(18, 8);
    col(16, 16);
    bak(4, 7);
    R.write('\xf0');
    bak(0, 0);
    pf[((px + xway)) * 25 + ((py + yway)) - 26] = 6;
    score = ((score + 2500)) | 0;
    update_info();
    clearkeys();
    flash(13, 25, 'The Crown is finally yours--25,000 points!');
  } else if ($78 === 25) {
    pxold = (px) << 16 >> 16;
    pyold = (py) << 16 >> 16;
    go();
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
      x$7 = ((R.random(64) + 2)) << 16 >> 16;
      y$3 = ((R.random(23) + 2)) << 16 >> 16;
    } while (!(((pf[(x$7) * 25 + (y$3) - 26] === 25) && (((pxold + xway) !== x$7) || ((pyold + yway) !== y$3)))));
    done = false;
    i$2 = 1; $124 = 100;
    if (i$2 <= $124) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($125 = pf[((x$7 + a)) * 25 + ((y$3 + b)) - 26], $125 === 0 || $125 === 32 || ($125 >= 55 && $125 <= 57)) && (done === false))) {
        if (!((((((x$7 + a) < 2) || ((x$7 + a) > 65)) || ((y$3 + b) < 2)) || ((y$3 + b) > 24)))) {
          done = true;
          x$7 = ((x$7 + a)) << 16 >> 16;
          y$3 = ((y$3 + b)) << 16 >> 16;
        }
      }
      if (i$2 >= $124) break;
      i$2++;
    }
    R.nosound();
    if ((done === false)) {
      x$7 = (pxold) << 16 >> 16;
      y$3 = (pyold) << 16 >> 16;
    }
    px = (x$7) << 16 >> 16;
    py = (y$3) << 16 >> 16;
    if (($126 = pf[(px) * 25 + (py) - 26], ($126 >= 55 && $126 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x$7 = 1; $127 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x$7 <= $127) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x$7 >= $127) break;
      x$7++;
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
  } else if ($78 === 26) {
    go();
    addscore(11);
    grabsound();
    x$7 = 1; $128 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x$7 <= $128) for (;;) {
      R.sound(((R.random(1000) + x$7) + 200));
      if (x$7 >= $128) break;
      x$7++;
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
  } else if ($78 === 27) {
    go();
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($78 === 28) {
    go();
    i$2 = 1; $129 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i$2 <= $129) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 >= $129) break;
      i$2++;
    }
    R.nosound();
    i$2 = 1; $130 = 50;
    if (i$2 <= $130) for (;;) {
      done = false;
      do {
        x$7 = ((R.random(64) + 2)) << 16 >> 16;
        y$3 = ((R.random(23) + 2)) << 16 >> 16;
        if (($131 = pf[(x$7) * 25 + (y$3) - 26], ($131 >= 0 && $131 <= 3) || $131 === 5 || ($131 >= 7 && $131 <= 11) || ($131 >= 15 && $131 <= 16) || $131 === 26 || $131 === 32)) {
          done = true;
          pf[(x$7) * 25 + (y$3) - 26] = 4;
          R.gotoxy(x$7, y$3);
          col(6, 7);
          R.write('\xb2');
        }
      } while (!(((R.random(100) === 0) || done)));
      x$7 = 1; $132 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x$7 <= $132) for (;;) {
        R.sound(R.random(200));
        if (x$7 >= $132) break;
        x$7++;
      }
      R.nosound();
      if (i$2 >= $130) break;
      i$2++;
    }
    i$2 = 2500; $133 = 20;
    if (i$2 >= $133) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $133) break;
      i$2--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($78 === 29) {
    R.gotoxy((px + xway), (py + yway));
    col(6, 7);
    R.write('\xb2');
    pf[((px + xway)) * 25 + ((py + yway)) - 26] = 4;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 29))) {
      foundset = R.union(foundset, R.setOf(29, 29));
      flash(13, 25, 'An Invisible Crumbled Wall blocks your way.');
    }
  } else if ($78 === 30) {
    R.gotoxy((px + xway), (py + yway));
    col(6, 7);
    R.write('\xdb');
    pf[((px + xway)) * 25 + ((py + yway)) - 26] = 14;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 30))) {
      foundset = R.union(foundset, R.setOf(30, 30));
      flash(17, 25, 'An Invisible Wall blocks your way.');
    }
  } else if ($78 === 31) {
    R.gotoxy((px + xway), (py + yway));
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
    pf[((px + xway)) * 25 + ((py + yway)) - 26] = 13;
    blocksound();
    clearkeys();
    if (!(R.inSet(foundset, 31))) {
      foundset = R.union(foundset, R.setOf(31, 31));
      flash(17, 25, 'An Invisible Door blocks your way.');
    }
  } else if ($78 === 32) {
    go();
  } else if ($78 === 33) {
    go();
    x$7 = 2; $134 = 65;
    if (x$7 <= $134) for (;;) {
      y$3 = 2; $135 = 24;
      if (y$3 <= $135) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 33)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $135) break;
        y$3++;
      }
      if (x$7 >= $134) break;
      x$7++;
    }
  } else if ($78 === 34) {
    go();
    grabsound();
    killed = (0) << 16 >> 16;
    trycounter = (0) << 16 >> 16;
    do {
      trycounter = ((trycounter + 1)) << 16 >> 16;
      $136 = (R.random(3) + 1);
      if ($136 === 1) {
        if ((snum > 1)) {
          i$2 = ((R.random(snum) + 1)) << 16 >> 16;
          if ((sx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $137 = 3;
            if (x$7 >= $137) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(sx[(i$2) - 1], sy[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(slow);
              if (x$7 <= $137) break;
              x$7--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(sx[(i$2) - 1], sy[(i$2) - 1]);
            R.write(' ');
            pf[(sx[(i$2) - 1]) * 25 + (sy[(i$2) - 1]) - 26] = 0;
            sx[(i$2) - 1] = 0;
          }
        }
      } else if ($136 === 2) {
        if ((mnum > 1)) {
          i$2 = ((R.random(mnum) + 1)) << 16 >> 16;
          if ((mx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $138 = 3;
            if (x$7 >= $138) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(mx[(i$2) - 1], my[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(medium);
              if (x$7 <= $138) break;
              x$7--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(mx[(i$2) - 1], my[(i$2) - 1]);
            R.write(' ');
            pf[(mx[(i$2) - 1]) * 25 + (my[(i$2) - 1]) - 26] = 0;
            mx[(i$2) - 1] = 0;
          }
        }
      } else if ($136 === 3) {
        if ((fnum > 1)) {
          i$2 = ((R.random(fnum) + 1)) << 16 >> 16;
          if ((fx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $139 = 3;
            if (x$7 >= $139) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(fx[(i$2) - 1], fy[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(fast);
              if (x$7 <= $139) break;
              x$7--;
            }
            R.nosound();
            col(0, 0);
            R.gotoxy(fx[(i$2) - 1], fy[(i$2) - 1]);
            R.write(' ');
            pf[(fx[(i$2) - 1]) * 25 + (fy[(i$2) - 1]) - 26] = 0;
            fx[(i$2) - 1] = 0;
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
  } else if ($78 === 35) {
    go();
    if ((snum < 945)) {
      i$2 = 1; $140 = 45;
      if (i$2 <= $140) for (;;) {
        done = false;
        do {
          x$7 = ((R.random(64) + 2)) << 16 >> 16;
          y$3 = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x$7) * 25 + (y$3) - 26] === 0)) {
            done = true;
            pf[(x$7) * 25 + (y$3) - 26] = 1;
            R.gotoxy(x$7, y$3);
            col(12, 7);
            R.write(slow);
            snum = ((snum + 1)) << 16 >> 16;
            sx[(snum) - 1] = x$7;
            sy[(snum) - 1] = y$3;
            x$7 = 5; $141 = 100;
            if (x$7 <= $141) for (;;) {
              R.sound((x$7 * 8));
              R.delay(1);
              if (x$7 >= $141) break;
              x$7++;
            }
            R.nosound();
          }
        } while (!(((R.random(120) === 0) || done)));
        if (i$2 >= $140) break;
        i$2++;
      }
    }
    addscore(35);
    clearkeys();
    if (!(R.inSet(foundset, 35))) {
      flash(21, 25, 'A Creature Creation Trap!');
      foundset = R.union(foundset, R.setOf(35, 35));
    }
  } else if ($78 === 36) {
    blocksound();
    if (!(R.inSet(foundset, 36))) {
      flash(14, 25, 'You have discovered a Creature Generator!');
      foundset = R.union(foundset, R.setOf(36, 36));
    }
  } else if ($78 === 37) {
    go();
    x$7 = 2; $142 = 65;
    if (x$7 <= $142) for (;;) {
      y$3 = 2; $143 = 24;
      if (y$3 <= $143) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 37)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $143) break;
        y$3++;
      }
      if (x$7 >= $142) break;
      x$7++;
    }
  } else if ($78 === 38) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, 38))) {
      foundset = R.union(foundset, R.setOf(38, 38));
      flash(19, 25, 'A Moving Wall blocks your way.');
    }
  } else if ($78 === 39) {
    go();
    x$7 = 2; $144 = 65;
    if (x$7 <= $144) for (;;) {
      y$3 = 2; $145 = 24;
      if (y$3 <= $145) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 39)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $145) break;
        y$3++;
      }
      if (x$7 >= $144) break;
      x$7++;
    }
  } else if ($78 === 41) {
    go();
    grabsound();
    i$2 = 1; $146 = ((+(fastpc) * 120) + (+(!(fastpc)) * 70));
    if (i$2 <= $146) for (;;) {
      x$7 = 7; $147 = 1;
      if (x$7 >= $147) for (;;) {
        R.sound((i$2 * x$7));
        if (x$7 <= $147) break;
        x$7--;
      }
      if (i$2 >= $146) break;
      i$2++;
    }
    R.nosound();
    i$2 = 1; $148 = ((difficulty * 2) + 5);
    if (i$2 <= $148) for (;;) {
      done = false;
      do {
        x$7 = ((R.random(64) + 2)) << 16 >> 16;
        y$3 = ((R.random(23) + 2)) << 16 >> 16;
        if ((pf[(x$7) * 25 + (y$3) - 26] === 0)) {
          R.sound((R.random(1200) + 110));
          done = true;
          pf[(x$7) * 25 + (y$3) - 26] = 9;
          R.gotoxy(x$7, y$3);
          col(gemcolor, 7);
          R.write('\x04');
          R.delay(7);
          R.nosound();
          R.delay(99);
        }
      } while (!(((R.random(100) === 0) || done)));
      if (i$2 >= $148) break;
      i$2++;
    }
    clearkeys();
    flash(8, 25, 'Yah Hoo! You discovered a hidden Reveal Gems Scroll!');
  } else if ($78 === 42) {
    go();
    grabsound();
    score = (((score + level) + 100)) | 0;
    update_info();
    if (!(R.inSet(foundset, 42))) {
      foundset = R.union(foundset, R.setOf(42, 42));
      flash(4, 25, 'You found an ancient Tablet with writing on it...huge points!');
    }
    clearkeys();
    $149 = level;
    if ($149 === 1) {
      flash(6, 25, 'Remember to experiment with every new object on a level.');
    } else if ($149 === 3) {
      flash(5, 25, 'Only use your valuable Teleports for last chance escapes!');
    } else if ($149 === 5) {
      flash(6, 25, 'You\'re right in the middle of a Lava Flow!  Run for it!');
    } else if ($149 === 7) {
      flash(10, 25, 'You\'ll need the two keys from the previous level!');
    } else if ($149 === 9) {
      flash(5, 25, 'The two chests can be yours if you find the hidden spell!');
    } else if ($149 === 11) {
      flash(17, 25, 'You learn from successful failures.');
    } else if ($149 === 13) {
      flash(4, 25, 'A Creature Generator exists within this chamber--destroy it!');
    } else if ($149 === 15) {
      flash(9, 25, 'By throwing dirt at someone you only lose ground.');
    } else if ($149 === 17) {
      flash(6, 25, 'The Bubble Creatures knock off three Gems when touched!');
    } else if ($149 === 19) {
      flash(3, 25, 'Be vigilant Adventurer, the Crown is near, but well protected.');
    } else if ($149 === 20) {
      flash(8, 25, 'You\'ve survived so far, Adventurer.  Can you succeed?');
    }
  } else if ($78 === 44) {
    go();
    x$7 = 2; $150 = 65;
    if (x$7 <= $150) for (;;) {
      y$3 = 2; $151 = 24;
      if (y$3 <= $151) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 43)) {
          R.sound(200);
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          i$2 = 1; $152 = 20;
          if (i$2 <= $152) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(16), 15);
            R.write('\xb2');
            R.delay(3);
            if (i$2 >= $152) break;
            i$2++;
          }
          R.gotoxy(x$7, y$3);
          col(0, 0);
          R.write(' ');
          R.nosound();
        }
        if (y$3 >= $151) break;
        y$3++;
      }
      if (x$7 >= $150) break;
      x$7++;
    }
    clearkeys();
    flash(19, 25, 'You\'ve triggered a secret area.');
  } else if ($78 === 45) {
    go();
    grabsound();
    score = ((score + 100)) | 0;
    gems = ((gems + 25)) << 16 >> 16;
    update_info();
    clearkeys();
    flash(15, 25, 'You found a Pouch containing 25 Gems!');
  } else if ($78 === 46) {
    blocksound();
    clearkeys();
    flash(9, 25, 'Statues are very dangerous...they drain your Gems!');
  } else if ($78 === 47) {
    go();
    i$2 = 1; $153 = 75;
    if (i$2 <= $153) for (;;) {
      done = false;
      do {
        x$7 = ((R.random(64) + 2)) << 16 >> 16;
        y$3 = ((R.random(23) + 2)) << 16 >> 16;
        if (($154 = pf[(x$7) * 25 + (y$3) - 26], $154 === 4 || $154 === 14)) {
          R.sound((R.random(2500) + 999));
          done = true;
          $155 = pf[(x$7) * 25 + (y$3) - 26];
          if ($155 === 4) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            pf[(x$7) * 25 + (y$3) - 26] = 29;
          } else if ($155 === 14) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            pf[(x$7) * 25 + (y$3) - 26] = 30;
          }
          R.delay(5);
          R.nosound();
        }
      } while (!(((R.random(200) === 0) || done)));
      if (i$2 >= $153) break;
      i$2++;
    }
    clearkeys();
    flash(5, 25, 'Yikes!  A trap has made many of the wall sections invisible!');
  } else if ($78 === 48) {
    go();
    grabsound();
    if ((bonus === 0)) {
      bonus = (1) << 16 >> 16;
    }
  } else if ($78 === 49) {
    go();
    grabsound();
    if ((bonus === 1)) {
      bonus = (2) << 16 >> 16;
    }
  } else if ($78 === 50) {
    go();
    grabsound();
    if ((bonus === 2)) {
      bonus = (3) << 16 >> 16;
    }
  } else if ($78 === 51) {
    go();
    grabsound();
    if ((bonus === 3)) {
      clearkeys();
      x$7 = 10; $156 = 45;
      if (x$7 <= $156) for (;;) {
        y$3 = 1; $157 = 13;
        if (y$3 <= $157) for (;;) {
          R.sound(((x$7 * x$7) * y$3));
          R.delay((y$3 + 1));
          if (y$3 >= $157) break;
          y$3++;
        }
        if (x$7 >= $156) break;
        x$7++;
      }
      R.nosound();
      score = ((score + 1000)) | 0;
      update_info();
      flash(17, 25, 'Super Kroz Bonus -- 10,000 points!');
    }
  } else if (($78 >= 52 && $78 <= 54)) {
    blocksound();
    addscore(14);
    clearkeys();
    if (!(R.inSet(foundset, 14))) {
      foundset = R.union(foundset, R.setOf(14, 14));
      flash(20, 25, 'A Solid Wall blocks your way.');
    }
  } else if (($78 >= 55 && $78 <= 57)) {
    go();
  } else if (($78 >= 58 && $78 <= 60)) {
    original = (pf[((px + xway)) * 25 + ((py + yway)) - 26]) & 255;
    $158 = original;
    if ($158 === 58) {
      spot = (52) & 255;
    } else if ($158 === 59) {
      spot = (53) & 255;
    } else if ($158 === 60) {
      spot = (54) & 255;
    }
    go();
    x$7 = 2; $159 = 65;
    if (x$7 <= $159) for (;;) {
      y$3 = 2; $160 = 24;
      if (y$3 <= $160) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === spot)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          i$2 = 1; $161 = 30;
          if (i$2 <= $161) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i$2 >= $161) break;
            i$2++;
          }
          a = 60; $162 = 1;
          if (a >= $162) for (;;) {
            R.sound((a * 40));
            R.delay(1);
            if (a <= $162) break;
            a--;
          }
          R.nosound();
          col(15, 15);
          R.gotoxy(x$7, y$3);
          R.write('\xdb');
          R.delay(8);
          R.gotoxy(x$7, y$3);
          col(0, 0);
          R.write(' ');
        }
        if (y$3 >= $160) break;
        y$3++;
      }
      if (x$7 >= $159) break;
      x$7++;
    }
    x$7 = 2; $163 = 65;
    if (x$7 <= $163) for (;;) {
      y$3 = 2; $164 = 24;
      if (y$3 <= $164) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === original)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          R.gotoxy(x$7, y$3);
          R.write(' ');
        }
        if (y$3 >= $164) break;
        y$3++;
      }
      if (x$7 >= $163) break;
      x$7++;
    }
    clearkeys();
    flash(16, 25, 'Magic has been released is this chamber!');
  } else if (($78 >= 61 && $78 <= 63)) {
    original = (pf[((px + xway)) * 25 + ((py + yway)) - 26]) & 255;
    $165 = original;
    if ($165 === 61) {
      spot = (55) & 255;
    } else if ($165 === 62) {
      spot = (56) & 255;
    } else if ($165 === 63) {
      spot = (57) & 255;
    }
    go();
    x$7 = 2; $166 = 65;
    if (x$7 <= $166) for (;;) {
      y$3 = 2; $167 = 24;
      if (y$3 <= $167) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === spot)) {
          pf[(x$7) * 25 + (y$3) - 26] = 14;
          i$2 = 1; $168 = 30;
          if (i$2 <= $168) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i$2 >= $168) break;
            i$2++;
          }
          a = 20; $169 = 80;
          if (a <= $169) for (;;) {
            R.sound((a * 50));
            R.delay(1);
            if (a >= $169) break;
            a++;
          }
          R.nosound();
          col(15, 15);
          R.gotoxy(x$7, y$3);
          R.write('\xdb');
          R.delay(8);
          R.gotoxy(x$7, y$3);
          col(6, 7);
          R.write('\xdb');
        }
        if (y$3 >= $167) break;
        y$3++;
      }
      if (x$7 >= $166) break;
      x$7++;
    }
    x$7 = 2; $170 = 65;
    if (x$7 <= $170) for (;;) {
      y$3 = 2; $171 = 24;
      if (y$3 <= $171) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === original)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          R.gotoxy(x$7, y$3);
          R.write(' ');
        }
        if (y$3 >= $171) break;
        y$3++;
      }
      if (x$7 >= $170) break;
      x$7++;
    }
    clearkeys();
    flash(14, 25, 'Oh no, new Walls have magically appeared!');
  } else {
    blocksound();
  }
}
function player_move() {
  let $172, $173, $174, $175, $176, $177, $178;
  $172 = getkey();
  if ($172 === 0) {

  } else if ($172 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(19, 25, 'Press any key to resume game.');
    restore_border();
  } else if ($172 === 81) {
    play(600, 600, 100);
    play(450, 450, 100);
    play(300, 300, 100);
    play(99, 99, 99);
    clearkeys();
    flash(16, 25, 'Are you sure you want to quit (Y/N)?');
    ch = R.readKbd();
    if ((R.upcase(ch) === 'Y')) {
      sign_off();
    } else {
      restore_border();
    }
  } else if ($172 === 82) {
    flash(15, 25, 'Are you sure you want to RESTORE (Y/N)?');
    restore_border();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'N')) {
      return;
    }
    bak(0, 0);
    col(15, 15);
    clearkeys();
    print(26, 25, '  Restoring...  ');
    R.assign(savefile, 'RETURN.SAV');
    R.reset(savefile);
    if ((R.ioresult() !== 0)) {
      restore_border();
      R.sound(300);
      R.delay(250);
      R.nosound();
      flash(14, 25, 'A SAVE FILE does not exist on this disk.');
    } else {
      R.reset(savefile);
      savestuff = R.clone(R.fread(savefile));
      R.close(savefile);
      $173 = savestuff;
      level = ($173.s_level) << 16 >> 16;
      score = ($173.s_score) | 0;
      gems = ($173.s_gems) << 16 >> 16;
      whips = ($173.s_whips) << 16 >> 16;
      teleports = ($173.s_teleports) << 16 >> 16;
      keys = ($173.s_keys) << 16 >> 16;
      whippower = ($173.s_whippower) << 16 >> 16;
      difficulty = ($173.s_difficulty) << 16 >> 16;
      px = ($173.s_px) << 16 >> 16;
      py = ($173.s_py) << 16 >> 16;
      foundset = $173.s_foundset;
      mixup = $173.s_mixup;
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
      gennum = (0) << 16 >> 16;
      bonus = (0) << 16 >> 16;
      t[(1) - 1] = 5;
      t[(2) - 1] = 6;
      t[(3) - 1] = 7;
      t[(8) - 1] = 7;
      t[(4) - 1] = 0;
      t[(5) - 1] = 0;
      t[(6) - 1] = 0;
      $174 = level;
      if ($174 === 1) {
        level1();
      } else if ($174 === 3) {
        level3();
      } else if ($174 === 5) {
        level5();
      } else if ($174 === 7) {
        level7();
      } else if ($174 === 9) {
        level9();
      } else if ($174 === 11) {
        level11();
      } else if ($174 === 13) {
        level13();
      } else if ($174 === 15) {
        level15();
      } else if ($174 === 17) {
        level17();
      } else if ($174 === 19) {
        level19();
      } else if ($174 === 20) {
        level20();
      } else {
        create_playfield();
      }
      R.window(2, 2, (64 + 1), (23 + 1));
      bak(0, 0);
      R.clrscr();
      cur(3);
      R.window(1, 1, 80, 25);
      border();
      display_playfield();
      x$7 = 1; $175 = 600;
      if (x$7 <= $175) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x$7 / 2));
        if (x$7 >= $175) break;
        x$7++;
      }
      R.nosound();
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
      bak(0, 0);
    }
    if ((level === 20)) {
      flash(10, 25, 'You\'ve finally reached the deepest level of Kroz!');
    } else {
      flash(16, 25, 'Press any key to begin this level.');
    }
  } else if ($172 === 83) {
    flash(16, 25, 'Are you sure you want to SAVE (Y/N)?');
    restore_border();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'N')) {
      return;
    }
    bak(0, 0);
    col(15, 15);
    $176 = savestuff;
    $176.s_level = (level) | 0;
    $176.s_score = (i_score) | 0;
    $176.s_gems = (i_gems) | 0;
    $176.s_whips = (i_whips) | 0;
    $176.s_teleports = (i_teleports) | 0;
    $176.s_keys = (i_keys) | 0;
    $176.s_whippower = (i_whippower) | 0;
    $176.s_difficulty = (i_difficulty) | 0;
    $176.s_px = (i_px) | 0;
    $176.s_py = (i_py) | 0;
    $176.s_foundset = i_foundset;
    $176.s_mixup = mixup;
    print(28, 25, '  Saving...  ');
    R.assign(savefile, 'RETURN.SAV');
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    restore_border();
  } else if ($172 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x$7 = 1; $177 = 250;
    if (x$7 <= $177) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $177) break;
      x$7++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
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
      x$7 = ((R.random(64) + 2)) << 16 >> 16;
      y$3 = ((R.random(23) + 2)) << 16 >> 16;
      if ((pf[(x$7) * 25 + (y$3) - 26] === 0)) {
        px = (x$7) << 16 >> 16;
        py = (y$3) << 16 >> 16;
        pf[(px) * 25 + (py) - 26] = 40;
      }
    } while (!((px !== 0)));
    clearkeys();
    x$7 = 1; $178 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x$7 <= $178) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $178) break;
      x$7++;
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
  } else if ($172 === 87) {
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
  } else if ($172 === 172) {
    move(0, -(1));
  } else if ($172 === 180) {
    move(0, 1);
  } else if ($172 === 177) {
    move(1, 0);
  } else if ($172 === 175) {
    move(-(1), 0);
  } else if ($172 === 171) {
    move(-(1), -(1));
  } else if ($172 === 173) {
    move(1, -(1));
  } else if ($172 === 179) {
    move(-(1), 1);
  } else if ($172 === 181) {
    move(1, 1);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $179, $180;
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
  loop$3 = 1; $179 = snum;
  if (loop$3 <= $179) for (;;) {
    L1_continue: {
    if ((sx[(loop$3) - 1] === 0)) {
      break L1_continue;
    }
    if ((pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] !== 1)) {
      sx[(loop$3) - 1] = 0;
      break L1_continue;
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
    if ((py < sy[(loop$3) - 1])) {
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] - 1);
      ydir = (1) << 16 >> 16;
    } else if ((py > sy[(loop$3) - 1])) {
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + 1);
      ydir = (-(1)) << 16 >> 16;
    }
    R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
    $180 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($180 === 0) {
      col(12, 7);
      R.write(slow);
      R.sound(20);
      R.nosound();
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
    } else if (($180 >= 1 && $180 <= 3) || $180 === 6 || $180 === 13 || $180 === 14 || $180 === 17 || ($180 >= 19 && $180 <= 25) || ($180 >= 28 && $180 <= 37) || $180 === 39 || $180 === 41 || $180 === 42 || ($180 >= 44 && $180 <= 47) || ($180 >= 52 && $180 <= 56) || ($180 >= 58 && $180 <= 63)) {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + xdir);
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + ydir);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
      col(12, 7);
      R.write(slow);
    } else if ($180 === 4 || $180 === 38 || $180 === 43 || $180 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($180 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 192);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($180 === 5 || ($180 >= 7 && $180 <= 12) || $180 === 15 || $180 === 16 || $180 === 18 || $180 === 26 || $180 === 27 || ($180 >= 48 && $180 <= 51)) {
      col(12, 7);
      R.write(slow);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      grabsound();
    } else {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + xdir);
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + ydir);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
      col(12, 7);
      R.write(slow);
    }
    }
    if ((R.random(8) === 1)) {
      player_move();
    }
    if (loop$3 >= $179) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $181, $182;
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
  loop$4 = 1; $181 = mnum;
  if (loop$4 <= $181) for (;;) {
    L2_continue: {
    if ((mx[(loop$4) - 1] === 0)) {
      break L2_continue;
    }
    if ((pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] !== 2)) {
      mx[(loop$4) - 1] = 0;
      break L2_continue;
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
    if ((py < my[(loop$4) - 1])) {
      my[(loop$4) - 1] = (my[(loop$4) - 1] - 1);
      ydir = (1) << 16 >> 16;
    } else if ((py > my[(loop$4) - 1])) {
      my[(loop$4) - 1] = (my[(loop$4) - 1] + 1);
      ydir = (-(1)) << 16 >> 16;
    }
    R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
    $182 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($182 === 0) {
      col(10, 7);
      R.write(medium);
      R.sound(20);
      R.nosound();
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
    } else if (($182 >= 1 && $182 <= 3) || $182 === 6 || $182 === 13 || $182 === 14 || $182 === 17 || ($182 >= 19 && $182 <= 25) || ($182 >= 28 && $182 <= 37) || $182 === 39 || $182 === 41 || $182 === 42 || ($182 >= 44 && $182 <= 47) || ($182 >= 52 && $182 <= 56) || ($182 >= 58 && $182 <= 63)) {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + xdir);
      my[(loop$4) - 1] = (my[(loop$4) - 1] + ydir);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
      col(10, 7);
      R.write(medium);
    } else if ($182 === 4 || $182 === 38 || $182 === 43 || $182 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($182 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 192);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($182 === 5 || ($182 >= 7 && $182 <= 12) || $182 === 15 || $182 === 16 || $182 === 18 || $182 === 26 || $182 === 27 || ($182 >= 48 && $182 <= 51)) {
      col(10, 7);
      R.write(medium);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      grabsound();
    } else {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + xdir);
      my[(loop$4) - 1] = (my[(loop$4) - 1] + ydir);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
      col(10, 7);
      R.write(medium);
    }
    }
    if ((R.random(7) === 1)) {
      player_move();
    }
    if (loop$4 >= $181) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $183, $184;
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
  loop$5 = 1; $183 = fnum;
  if (loop$5 <= $183) for (;;) {
    L3_continue: {
    if ((fx[(loop$5) - 1] === 0)) {
      break L3_continue;
    }
    if ((pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] !== 3)) {
      fx[(loop$5) - 1] = 0;
      break L3_continue;
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
    if ((py < fy[(loop$5) - 1])) {
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] - 1);
      ydir = (1) << 16 >> 16;
    } else if ((py > fy[(loop$5) - 1])) {
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + 1);
      ydir = (-(1)) << 16 >> 16;
    }
    R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
    $184 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($184 === 0) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($184 >= 1 && $184 <= 3) || $184 === 6 || $184 === 13 || $184 === 14 || $184 === 17 || ($184 >= 19 && $184 <= 25) || ($184 >= 28 && $184 <= 37) || $184 === 39 || $184 === 41 || $184 === 42 || ($184 >= 44 && $184 <= 47) || ($184 >= 52 && $184 <= 56) || ($184 >= 58 && $184 <= 63)) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($184 === 4 || $184 === 38 || $184 === 43 || $184 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($184 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 192);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($184 === 5 || ($184 >= 7 && $184 <= 12) || $184 === 15 || $184 === 16 || $184 === 18 || $184 === 26 || $184 === 27 || ($184 >= 48 && $184 <= 51)) {
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
    if (loop$5 >= $183) break;
    loop$5++;
  }
}
function move_mblock() {
  let loop$6 = 0;
  let $185, $186;
  t[(8) - 1] = btime;
  if ((bnum < 1)) {
    return;
  }
  loop$6 = 1; $185 = bnum;
  if (loop$6 <= $185) for (;;) {
    L4_continue: {
    if ((bx[(loop$6) - 1] === 0)) {
      break L4_continue;
    }
    if ((pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26] !== 38)) {
      bx[(loop$6) - 1] = 0;
      break L4_continue;
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
    if ((py < by[(loop$6) - 1])) {
      by[(loop$6) - 1] = (by[(loop$6) - 1] - 1);
      ydir = (1) << 16 >> 16;
    } else if ((py > by[(loop$6) - 1])) {
      by[(loop$6) - 1] = (by[(loop$6) - 1] + 1);
      ydir = (-(1)) << 16 >> 16;
    }
    $186 = pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26];
    if ($186 === 0) {
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
    if (loop$6 >= $185) break;
    loop$6++;
  }
}

export function main() {
  let $187, $188, $189, $190, $191;

  screen();
  L5_newgame: for (;;) {
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
  x$7 = 1; $187 = 800;
  if (x$7 <= $187) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x$7 / 2));
    if (x$7 >= $187) break;
    x$7++;
  }
  R.gotoxy(px, py);
  col(14, 15);
  bak(0, 0);
  R.write('\x02');
  R.nosound();
  bak(0, 0);
  clearkeys();
  flash(16, 25, 'Press any key to begin this level.');
  do {
    player_move();
    if (R.keypressed()) {
      skiptime = (801) << 16 >> 16;
    } else {
      skiptime = ((skiptime + 1)) << 16 >> 16;
    }
    if ((skiptime > 800)) {
      x$7 = 1; $188 = 9;
      if (x$7 <= $188) for (;;) {
        t[(x$7) - 1] = (t[(x$7) - 1] - 1);
        if (x$7 >= $188) break;
        x$7++;
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
      strval = R.trunc(R.fmt(score, 0), 192);
      if ((score > 0)) {
        strval = R.trunc((strval + '0'), 192);
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
          x$7 = ((R.random(64) + 2)) << 16 >> 16;
          y$3 = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x$7) * 25 + (y$3) - 26] === 0)) {
            done = true;
            pf[(x$7) * 25 + (y$3) - 26] = 1;
            R.gotoxy(x$7, y$3);
            col(15, 15);
            R.write(slow);
            snum = ((snum + 1)) << 16 >> 16;
            sx[(snum) - 1] = x$7;
            sy[(snum) - 1] = y$3;
            x$7 = 5; $189 = 70;
            if (x$7 <= $189) for (;;) {
              R.sound((x$7 * 8));
              R.delay(1);
              if (x$7 >= $189) break;
              x$7++;
            }
            R.nosound();
          }
        } while (!(((R.random(50) === 0) || done)));
      }
      if ((lavaflow && (R.random(10) === 0))) {
        i$2 = 1; $190 = lavarate;
        if (i$2 <= $190) for (;;) {
          done = false;
          x$7 = ((R.random(64) + 2)) << 16 >> 16;
          y$3 = ((R.random(23) + 2)) << 16 >> 16;
          if (($191 = pf[(x$7) * 25 + (y$3) - 26], ($191 >= 0 && $191 <= 4) || $191 === 5 || ($191 >= 7 && $191 <= 11) || $191 === 15 || $191 === 16 || ($191 >= 18 && $191 <= 21) || ($191 >= 26 && $191 <= 28) || ($191 >= 32 && $191 <= 35) || ($191 >= 37 && $191 <= 39) || $191 === 41 || ($191 >= 42 && $191 <= 44) || $191 === 45 || ($191 >= 47 && $191 <= 51) || $191 === 57 || $191 === 60 || $191 === 64)) {
            if ((pf[((x$7 + 1)) * 25 + (y$3) - 26] === 22)) {
              done = true;
            } else if ((pf[((x$7 - 1)) * 25 + (y$3) - 26] === 22)) {
              done = true;
            } else if ((pf[(x$7) * 25 + ((y$3 + 1)) - 26] === 22)) {
              done = true;
            } else if ((pf[(x$7) * 25 + ((y$3 - 1)) - 26] === 22)) {
              done = true;
            }
            if (done) {
              pf[(x$7) * 25 + (y$3) - 26] = 22;
              R.gotoxy(x$7, y$3);
              col(12, 16);
              bak(4, 7);
              R.write('\xb2');
              bak(0, 0);
            }
          }
          if (i$2 >= $190) break;
          i$2++;
        }
      }
    }
  } while (!(restart));
  continue L5_newgame;
    break;
  }
}

export const state = () => [px, py];
