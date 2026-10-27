// Translated from Turbo Pascal by tools/kroz/pascal.mjs; do not edit.
import * as R from '../runtime.js';
let df = new Array(25).fill('');
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
let hidetrap = false;
let hiderock = false;
let hidestairs = false;
let hideopenwall = false;
let hidecreate = false;
let hidemblock = false;
let hidelevel = false;
let hidegems = false;
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
  R.gotoxy(28, 1);
  R.write('THE FINAL CRUSADE OF KROZ');
  R.gotoxy(26, 2);
  R.write('An Apogee Software Production' + '\r\n');
  R.write('' + '\r\n');
  R.write('Other new games available from Scott Miller:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 15);
  R.write('* THE LOST ADVENTURES OF KROZ - The latest, most advanced, largest, and' + '\r\n');
  R.write('     most unique of all Kroz games.  75 all-new levels ($20 + $2 P&H)' + '\r\n');
  R.write('' + '\r\n');
  col(7, 7);
  R.write('* SUPERNOVA - An epic adventure, with 16 colors, graphics and sound effects.' + '\r\n');
  R.write('     Understands full-sentence input.  Game takes up an entire disk!  ($10)' + '\r\n');
  R.write('' + '\r\n');
  R.write('* BEYOND THE TITANIC - A fantastic adventure of exploration and survival.' + '\r\n');
  R.write('     What really happened?  Sound effects and 16 color screens.  ($8)' + '\r\n');
  R.write('' + '\r\n');
  R.write('* TREK TRIVIA - VOLUMES 1 through 10 -  Each volume has 100 Star Trek trivia' + '\r\n');
  R.write('     questions, and is played like a game.  16-colors and sound effects, too.' + '\r\n');
  R.write('     $4 per volume (plus $2 per order for postage and disks), order all 10' + '\r\n');
  R.write('     volumes and pay only $30, a $12 savings!' + '\r\n');
  R.write('' + '\r\n');
  R.write('* Five more Kroz games!  KINGDOM OF KROZ, CAVERNS OF KROZ, DUNGEONS OF KROZ,' + '\r\n');
  R.write('     RETURN TO KROZ and TEMPLE OF KROZ.  Each $7.50, or order all six' + '\r\n');
  R.write('     for $35!  This is the most popular game series in shareware.' + '\r\n');
  cur(1);
  clearkeys();
  R.halt();
}
function shareware(wait) {
  let $14;
  bak(1, 0);
  bor(1);
  R.clrscr();
  cur(3);
  col(15, 15);
  R.gotoxy(19, 1);
  R.write('THE FINAL CRUSADE OF KROZ \xc4 HOW TO REGISTER' + '\r\n');
  R.gotoxy(1, 2);
  x = 1; $14 = 80;
  if (x <= $14) for (;;) {
    R.write('\xc4');
    if (x >= $14) break;
    x++;
  }
  R.gotoxy(1, 3);
  col(7, 7);
  R.write('  This is Volume III of the Super Kroz Trilogy.  Crusade of Kroz is a shareware' + '\r\n');
  R.write('game, which means it is user supported.  If you enjoy this game you are asked' + '\r\n');
  R.write('by the author to please send an appreciation check of $7.50 to Apogee Software.' + '\r\n');
  R.write('This minimal amount will help compensate the many months of work that went into' + '\r\n');
  R.write('the creation of this game.' + '\r\n');
  R.write('  Also, this registration fee will allow you to order the two shareware' + '\r\n');
  R.write('sequels:  ');
  col(15, 9);
  R.write('Return to Kroz');
  col(7, 7);
  R.write(' (Volume I) and ');
  col(15, 9);
  R.write('Temple of Kroz');
  col(7, 7);
  R.write(' (Volume II).' + '\r\n');
  R.write('Each sequel can be ordered for $7.50 each, or all three for $20.  Registered' + '\r\n');
  R.write('players will also get a secret code that makes this game easier to complete,' + '\r\n');
  R.write('plus a "Hints, Tricks and Scoring Secrets" guide and "The Domain of Kroz" map.' + '\r\n');
  R.write('' + '\r\n');
  col(15, 9);
  R.write('  The Lost Adventures of Kroz');
  col(11, 15);
  R.write(' will be available by the start of 1990.  It will' + '\r\n');
  R.write('have 75 all-new screens to explore, with new objects and a new level type.' + '\r\n');
  R.write('This newest, largest and most feature-packed Kroz game came about as a direct' + '\r\n');
  R.write('result of players\' comments for more Kroz games!  (Don\'t say I don\'t deliver!)' + '\r\n');
  R.write('Advance orders will be accepted.  Price: $20 plus $2 postage, disk & handling.' + '\r\n');
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
function define_levels() {
  df[(2) - 1] = R.trunc(('200      200 20  1  1  7 20    25         100 50                               10                                    ' + '                                                                            50      '), 201);
  df[(4) - 1] = R.trunc(('             80  2  2    50    12                             2                    5                           999   ' + '                          1  1  1  1                                                '), 201);
  df[(6) - 1] = R.trunc(('                 2          25 12              9     1                    2    80  3                       3         ' + '     1              1     1  1  1  1                                          620   '), 201);
  df[(8) - 1] = R.trunc(('             50 10  2    70    15           3 20     1        5           6   100    50 50                           ' + '     1                                                                     100100   '), 201);
  df[(10) - 1] = R.trunc(('             40  5       50     5                    1500500 22                50  1                       1         ' + '     1           1        1  1  1  1                                                '), 201);
  df[(12) - 1] = R.trunc((' 25 20 10        3  3               700                      15          20   100 20      100                        ' + '     1                    1  1  1  1                                                '), 201);
  df[(14) - 1] = R.trunc((' 20              2                                                            100  1                       3         ' + '     1                    1  1  1  1                                       500640   '), 201);
  df[(16) - 1] = R.trunc(('   600           2                                                            100 25                                 ' + '                                                                        600         '), 201);
  df[(18) - 1] = R.trunc((' 60         130300     9                             1            250    20        6                           100   ' + '     4              1                                                               '), 201);
}
function convert_format() {
  let xloop = 0;
  let yloop = 0;
  let tempstr = '';
  let $15, $16, $17, $18, $19, $20;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  t[(9) - 1] = -(1);
  lavaflow = false;
  x = 1; $15 = 66;
  if (x <= $15) for (;;) {
    y = 1; $16 = 25;
    if (y <= $16) for (;;) {
      pf[(x) * 25 + (y) - 26] = 0;
      if (y >= $16) break;
      y++;
    }
    if (x >= $15) break;
    x++;
  }
  x = 1; $17 = 999;
  if (x <= $17) for (;;) {
    bx[(x) - 1] = 0;
    by[(x) - 1] = 0;
    sx[(x) - 1] = 0;
    sy[(x) - 1] = 0;
    mx[(x) - 1] = 0;
    my[(x) - 1] = 0;
    fx[(x) - 1] = 0;
    fy[(x) - 1] = 0;
    if (x >= $17) break;
    x++;
  }
  new_gem_color();
  yloop = 1; $18 = 23;
  if (yloop <= $18) for (;;) {
    xloop = 1; $19 = 64;
    if (xloop <= $19) for (;;) {
      tempstr = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
      $20 = R.charAt(tempstr, 1);
      if ($20 === ' ') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 0;
      } else if ($20 === '1') {
        snum = ((snum + 1)) << 16 >> 16;
        sx[(snum) - 1] = (xloop + 1);
        sy[(snum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 1;
      } else if ($20 === '2') {
        mnum = ((mnum + 1)) << 16 >> 16;
        mx[(mnum) - 1] = (xloop + 1);
        my[(mnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 2;
      } else if ($20 === '3') {
        fnum = ((fnum + 1)) << 16 >> 16;
        fx[(fnum) - 1] = (xloop + 1);
        fy[(fnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 3;
      } else if ($20 === 'X') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 4;
      } else if ($20 === 'W') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 5;
      } else if ($20 === 'L') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 6;
      } else if ($20 === 'C') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 7;
      } else if ($20 === 'S') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 8;
      } else if ($20 === '+') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 9;
      } else if ($20 === 'I') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 10;
      } else if ($20 === 'T') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 11;
      } else if ($20 === 'K') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 12;
      } else if ($20 === 'D') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 13;
      } else if ($20 === '#') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 14;
      } else if ($20 === 'F') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 15;
      } else if ($20 === '.') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 16;
      } else if ($20 === 'R') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 17;
      } else if ($20 === 'Q') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 18;
      } else if ($20 === '/') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 19;
      } else if ($20 === '\\') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 20;
      } else if ($20 === 'B') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 21;
      } else if ($20 === 'V') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 22;
      } else if ($20 === '=') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 23;
      } else if ($20 === 'A') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 24;
      } else if ($20 === 'U') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 25;
      } else if ($20 === 'Z') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 26;
      } else if ($20 === '*') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 27;
      } else if ($20 === 'E') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 28;
      } else if ($20 === ';') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 29;
      } else if ($20 === ':') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 30;
      } else if ($20 === '`') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 31;
      } else if ($20 === '-') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 32;
      } else if ($20 === '@') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 33;
      } else if ($20 === '%') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 34;
      } else if ($20 === ']') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 35;
      } else if ($20 === 'G') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 36;
        gennum = ((gennum + 1)) << 16 >> 16;
      } else if ($20 === '(') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 37;
      } else if ($20 === 'M') {
        bnum = ((bnum + 1)) << 16 >> 16;
        bx[(bnum) - 1] = (xloop + 1);
        by[(bnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 38;
      } else if ($20 === ')') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 39;
      } else if ($20 === 'P') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 40;
        px = ((xloop + 1)) << 16 >> 16;
        py = ((yloop + 1)) << 16 >> 16;
      } else if ($20 === '&') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 41;
      } else if ($20 === '!') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 42;
      } else if ($20 === 'O') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 43;
      } else if ($20 === 'H') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 44;
      } else if ($20 === '?') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 45;
      } else if ($20 === '>') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 46;
        t[(9) - 1] = 32000;
      } else if ($20 === 'N') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 47;
      } else if ($20 === '<') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 48;
      } else if ($20 === '[') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 49;
      } else if ($20 === '|') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 50;
      } else if ($20 === '"') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 51;
      } else if ($20 === '4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 52;
      } else if ($20 === '5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 53;
      } else if ($20 === '6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 54;
      } else if ($20 === '7') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 55;
      } else if ($20 === '8') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 56;
      } else if ($20 === '9') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 57;
      } else if ($20 === '\xf1') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 58;
      } else if ($20 === '\xf2') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 59;
      } else if ($20 === '\xf3') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 60;
      } else if ($20 === '\xf4') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 61;
      } else if ($20 === '\xf5') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 62;
      } else if ($20 === '\xf6') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 63;
      } else if ($20 === 'Y') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 64;
      } else if ($20 === '0') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 65;
      } else if ($20 === '~') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 66;
      } else if ($20 === '$') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 67;
      } else {
        tempstr = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = R.charAt(tempstr, 1).charCodeAt(0);
      }
      if (xloop >= $19) break;
      xloop++;
    }
    if (yloop >= $18) break;
    yloop++;
  }
}
function level1() {
  fp[(1) - 1] = R.trunc('###the#final####  *    ##                      *##              ', 64);
  fp[(2) - 1] = R.trunc('crusade#of#kroz#       ##                       ##     T        ', 64);
  fp[(3) - 1] = R.trunc('                       ##|                      ##              ', 64);
  fp[(4) - 1] = R.trunc('       ##              ###########  #########   ##              ', 64);
  fp[(5) - 1] = R.trunc('   !   ##                              ##TT##   ##            B ', 64);
  fp[(6) - 1] = R.trunc('       ##              ##  W           ##TT###  #####]]####OO###', 64);
  fp[(7) - 1] = R.trunc('#########################              ##                ##OOOOO', 64);
  fp[(8) - 1] = R.trunc('       ##TTTTT##                       ##         *      ##OOOOO', 64);
  fp[(9) - 1] = R.trunc('  &    ##     ##                   W   ##                ##OOOOO', 64);
  fp[(10) - 1] = R.trunc('     & ##     ###########################  *             ##OO###', 64);
  fp[(11) - 1] = R.trunc('                   ##1111111@      ## H####################     ', 64);
  fp[(12) - 1] = R.trunc(' &    *##          ##11111@@@      @                <##         ', 64);
  fp[(13) - 1] = R.trunc('#########          ##1111@@  ...   ##                ## *       ', 64);
  fp[(14) - 1] = R.trunc('*      ##         *##11@@@   .P.   ##                ##         ', 64);
  fp[(15) - 1] = R.trunc('       ##   #########@@@     ...   ####################         ', 64);
  fp[(16) - 1] = R.trunc('           [##*    ##                ##*             ##         ', 64);
  fp[(17) - 1] = R.trunc('       #######      @                ##          W   ##        *', 64);
  fp[(18) - 1] = R.trunc('            ##     #############@@#####              ##         ', 64);
  fp[(19) - 1] = R.trunc('            ##         ##*           ##          ###########  ##', 64);
  fp[(20) - 1] = R.trunc('###  #########         ##                        ##            T', 64);
  fp[(21) - 1] = R.trunc(' +   + ##              ##            ##                         ', 64);
  fp[(22) - 1] = R.trunc('+  +   ]               ##            #######  #####    ##apogee#', 64);
  fp[(23) - 1] = R.trunc('  +   +##             W##        *   ##LL        ##"   #software', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidetrap = true;
  hidecreate = true;
}
function level3() {
  fp[(1) - 1] = R.trunc('                              P          F                H1##LL', 64);
  fp[(2) - 1] = R.trunc('#.#############0###########-############-##########O#0########DD', 64);
  fp[(3) - 1] = R.trunc('#.####@@@@@@@2@@@@@@@@@@@###-###+-222YYY-YYY222-+##S#1-1-1-1##22', 64);
  fp[(4) - 1] = R.trunc('#.#W##@@@2@@@@@@@@@@@@2@@##-############-##########O#-1-1-1-##22', 64);
  fp[(5) - 1] = R.trunc('#. ###@@@@@@@@@@2@@@@@@@@###-###+-222YYY-YYY222-+##O#1-1-1-1##))', 64);
  fp[(6) - 1] = R.trunc('#.####@@@@@2@@VVV@@2@@@@@####-##########-##########O#-1-1-1-##))', 64);
  fp[(7) - 1] = R.trunc('#.#W##2@@@@@VVVVVVV@@@@@2###-###+-222YYY-YYY222-+##O#1-1-1-1##))', 64);
  fp[(8) - 1] = R.trunc('#. ###@@@@2@VVVVVVV@@@@@@##-############-##########O#-1-1-1-##))', 64);
  fp[(9) - 1] = R.trunc('#.####@2@@@@@@VVV@@@@@@2@###-###+-222YYY-YYY222-+##O#1-1-1-1##))', 64);
  fp[(10) - 1] = R.trunc('#.#W##@@@@@@2@@@@@@@2@@@@##-############-##########O#-1-1-1-##))', 64);
  fp[(11) - 1] = R.trunc('#. ###0000000000000000000###-###--------S4---4---2#O#1-1-1-1##))', 64);
  fp[(12) - 1] = R.trunc('#.####T********T********T####-##-444444444-4-4-4\xf1##O#-1-1-1-##))', 64);
  fp[(13) - 1] = R.trunc('#.#W########################-###-----------4---4C##O#1-1-1-1##))', 64);
  fp[(14) - 1] = R.trunc('#. ##!T(M(((M(((((M((((M((M(####2424242424242424C##O#;::::::##))', 64);
  fp[(15) - 1] = R.trunc('#.###TTM((M(((M(M(((M((((M((#######################O#<F[F|F"##))', 64);
  fp[(16) - 1] = R.trunc('   ###############################-----------------O##########))', 64);
  fp[(17) - 1] = R.trunc('   ##11111111111111111############-#####################++YYYY))', 64);
  fp[(18) - 1] = R.trunc('2  ##-----------------##S-------##-------------------Q##++YYYY))', 64);
  fp[(19) - 1] = R.trunc('  Z##  #############--#########-########################++YYYY))', 64);
  fp[(20) - 1] = R.trunc('             0--------X+++++K##---------------?TTTTTT2##++YYYY))', 64);
  fp[(21) - 1] = R.trunc('   ############################-##############################))', 64);
  fp[(22) - 1] = R.trunc('   ##-----------------------------------------------------------', 64);
  fp[(23) - 1] = R.trunc('+  I--1111111111111111111111111111111111111111111111111111111111', 64);
  slow = '\x9a';
  medium = '\x94';
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (35) << 16 >> 16;
}
function level5() {
  fp[(1) - 1] = R.trunc('"2              2     XXCRRRRRRR@@@@1@@@@@@@@@1@@@@@@@@@1@@@@1@<', 64);
  fp[(2) - 1] = R.trunc('     P   2           WRRRRRRRRR1@@@@@@@@@@@@@@@@@1@@@1@@@@@@@@@@', 64);
  fp[(3) - 1] = R.trunc('               2 RRRRRRRRRRRK-@@@@@@@1@@@@1@@@@@@@@@@@@@@1@@1@1@', 64);
  fp[(4) - 1] = R.trunc('    2  TRRRRRRRRRRRRRRRRRRRRR-1@@@@1@@@@@@@@@@1@@@@@@@@@@@######', 64);
  fp[(5) - 1] = R.trunc('2  TRRRRRRRRRRRRRRRR###RRRRRRRR@@@@@@@@1@@@@@@@@@@@@1@@@@@DDD&LL', 64);
  fp[(6) - 1] = R.trunc('RRRRRRRRRR#################RRRRRRRR1@@@@@@@1@@@1@@@@@@@1@@######', 64);
  fp[(7) - 1] = R.trunc('RRRRR 2   - T  2 -   2 -   2 KRRRRRRRRR@@1@@@@@@@@@1@@@@@@@@@@1@', 64);
  fp[(8) - 1] = R.trunc('RRT   -    2 -    2 -   2  -   -  -RRRRRRRRR@1@@@@@@@@@1@@@1@@@@', 64);
  fp[(9) - 1] = R.trunc('     - 2 -    2  -   2   -  2   2  2  TRRRRRRRR@1@@@@@@@@@@@@@@1', 64);
  fp[(10) - 1] = R.trunc('O## 2 -   2-   -  2   2   2   -  -   -    2RRRRRRRR1@@@@@1@@@1@@', 64);
  fp[(11) - 1] = R.trunc('O##7772 -   2-  2  -    -   T  2  2   2 -  -2 RRRRRRRRR@@@@@@@@@', 64);
  fp[(12) - 1] = R.trunc('O##\xf477   2    2  T  2    2  -  -   -  -  2  2 - 2  RRRRRRRRR!---', 64);
  fp[(13) - 1] = R.trunc('O##find#the#hidden#spell#    2  2   2  2       2   2 XHRRRRRRRRU', 64);
  fp[(14) - 1] = R.trunc('O##########################################################RRRRR', 64);
  fp[(15) - 1] = R.trunc('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO?UR', 64);
  fp[(16) - 1] = R.trunc('####W##########W##########W##########W##########W##########W####', 64);
  fp[(17) - 1] = R.trunc(';;;;-;;;;##XXXXXXXXX##---------##2-2-2-2-2##\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa##2226-----', 64);
  fp[(18) - 1] = R.trunc(';T;;;-;;##XXXXXXXXXXX##;;;;;;-##2-2-2-2-2-2##\xfa\xfa\xfa\xfa\xfa\xfa\xfa##222266666-', 64);
  fp[(19) - 1] = R.trunc('-;-;;;-;;##XXXXXXXXX##---------##2-2-2-2-2##\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa##22222226-', 64);
  fp[(20) - 1] = R.trunc('-;;-;;;-;B##XXXXXXX##B---------B##2-2-2-2##B\xfa\xfa\xfa\xfaS\xfa\xfa\xfa\xfaB##2222226-', 64);
  fp[(21) - 1] = R.trunc(';-;;-;-;;##XXXXXXXXX##VVVVVVVVV##2-2-2-2-2##\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa\xfa##22222226-', 64);
  fp[(22) - 1] = R.trunc(';-;;;-;;##XXXXXXXXXXX##VVVVVVV##2-2-----2-2##\xfa\xfa\xfa\xfa\xfa\xfa\xfa##222222226\xf3', 64);
  fp[(23) - 1] = R.trunc('|;;;;;;;+##XXXXCXXXX##CT+TCT+TC##2-2-K-2-2##****Q****##22222226[', 64);
  slow = '\xff';
  medium = '\x99';
  fast = '\xea';
  convert_format();
}
function level7() {
  fp[(1) - 1] = R.trunc('!+-----+----+------+##%VVOOOOO44U44OOOOVV%##3333333333333333333K', 64);
  fp[(2) - 1] = R.trunc('-----+--+-----+-----##VVVOOOOO44444OOOOVVV##66666666666666666663', 64);
  fp[(3) - 1] = R.trunc('+--+------+--------+##OOOOOOOO##5##OOOOOOO##                  63', 64);
  fp[(4) - 1] = R.trunc('-----+-------+----+-##OOOOOOOO##?##OOOOOOO##                  63', 64);
  fp[(5) - 1] = R.trunc('---+-----+------+---##VVVOOOOOO###OOOOOVVV##XXXXX             63', 64);
  fp[(6) - 1] = R.trunc('-+----+-------+-----##CVVOOOOOOO#OOOOOOVVC##XXXXX             63', 64);
  fp[(7) - 1] = R.trunc('+-------+--------+-U##CVVOOOOOOOOOOOOOOVVC##UXXXX             63', 64);
  fp[(8) - 1] = R.trunc('###############################OOO##############################', 64);
  fp[(9) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMM##S                  S##11111111111111111111', 64);
  fp[(10) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMM##                    ##11111111111111111111', 64);
  fp[(11) - 1] = R.trunc('@@@@@@@@@@@@@@@@@@@@##         000        ##11111111111111111111', 64);
  fp[(12) - 1] = R.trunc('K@@@@@@@@@@@@W                 0P0        HB11111111111B1111111\xf1', 64);
  fp[(13) - 1] = R.trunc('@@@@@@@@@@@@@@@@@@@@##         000        ##11111111111111111111', 64);
  fp[(14) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMM##                    ##11111111111111111111', 64);
  fp[(15) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMM##S                  S##11111111111111111111', 64);
  fp[(16) - 1] = R.trunc('###############################~~~##############################', 64);
  fp[(17) - 1] = R.trunc('111111111111111111-U##C00000000---0-000---##U-))I)))))))333))))-', 64);
  fp[(18) - 1] = R.trunc('1(((((((((((((((((--##-0000H---0000---0-0-##--)I)))))))333))))-*', 64);
  fp[(19) - 1] = R.trunc('1(((((((TTT((((((((1##00000000 00000000000##))I)))))))333))))-*I', 64);
  fp[(20) - 1] = R.trunc('1(((((((TTT((((((((1##-0-00000000000000-00##)I)))))))333))))-*I*', 64);
  fp[(21) - 1] = R.trunc('1(((((((TTT((((((((1##00-0-----0000000<[|"##I)))))))333))))-*I*I', 64);
  fp[(22) - 1] = R.trunc('1((((((((((((((((((1##-#####################)))))))333))))-*I*I*', 64);
  fp[(23) - 1] = R.trunc('\xf31111111111111111111##C-------D-D-D]]E\xf2&LL##K)))))333))))-*I*I*I', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidemblock = true;
  hidegems = true;
}
function level9() {
  fp[(1) - 1] = R.trunc('    ~~~~~~~~~~1144\\\\XMMMMMMMMMX55//2266033U-YYYD-DDDDDDDDDDDDDDL', 64);
  fp[(2) - 1] = R.trunc(' 0 0~~~~~~~~~~1144\\\\XMMMMMMMMMX55//2266033U-YYYDDDDDDD-DDDD-DDD-', 64);
  fp[(3) - 1] = R.trunc('    ~~~~~~~~~~1144\\\\XMMMMMMMMMX55//2266033U-YYYDDD-DDDDDDDDDDDDD', 64);
  fp[(4) - 1] = R.trunc('   0~~~~~~~~~~1144\\\\XMMMMMMMMMX55//2266033U-YYYDDDDD-DDD-DDDD-DD', 64);
  fp[(5) - 1] = R.trunc('   #############################################################', 64);
  fp[(6) - 1] = R.trunc(' 0 ##!\xf6   TT          I  .            .     . ;;Q   .      . 88K', 64);
  fp[(7) - 1] = R.trunc('  0  0  0 ##7777P  .  I           .       .   ;;;;;     .    88\xf5', 64);
  fp[(8) - 1] = R.trunc(' 0  0 0   ##\xf4\xf477      I     .                    .           88\xf5', 64);
  fp[(9) - 1] = R.trunc('9999999999##K\xf477      I   .         .        .        .     .88K', 64);
  fp[(10) - 1] = R.trunc('############@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', 64);
  fp[(11) - 1] = R.trunc('KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(12) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(13) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(14) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM\xf1MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(15) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(16) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(17) - 1] = R.trunc('K@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@K', 64);
  fp[(18) - 1] = R.trunc('MMMMMMMMMMMMMMMM\xf2MMMMMMMMMMMMMMMMMMMMMMMMMMMMMM\xf3MMMMMMMMMMMMMMMM', 64);
  fp[(19) - 1] = R.trunc('MMMMMMBMMMMMMMMMMMMMMMMMMMMMMMMMBMMMMMMMMMMMMMMMMMMMMMMMMBMMMMMM', 64);
  fp[(20) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(21) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(22) - 1] = R.trunc('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(23) - 1] = R.trunc('KMMMMMMMMMMMMWWWWWWWMMMMMMMMMMMMKMMMMMMMMMMMWWWWWWWMMMMMMMMMMMMK', 64);
  slow = '\x9a';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidemblock = true;
  hidetrap = true;
}
function level11() {
  fp[(1) - 1] = R.trunc('334  X~~~~~~  ~ ~~~~~~ P ~~ ~ ~~~ ~  ~ K~##U====U##U-~~*~~~2222K', 64);
  fp[(2) - 1] = R.trunc('334  ~ ~~~~ ~~ ~ ~~~~    ~ ~ ~ ~ ~ ~~~~~~~## ==== ##~-~~--~@@@@2', 64);
  fp[(3) - 1] = R.trunc('334  ~~ ~ ~~ ~~~ ~ ~ ~~~~ ~~~~~U~~~~~ ~~~~## ==== ##-~~-~~-@@@@2', 64);
  fp[(4) - 1] = R.trunc('334  ~~~ ~ ~~ ~~~ ~ ~~~~~~~~~~~-~~~~~ ~~~## ==== ##~~-~~-~~~~~~~', 64);
  fp[(5) - 1] = R.trunc('334  ~~~~~~  ~~~~~~~~~II~~~~~~II~~~~~ ~~## ==== ##~~-~~-~~999999', 64);
  fp[(6) - 1] = R.trunc('334  ~~~~~~~~~I~I~II~I~~I~II~I~I~~~~~ ~~~## ==== ##-~~~-~-DDDDKL', 64);
  fp[(7) - 1] = R.trunc('334  ~~!YGIIII~I~I~~I~~~~I~~I~~I~~~~~0~~## ==== ##~~-~-~~-999999', 64);
  fp[(8) - 1] = R.trunc('334  ~~~~~~~~~~~~~~~~~~~~~~~~~~I~1111111## ==== ##~*~-~~~\xf6######', 64);
  fp[(9) - 1] = R.trunc('334  ~K-U-7\xf40~0~0~0~0~0~0~XXXK~I~11111111##0==== ##~~~~~33333333', 64);
  fp[(10) - 1] = R.trunc('334  ~~~~~~~~~~~~~~~~~~~~~~~~~~I~111111111##-==== ##~~~333333333', 64);
  fp[(11) - 1] = R.trunc('444\xf1\xf1~~~~~~~~~~~~~333333~~~111~I~1111B11111##-==== ##~3333333333', 64);
  fp[(12) - 1] = R.trunc('     ~~~~~~~~"~~~~333333~|~1110I~1111111111##-==== ##~~~~~~~~~~-', 64);
  fp[(13) - 1] = R.trunc('     ~~~~~~~~~~~~~333333~~~111~I~111111111##-==== ##~~  000    -', 64);
  fp[(14) - 1] = R.trunc('~0~0~~   ~~~~~~ ~~((((((~~~~~~~I~1111111111##-==== ##~          ', 64);
  fp[(15) - 1] = R.trunc('~ ~ ~ ~~~ ~*~~~~ 0      0 ~~~~~2~111111111##-====0##Z           ', 64);
  fp[(16) - 1] = R.trunc('~ ~ ~ ~ ~~ ~*~~~ 0      0 ~~ ~~K~~~~~-~~~##-====-##-~YYYYYYYYYY~', 64);
  fp[(17) - 1] = R.trunc('~ ~ ~~ ~ ~~~*~~~ 0      0 ~ ~ ~~~~~~-~~~##-====-##~-~YYYYYYYYYY~', 64);
  fp[(18) - 1] = R.trunc('~ ~ ~~~~~ ~~~~~~           ~~ ~~~~~~-~~##-====-##~-~~YCYYYYYYCY~', 64);
  fp[(19) - 1] = R.trunc('~ ~ ~    C~~~~~~~~((((((~~~~ ~~ ~~~-~~~##-====-##~~-~~~~~~~~~~~~', 64);
  fp[(20) - 1] = R.trunc('~ ~  ~~~~~~~~~~~~~((((((~~~ ~~ ~ ~-~~~##-====-##~~-~~-~~-----U-[', 64);
  fp[(21) - 1] = R.trunc('~ ~ ~~   Q~~~~~~~~((((((~~ ~~ ~~ ~U~~~~##-====-##-~~-~-~-~#chasm', 64);
  fp[(22) - 1] = R.trunc('~     ~~~~~~~~~~~~******~ ~~ ~~ ~~ ~~~~~##-====-##--~~-~-~####of', 64);
  fp[(23) - 1] = R.trunc('~ ~~~~~~~~~~~~~~~~TTTTTT~~  ~~*~U~+++++++##C====C##~~~~-~~##fate', 64);
  slow = '\x8f';
  medium = '\x94';
  fast = '\xea';
  convert_format();
  hideopenwall = true;
  hidecreate = true;
}
function level13() {
  fp[(1) - 1] = R.trunc('LLL##U##@@@@@@@@@@@|000---0000000000000000-0--00000000VVV000Y-0V', 64);
  fp[(2) - 1] = R.trunc('```##6##@00000000000000---0000222222220---0000-00000000000--Y-0V', 64);
  fp[(3) - 1] = R.trunc('```##6##@@022222222K000---0000-0000000000-0000-0)))))YYYW-W0Y-0V', 64);
  fp[(4) - 1] = R.trunc('```##6##@@@222222222000---000U*******00000000000)))0000000000-00', 64);
  fp[(5) - 1] = R.trunc('```##6##@@@222222222000---000000000000000000000000222222--000---', 64);
  fp[(6) - 1] = R.trunc('```##6##@@0222222222000---(((((((((((((((\xf1(((((000222222-C00000-', 64);
  fp[(7) - 1] = R.trunc('333##6##@00000000000000---00004444444444444444(0000000000000000-', 64);
  fp[(8) - 1] = R.trunc('333##6##3CCC....0---------00022222222222222222(K(---------------', 64);
  fp[(9) - 1] = R.trunc('$$$##6##000000000000000---00000000000000000000000000000000000000', 64);
  fp[(10) - 1] = R.trunc('   0--00000000000000000---000000000000000000000===============--', 64);
  fp[(11) - 1] = R.trunc(' P 00-00+02222222220--------------------------0="===-=--===-==-=', 64);
  fp[(12) - 1] = R.trunc('$$$00-00+02222222220-00---0000000000000000000-0==I=-=-==-=-=-==-', 64);
  fp[(13) - 1] = R.trunc(' ! 00-00+02222222220-00-Z-0000000000000000000-0=H==-===T==-==--=', 64);
  fp[(14) - 1] = R.trunc('00000-00[02222B22220-00---00----03333333CC----0==I==-===-==-====', 64);
  fp[(15) - 1] = R.trunc('0--00-00+02222222220-00---00-0000000000000000-0===--==-==-==--==', 64);
  fp[(16) - 1] = R.trunc('-0000-00+02222222220-00---00-0000000000000000-0==-===-=-=-====-=', 64);
  fp[(17) - 1] = R.trunc('00000-00+02222222220W00---00-----0--------000-0=-==--==-=-=--=T=', 64);
  fp[(18) - 1] = R.trunc('0--00-00000000000000000---000000000001110-000-0==T-===-===-==-==', 64);
  fp[(19) - 1] = R.trunc('00000-00000000000000000---000000000001110-00000=======-=========', 64);
  fp[(20) - 1] = R.trunc('--000----------------- ---0WWWWWWWWW01110-000-000000000000000000', 64);
  fp[(21) - 1] = R.trunc('00000-00000000000000000---000-00000001110-000K--<000OO000OOOOO\xf3*', 64);
  fp[(22) - 1] = R.trunc('--000-000000~~~0000000#---#00-00000000000-000000000000OOOO000000', 64);
  fp[(23) - 1] = R.trunc('00K000000********3000##VVV##0-------------00000triskaidekaphobia', 64);
  slow = '\x8e';
  medium = '\x94';
  fast = '\xff';
  convert_format();
  lavaflow = true;
  lavarate = (112) << 16 >> 16;
  hideopenwall = true;
}
function level15() {
  fp[(1) - 1] = R.trunc('LL.......CCC0~0~0~01UU-D-D-D-D3.......C.....-OOOOOO%K66636363636', 64);
  fp[(2) - 1] = R.trunc('66666666666666666666666666666666666666666666;6666666666363636363', 64);
  fp[(3) - 1] = R.trunc(']]]]]]]]?6633##\xf1##33-=-===--=Z=663333333-K66-----\\\\\\H66636363636', 64);
  fp[(4) - 1] = R.trunc('0000000066(((##T##(66-=-=-==-=6622222222-66------\\\\\\\\66$6$6$6$6$', 64);
  fp[(5) - 1] = R.trunc('00000000066((##T##((66=-==-==-=6611111111166-----\\\\\\\\666$6$6$6$6', 64);
  fp[(6) - 1] = R.trunc('----------66(##T##(((66=-=-=-==-66)))))))))66------0066$6$6Q6$6$', 64);
  fp[(7) - 1] = R.trunc('-----------(((((((((66|-=-===--=-)))))))))---------0"666$6$6$6$6', 64);
  fp[(8) - 1] = R.trunc('66666666-6666666666666666666666666666666666666666666666$6$6$6$6$', 64);
  fp[(9) - 1] = R.trunc('22222222266+~+~+~+~+~IMMMMMMMMM66*0*0*0*0*66K~-VVVVCC666T6T6T6T6', 64);
  fp[(10) - 1] = R.trunc('2222222266+~+~+~+~+~+66MMMMMMM66--0-0-0-0--66~--VVVVC66$6$6$6$6$', 64);
  fp[(11) - 1] = R.trunc('55555555566+~+~+~+~+66MMMMMMMMM66-0-0-0-0-66-----VVVV666$6$6$6$6', 64);
  fp[(12) - 1] = R.trunc('XXXXXXXXXX66+~+~+~+66MMMMMMMMMMM660-0-0-066-------VVV66$6$6$6$6$', 64);
  fp[(13) - 1] = R.trunc('XXXXXXXXX66+~+~+~+~+66MMMMMMMMM66-0*0*0*0---------!VV666$6$6$6$6', 64);
  fp[(14) - 1] = R.trunc('\xf2666666666666666666066666DDD66666-6666666666I6666666666$6$6$6$6$', 64);
  fp[(15) - 1] = R.trunc('.........66C7--;----66---------66-YYYYYYYY66W;W;W;W;W666$6$6$6$6', 64);
  fp[(16) - 1] = R.trunc('..........667--;-----66---------66YYYYYYYYY66W;W;W;W;66$6$6$6$6$', 64);
  fp[(17) - 1] = R.trunc('.........66----;----66--00000--66-YYYYYYYY66W;W;W;W;W66$$$$$$$$$', 64);
  fp[(18) - 1] = R.trunc('..........-----;--\xf466---00B00-66--YYYYYYY66W;W;W;W;W;66;;;;;;;;;', 64);
  fp[(19) - 1] = R.trunc('.........66----;--\xf4[66--00T00-----YYYYYYY<66W;W;W;W;W;          ', 64);
  fp[(20) - 1] = R.trunc('4666666666666666666666666666666666666666666666666666666 ###crazy', 64);
  fp[(21) - 1] = R.trunc(';:       ==+ == W== +==W     == +== W==      ==     W== cubicals', 64);
  fp[(22) - 1] = R.trunc(';:P  ==  ==          ==  ==  ==      ==  ==      ==  == one#last', 64);
  fp[(23) - 1] = R.trunc('K:   ==W     ==  ==     +==      ==     +== W== +==     ####time', 64);
  slow = '\x9a';
  medium = '\x99';
  fast = '\x01';
  convert_format();
  hidemblock = true;
  hideopenwall = true;
}
function level17() {
  fp[(1) - 1] = R.trunc('KMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM\xf3MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMK', 64);
  fp[(2) - 1] = R.trunc('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', 64);
  fp[(3) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222222222222', 64);
  fp[(4) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222222222222', 64);
  fp[(5) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222222222222', 64);
  fp[(6) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222222222222', 64);
  fp[(7) - 1] = R.trunc('5555555555555555555555555555555555555555555555555555555555555555', 64);
  fp[(8) - 1] = R.trunc('------B---------B---------B----------B---------B---------B------', 64);
  fp[(9) - 1] = R.trunc('4444444444444444444444444444444444444444444444444444444444444444', 64);
  fp[(10) - 1] = R.trunc('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(11) - 1] = R.trunc('0000000000000000000000000000000000000000000000000000000000000000', 64);
  fp[(12) - 1] = R.trunc('3(                           T    T                           )3', 64);
  fp[(13) - 1] = R.trunc('3(                    ####################                    )3', 64);
  fp[(14) - 1] = R.trunc('3(                    ##  )  ]\xf1##\xf2]  (  ##                    )3', 64);
  fp[(15) - 1] = R.trunc('3(       P            ##;;############;;##           !        )3', 64);
  fp[(16) - 1] = R.trunc('3(                    ##  ##T##LL##T##  ##                    )3', 64);
  fp[(17) - 1] = R.trunc('3(                    ##00##;##DD##;##00##                    )3', 64);
  fp[(18) - 1] = R.trunc('3(                    ##  ##E##DD##E##  ##                    )3', 64);
  fp[(19) - 1] = R.trunc('3(                    ##;;##66666666##;;##                   &)3', 64);
  fp[(20) - 1] = R.trunc('######                0+++            +++0                ######', 64);
  fp[(21) - 1] = R.trunc('3333##                ####################                ##<[|"', 64);
  fp[(22) - 1] = R.trunc('U333##                          0                         U-I--C', 64);
  fp[(23) - 1] = R.trunc('YYYY##;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;######', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hiderock = true;
  hidemblock = true;
  hidecreate = true;
}
function level19() {
  fp[(1) - 1] = R.trunc('KMMMMMMMM----MMMMMMMMMMM-MMMMMMM##LL&DDDDDDD-MMMMMMMMMMMMMMMMMMM', 64);
  fp[(2) - 1] = R.trunc('MMMMMMMM-MMMM--MMMMMMMM-M-MMMMMM############-------------------M', 64);
  fp[(3) - 1] = R.trunc('MMMMMMM-MMMMMMM-MMMMMM-MMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-M', 64);
  fp[(4) - 1] = R.trunc('MMMMMM-MMMMMMMMM--MMM-MMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-M', 64);
  fp[(5) - 1] = R.trunc('MMMMM-MMMMM!MMMMMM---MMMMMM-MMMMMMMKMMMMMMMM**********MMMMMMMM-M', 64);
  fp[(6) - 1] = R.trunc('MMMM-MMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-', 64);
  fp[(7) - 1] = R.trunc('MMM-MMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMM-M', 64);
  fp[(8) - 1] = R.trunc('MM-MMMMMMMMM-------------MMMMMMMMMMMMM------------------M-M-M-MM', 64);
  fp[(9) - 1] = R.trunc('M-MMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMM-MMM-MMM', 64);
  fp[(10) - 1] = R.trunc('-MMMMMMMMM-MMMWWWWWWWWWWWMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(11) - 1] = R.trunc('-MMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMM', 64);
  fp[(12) - 1] = R.trunc('-M---MMMMMMM-M-M-M-M-M-M-MMMMMMMMMMM-MMMMM-MMM-MMM-MMMMMMMMMMMMM', 64);
  fp[(13) - 1] = R.trunc('M-MMM-MMMMMMM-M-M-M-M&M-M-MMMMMMMMMMM---M-M-M-M-M-M---------MMMM', 64);
  fp[(14) - 1] = R.trunc('MMMM-MMMMMMMMMMMMMMMMMMMMM-MMMMMKMMMMMMM-MMM-MMM-MMMMMMMMMMM-MMM', 64);
  fp[(15) - 1] = R.trunc('MMM-MMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMM+', 64);
  fp[(16) - 1] = R.trunc('MM-MMMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMMM+', 64);
  fp[(17) - 1] = R.trunc('M-MMMMMKMMMMM-------------MMMMMMMMMMMMMMMMMMMMMMMMMMKMMMMM-MMMM+', 64);
  fp[(18) - 1] = R.trunc('M-MMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMMMM-M-MMM+', 64);
  fp[(19) - 1] = R.trunc('M-MMMMMMMMMM-MMMMMMMMMMMMMMMMMMMMMMMMM-MMMMMMM-M-MMMMMMM-MMM-MMM', 64);
  fp[(20) - 1] = R.trunc('M-MMMMMMMMMM-MMMMMMKMMMMMMMMMMM-MMMMM-M-MMMMM-MMM-MMMMM-MMMMM-MM', 64);
  fp[(21) - 1] = R.trunc('@@@MMMMMMMM-MMMMMMMMMMMMMM-MMM-M-MMM-MMM-MMM-MMMMM-MMM-MMMMMMM-M', 64);
  fp[(22) - 1] = R.trunc('@P@MMMMMMMMM-MMMMMMMMMMMM-M-M-MMM-M-MMMMM-M-MMMMMMM-M-MMMMMMMMM-', 64);
  fp[(23) - 1] = R.trunc('@@@MMMMMMMMMM--M-M-M-M---MMM-MMMMM-MMMMMMM-MMMMMMMMM-MMMMMKMMMMM', 64);
  slow = '\x8f';
  medium = '\x94';
  fast = '\xea';
  convert_format();
}
function level20() {
  fp[(1) - 1] = R.trunc('K333333333333333333333333333333333333333333333333K##VVC?CVVVVVVV', 64);
  fp[(2) - 1] = R.trunc('3                                                3##VVVVVVVVAVVV', 64);
  fp[(3) - 1] = R.trunc('3   .     .           .          .     .         3##VVVVVVVVVVVV', 64);
  fp[(4) - 1] = R.trunc('3            ;::               .             .   3##++VVVVVVVVVV', 64);
  fp[(5) - 1] = R.trunc('3      .     :\xf1:.                                3##++++++VVVVVV', 64);
  fp[(6) - 1] = R.trunc('3            :::               :::      .        3##---!----VVVV', 64);
  fp[(7) - 1] = R.trunc('3               .         .    :>:.              3##---------&VV', 64);
  fp[(8) - 1] = R.trunc('3    .                         :::               3##DDDDDDDDDDDD', 64);
  fp[(9) - 1] = R.trunc('3                             .    .      .      3##DDDDDDDDDDDD', 64);
  fp[(10) - 1] = R.trunc('3                    FFFFFFF                     3##DDDDDDDDDDDD', 64);
  fp[(11) - 1] = R.trunc('3           .        F.   .F            .     .  3##DDDDDDDDDDDD', 64);
  fp[(12) - 1] = R.trunc('3  .                 F  P  F  .                  3##000000000000', 64);
  fp[(13) - 1] = R.trunc('3                    F.   .F          .    .     3##------------', 64);
  fp[(14) - 1] = R.trunc('3                    FFFFFFF                     3##............', 64);
  fp[(15) - 1] = R.trunc('3       .    .                                   3##           %', 64);
  fp[(16) - 1] = R.trunc('3                 .              .  .      .     3## .      .  V', 64);
  fp[(17) - 1] = R.trunc('3     ;;;                 .                      3##    .     VV', 64);
  fp[(18) - 1] = R.trunc('3   . ;%;       .                    ;;;         3##         VVV', 64);
  fp[(19) - 1] = R.trunc('3     ;;;              .       .    .;Z;         3##        VVVV', 64);
  fp[(20) - 1] = R.trunc('3                                    ;;;   .     3## .     VVVVV', 64);
  fp[(21) - 1] = R.trunc('3  .       .         .      .                    3##      VVVVVV', 64);
  fp[(22) - 1] = R.trunc('3                                                3##  .  VVVVVVV', 64);
  fp[(23) - 1] = R.trunc('K333333333333333333333333333333333333333333333333K44    VVVV<[|"', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidegems = true;
  hidetrap = true;
}
function level21() {
  fp[(1) - 1] = R.trunc('#######################################################)P)!#####', 64);
  fp[(2) - 1] = R.trunc('#######################################################))))#####', 64);
  fp[(3) - 1] = R.trunc('L$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$##########))))#####', 64);
  fp[(4) - 1] = R.trunc('L$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$##########))))#####', 64);
  fp[(5) - 1] = R.trunc('#########################################$$$$##########))))#####', 64);
  fp[(6) - 1] = R.trunc('######the#bones#of#######################$$$$##########))))#####', 64);
  fp[(7) - 1] = R.trunc('######scott#miller#######################$$$$##########))))#####', 64);
  fp[(8) - 1] = R.trunc('######rest#here##########################$$$$##########))))#####', 64);
  fp[(9) - 1] = R.trunc('#############################     #######$$$$##########))))#####', 64);
  fp[(10) - 1] = R.trunc('#############################  ?  #######$$$$##########$$$$#####', 64);
  fp[(11) - 1] = R.trunc('#############################     #######$$$$##########EEEE#####', 64);
  fp[(12) - 1] = R.trunc('#########################################$$$$##########$$$$#####', 64);
  fp[(13) - 1] = R.trunc('#########################################$$$$##########$$$$#####', 64);
  fp[(14) - 1] = R.trunc('###$$$$E$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$]$$$$$##########$$$$#####', 64);
  fp[(15) - 1] = R.trunc('###$$$$E$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$]$$$$$##########$$$$#####', 64);
  fp[(16) - 1] = R.trunc('###$$$$################################################$$$$#####', 64);
  fp[(17) - 1] = R.trunc('###$$$$##########################################>#####$$$$#####', 64);
  fp[(18) - 1] = R.trunc('###$$$$################################################$$$$#####', 64);
  fp[(19) - 1] = R.trunc('###@@@@################################################$$$$#####', 64);
  fp[(20) - 1] = R.trunc('###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$#####', 64);
  fp[(21) - 1] = R.trunc('###@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@$$$$#####', 64);
  fp[(22) - 1] = R.trunc('#######------------------------------------------------#########', 64);
  fp[(23) - 1] = R.trunc('#######VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV#########', 64);
  slow = '\x8e';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidecreate = true;
  lavaflow = true;
  lavarate = (40) << 16 >> 16;
  hidestairs = true;
}
function level22() {
  fp[(1) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(2) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(3) - 1] = R.trunc('RRRRRRRR                  ]                                    P', 64);
  fp[(4) - 1] = R.trunc('RRRRRRRR                  ]                                     ', 64);
  fp[(5) - 1] = R.trunc('RRRRRRRR    RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(6) - 1] = R.trunc('RRRRRRRR    RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(7) - 1] = R.trunc('RRRRRRRR    RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(8) - 1] = R.trunc('RRRRRRRR                                   RRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(9) - 1] = R.trunc('RRRRRRRR         !                         RRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(10) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR             RRRRRRRRRRRR', 64);
  fp[(11) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR             RRRRRRRRRRRR', 64);
  fp[(12) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR    RRRRRRRRRRRR', 64);
  fp[(13) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR    ;     RRRRRR', 64);
  fp[(14) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR    ;     RRRRRR', 64);
  fp[(15) - 1] = R.trunc('RRRRRRRRRRRRR@@OOOOOOOOOOOOOOOOOOOH   RRRRRRRRRRRRRRRR    RRRRRR', 64);
  fp[(16) - 1] = R.trunc('RRRRRRRRRRRR@@@OOOOOOOOOOOOOOOOOOOH   RRRRRRRRRRRRRRRR    RRRRRR', 64);
  fp[(17) - 1] = R.trunc('RRRRRRRRRRR@@@@RRRRRRRRRRRRRRRRRRRH   RRRRRRRRRRRRRRRR    RRRRRR', 64);
  fp[(18) - 1] = R.trunc('RRRRRRRRRREEEERRRRRRRRRRRRRRRRRRRR    RRRRRRRRRRRRRRRR    RRRRRR', 64);
  fp[(19) - 1] = R.trunc('RRRRRRRRREEEERRRRRRRRRRRRRRRRRRRRR    RRRRRRRRRRRRRRRR    RRRRRR', 64);
  fp[(20) - 1] = R.trunc('RRRRRRRREEEERRRRRRRRRRRRRRRRRRRRRR                        RRRRRR', 64);
  fp[(21) - 1] = R.trunc('RRRRRRR]]]]RRRRRRRRRRRRRRRRRRRRRRR                        RRRRRR', 64);
  fp[(22) - 1] = R.trunc('RRRRRR&&&&RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(23) - 1] = R.trunc('RRRRRLLLLRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidestairs = true;
  hidecreate = true;
}
function level23() {
  fp[(1) - 1] = R.trunc('~~~~ P  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(2) - 1] = R.trunc('~~~~ &  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(3) - 1] = R.trunc('~~~~    ~~~~~~~~~~~                            ~~~~~~~~~~~~~~~~~', 64);
  fp[(4) - 1] = R.trunc('~~~~    ~~~~~~~~~~~                            ~~~~~~~~~~~~~~~~~', 64);
  fp[(5) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~', 64);
  fp[(6) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~', 64);
  fp[(7) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~', 64);
  fp[(8) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~                ~~~~~', 64);
  fp[(9) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~                ~~~~~', 64);
  fp[(10) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    ~~~~~', 64);
  fp[(11) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    ~~~~~', 64);
  fp[(12) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    ~~~~~', 64);
  fp[(13) - 1] = R.trunc('~~~~    ~~~~~~~~~~~    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~    ~~~~~', 64);
  fp[(14) - 1] = R.trunc('~~~~    ~~~~~~~~~~~               ~~~~~                    ~~~~~', 64);
  fp[(15) - 1] = R.trunc('~~~~EEEE~~~~~~~~~~~               ~~~~~                    ~~~~~', 64);
  fp[(16) - 1] = R.trunc('~~~~    ~~~~~~~~~~~~~~~~~~~~~~    ~~~~~    ~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(17) - 1] = R.trunc('~~~~    ~~~~~~~~~~~~~~~~~~~~~~    ~~~~~    ~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(18) - 1] = R.trunc('~~~~    ~~~~~~~~~~~~~~~~~~~~~~    ~~~~~    ~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(19) - 1] = R.trunc('~~~~    ~~~~~~~~~~~~~~~~~~~~~~    ~~~~~    ~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(20) - 1] = R.trunc('~~~~    ~~~~~~~~~~~~~~~~~~~~~~    ~~~~~                        L', 64);
  fp[(21) - 1] = R.trunc('~~~~                              ~~~~~                        L', 64);
  fp[(22) - 1] = R.trunc('~~~~                          <[|"~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  fp[(23) - 1] = R.trunc('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidelevel = true;
}
function level24() {
  fp[(1) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(2) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(3) - 1] = R.trunc('VV--------------------------------~~---------------------VVVVVVV', 64);
  fp[(4) - 1] = R.trunc('VV--------------------------------~~---------------------VVVVVVV', 64);
  fp[(5) - 1] = R.trunc('VV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVV', 64);
  fp[(6) - 1] = R.trunc('VV----VVVVVVVVVVVVVVVVVCCVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVV', 64);
  fp[(7) - 1] = R.trunc('VV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV<[|"VV----VVVVVVV', 64);
  fp[(8) - 1] = R.trunc('VV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVV', 64);
  fp[(9) - 1] = R.trunc('VV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVV', 64);
  fp[(10) - 1] = R.trunc('VV-----E----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV----VCVVVVV', 64);
  fp[(11) - 1] = R.trunc('VV-----E----VVVVVVVVVVVVVV-----------------VVVVVVVVVV----VCVVVVV', 64);
  fp[(12) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV-----------------VVVVVVVVVV----VVVVVVV', 64);
  fp[(13) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVVVVVVV----VVVVVVVVVV----VVVVVVV', 64);
  fp[(14) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVCCVVVV----VVVVVVVVVV----VVVVVVV', 64);
  fp[(15) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVVVVVVV----VVVVVVVVVV----VVVVVVV', 64);
  fp[(16) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVVVVVVV----VVVVVVVVVV----VVVVVVV', 64);
  fp[(17) - 1] = R.trunc('VVVVVVVV-?--VVVVVVVVVVVVVV----VVVVVVVVV----VVVVCCVVVV----VVVVVVV', 64);
  fp[(18) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVVVVVVV----VVVVVVVVVV----VVVVVVV', 64);
  fp[(19) - 1] = R.trunc('VVVVVVVV----VVVVVVVVVVVVVV----VVVVVVVVV------------------VVVVVVV', 64);
  fp[(20) - 1] = R.trunc('P-----------VVVVVVVVVVVVVV----VVVVVVVVV------------------VVVVVVV', 64);
  fp[(21) - 1] = R.trunc('-----!------VVVVVVVVVVVVVV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(22) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVV----VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(23) - 1] = R.trunc('VVVVVVVVVVVVVVVVVVVVVVVVVVLLLLVVVVVVVVVVVVVVVtoo#h\xf9o\xf9tVVVVVVVVVV', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidestairs = true;
  lavaflow = true;
  lavarate = (15) << 16 >> 16;
}
function level25() {
  fp[(1) - 1] = R.trunc('&&-3 3CCCCK    ;      ;    P WW 4444444444444444444444444444444K', 64);
  fp[(2) - 1] = R.trunc('######4####################S####################################', 64);
  fp[(3) - 1] = R.trunc('<0[0|0"##\xf1\\\\\\\\\\##22222222)   N##C+++\xf5~                3333333333', 64);
  fp[(4) - 1] = R.trunc('0000000##\\\\\\\\MM##)))))))))    #######~888888888~~~~~~~~~~K~~~~~ ', 64);
  fp[(5) - 1] = R.trunc('MMMMMMM##\\\\MMMM##                                0    H\xf2~~~CC]I ', 64);
  fp[(6) - 1] = R.trunc('*******##\\MMMMM##     )RRR]                    ~~~~~~~~-~~~~~~~ ', 64);
  fp[(7) - 1] = R.trunc('MMMMMMM#######--      )BRRRR                   ...TTT...~~>@@@@ ', 64);
  fp[(8) - 1] = R.trunc('*******##K]-##        RRRR]                    ~~~~~~~~~~~~~~~~ ', 64);
  fp[(9) - 1] = R.trunc('MMMMMMM####0## G                          G                     ', 64);
  fp[(10) - 1] = R.trunc('\xf4\xf4\xf4\xf4\xf4\xf4\xf4##---##                                       @@@@@@@@@@@', 64);
  fp[(11) - 1] = R.trunc('7777777##0####                                       @2222222222', 64);
  fp[(12) - 1] = R.trunc('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO', 64);
  fp[(13) - 1] = R.trunc('5555555555555555555555555555555555555555555555555555555555555555', 64);
  fp[(14) - 1] = R.trunc('3333333333333333333333333333333333333333333333333333333333333333', 64);
  fp[(15) - 1] = R.trunc('3333333333333333333333333333333333333333333333333333333333333333', 64);
  fp[(16) - 1] = R.trunc('3333333333333333333333333333333K33333333333333333333333333333333', 64);
  fp[(17) - 1] = R.trunc('U-$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$', 64);
  fp[(18) - 1] = R.trunc('===========$   $    $      $       $       $    $   999#########', 64);
  fp[(19) - 1] = R.trunc('~~~~~~=+======   $    $  YYYYYYYYYYYYY              ##\xf6##K-U-3-U', 64);
  fp[(20) - 1] = R.trunc('DDDD~~=-==0-===          YY666666666YY  $    $    $ ##+######the', 64);
  fp[(21) - 1] = R.trunc('D~~D~~=-=-==-==    $     YY66VVVVV66YY              ##+#fountain', 64);
  fp[(22) - 1] = R.trunc('D~~D~~=0==-==-=$       $ YY66VVAVV66YY$    $    $   ##+#######of', 64);
  fp[(23) - 1] = R.trunc('\xf3~~----=--====0$    $    YY66VV&VV66YY  $    $     $##!####youth', 64);
  slow = '\x8f';
  medium = '\x99';
  fast = '\xea';
  convert_format();
  hidemblock = true;
  lavaflow = true;
  lavarate = (150) << 16 >> 16;
  hidecreate = true;
}
let parsed = new Int16Array(67);
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
  let $21;
  R.gotoxy(70, ypos$2);
  R.write('       ');
  strval = R.trunc(R.fmt(num$3, 0), 201);
  if (((ypos$2 === 2) && (score > 0))) {
    strval = R.trunc((strval + '0'), 201);
  }
  if ((ypos$2 === 11)) {
    $21 = whippower;
    if (($21 >= 0 && $21 <= 3)) {

    } else if (($21 >= 4 && $21 <= 5)) {
      strval = R.trunc((strval + '+'), 201);
    } else {
      strval = R.trunc((strval + '++'), 201);
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
  let $22, $23;
  if ((start <= stop)) {
    x$8 = start; $22 = stop;
    if (x$8 <= $22) for (;;) {
      R.sound(x$8);
      R.delay(speed);
      if (x$8 >= $22) break;
      x$8++;
    }
  } else {
    x$8 = start; $23 = stop;
    if (x$8 >= $23) for (;;) {
      R.sound(x$8);
      R.delay(speed);
      if (x$8 <= $23) break;
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
  let $24;
  $24 = what;
  if (($24 >= 1 && $24 <= 3)) {
    score = ((score + what)) | 0;
  } else if ($24 === 4 || $24 === 14) {
    if ((score > 2)) {
      score = ((score - 2)) | 0;
    }
  } else if ($24 === 5) {
    score = ((score + 1)) | 0;
  } else if ($24 === 6) {
    score = ((score + level)) | 0;
  } else if ($24 === 7) {
    score = ((score + 5)) | 0;
  } else if ($24 === 9) {
    score = ((score + 1)) | 0;
  } else if ($24 === 10) {
    score = ((score + 10)) | 0;
  } else if ($24 === 11) {
    score = ((score + 1)) | 0;
  } else if ($24 === 15) {
    score = ((score + 2)) | 0;
  } else if ($24 === 16) {
    if ((score > 5)) {
      score = ((score - 5)) | 0;
    }
  } else if ($24 === 22) {
    score = ((score + 25)) | 0;
  } else if ($24 === 20) {
    if ((score > level)) {
      score = ((score - Math.trunc(level / 2))) | 0;
    }
  } else if ($24 === 27) {
    score = ((score + 50)) | 0;
  } else if ($24 === 35) {
    score = ((score + (level * 2))) | 0;
  } else if ($24 === 36) {
    score = ((score + 50)) | 0;
  } else if ($24 === 38) {
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
  R.gotoxy(27, 3);
  R.write('THE FINAL CRUSADE OF KROZ');
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
  let $25, $26;
  R.gotoxy(1, 24);
  bc = ((R.random(8) + 8)) << 16 >> 16;
  bb = ((R.random(7) + 1)) << 16 >> 16;
  col(bc, 0);
  bak(bb, 7);
  i$2 = 1; $25 = 66;
  if (i$2 <= $25) for (;;) {
    R.gotoxy(i$2, 25);
    R.write('\xb2');
    R.gotoxy(i$2, 1);
    R.write('\xb2');
    if (i$2 >= $25) break;
    i$2++;
  }
  i$2 = 2; $26 = 24;
  if (i$2 <= $26) for (;;) {
    R.gotoxy(1, i$2);
    R.write('\xb2');
    R.gotoxy(66, i$2);
    R.write('\xb2');
    if (i$2 >= $26) break;
    i$2++;
  }
  bak(0, 0);
}
function restore_border() {
  let $27;
  R.gotoxy(2, 25);
  col(bc, 0);
  bak(bb, 7);
  x$7 = 1; $27 = 64;
  if (x$7 <= $27) for (;;) {
    R.write('\xb2');
    if (x$7 >= $27) break;
    x$7++;
  }
  bak(0, 0);
}
function init_screen() {
  let $28, $29;
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
  $28 = difficulty;
  if ($28 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($28 === 8) {
    gems = (25) << 16 >> 16;
    whips = (10) << 16 >> 16;
  } else if ($28 === 5) {
    gems = (18) << 16 >> 16;
  } else if ($28 === 2) {
    gems = (10) << 16 >> 16;
  }
  replacement = (0) << 16 >> 16;
  bonus = (0) << 16 >> 16;
  lavaflow = false;
  hiderock = false;
  hidestairs = false;
  hidelevel = false;
  hidecreate = false;
  hideopenwall = false;
  hidetrap = false;
  hidegems = false;
  hidemblock = false;
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
    foundset = R.setOf(0, 67);
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
  x$7 = 1; $29 = 9;
  if (x$7 <= $29) for (;;) {
    t[(x$7) - 1] = -(1);
    if (x$7 >= $29) break;
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
  let $30, $31, $32, $33, $34, $35, $36, $37, $38;
  R.nosound();
  clearkeys();
  bak(1, 0);
  bor(4);
  R.clrscr();
  cur(3);
  R.gotoxy(26, 1);
  col(4, 7);
  bak(1, 0);
  R.write('\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc');
  R.gotoxy(26, 3);
  R.write('\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf');
  R.gotoxy(25, 5);
  col(15, 15);
  R.write('An Apogee Software Production');
  R.gotoxy(28, 7);
  R.write('Created by Scott Miller');
  R.gotoxy(1, 9);
  col(11, 7);
  R.write('  Battered and worn from your last adventures in the vast kingdom of Kroz you' + '\r\n');
  R.write('  have decided to venture the underground just one last time.  Secret writing' + '\r\n');
  R.write('  reveals the presence of the most fantastic treasure of all waiting beneath.' + '\r\n');
  R.write('  So,  once again you grab your whip and crawl through the secret passageway.' + '\r\n');
  R.write('  Can you survive? Will the many traps and creatures finally take their toll?' + '\r\n');
  R.write('            In your heart you know you must go on, one last time...' + '\r\n');
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
      R.gotoxy(26, 2);
      col(R.random(16), 0);
      R.write(' THE FINAL CRUSADE OF KROZ ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($30 = R.upcase(ch).charCodeAt(0), $30 === 13 || $30 === 78 || $30 === 32 || $30 === 69 || $30 === 65 || $30 === 33)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x$7 = 1; $31 = 28;
  if (x$7 <= $31) for (;;) {
    R.write('  ');
    if (x$7 >= $31) break;
    x$7++;
  }
  col(30, 31);
  bak(1, 0);
  $32 = R.upcase(ch);
  if ($32 === 'N' || $32 === ' ' || $32 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($32 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($32 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($32 === '!') {
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
    R.gotoxy(26, 2);
    col(R.random(16), 0);
    R.write(' THE FINAL CRUSADE OF KROZ ');
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
    R.gotoxy(27, 2);
    R.write('THE FINAL CRUSADE OF KROZ');
    R.gotoxy(17, 4);
    col(6, 7);
    R.write('Copyright (c) 1990 Apogee Software Productions');
    R.gotoxy(6, 6);
    R.write('Version 1.0 -- Volume III of the Super Kroz Trilogy by Scott Miller');
    R.gotoxy(4, 8);
    col(2, 7);
    R.write('THIS GAME MAY NOT BE DISTRIBUTED BY SHAREWARE OR PUBLIC DOMAIN LIBRARIES,' + '\r\n');
    R.gotoxy(6, 9);
    R.write('NOR BULLETIN BOARD SYSTEMS.  ONLY ');
    col(10, 15);
    R.write('RETURN TO KROZ');
    col(2, 7);
    R.write(' MAY BE FREELY SHARED.' + '\r\n');
    R.gotoxy(1, 11);
    col(4, 7);
    x$7 = 1; $33 = 80;
    if (x$7 <= $33) for (;;) {
      R.write('\xc4');
      if (x$7 >= $33) break;
      x$7++;
    }
    col(14, 15);
    R.gotoxy(28, 13);
    R.write('B');
    col(11, 7);
    R.write('egin your descent into Kroz...');
    col(14, 15);
    R.gotoxy(28, 15);
    R.write('I');
    col(11, 7);
    R.write('nstructions');
    col(14, 15);
    R.gotoxy(28, 17);
    R.write('M');
    col(11, 7);
    R.write('arketing Kroz');
    col(14, 15);
    R.gotoxy(28, 19);
    R.write('S');
    col(11, 7);
    R.write('tory Behind Kroz');
    col(14, 15);
    R.gotoxy(28, 21);
    R.write('O');
    col(11, 7);
    R.write('riginal Kroz Trilogy');
    R.gotoxy(27, 24);
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
    $34 = R.upcase(ch);
    if ($34 === 'B') {
      x$7 = 40; $35 = 4;
      if (x$7 >= $35) for (;;) {
        y$3 = 100; $36 = 20;
        if (y$3 >= $36) for (;;) {
          R.sound((x$7 * y$3));
          R.delay(1);
          if (y$3 <= $36) break;
          y$3--;
        }
        if (x$7 <= $35) break;
        x$7--;
      }
      R.nosound();
      startgame = true;
    } else if ($34 === 'I') {
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
      R.write('   Crusade of Kroz is a game of exploration and survival.  Your journey will' + '\r\n');
      R.write(' take you through 20 very dangerous chambers, each riddled with diabolical' + '\r\n');
      R.write(' traps and hideous creatures.   Hidden in the deepest chamber lies the' + '\r\n');
      R.write(' a hidden treasure of immense value. Use the cursor pad to move 8 directions.' + '\r\n');
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
      R.write('   Crusade of Kroz will present you with many challenges. You will venture deep' + '\r\n');
      R.write(' underground and probably not make it out alive!' + '\r\n');
      R.write('' + '\r\n');
      R.write(' Hints:  * Don\'t forget to use the Home, End, PgUp, and PgDn keys to move your' + '\r\n');
      R.write('           on-screen character diagonally (along with the marked cursor keys).' + '\r\n');
      R.write('         * Use your player to touch each new object to find out about it.  When' + '\r\n');
      R.write('           you first touch an object a message appears at the bottom of the' + '\r\n');
      R.write('           screen that describes it.' + '\r\n');
      R.write('         * Collect keys to unlock doors, which usually block the stairs.' + '\r\n');
      R.write('         * The faster monsters are the most dangerous to touch--they will knock' + '\r\n');
      R.write('           off three of your valuable gems.  The slowest creatures only take a' + '\r\n');
      R.write('           single gem from you, and the medium speed monsters take two.' + '\r\n');
      R.write('         * Nearly every new level presents you with new objects to discover.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   To prove to you that this game CAN be completed, let me say (or brag) that I' + '\r\n');
      R.write(' have finished this game on the "Advanced" skill level, with over 90 gems and' + '\r\n');
      R.write(' 35 whips left to spare.  On the "Novice" level I can play and win one handed!' + '\r\n');
      R.write('   There\'s many secret tricks in this game that can help you, but even' + '\r\n');
      R.write(' without these hidden maneuvers you can complete The Final Crusade of Kroz.' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($34 === 'M') {
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
      R.write('   Crusade of Kroz is a user-supported game.  This means that the creator of' + '\r\n');
      R.write(' this program relies on the appreciation of honest players to pay the game\'s' + '\r\n');
      R.write(' minimal registration fee--$7.50.' + '\r\n');
      R.write('   Payment of this fee entitles you to all the free help and hints you might' + '\r\n');
      R.write(' need to enjoy the game.  All letters from registered users are answered' + '\r\n');
      R.write(' within two days.  (Try to get this kind of support from commercial games!)' + '\r\n');
      R.write('   Also, players can order the other Kroz sequels ONLY if this first' + '\r\n');
      R.write(' registration fee is paid.  ($7.50 each or $20 for all three games.)' + '\r\n');
      R.write('   Everyone who orders (or registers) all three of the Super Kroz Trilogy also' + '\r\n');
      R.write(' get a "Hints, Tricks and Scoring Secrets" guide, and "The Domain of Kroz" map.' + '\r\n');
      R.write('   A single Kroz game takes nearly six months to create, or, over 200 hours!' + '\r\n');
      R.write(' I can\'t afford to devote this much time without receiving something in return.' + '\r\n');
      R.write(' That is why I ask for this small fee, which is only necessary if you enjoy' + '\r\n');
      R.write(' this game.  In other words, try before you buy.' + '\r\n');
      R.write('   Even if you buy this game from a public domain or shareware library, I don\'t' + '\r\n');
      R.write(' receive any of that money.  You\'re simply paying for "storage, distribution,' + '\r\n');
      R.write(' disk, and handling".' + '\r\n');
      R.write('' + '\r\n');
      R.write('   -- Scott Miller, President, Apogee Software Productions' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($34 === 'S') {
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
      R.write('   Thanks to Terry Nagy, who spent countless hours play testing all six Kroz' + '\r\n');
      R.write(' games, and donated many valuable ideas. (Blame him for the game\'s difficulty!)' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($34 === 'O') {
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
      R.write('   The Lost Adventures of Kroz is the latest addition to the Kroz family of' + '\r\n');
      R.write(' games that will be ready by January 1, 1990.  It features 75 unique levels' + '\r\n');
      R.write(' with features never seen in a Kroz game before.  The $22 price includes P&H.' + '\r\n');
      R.write('   The original three Kroz games were such a tremendous success, which is why' + '\r\n');
      R.write(' I created this second "Super Kroz" trilogy.  The first three original Kroz' + '\r\n');
      R.write(' games are:   * Kingdom of Kroz  * Caverns of Kroz  * Dungeons of Kroz.' + '\r\n');
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
      flash(27, 25, 'Press any key to continue.');
    } else {
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
  let $39, $40, $41, $42, $43, $44, $45, $46, $47, $48;
  clearkeys();
  R.window(2, 2, (64 + 1), (23 + 1));
  bak(0, 0);
  R.clrscr();
  R.window(1, 1, 80, 25);
  cur(3);
  R.assign(hsfile, 'CRUSADE.HS');
  R.reset(hsfile);
  if ((R.ioresult() !== 0)) {
    R.rewrite(hsfile);
    x$9 = 1; $39 = 15;
    if (x$9 <= $39) for (;;) {
      $40 = (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 });
      $41 = x$9;
      if ($41 === 1) {
        $40.name = R.trunc('Scott Miller', 15);
        $40.highscore = (8602) | 0;
        $40.highlevel = (7) | 0;
      } else if ($41 === 2) {
        $40.name = R.trunc('J. T. Kirk', 15);
        $40.highscore = (4017) | 0;
        $40.highlevel = (4) | 0;
      } else {
        $40.name = R.trunc('-----', 15);
        $40.highscore = (0) | 0;
        $40.highlevel = (0) | 0;
      }
      R.fwrite(hsfile, (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 >= $39) break;
      x$9++;
    }
    R.close(hsfile);
  }
  col(9, 9);
  R.gotoxy(22, 3);
  R.write('THE FINAL CRUSADE OF KROZ');
  col(11, 7);
  R.gotoxy(16, 5);
  R.write('NAME');
  R.gotoxy(33, 5);
  R.write('HIGH SCORE');
  R.gotoxy(49, 5);
  R.write('LEVEL');
  R.reset(hsfile);
  x$9 = 1; $42 = 15;
  if (x$9 <= $42) for (;;) {
    hslist[(x$9) - 1] = R.clone(R.fread(hsfile));
    if (x$9 >= $42) break;
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
    x$9 = 15; $43 = place;
    if (x$9 >= $43) for (;;) {
      hslist[(x$9) - 1] = R.clone((hslist[((x$9 - 1)) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 <= $43) break;
      x$9--;
    }
  }
  $44 = (hslist[(place) - 1] || { name: '', highscore: 0, highlevel: 0 });
  $44.name = R.trunc('', 15);
  $44.highscore = (score) | 0;
  $44.highlevel = (level) | 0;
  x$9 = 1; $45 = 15;
  if (x$9 <= $45) for (;;) {
    if (((x$9 & 1) !== 0)) {
      col(12, 7);
    } else {
      col(13, 7);
    }
    $46 = (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 });
    R.gotoxy(13, (x$9 + 6));
    R.write(R.fmt(x$9, 2));
    R.gotoxy(16, (x$9 + 6));
    R.write($46.name);
    R.gotoxy(36, (x$9 + 6));
    R.write(String($46.highscore));
    if (($46.highscore > 0)) {
      R.write('0');
    }
    R.gotoxy(50, (x$9 + 6));
    R.write(String($46.highlevel));
    if (x$9 >= $45) break;
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
    x$9 = 1; $47 = 15;
    if (x$9 <= $47) for (;;) {
      R.fwrite(hsfile, (hslist[(x$9) - 1] || { name: '', highscore: 0, highlevel: 0 }));
      if (x$9 >= $47) break;
      x$9++;
    }
    R.close(hsfile);
  }
  bak(0, 0);
  R.gotoxy(15, 23);
  R.write('                                   ');
  x$9 = 1; $48 = 999;
  if (x$9 <= $48) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    bx[(x$9) - 1] = 0;
    by[(x$9) - 1] = 0;
    if (x$9 >= $48) break;
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
      R.write('You\'ve completed THE FINAL CRUSADE OF KROZ!' + '\r\n');
    } else {
      R.gotoxy(17, 2);
      R.write('THE FINAL CRUSADE OF KROZ' + '\r\n');
    }
    sign_off();
  }
}
function won() {
  border();
  clearkeys();
  col(16, 31);
  bak(bb, 0);
  print(8, 1, 'YOUR QUEST FOR THE FOUNTAIN OF YOUTH WAS SUCCESSFUL!');
  bak(0, 0);
  high_score(false);
}
function dead(deaddot) {
  let $49;
  if ((gems > 9)) {
    col(4, 7);
  } else {
    gems = (0) << 16 >> 16;
    col(20, 23);
  }
  bak(7, 0);
  R.gotoxy(71, 8);
  R.write('     ');
  strval = R.trunc(R.fmt(gems, 0), 201);
  R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
  R.write(strval);
  bak(0, 0);
  if (deaddot) {
    x$7 = 150; $49 = 5;
    if (x$7 >= $49) for (;;) {
      R.gotoxy(px, py);
      col(x$7, x$7);
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound((x$7 * x$7));
      if (x$7 <= $49) break;
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
  let $50;
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
    ($50 = R.val(fetch), parsed[(counter$2) - 1] = $50[0], test = ($50[1]) << 16 >> 16);
    slot = ((slot + 3)) << 16 >> 16;
    counter$2 = ((counter$2 + 1)) << 16 >> 16;
  } while (!((counter$2 > 67)));
}
function create_playfield() {
  let x$10 = 0;
  let y$4 = 0;
  let obj = 0;
  let loop$2 = 0;
  let xspot = 0;
  let yspot = 0;
  let $51, $52, $53, $54, $55, $56;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$10 = 1; $51 = 999;
  if (x$10 <= $51) for (;;) {
    bx[(x$10) - 1] = 0;
    by[(x$10) - 1] = 0;
    sx[(x$10) - 1] = 0;
    sy[(x$10) - 1] = 0;
    mx[(x$10) - 1] = 0;
    my[(x$10) - 1] = 0;
    fx[(x$10) - 1] = 0;
    fy[(x$10) - 1] = 0;
    if (x$10 >= $51) break;
    x$10++;
  }
  new_gem_color();
  x$10 = 2; $52 = 65;
  if (x$10 <= $52) for (;;) {
    y$4 = 2; $53 = 24;
    if (y$4 <= $53) for (;;) {
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      if (y$4 >= $53) break;
      y$4++;
    }
    if (x$10 >= $52) break;
    x$10++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $54 = 67;
  if (obj <= $54) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $55 = parsed[(obj) - 1];
      if (loop$2 <= $55) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $56 = obj;
            if ($56 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($56 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($56 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            } else if ($56 === 36) {
              gennum = ((gennum + 1)) << 16 >> 16;
            } else if ($56 === 38) {
              bnum = ((bnum + 1)) << 16 >> 16;
              bx[(bnum) - 1] = xspot;
              by[(bnum) - 1] = yspot;
            } else if ($56 === 46) {
              t[(9) - 1] = 32000;
            }
          }
        } while (!(done));
        if (loop$2 >= $55) break;
        loop$2++;
      }
    }
    if (obj >= $54) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $57, $58, $59;
  xloop$2 = 2; $57 = 65;
  if (xloop$2 <= $57) for (;;) {
    yloop$2 = 2; $58 = 24;
    if (yloop$2 <= $58) for (;;) {
      if (((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0) && !(hidelevel))) {
        R.gotoxy(xloop$2, yloop$2);
        $59 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($59 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($59 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($59 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($59 === 4) {
          col(6, 7);
          R.write('\xb2');
        } else if ($59 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($59 === 6) {
          if (!(hidestairs)) {
            bak(7, 7);
            col(16, 16);
            R.write('\xf0');
            bak(0, 0);
          }
        } else if ($59 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($59 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($59 === 9) {
          if (!(hidegems)) {
            col(gemcolor, 7);
            R.write('\x04');
          }
        } else if ($59 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($59 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($59 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($59 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($59 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($59 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($59 === 16) {
          if (!(hidetrap)) {
            if ((R.random(120) === 0)) {
              col(15, 7);
              R.write('?');
            } else {
              col(7, 7);
              R.write('\xf9');
            }
          }
        } else if ($59 === 17) {
          col(9, 0);
          bak(1, 7);
          R.write('\xf7');
          bak(0, 0);
        } else if ($59 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            bak(0, 0);
            R.write('\x09');
          }
        } else if ($59 === 19) {
          col(6, 0);
          bak(2, 7);
          R.write('\xb0');
          bak(0, 0);
        } else if ($59 === 20) {
          col(6, 0);
          bak(2, 7);
          R.write('\xb1');
          bak(0, 0);
        } else if ($59 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($59 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($59 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($59 === 24) {
          col(15, 15);
          bak(4, 0);
          R.write('\x03');
          bak(0, 0);
        } else if ($59 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($59 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($59 === 27) {
          col(artcolor, 7);
          R.write('\x0f');
        } else if ($59 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($59 === 29) {

        } else if ($59 === 30) {

        } else if ($59 === 31) {

        } else if ($59 === 32) {

        } else if ($59 === 33) {

        } else if ($59 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($59 === 35) {
          if (!(hidecreate)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($59 === 36) {
          col(30, 31);
          R.write('\x06');
        } else if ($59 === 37) {

        } else if ($59 === 38) {
          if (!(hidemblock)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($59 === 39 || $59 === 67) {

        } else if ($59 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($59 === 41) {

        } else if ($59 === 42) {
          col(9, 7);
          R.write('\xfe');
        } else if ($59 === 43) {
          col(6, 7);
          R.write('\xb2');
        } else if ($59 === 44) {

        } else if ($59 === 45) {
          col(15, 7);
          R.write('?');
        } else if ($59 === 46) {
          col(31, 23);
          R.write('\x01');
        } else if ($59 === 48) {
          col(14, 7);
          R.write('K');
        } else if ($59 === 49) {
          col(14, 7);
          R.write('R');
        } else if ($59 === 50) {
          col(14, 7);
          R.write('O');
        } else if ($59 === 51) {
          col(14, 7);
          R.write('Z');
        } else if ($59 === 52 || $59 === 53) {
          col(6, 7);
          R.write('\xdb');
        } else if ($59 === 54) {
          col(7, 7);
          R.write('\xdb');
        } else if (($59 >= 55 && $59 <= 57)) {

        } else if (($59 >= 58 && $59 <= 60)) {
          if (!(hideopenwall)) {
            col(11, 7);
            R.write('\x7f');
          }
        } else if (($59 >= 61 && $59 <= 63)) {

        } else if ($59 === 64) {
          col(7, 7);
          R.write('\xb2');
        } else if ($59 === 65) {
          if (!(hiderock)) {
            col(7, 7);
            R.write('O');
          }
        } else if ($59 === 66) {
          col(12, 0);
          bak(4, 7);
          R.write('X');
          bak(0, 0);
        } else if ($59 === 47) {
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
      if (yloop$2 >= $58) break;
      yloop$2++;
    }
    if (xloop$2 >= $57) break;
    xloop$2++;
  }
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $60;
    R.sound(540);
    R.delay(40);
    x$7 = 1; $60 = 4;
    if (x$7 <= $60) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x$7 >= $60) break;
      x$7++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $61, $62;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($61 = key.charCodeAt(0), $61 === 72 || $61 === 80 || $61 === 77 || $61 === 75 || $61 === 71 || $61 === 79 || $61 === 73 || $61 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $62 = key.charCodeAt(0);
      if ($62 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($62 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($62 === 119 || $62 === 87) {
        $result = (87) & 255;
      } else if ($62 === 116 || $62 === 84) {
        $result = (84) & 255;
      } else if ($62 === 112 || $62 === 80) {
        $result = (80) & 255;
      } else if ($62 === 113 || $62 === 81) {
        $result = (81) & 255;
      } else if ($62 === 115 || $62 === 83) {
        $result = (83) & 255;
      } else if ($62 === 114 || $62 === 82) {
        $result = (82) & 255;
      } else if ($62 === 117 || $62 === 85) {
        $result = (171) & 255;
      } else if ($62 === 105 || $62 === 73) {
        $result = (172) & 255;
      } else if ($62 === 111 || $62 === 79) {
        $result = (173) & 255;
      } else if ($62 === 106 || $62 === 74) {
        $result = (175) & 255;
      } else if ($62 === 107 || $62 === 75) {
        $result = (177) & 255;
      } else if ($62 === 110 || $62 === 78) {
        $result = (179) & 255;
      } else if ($62 === 109 || $62 === 77) {
        $result = (180) & 255;
      } else if ($62 === 44) {
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
  let $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76;
  thing = String.fromCharCode(pf[(x$11) * 25 + (y$5) - 26]);
  bak(0, 0);
  i$3 = 1; $63 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $63) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$11, y$5);
    R.write(ch$2);
    if (i$3 >= $63) break;
    i$3++;
  }
  R.gotoxy(x$11, y$5);
  $64 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($64 >= 1 && $64 <= 3)) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($64 === 4 || $64 === 19 || $64 === 20) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $65 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($65 === 4) {
      thing = '\xb2';
    } else if ($65 === 19) {
      thing = '\xb0';
    } else if ($65 === 20) {
      thing = '\xb1';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $66 = 20;
      if (i$3 >= $66) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $66) break;
        i$3--;
      }
      R.sound(90);
    } else {
      R.sound(130);
      R.delay(25);
      R.sound(90);
      col(6, 7);
      if (($67 = thing.charCodeAt(0), $67 === 176 || $67 === 177)) {
        col(6, 0);
        bak(2, 7);
      }
      R.write(thing);
      if (($68 = thing.charCodeAt(0), $68 === 176 || $68 === 177)) {
        bak(0, 0);
      }
    }
  } else if ($64 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($64 === 10 || $64 === 15 || $64 === 16 || $64 === 18 || $64 === 36 || ($64 >= 48 && $64 <= 51)) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $69 = 20;
      if (i$3 >= $69) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $69) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($64 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($64 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($64 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($64 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($64 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($64 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($64 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($64 === 14 || $64 === 52 || $64 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($64 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($64 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($64 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($64 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($64 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($64 === 24) {
    col(15, 15);
    bak(4, 0);
    R.write('\x03');
    bak(0, 0);
  } else if ($64 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($64 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($64 === 27) {
    col(artcolor, 7);
    R.write('\x0f');
  } else if (($64 >= 28 && $64 <= 31) || $64 === 33 || $64 === 37 || $64 === 39 || $64 === 41 || $64 === 44 || $64 === 67) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($64 === 32) {
    pf[(x$11) * 25 + (y$5) - 26] = 0;
    R.write(' ');
  } else if ($64 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($64 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($64 === 42) {
    col(9, 7);
    R.write('\xfe');
  } else if ($64 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($64 >= 58 && $64 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($64 === 66) {
    col(12, 0);
    bak(4, 7);
    R.write('X');
    bak(0, 0);
  } else if ($64 === 47 || ($64 >= 55 && $64 <= 57) || ($64 >= 61 && $64 <= 63)) {
    R.write(' ');
  } else if ($64 === 46) {
    i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $70 = 20;
    if (i$3 >= $70) for (;;) {
      R.sound(R.random(i$3));
      if (i$3 <= $70) break;
      i$3--;
    }
    R.sound(90);
    if ((R.random(50) < whippower)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = 1; $71 = 32000;
      if (i$3 <= $71) for (;;) {
        R.sound(R.random(5000));
        if (i$3 >= $71) break;
        i$3++;
      }
      i$3 = 18900; $72 = 20;
      if (i$3 >= $72) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $72) break;
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
  } else if ($64 === 65) {
    if ((R.random(25) < whippower)) {
      R.write(' ');
      pf[(x$11) * 25 + (y$5) - 26] = 0;
      i$3 = ((+(fastpc) * 8700) + (+(!(fastpc)) * 5300)); $73 = 20;
      if (i$3 >= $73) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $73) break;
        i$3--;
      }
      R.sound(90);
      score = ((score + 100)) | 0;
      update_info();
    } else {
      i$3 = ((+(fastpc) * 4700) + (+(!(fastpc)) * 2300)); $74 = 20;
      if (i$3 >= $74) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $74) break;
        i$3--;
      }
      R.sound(90);
      col(7, 7);
      R.write('O');
    }
  } else if ($64 === 38 || $64 === 43 || $64 === 64) {
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
  } else if ($64 === 0) {
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
function tablet_message(level$2) {
  let $77;
  $77 = level$2;
  if ($77 === 1) {
    flash(12, 25, 'Search carefully the room below, Adventurer!');
  } else if ($77 === 3) {
    flash(7, 25, 'Use the "Boulder", Luke!  (Creatures don\'t like them!)');
  } else if ($77 === 5) {
    flash(7, 25, 'Be wary, Adventurer, for not all creatures can be seen!');
  } else if ($77 === 7) {
    flash(10, 25, 'Adventurer, sometimes Gems can be crystal clear!');
  } else if ($77 === 9) {
    flash(9, 25, 'Ah ha, Adventurer, you fell for the obvious trap!');
  } else if ($77 === 11) {
    flash(7, 25, 'You\'ve done well..so far.  But you shall not succeed!');
  } else if ($77 === 13) {
    flash(8, 25, 'Invisible creatures patrol this area...stay guarded!');
  } else if ($77 === 15) {
    flash(9, 25, 'Cross the lava if you dare:  you\'ll lose 20 Gems!');
  } else if ($77 === 17) {
    flash(7, 25, 'Things are never as they appear--look for the hidden.');
  } else if ($77 === 19) {
    flash(7, 25, 'Stay on the trail, Adventurer, if you wish to succeed!');
  } else if ($77 === 20) {
    flash(9, 25, 'You\'ve finally discovered "The Fountain of Youth!"');
  } else if ($77 === 21) {
    flash(7, 25, 'Follow the secret passage, Adventurer--or die trying!');
  } else if ($77 === 22) {
    flash(7, 25, 'Are you sure you kwow where you\'re going, Adventurer?');
  } else if ($77 === 24) {
    flash(11, 25, 'Act quickly, or be forever trapped in Lava!!!');
  } else if ($77 === 25) {
    flash(6, 25, 'So close, Adventurer.  (The top, left corner might help.)');
  }
}
function move(xway, yway) {
  let killed = 0;
  let rx = 0;
  let ry = 0;
  let rxway = 0;
  let ryway = 0;
  let trycounter = 0;
  let spot = 0;
  let original = 0;
  let nogo = false;
  function go() {
    let $78;
    pf[(px) * 25 + (py) - 26] = replacement;
    R.gotoxy(px, py);
    R.write(' ');
    px = ((px + xway)) << 16 >> 16;
    py = ((py + yway)) << 16 >> 16;
    if (($78 = pf[(px) * 25 + (py) - 26], ($78 >= 55 && $78 <= 57))) {
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
  function moverock() {
    let $79;
    i$2 = 1; $79 = ((+(fastpc) * 500) + (+(!(fastpc)) * 330));
    if (i$2 <= $79) for (;;) {
      R.sound((R.random(100) + 20));
      R.delay(1);
      if (i$2 >= $79) break;
      i$2++;
    }
    R.nosound();
    R.gotoxy((px + xway), (py + yway));
    col(0, 0);
    R.write(' ');
    R.gotoxy(rx, ry);
    col(7, 7);
    R.write('O');
    pf[(rx) * 25 + (ry) - 26] = 65;
    go();
    skiptime = (3001) << 16 >> 16;
  }
  let $80, $81, $82, $83, $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131, $132, $133, $134, $135, $136, $137, $138, $139, $140, $141, $142, $143, $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155, $156, $157, $158, $159, $160, $161, $162, $163, $164, $165, $166, $167, $168, $169, $170, $171, $172, $173, $174, $175, $176, $177, $178, $179, $180, $181, $182, $183, $184, $185;
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
  $80 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
  if ($80 === 0) {
    go();
  } else if (($80 >= 1 && $80 <= 3)) {
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
  } else if ($80 === 4 || $80 === 43 || $80 === 64) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, 4))) {
      foundset = R.union(foundset, R.setOf(4, 4));
      flash(18, 25, 'A Crumbled Wall blocks your way.');
    }
  } else if ($80 === 5) {
    go();
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($80 === 6) {
    go();
    clearkeys();
    if ((level === 25)) {
      footstep();
      R.delay(300);
      footstep();
      R.delay(300);
      footstep();
      x$7 = 1; $81 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
      if (x$7 <= $81) for (;;) {
        R.sound((R.random(3000) + x$7));
        R.gotoxy(px, py);
        bak(R.random(8), 0);
        col(14, 15);
        R.write('\x02');
        col(R.random(16), R.random(16));
        bak(0, 0);
        print(15, 25, 'Oh no, something strange is happening!');
        if (x$7 >= $81) break;
        x$7++;
      }
      i$2 = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $82 = 20;
      if (i$2 >= $82) for (;;) {
        R.sound(R.random(i$2));
        if (i$2 <= $82) break;
        i$2--;
      }
      col(14, 15);
      bak(0, 0);
      x$7 = 1; $83 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
      if (x$7 <= $83) for (;;) {
        R.sound((x$7 * 3));
        R.gotoxy(px, py);
        R.write(String.fromCharCode(((220 + R.random(4))) & 255));
        if (x$7 >= $83) break;
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
      i$2 = 1; $84 = gems;
      if (i$2 <= $84) for (;;) {
        R.sound(((i$2 * 8) + 100));
        score = ((score + 10)) | 0;
        update_info();
        R.delay(20);
        if (i$2 >= $84) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(15, 25, 'Your Whips are worth 100 points each...');
      i$2 = 1; $85 = whips;
      if (i$2 <= $85) for (;;) {
        R.sound(((i$2 * 10) + 200));
        score = ((score + 10)) | 0;
        update_info();
        R.delay(20);
        if (i$2 >= $85) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
      i$2 = 1; $86 = teleports;
      if (i$2 <= $86) for (;;) {
        R.sound(((i$2 * 12) + 300));
        score = ((score + 20)) | 0;
        update_info();
        R.delay(30);
        if (i$2 >= $86) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      col(15, 15);
      bak(0, 0);
      print(14, 25, 'Your Keys are worth 10,000 points each...');
      i$2 = 1; $87 = keys;
      if (i$2 <= $87) for (;;) {
        R.sound(((i$2 * 30) + 100));
        score = ((score + 1000)) | 0;
        update_info();
        R.delay(50);
        if (i$2 >= $87) break;
        i$2++;
      }
      R.nosound();
      ch = R.readKbd();
      restore_border();
      clearkeys();
      bak(gemcolor, 7);
      x$7 = 1; $88 = 30;
      if (x$7 <= $88) for (;;) {
        R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
        R.clrscr();
        if (x$7 >= $88) break;
        x$7++;
      }
      bak(0, 0);
      x$7 = 1; $89 = 30;
      if (x$7 <= $89) for (;;) {
        R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
        R.clrscr();
        R.sound((x$7 * 45));
        if (x$7 >= $89) break;
        x$7++;
      }
      R.nosound();
      R.window(1, 1, 80, 25);
      cur(3);
      bak(1, 0);
      R.window(2, 2, 65, 24);
      R.clrscr();
      col(14, 9);
      R.gotoxy(25, 2);
      R.write('THE END OF KROZ?' + '\r\n');
      R.gotoxy(25, 3);
      R.write('\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4\xc4' + '\r\n');
      R.write('' + '\r\n');
      col(15, 7);
      R.write('   As you were magically lifted from the lower depths of Kroz' + '\r\n');
      R.write(' you noticed a possible new tunnel.  You make a mental note' + '\r\n');
      R.write(' to look into this matter at a later time.  You realize' + '\r\n');
      R.write(' no one else could survive the kingdom of Kroz--which means' + '\r\n');
      R.write(' it\'s up to you!  (It\'s a tough job, but it\'s a living.)' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Meanwhile, you drink from the the cup of water you collected' + '\r\n');
      R.write(' from the magical Fountain.  Health is restored to your beaten' + '\r\n');
      R.write(' body.  You feel young again.  Vibrant and charged with energy' + '\r\n');
      R.write(' you head back to your village hut to examine the findings from' + '\r\n');
      R.write(' this latest expedition--and to plot out your next journey into' + '\r\n');
      R.write(' the vast underground of Kroz.' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Afterall, you can\'t keep a good adventurer down! (Or up?)' + '\r\n');
      R.write('' + '\r\n');
      R.write('' + '\r\n');
      col(11, 15);
      R.write('   Coming by January 1, 1990:  THE LOST ADVENTURES OF KROZ' + '\r\n');
      R.write('                               75 all-new levels, $20 + $2' + '\r\n');
      R.write('' + '\r\n');
      R.write('   Thank you for exploring my games.   -- Scott Miller');
      clearkeys();
      R.window(1, 1, 80, 25);
      bak(0, 0);
      flash(21, 25, 'Press any key, Adventurer.');
      won();
    }
    if (mixup) {
      level = ((R.random(17) + 2)) << 16 >> 16;
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
    foundset = R.diff(foundset, R.setOf(0, 0, 8, 8, 13, 13, 15, 15, 17, 17, 19, 21, 22, 22, 26, 26, 28, 28, 36, 36, 66, 66));
    gennum = (0) << 16 >> 16;
    lavaflow = false;
    hidelevel = false;
    hideopenwall = false;
    hiderock = false;
    hidestairs = false;
    hidegems = false;
    hidemblock = false;
    hidetrap = false;
    hidecreate = false;
    bonus = (0) << 16 >> 16;
    $90 = level;
    if ($90 === 1) {
      level1();
    } else if ($90 === 3) {
      level3();
    } else if ($90 === 5) {
      level5();
    } else if ($90 === 7) {
      level7();
    } else if ($90 === 9) {
      level9();
    } else if ($90 === 11) {
      level11();
    } else if ($90 === 13) {
      level13();
    } else if ($90 === 15) {
      level15();
    } else if ($90 === 17) {
      level17();
    } else if ($90 === 19) {
      level19();
    } else if ($90 === 20) {
      level20();
    } else if ($90 === 21) {
      level21();
    } else if ($90 === 22) {
      level22();
    } else if ($90 === 23) {
      level23();
    } else if ($90 === 24) {
      level24();
    } else if ($90 === 25) {
      level25();
    } else {
      create_playfield();
    }
    if ((level === 2)) {
      hidetrap = true;
    }
    if ((level === 6)) {
      slow = '\x8e';
    }
    if ((level === 8)) {
      hidelevel = true;
    }
    if ((level === 10)) {
      lavaflow = true;
      lavarate = (50) << 16 >> 16;
    }
    footstep();
    bak(gemcolor, 7);
    x$7 = 1; $91 = 30;
    if (x$7 <= $91) for (;;) {
      R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
      R.clrscr();
      if (x$7 >= $91) break;
      x$7++;
    }
    bak(0, 0);
    x$7 = 1; $92 = 30;
    if (x$7 <= $92) for (;;) {
      R.window((32 - x$7), (12 - Math.trunc(x$7 / 3)), (35 + x$7), (14 + Math.trunc(x$7 / 3)));
      R.clrscr();
      R.sound((x$7 * 45));
      if (x$7 >= $92) break;
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
    x$7 = 1; $93 = 600;
    if (x$7 <= $93) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x$7 / 2));
      if (x$7 >= $93) break;
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
    if (((level === 20) || (level === 25))) {
      flash(9, 25, 'You\'ve finally reached the deepest chamber of Kroz!');
    } else {
      flash(17, 25, 'Press any key to begin this level.');
    }
  } else if ($80 === 7) {
    go();
    xb = 3; $94 = 42;
    if (xb <= $94) for (;;) {
      yb = 3; $95 = 42;
      if (yb <= $95) for (;;) {
        R.sound((xb * yb));
        R.delay(1);
        if (yb >= $95) break;
        yb++;
      }
      if (xb >= $94) break;
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
  } else if ($80 === 8) {
    go();
    addscore(5);
    x$7 = 7; $96 = 1;
    if (x$7 >= $96) for (;;) {
      R.sound(((x$7 * 50) + 300));
      R.delay(((x$7 * 10) + 40));
      if (x$7 <= $96) break;
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
      flash(18, 25, 'You activated a Slow Time spell.');
    }
  } else if ($80 === 9) {
    go();
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($80 === 10) {
    go();
    addscore(10);
    x$7 = 1; $97 = 4;
    if (x$7 <= $97) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x$7 >= $97) break;
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
  } else if ($80 === 11) {
    go();
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($80 === 12) {
    go();
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($80 === 13) {
    if ((keys < 1)) {
      x$7 = 1; $98 = 15;
      if (x$7 <= $98) for (;;) {
        R.sound((R.random(99) + 30));
        R.delay(15);
        R.nosound();
        R.delay(15);
        if (x$7 >= $98) break;
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
      x$7 = 10; $99 = 90;
      if (x$7 <= $99) for (;;) {
        R.sound(x$7);
        R.delay(15);
        if (x$7 >= $99) break;
        x$7++;
      }
      clearkeys();
      go();
      if ((((level === 30) && (px === 53)) && (py === 13))) {
        flash(17, 25, 'You have found the magical Staff!');
      }
    }
  } else if ($80 === 14 || $80 === 17) {
    if ((pf[((px + xway)) * 25 + ((py + yway)) - 26] === 14)) {
      blocksound();
    } else {
      x$7 = 1; $100 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
      if (x$7 <= $100) for (;;) {
        R.sound((R.random(((x$7 * 2) + 200)) + x$7));
        if (x$7 >= $100) break;
        x$7++;
      }
      R.nosound();
    }
    addscore(14);
    clearkeys();
    if (!(R.inSet(foundset, pf[((px + xway)) * 25 + ((py + yway)) - 26]))) {
      foundset = R.union(foundset, R.setOf(pf[((px + xway)) * 25 + ((py + yway)) - 26], pf[((px + xway)) * 25 + ((py + yway)) - 26]));
      $101 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
      if ($101 === 14) {
        flash(20, 25, 'A Solid Wall blocks your way.');
      } else if ($101 === 17) {
        flash(18, 25, 'You cannot travel through Water.');
      }
    }
  } else if ($80 === 15) {
    go();
    addscore(15);
    x$7 = 1; $102 = 7;
    if (x$7 <= $102) for (;;) {
      R.sound(((x$7 * 50) + 300));
      R.delay(((x$7 * 10) + 40));
      if (x$7 >= $102) break;
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
      flash(18, 25, 'You activated a Speed Time spell.');
    }
  } else if ($80 === 16) {
    go();
    addscore(16);
    x$7 = 1; $103 = 500;
    if (x$7 <= $103) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $103) break;
      x$7++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $104 = 1;
    if (yb >= $104) for (;;) {
      x$7 = 550; $105 = 20;
      if (x$7 >= $105) for (;;) {
        R.sound((yb * x$7));
        if (x$7 <= $105) break;
        x$7--;
      }
      if (yb <= $104) break;
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
    x$7 = 1; $106 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x$7 <= $106) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $106) break;
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
  } else if ($80 === 18) {
    go();
    whippower = ((whippower + 1)) << 16 >> 16;
    addscore(15);
    x$7 = 3; $107 = 35;
    if (x$7 <= $107) for (;;) {
      y$3 = 45; $108 = 52;
      if (y$3 <= $108) for (;;) {
        R.sound((x$7 * y$3));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y$3 >= $108) break;
        y$3++;
      }
      if (x$7 >= $107) break;
      x$7++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    flash(22, 25, 'An increase Whip Power Ring!');
  } else if ($80 === 19 || $80 === 20) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, pf[((px + xway)) * 25 + ((py + yway)) - 26]))) {
      foundset = R.union(foundset, R.setOf(pf[((px + xway)) * 25 + ((py + yway)) - 26], pf[((px + xway)) * 25 + ((py + yway)) - 26]));
      $109 = pf[((px + xway)) * 25 + ((py + yway)) - 26];
      if ($109 === 19) {
        flash(14, 25, 'You cannot travel through forest terrain.');
      } else if ($109 === 20) {
        flash(24, 25, 'A tree blocks your way.');
      }
    }
  } else if ($80 === 21) {
    go();
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i$2 = 70; $110 = 600;
    if (i$2 <= $110) for (;;) {
      R.sound((i$2 * 2));
      R.delay(3);
      if (i$2 >= $110) break;
      i$2++;
    }
    bor(14);
    i$2 = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $111 = 20;
    if (i$2 >= $111) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $111) break;
      i$2--;
    }
    width = 1; $112 = 4;
    if (width <= $112) for (;;) {
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
      x$7 = (px - xl); $113 = (px + xr);
      if (x$7 <= $113) for (;;) {
        y$3 = (py - yl); $114 = (py + yr);
        if (y$3 <= $114) for (;;) {
          if (($115 = pf[(x$7) * 25 + (y$3) - 26], ($115 >= 0 && $115 <= 4) || $115 === 13 || $115 === 16 || $115 === 19 || ($115 >= 28 && $115 <= 32) || $115 === 35 || ($115 >= 36 && $115 <= 39) || $115 === 43 || $115 === 45 || ($115 >= 48 && $115 <= 51) || $115 === 64)) {
            R.gotoxy(x$7, y$3);
            col(12, 15);
            R.write('\xdb');
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
    R.delay(100);
    width = 1; $116 = 4;
    if (width <= $116) for (;;) {
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
      x$7 = (px - xl); $117 = (px + xr);
      if (x$7 <= $117) for (;;) {
        y$3 = (py - yl); $118 = (py + yr);
        if (y$3 <= $118) for (;;) {
          if (($119 = pf[(x$7) * 25 + (y$3) - 26], ($119 >= 0 && $119 <= 4) || $119 === 13 || $119 === 16 || $119 === 19 || ($119 >= 28 && $119 <= 32) || $119 === 35 || ($119 >= 36 && $119 <= 39) || $119 === 43 || $119 === 45 || ($119 >= 48 && $119 <= 51) || $119 === 64)) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            if (($120 = pf[(x$7) * 25 + (y$3) - 26], ($120 >= 1 && $120 <= 3))) {
              score = ((score + pf[(x$7) * 25 + (y$3) - 26])) | 0;
            }
            pf[(x$7) * 25 + (y$3) - 26] = 0;
          }
          if (y$3 >= $118) break;
          y$3++;
        }
        if (x$7 >= $117) break;
        x$7++;
      }
      if (width >= $116) break;
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
  } else if ($80 === 22) {
    go();
    gems = ((gems - 10)) << 16 >> 16;
    x$7 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $121 = 20;
    if (x$7 >= $121) for (;;) {
      y$3 = 9; $122 = 2;
      if (y$3 >= $122) for (;;) {
        R.sound((R.random(((y$3 * x$7) + 100)) + (y$3 * x$7)));
        if (y$3 <= $122) break;
        y$3--;
      }
      if (x$7 <= $121) break;
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
  } else if ($80 === 23) {
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
    i$2 = 1; $123 = 16;
    if (i$2 <= $123) for (;;) {
      y$3 = 2; $124 = 24;
      if (y$3 <= $124) for (;;) {
        x$7 = ((x$7 - 8)) << 16 >> 16;
        R.sound(x$7);
        R.gotoxy(34, y$3);
        R.write('\x02');
        R.delay((52 - (3 * i$2)));
        R.gotoxy(34, y$3);
        R.write(' ');
        if (y$3 >= $124) break;
        y$3++;
      }
      if (i$2 >= $123) break;
      i$2++;
    }
    R.nosound();
    R.gotoxy(34, 24);
    R.write('_');
    i$2 = 8000; $125 = 20;
    if (i$2 >= $125) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $125) break;
      i$2--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT! *');
    dead(false);
  } else if ($80 === 24) {
    if ((level === 20)) {
      x$7 = 1; $126 = 24;
      if (x$7 <= $126) for (;;) {
        y$3 = 5; $127 = 1;
        if (y$3 >= $127) for (;;) {
          R.sound(((x$7 * 45) + (y$3 * 10)));
          R.delay((y$3 * 3));
          R.nosound();
          R.delay(40);
          R.gotoxy(62, 3);
          col(R.random(16), R.random(16));
          bak(R.random(8), R.random(8));
          R.write('\xf0');
          if (y$3 <= $127) break;
          y$3--;
        }
        if (x$7 >= $126) break;
        x$7++;
      }
      R.gotoxy(1, 1);
      col(16, 16);
      bak(7, 7);
      R.gotoxy(62, 3);
      pf[(62) * 25 + (3) - 26] = 6;
      R.write('\xf0');
      clearkeys();
      bak(0, 0);
      flash(4, 25, 'Oh no, it was only an illusion! Where is the real Fountain?');
      clearkeys();
      flash(7, 25, 'Your quest for the Fountain of Youth must continue...!');
    } else {
      bak(0, 0);
      x$7 = 1; $128 = 24;
      if (x$7 <= $128) for (;;) {
        y$3 = 5; $129 = 1;
        if (y$3 >= $129) for (;;) {
          R.sound(((x$7 * 45) + (y$3 * 10)));
          R.delay((y$3 * 3));
          R.nosound();
          R.delay(40);
          R.gotoxy(33, 23);
          col(R.random(16), R.random(16));
          R.write('\x03');
          if (y$3 <= $129) break;
          y$3--;
        }
        if (x$7 >= $128) break;
        x$7++;
      }
      R.gotoxy(33, 23);
      col(16, 16);
      bak(2, 7);
      R.write('\xf0');
      bak(0, 0);
      pf[((px + xway)) * 25 + ((py + yway)) - 26] = 6;
      score = ((score + 5000)) | 0;
      update_info();
      clearkeys();
      flash(10, 25, 'You found the Fountain of Youth--50,000 points!');
    }
  } else if ($80 === 25) {
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
    i$2 = 1; $130 = 100;
    if (i$2 <= $130) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($131 = pf[((x$7 + a)) * 25 + ((y$3 + b)) - 26], $131 === 0 || $131 === 32 || ($131 >= 55 && $131 <= 57)) && (done === false))) {
        if (!((((((x$7 + a) < 2) || ((x$7 + a) > 65)) || ((y$3 + b) < 2)) || ((y$3 + b) > 24)))) {
          done = true;
          x$7 = ((x$7 + a)) << 16 >> 16;
          y$3 = ((y$3 + b)) << 16 >> 16;
        }
      }
      if (i$2 >= $130) break;
      i$2++;
    }
    R.nosound();
    if ((done === false)) {
      x$7 = (pxold) << 16 >> 16;
      y$3 = (pyold) << 16 >> 16;
    }
    px = (x$7) << 16 >> 16;
    py = (y$3) << 16 >> 16;
    if (($132 = pf[(px) * 25 + (py) - 26], ($132 >= 55 && $132 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x$7 = 1; $133 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x$7 <= $133) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x$7 >= $133) break;
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
  } else if ($80 === 26) {
    go();
    addscore(11);
    grabsound();
    x$7 = 1; $134 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x$7 <= $134) for (;;) {
      R.sound(((R.random(1000) + x$7) + 200));
      if (x$7 >= $134) break;
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
      flash(15, 25, 'You have activated a Freeze Time spell!');
    }
  } else if ($80 === 27) {
    go();
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($80 === 28) {
    go();
    i$2 = 1; $135 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i$2 <= $135) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 >= $135) break;
      i$2++;
    }
    R.nosound();
    i$2 = 1; $136 = 50;
    if (i$2 <= $136) for (;;) {
      done = false;
      do {
        x$7 = ((R.random(64) + 2)) << 16 >> 16;
        y$3 = ((R.random(23) + 2)) << 16 >> 16;
        if (($137 = pf[(x$7) * 25 + (y$3) - 26], ($137 >= 0 && $137 <= 3) || $137 === 5 || ($137 >= 7 && $137 <= 11) || ($137 >= 15 && $137 <= 16) || $137 === 26 || $137 === 32)) {
          done = true;
          pf[(x$7) * 25 + (y$3) - 26] = 65;
          R.gotoxy(x$7, y$3);
          col(7, 7);
          R.write('O');
        }
      } while (!(((R.random(100) === 0) || done)));
      x$7 = 1; $138 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x$7 <= $138) for (;;) {
        R.sound(R.random(200));
        if (x$7 >= $138) break;
        x$7++;
      }
      R.nosound();
      if (i$2 >= $136) break;
      i$2++;
    }
    i$2 = 2500; $139 = 20;
    if (i$2 >= $139) for (;;) {
      R.sound(R.random(i$2));
      if (i$2 <= $139) break;
      i$2--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($80 === 29) {
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
  } else if ($80 === 30) {
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
  } else if ($80 === 31) {
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
  } else if ($80 === 32) {
    go();
  } else if ($80 === 33) {
    go();
    x$7 = 2; $140 = 65;
    if (x$7 <= $140) for (;;) {
      y$3 = 2; $141 = 24;
      if (y$3 <= $141) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 33)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $141) break;
        y$3++;
      }
      if (x$7 >= $140) break;
      x$7++;
    }
  } else if ($80 === 34) {
    go();
    grabsound();
    killed = (0) << 16 >> 16;
    trycounter = (0) << 16 >> 16;
    do {
      trycounter = ((trycounter + 1)) << 16 >> 16;
      $142 = (R.random(3) + 1);
      if ($142 === 1) {
        if ((snum > 1)) {
          i$2 = ((R.random(snum) + 1)) << 16 >> 16;
          if ((sx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $143 = 3;
            if (x$7 >= $143) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(sx[(i$2) - 1], sy[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(slow);
              if (x$7 <= $143) break;
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
      } else if ($142 === 2) {
        if ((mnum > 1)) {
          i$2 = ((R.random(mnum) + 1)) << 16 >> 16;
          if ((mx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $144 = 3;
            if (x$7 >= $144) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(mx[(i$2) - 1], my[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(medium);
              if (x$7 <= $144) break;
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
      } else if ($142 === 3) {
        if ((fnum > 1)) {
          i$2 = ((R.random(fnum) + 1)) << 16 >> 16;
          if ((fx[(i$2) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x$7 = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $145 = 3;
            if (x$7 >= $145) for (;;) {
              R.sound((x$7 * 5));
              R.gotoxy(fx[(i$2) - 1], fy[(i$2) - 1]);
              col(R.random(16), 15);
              R.write(fast);
              if (x$7 <= $145) break;
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
  } else if ($80 === 35) {
    go();
    if ((snum < 945)) {
      i$2 = 1; $146 = 45;
      if (i$2 <= $146) for (;;) {
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
            x$7 = 5; $147 = 100;
            if (x$7 <= $147) for (;;) {
              R.sound((x$7 * 8));
              R.delay(1);
              if (x$7 >= $147) break;
              x$7++;
            }
            R.nosound();
          }
        } while (!(((R.random(120) === 0) || done)));
        if (i$2 >= $146) break;
        i$2++;
      }
    }
    addscore(35);
    clearkeys();
    if (!(R.inSet(foundset, 35))) {
      flash(21, 25, 'A Creature Creation Trap!');
      foundset = R.union(foundset, R.setOf(35, 35));
    }
  } else if ($80 === 36) {
    blocksound();
    if (!(R.inSet(foundset, 36))) {
      flash(14, 25, 'You have discovered a Creature Generator!');
      foundset = R.union(foundset, R.setOf(36, 36));
    }
  } else if ($80 === 37) {
    go();
    x$7 = 2; $148 = 65;
    if (x$7 <= $148) for (;;) {
      y$3 = 2; $149 = 24;
      if (y$3 <= $149) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 37)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $149) break;
        y$3++;
      }
      if (x$7 >= $148) break;
      x$7++;
    }
  } else if ($80 === 38) {
    blocksound();
    addscore(4);
    clearkeys();
    if (!(R.inSet(foundset, 38))) {
      foundset = R.union(foundset, R.setOf(38, 38));
      flash(19, 25, 'A Moving Wall blocks your way.');
    }
  } else if ($80 === 39) {
    go();
    x$7 = 2; $150 = 65;
    if (x$7 <= $150) for (;;) {
      y$3 = 2; $151 = 24;
      if (y$3 <= $151) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 39)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $151) break;
        y$3++;
      }
      if (x$7 >= $150) break;
      x$7++;
    }
  } else if ($80 === 41) {
    go();
    grabsound();
    i$2 = 1; $152 = ((+(fastpc) * 120) + (+(!(fastpc)) * 70));
    if (i$2 <= $152) for (;;) {
      x$7 = 7; $153 = 1;
      if (x$7 >= $153) for (;;) {
        R.sound((i$2 * x$7));
        if (x$7 <= $153) break;
        x$7--;
      }
      if (i$2 >= $152) break;
      i$2++;
    }
    R.nosound();
    i$2 = 1; $154 = ((difficulty * 2) + 5);
    if (i$2 <= $154) for (;;) {
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
      if (i$2 >= $154) break;
      i$2++;
    }
    clearkeys();
    flash(8, 25, 'Yah Hoo! You discovered a hidden Reveal Gems Scroll!');
  } else if ($80 === 42) {
    go();
    grabsound();
    score = (((score + level) + 100)) | 0;
    update_info();
    if (!(R.inSet(foundset, 42))) {
      foundset = R.union(foundset, R.setOf(42, 42));
      flash(4, 25, 'You found an ancient Tablet with writing on it...huge points!');
    }
    clearkeys();
    tablet_message(level);
  } else if ($80 === 44) {
    go();
    x$7 = 2; $155 = 65;
    if (x$7 <= $155) for (;;) {
      y$3 = 2; $156 = 24;
      if (y$3 <= $156) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 43)) {
          R.sound(200);
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          i$2 = 1; $157 = 20;
          if (i$2 <= $157) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(16), 15);
            R.write('\xb2');
            R.delay(3);
            if (i$2 >= $157) break;
            i$2++;
          }
          R.gotoxy(x$7, y$3);
          col(0, 0);
          R.write(' ');
          R.nosound();
        }
        if (y$3 >= $156) break;
        y$3++;
      }
      if (x$7 >= $155) break;
      x$7++;
    }
    x$7 = 2; $158 = 65;
    if (x$7 <= $158) for (;;) {
      y$3 = 2; $159 = 24;
      if (y$3 <= $159) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 44)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $159) break;
        y$3++;
      }
      if (x$7 >= $158) break;
      x$7++;
    }
    clearkeys();
    flash(20, 25, 'You\'ve triggered Exploding Walls!');
  } else if ($80 === 45) {
    go();
    grabsound();
    score = ((score + 100)) | 0;
    gems = ((gems + 25)) << 16 >> 16;
    update_info();
    clearkeys();
    flash(15, 25, 'You found a Pouch containing 25 Gems!');
  } else if ($80 === 46) {
    blocksound();
    clearkeys();
    flash(9, 25, 'Statues are very dangerous...they drain your Gems!');
  } else if ($80 === 47) {
    go();
    i$2 = 1; $160 = 75;
    if (i$2 <= $160) for (;;) {
      done = false;
      do {
        x$7 = ((R.random(64) + 2)) << 16 >> 16;
        y$3 = ((R.random(23) + 2)) << 16 >> 16;
        if (($161 = pf[(x$7) * 25 + (y$3) - 26], $161 === 4 || $161 === 14)) {
          R.sound((R.random(2500) + 999));
          done = true;
          $162 = pf[(x$7) * 25 + (y$3) - 26];
          if ($162 === 4) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            pf[(x$7) * 25 + (y$3) - 26] = 29;
          } else if ($162 === 14) {
            R.gotoxy(x$7, y$3);
            col(0, 0);
            R.write(' ');
            pf[(x$7) * 25 + (y$3) - 26] = 30;
          }
          R.delay(5);
          R.nosound();
        }
      } while (!(((R.random(200) === 0) || done)));
      if (i$2 >= $160) break;
      i$2++;
    }
    clearkeys();
    flash(5, 25, 'Yikes!  A trap has made many of the wall sections invisible!');
  } else if ($80 === 48) {
    go();
    grabsound();
    if ((bonus === 0)) {
      bonus = (1) << 16 >> 16;
    }
  } else if ($80 === 49) {
    go();
    grabsound();
    if ((bonus === 1)) {
      bonus = (2) << 16 >> 16;
    }
  } else if ($80 === 50) {
    go();
    grabsound();
    if ((bonus === 2)) {
      bonus = (3) << 16 >> 16;
    }
  } else if ($80 === 51) {
    go();
    grabsound();
    if ((bonus === 3)) {
      clearkeys();
      x$7 = 10; $163 = 45;
      if (x$7 <= $163) for (;;) {
        y$3 = 1; $164 = 13;
        if (y$3 <= $164) for (;;) {
          R.sound(((x$7 * x$7) * y$3));
          R.delay((y$3 + 1));
          if (y$3 >= $164) break;
          y$3++;
        }
        if (x$7 >= $163) break;
        x$7++;
      }
      R.nosound();
      score = ((score + 1000)) | 0;
      update_info();
      flash(17, 25, 'Super Kroz Bonus -- 10,000 points!');
    }
  } else if (($80 >= 52 && $80 <= 54)) {
    blocksound();
    addscore(14);
    clearkeys();
    if (!(R.inSet(foundset, 14))) {
      foundset = R.union(foundset, R.setOf(14, 14));
      flash(20, 25, 'A Solid Wall blocks your way.');
    }
  } else if (($80 >= 55 && $80 <= 57)) {
    go();
  } else if (($80 >= 58 && $80 <= 60)) {
    original = (pf[((px + xway)) * 25 + ((py + yway)) - 26]) & 255;
    $165 = original;
    if ($165 === 58) {
      spot = (52) & 255;
    } else if ($165 === 59) {
      spot = (53) & 255;
    } else if ($165 === 60) {
      spot = (54) & 255;
    }
    go();
    x$7 = 2; $166 = 65;
    if (x$7 <= $166) for (;;) {
      y$3 = 2; $167 = 24;
      if (y$3 <= $167) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === spot)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          i$2 = 1; $168 = 30;
          if (i$2 <= $168) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i$2 >= $168) break;
            i$2++;
          }
          a = 60; $169 = 1;
          if (a >= $169) for (;;) {
            R.sound((a * 40));
            R.delay(1);
            if (a <= $169) break;
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
    flash(14, 25, 'Magic has been released is this chamber!');
  } else if (($80 >= 61 && $80 <= 63)) {
    original = (pf[((px + xway)) * 25 + ((py + yway)) - 26]) & 255;
    $172 = original;
    if ($172 === 61) {
      spot = (55) & 255;
    } else if ($172 === 62) {
      spot = (56) & 255;
    } else if ($172 === 63) {
      spot = (57) & 255;
    }
    go();
    x$7 = 2; $173 = 65;
    if (x$7 <= $173) for (;;) {
      y$3 = 2; $174 = 24;
      if (y$3 <= $174) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === spot)) {
          pf[(x$7) * 25 + (y$3) - 26] = 14;
          i$2 = 1; $175 = 30;
          if (i$2 <= $175) for (;;) {
            R.gotoxy(x$7, y$3);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i$2 >= $175) break;
            i$2++;
          }
          a = 20; $176 = 80;
          if (a <= $176) for (;;) {
            R.sound((a * 50));
            R.delay(1);
            if (a >= $176) break;
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
        if (y$3 >= $174) break;
        y$3++;
      }
      if (x$7 >= $173) break;
      x$7++;
    }
    x$7 = 2; $177 = 65;
    if (x$7 <= $177) for (;;) {
      y$3 = 2; $178 = 24;
      if (y$3 <= $178) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === original)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
          R.gotoxy(x$7, y$3);
          R.write(' ');
        }
        if (y$3 >= $178) break;
        y$3++;
      }
      if (x$7 >= $177) break;
      x$7++;
    }
    clearkeys();
    flash(14, 25, 'Oh no, new Walls have magically appeared!');
  } else if ($80 === 65) {
    rxway = (0) << 16 >> 16;
    ryway = (0) << 16 >> 16;
    nogo = false;
    if ((xway === 1)) {
      rxway = (2) << 16 >> 16;
    }
    if ((xway === -(1))) {
      rxway = (-(2)) << 16 >> 16;
    }
    if ((yway === 1)) {
      ryway = (2) << 16 >> 16;
    }
    if ((yway === -(1))) {
      ryway = (-(2)) << 16 >> 16;
    }
    rx = ((px + rxway)) << 16 >> 16;
    ry = ((py + ryway)) << 16 >> 16;
    if (((xway === 1) && (rx > 65))) {
      nogo = true;
    }
    if (((xway === -(1)) && (rx < 2))) {
      nogo = true;
    }
    if (((yway === 1) && (ry > 24))) {
      nogo = true;
    }
    if (((yway === -(1)) && (ry < 2))) {
      nogo = true;
    }
    clearkeys();
    if (!(nogo)) {
      $179 = pf[(rx) * 25 + (ry) - 26];
      if ($179 === 0 || $179 === 32 || $179 === 33 || $179 === 37 || $179 === 39 || $179 === 41 || $179 === 44 || $179 === 47 || ($179 >= 52 && $179 <= 57) || ($179 >= 61 && $179 <= 63)) {
        moverock();
      } else if (($179 >= 1 && $179 <= 3)) {
        score = ((score + pf[(rx) * 25 + (ry) - 26])) | 0;
        moverock();
        R.sound(600);
        R.delay(20);
        R.nosound();
      } else if ($179 === 4 || $179 === 13 || $179 === 14 || $179 === 17 || $179 === 19 || $179 === 20 || $179 === 22 || $179 === 24 || $179 === 25 || ($179 >= 29 && $179 <= 31) || $179 === 36 || $179 === 38 || $179 === 43 || $179 === 46 || $179 === 64 || $179 === 65) {
        blocksound();
      } else if ($179 === 5 || ($179 >= 7 && $179 <= 12) || $179 === 16 || $179 === 18 || $179 === 21 || $179 === 26 || $179 === 27 || $179 === 34 || $179 === 35 || $179 === 42 || $179 === 45 || ($179 >= 48 && $179 <= 51) || ($179 >= 58 && $179 <= 60)) {
        moverock();
        grabsound();
      } else if ($179 === 66) {
        moverock();
        pf[(rx) * 25 + (ry) - 26] = 0;
        R.sound(90);
        clearkeys();
        i$2 = 1; $180 = 20;
        if (i$2 <= $180) for (;;) {
          R.gotoxy(rx, ry);
          col((R.random(15) + 1), 15);
          bak(R.random(8), 0);
          R.write('X');
          bor((R.random(15) + 1));
          if (i$2 >= $180) break;
          i$2++;
        }
        bor(4);
        bak(0, 0);
        R.gotoxy(rx, ry);
        col(0, 0);
        R.write(' ');
        i$2 = 30000; $181 = 20;
        if (i$2 >= $181) for (;;) {
          R.sound(R.random(i$2));
          if (i$2 <= $181) break;
          i$2--;
        }
        R.nosound();
        if (!(R.inSet(foundset, 0))) {
          foundset = R.union(foundset, R.setOf(0, 0));
          clearkeys();
          flash(21, 25, 'The Boulder is vaporized!');
        }
      } else if ($179 === 6 || $179 === 23) {
        i$2 = 1; $182 = ((+(fastpc) * 500) + (+(!(fastpc)) * 330));
        if (i$2 <= $182) for (;;) {
          R.sound((R.random(100) + 20));
          R.delay(1);
          if (i$2 >= $182) break;
          i$2++;
        }
        R.nosound();
        R.gotoxy((px + xway), (py + yway));
        col(0, 0);
        R.write(' ');
        go();
        i$2 = 130; $183 = 5;
        if (i$2 >= $183) for (;;) {
          R.sound((i$2 * 8));
          R.delay(3);
          if (i$2 <= $183) break;
          i$2--;
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
  } else if ($80 === 66) {
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
  } else if ($80 === 67) {
    go();
    x$7 = 2; $184 = 65;
    if (x$7 <= $184) for (;;) {
      y$3 = 2; $185 = 24;
      if (y$3 <= $185) for (;;) {
        if ((pf[(x$7) * 25 + (y$3) - 26] === 67)) {
          pf[(x$7) * 25 + (y$3) - 26] = 0;
        }
        if (y$3 >= $185) break;
        y$3++;
      }
      if (x$7 >= $184) break;
      x$7++;
    }
  } else {
    blocksound();
  }
}
function player_move() {
  let $186, $187, $188, $189, $190, $191, $192;
  $186 = getkey();
  if ($186 === 0) {

  } else if ($186 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(19, 25, 'Press any key to resume game.');
    restore_border();
  } else if ($186 === 81) {
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
  } else if ($186 === 82) {
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
    R.assign(savefile, 'CRUSADE.SAV');
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
      $187 = savestuff;
      level = ($187.s_level) << 16 >> 16;
      score = ($187.s_score) | 0;
      gems = ($187.s_gems) << 16 >> 16;
      whips = ($187.s_whips) << 16 >> 16;
      teleports = ($187.s_teleports) << 16 >> 16;
      keys = ($187.s_keys) << 16 >> 16;
      whippower = ($187.s_whippower) << 16 >> 16;
      difficulty = ($187.s_difficulty) << 16 >> 16;
      px = ($187.s_px) << 16 >> 16;
      py = ($187.s_py) << 16 >> 16;
      foundset = $187.s_foundset;
      mixup = $187.s_mixup;
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
      hidelevel = false;
      hidecreate = false;
      hidestairs = false;
      hidetrap = false;
      hiderock = false;
      hidegems = false;
      hidemblock = false;
      hideopenwall = false;
      bonus = (0) << 16 >> 16;
      t[(1) - 1] = 5;
      t[(2) - 1] = 6;
      t[(3) - 1] = 7;
      t[(8) - 1] = 7;
      t[(4) - 1] = 0;
      t[(5) - 1] = 0;
      t[(6) - 1] = 0;
      $188 = level;
      if ($188 === 1) {
        level1();
      } else if ($188 === 3) {
        level3();
      } else if ($188 === 5) {
        level5();
      } else if ($188 === 7) {
        level7();
      } else if ($188 === 9) {
        level9();
      } else if ($188 === 11) {
        level11();
      } else if ($188 === 13) {
        level13();
      } else if ($188 === 15) {
        level15();
      } else if ($188 === 17) {
        level17();
      } else if ($188 === 19) {
        level19();
      } else if ($188 === 20) {
        level20();
      } else if ($188 === 21) {
        level21();
      } else if ($188 === 22) {
        level22();
      } else if ($188 === 23) {
        level23();
      } else if ($188 === 24) {
        level24();
      } else if ($188 === 25) {
        level25();
      } else {
        create_playfield();
      }
      if ((level === 2)) {
        hidetrap = true;
      }
      if ((level === 6)) {
        slow = '\x8e';
      }
      if ((level === 8)) {
        hidelevel = true;
      }
      if ((level === 10)) {
        lavaflow = true;
        lavarate = (50) << 16 >> 16;
      }
      R.window(2, 2, (64 + 1), (23 + 1));
      bak(0, 0);
      R.clrscr();
      cur(3);
      R.window(1, 1, 80, 25);
      border();
      display_playfield();
      x$7 = 1; $189 = 600;
      if (x$7 <= $189) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x$7 / 2));
        if (x$7 >= $189) break;
        x$7++;
      }
      R.nosound();
      R.gotoxy(px, py);
      col(14, 15);
      bak(0, 0);
      R.write('\x02');
      bak(0, 0);
    }
    if (((level === 20) || (level === 25))) {
      flash(9, 25, 'You\'ve finally reached the deepest chamber of Kroz!');
    } else {
      flash(17, 25, 'Press any key to begin this level.');
    }
  } else if ($186 === 83) {
    flash(16, 25, 'Are you sure you want to SAVE (Y/N)?');
    restore_border();
    ch = R.readKbd();
    if ((R.upcase(ch) === 'N')) {
      return;
    }
    bak(0, 0);
    col(15, 15);
    $190 = savestuff;
    $190.s_level = (level) | 0;
    $190.s_score = (i_score) | 0;
    $190.s_gems = (i_gems) | 0;
    $190.s_whips = (i_whips) | 0;
    $190.s_teleports = (i_teleports) | 0;
    $190.s_keys = (i_keys) | 0;
    $190.s_whippower = (i_whippower) | 0;
    $190.s_difficulty = (i_difficulty) | 0;
    $190.s_px = (i_px) | 0;
    $190.s_py = (i_py) | 0;
    $190.s_foundset = i_foundset;
    $190.s_mixup = mixup;
    print(28, 25, '  Saving...  ');
    R.assign(savefile, 'CRUSADE.SAV');
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    restore_border();
  } else if ($186 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x$7 = 1; $191 = 250;
    if (x$7 <= $191) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $191) break;
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
    x$7 = 1; $192 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x$7 <= $192) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x$7 >= $192) break;
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
  } else if ($186 === 87) {
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
  } else if ($186 === 172) {
    move(0, -(1));
  } else if ($186 === 180) {
    move(0, 1);
  } else if ($186 === 177) {
    move(1, 0);
  } else if ($186 === 175) {
    move(-(1), 0);
  } else if ($186 === 171) {
    move(-(1), -(1));
  } else if ($186 === 173) {
    move(1, -(1));
  } else if ($186 === 179) {
    move(-(1), 1);
  } else if ($186 === 181) {
    move(1, 1);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $193, $194;
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
  loop$3 = 1; $193 = snum;
  if (loop$3 <= $193) for (;;) {
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
    $194 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($194 === 0) {
      col(12, 7);
      R.write(slow);
      R.sound(20);
      R.nosound();
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
    } else if (($194 >= 1 && $194 <= 3) || $194 === 6 || $194 === 13 || $194 === 14 || $194 === 17 || ($194 >= 19 && $194 <= 25) || ($194 >= 28 && $194 <= 37) || $194 === 39 || $194 === 41 || $194 === 42 || ($194 >= 44 && $194 <= 47) || ($194 >= 52 && $194 <= 56) || ($194 >= 58 && $194 <= 63) || $194 === 65 || $194 === 66 || $194 === 67) {
      sx[(loop$3) - 1] = (sx[(loop$3) - 1] + xdir);
      sy[(loop$3) - 1] = (sy[(loop$3) - 1] + ydir);
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 1;
      R.gotoxy(sx[(loop$3) - 1], sy[(loop$3) - 1]);
      col(12, 7);
      R.write(slow);
    } else if ($194 === 4 || $194 === 38 || $194 === 43 || $194 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($194 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 201);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($194 === 5 || ($194 >= 7 && $194 <= 12) || $194 === 15 || $194 === 16 || $194 === 18 || $194 === 26 || $194 === 27 || ($194 >= 48 && $194 <= 51)) {
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
    if (loop$3 >= $193) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $195, $196;
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
  loop$4 = 1; $195 = mnum;
  if (loop$4 <= $195) for (;;) {
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
    $196 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($196 === 0) {
      col(10, 7);
      R.write(medium);
      R.sound(20);
      R.nosound();
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
    } else if (($196 >= 1 && $196 <= 3) || $196 === 6 || $196 === 13 || $196 === 14 || $196 === 17 || ($196 >= 19 && $196 <= 25) || ($196 >= 28 && $196 <= 37) || $196 === 39 || $196 === 41 || $196 === 42 || ($196 >= 44 && $196 <= 47) || ($196 >= 52 && $196 <= 56) || ($196 >= 58 && $196 <= 63) || $196 === 65 || $196 === 66 || $196 === 67) {
      mx[(loop$4) - 1] = (mx[(loop$4) - 1] + xdir);
      my[(loop$4) - 1] = (my[(loop$4) - 1] + ydir);
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 2;
      R.gotoxy(mx[(loop$4) - 1], my[(loop$4) - 1]);
      col(10, 7);
      R.write(medium);
    } else if ($196 === 4 || $196 === 38 || $196 === 43 || $196 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($196 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 201);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($196 === 5 || ($196 >= 7 && $196 <= 12) || $196 === 15 || $196 === 16 || $196 === 18 || $196 === 26 || $196 === 27 || ($196 >= 48 && $196 <= 51)) {
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
    if (loop$4 >= $195) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $197, $198;
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
  loop$5 = 1; $197 = fnum;
  if (loop$5 <= $197) for (;;) {
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
    $198 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($198 === 0) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($198 >= 1 && $198 <= 3) || $198 === 6 || $198 === 13 || $198 === 14 || $198 === 17 || ($198 >= 19 && $198 <= 25) || ($198 >= 28 && $198 <= 37) || $198 === 39 || $198 === 41 || $198 === 42 || ($198 >= 44 && $198 <= 47) || ($198 >= 52 && $198 <= 56) || ($198 >= 58 && $198 <= 63) || $198 === 65 || $198 === 66 || $198 === 67) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($198 === 4 || $198 === 38 || $198 === 43 || $198 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($198 === 40) {
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
      strval = R.trunc(R.fmt(gems, 0), 201);
      R.gotoxy((73 - Math.trunc(strval.length / 2)), 8);
      R.write(strval);
      bak(0, 0);
    } else if ($198 === 5 || ($198 >= 7 && $198 <= 12) || $198 === 15 || $198 === 16 || $198 === 18 || $198 === 26 || $198 === 27 || ($198 >= 48 && $198 <= 51)) {
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
    if (loop$5 >= $197) break;
    loop$5++;
  }
}
function move_mblock() {
  let loop$6 = 0;
  let $199, $200;
  t[(8) - 1] = btime;
  if ((bnum < 1)) {
    return;
  }
  loop$6 = 1; $199 = bnum;
  if (loop$6 <= $199) for (;;) {
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
    $200 = pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26];
    if ($200 === 0) {
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
    if (loop$6 >= $199) break;
    loop$6++;
  }
}

export function main() {
  let $201, $202, $203, $204, $205, $206;

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
  x$7 = 1; $201 = 800;
  if (x$7 <= $201) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x$7 / 2));
    if (x$7 >= $201) break;
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
      x$7 = 1; $202 = 9;
      if (x$7 <= $202) for (;;) {
        t[(x$7) - 1] = (t[(x$7) - 1] - 1);
        if (x$7 >= $202) break;
        x$7++;
      }
      if ((skiptime > 3000)) {
        x$7 = 1; $203 = 9;
        if (x$7 <= $203) for (;;) {
          t[(x$7) - 1] = (t[(x$7) - 1] - 5);
          if (x$7 >= $203) break;
          x$7++;
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
      strval = R.trunc(R.fmt(score, 0), 201);
      if ((score > 0)) {
        strval = R.trunc((strval + '0'), 201);
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
            x$7 = 5; $204 = 70;
            if (x$7 <= $204) for (;;) {
              R.sound((x$7 * 8));
              R.delay(1);
              if (x$7 >= $204) break;
              x$7++;
            }
            R.nosound();
          }
        } while (!(((R.random(50) === 0) || done)));
      }
      if ((lavaflow && (R.random(10) === 0))) {
        i$2 = 1; $205 = lavarate;
        if (i$2 <= $205) for (;;) {
          done = false;
          x$7 = ((R.random(64) + 2)) << 16 >> 16;
          y$3 = ((R.random(23) + 2)) << 16 >> 16;
          if (($206 = pf[(x$7) * 25 + (y$3) - 26], ($206 >= 0 && $206 <= 4) || $206 === 5 || ($206 >= 7 && $206 <= 11) || $206 === 15 || $206 === 16 || ($206 >= 18 && $206 <= 21) || ($206 >= 26 && $206 <= 28) || ($206 >= 32 && $206 <= 35) || ($206 >= 37 && $206 <= 39) || $206 === 41 || ($206 >= 42 && $206 <= 44) || $206 === 45 || ($206 >= 47 && $206 <= 51) || $206 === 57 || $206 === 60 || $206 === 64)) {
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
          if (i$2 >= $205) break;
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
