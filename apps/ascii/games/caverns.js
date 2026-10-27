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
let df = new Array(40).fill('');
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
  R.gotoxy(31, 2);
  R.write('CAVERNS OF KROZ II');
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
  R.gotoxy(22, 1);
  R.write('CAVERNS OF KROZ II \xc4 HOW TO REGISTER' + '\r\n');
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
  print(4, 1, 'YOUR QUEST FOR THE PRICELESS AMULET OF KROZ WAS SUCCESSFUL!!');
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
  R.assign(hsfile, 'CAVERNS2.HS');
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
        $23.name = R.trunc('I. Jones', 15);
        $23.highscore = (8574) | 0;
        $23.highlevel = (14) | 0;
      } else if ($24 === 3) {
        $23.name = R.trunc('J. Picard', 15);
        $23.highscore = (6995) | 0;
        $23.highlevel = (11) | 0;
      } else if ($24 === 4) {
        $23.name = R.trunc('Neil Peart', 15);
        $23.highscore = (3501) | 0;
        $23.highlevel = (8) | 0;
      } else if ($24 === 5) {
        $23.name = R.trunc('Peerless Pat', 15);
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
  R.write('CAVERNS OF KROZ II');
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
      R.write('You\'ve completed CAVERNS OF KROZ II!' + '\r\n');
    } else {
      R.gotoxy(17, 2);
      R.write('CAVERNS OF KROZ II' + '\r\n');
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
  let $33;
  i = 1; $33 = 40;
  if (i <= $33) for (;;) {
    df[(i) - 1] = R.trunc('', 222);
    if (i >= $33) break;
    i++;
  }
  df[(1) - 1] = R.trunc(' 15           1  3        8                                          ', 222);
  df[(3) - 1] = R.trunc(' 60       25  5  2       10     3                                    ', 222);
  df[(5) - 1] = R.trunc('500              1       20     3       60                           ', 222);
  df[(6) - 1] = R.trunc('         999 20  2  1    10     3                                    ', 222);
  df[(8) - 1] = R.trunc('   500           2       30400  5                                    ', 222);
  df[(10) - 1] = R.trunc('150150120999  5  1  1     8     2                                    ', 222);
  df[(13) - 1] = R.trunc('   750   150  2100  1    35  1  3  1  5 50     2                     ', 222);
  df[(15) - 1] = R.trunc('200100 50300  2  1  1  1 15150  3  1   320  1150                     ', 222);
  df[(17) - 1] = R.trunc(' 25 25 25100 10  6  1  1 25100  3      850  1110                     ', 222);
  df[(19) - 1] = R.trunc('   980           1       40380  5              5                     ', 222);
  df[(22) - 1] = R.trunc('450           1  1  1    25  1  5            980                     ', 222);
  df[(24) - 1] = R.trunc('   240    25  5  2  1    55  5  3       25     5             12700                      ', 222);
  df[(26) - 1] = R.trunc('130130130 30  5  1  1  1 50  1 10         100  2              2100   ', 222);
  df[(28) - 1] = R.trunc('      340        1       60400  5              5                     ', 222);
  df[(30) - 1] = R.trunc('200299           1  5      10   5         100  5             16      ', 222);
  df[(32) - 1] = R.trunc('300      150  5  3     2 25     5                             1   500', 222);
  df[(34) - 1] = R.trunc('134              1  1           5                     640650 35      ', 222);
  df[(36) - 1] = R.trunc('120120120 50  5  1  1  2 50 50  3       50  2 50 60  1 60 60 17100 98', 222);
  df[(38) - 1] = R.trunc('300200100     5  1  5    30     5              5              1 10  3', 222);
}
function convert_format() {
  let xloop = 0;
  let yloop = 0;
  let tempstr$2 = '';
  let $34, $35, $36, $37, $38, $39, $40;
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
  x = 1; $37 = 1300;
  if (x <= $37) for (;;) {
    bx[(x) - 1] = 0;
    by[(x) - 1] = 0;
    if (x >= $37) break;
    x++;
  }
  new_gem_color();
  yloop = 1; $38 = 23;
  if (yloop <= $38) for (;;) {
    xloop = 1; $39 = 64;
    if (xloop <= $39) for (;;) {
      tempstr$2 = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
      $40 = R.charAt(tempstr$2, 1);
      if ($40 === ' ') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 0;
      } else if ($40 === '1') {
        snum = ((snum + 1)) << 16 >> 16;
        sx[(snum) - 1] = (xloop + 1);
        sy[(snum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 1;
      } else if ($40 === '2') {
        mnum = ((mnum + 1)) << 16 >> 16;
        mx[(mnum) - 1] = (xloop + 1);
        my[(mnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 2;
      } else if ($40 === '3') {
        fnum = ((fnum + 1)) << 16 >> 16;
        fx[(fnum) - 1] = (xloop + 1);
        fy[(fnum) - 1] = (yloop + 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 3;
      } else if ($40 === 'X') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 4;
      } else if ($40 === 'W') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 5;
      } else if ($40 === 'L') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 6;
      } else if ($40 === 'C') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 7;
      } else if ($40 === 'S') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 8;
      } else if ($40 === '+') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 9;
      } else if ($40 === 'I') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 10;
      } else if ($40 === 'T') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 11;
      } else if ($40 === 'K') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 12;
      } else if ($40 === 'D') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 13;
      } else if ($40 === '#') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 14;
      } else if ($40 === 'F') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 15;
      } else if ($40 === '.') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 16;
      } else if ($40 === 'R') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 17;
      } else if ($40 === 'Q') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 18;
      } else if ($40 === '/') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 19;
      } else if ($40 === '\\') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 20;
      } else if ($40 === 'B') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 21;
      } else if ($40 === 'V') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 22;
      } else if ($40 === '=') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 23;
      } else if ($40 === 'A') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 24;
      } else if ($40 === 'U') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 25;
      } else if ($40 === 'Z') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 26;
      } else if ($40 === '*') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 27;
      } else if ($40 === 'E') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 28;
      } else if ($40 === ';') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 29;
      } else if ($40 === ':') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 30;
      } else if ($40 === '`') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 31;
      } else if ($40 === '-') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 32;
      } else if ($40 === '@') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 33;
      } else if ($40 === '%') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 34;
      } else if ($40 === ']') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 35;
      } else if ($40 === '!') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 222;
      } else if ($40 === 'G') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 36;
        gennum = ((gennum + 1)) << 16 >> 16;
      } else if ($40 === '(') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 37;
      } else if ($40 === 'P') {
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = 40;
        px = ((xloop + 1)) << 16 >> 16;
        py = ((yloop + 1)) << 16 >> 16;
      } else {
        tempstr$2 = R.trunc(R.copy((fp[(yloop) - 1] ?? ''), xloop, 1), 1);
        pf[((xloop + 1)) * 25 + ((yloop + 1)) - 26] = R.charAt(tempstr$2, 1).charCodeAt(0);
      }
      if (xloop >= $39) break;
      xloop++;
    }
    if (yloop >= $38) break;
    yloop++;
  }
}
function go(xway, yway, human) {
  let previous = 0;
  let oldx = 0;
  let oldy = 0;
  let $41;
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
  if (($41 = pf[(px) * 25 + (py) - 26], ($41 >= 55 && $41 <= 57) || $41 === 75)) {
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
  let $42, $43, $44, $45, $46, $47, $48, $49, $50;
  footstep();
  R.delay(300);
  footstep();
  R.delay(300);
  footstep();
  x = 1; $42 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
  if (x <= $42) for (;;) {
    R.sound((R.random(3000) + x));
    R.gotoxy(px, py);
    bak(R.random(8), 0);
    col(14, 15);
    R.write('\x02');
    col(R.random(16), R.random(16));
    bak(0, 0);
    print(15, 25, 'Oh no, something strange is happening!');
    if (x >= $42) break;
    x++;
  }
  i = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $43 = 20;
  if (i >= $43) for (;;) {
    R.sound(R.random(i));
    if (i <= $43) break;
    i--;
  }
  col(14, 15);
  bak(0, 0);
  x = 1; $44 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
  if (x <= $44) for (;;) {
    R.sound((x * 3));
    R.gotoxy(px, py);
    R.write(String.fromCharCode(((220 + R.random(4))) & 255));
    if (x >= $44) break;
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
  i = 1; $45 = gems;
  if (i <= $45) for (;;) {
    R.sound(((i * 8) + 100));
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
  print(15, 25, 'Your Whips are worth 100 points each...');
  i = 1; $46 = whips;
  if (i <= $46) for (;;) {
    R.sound(((i * 10) + 200));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $46) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
  i = 1; $47 = teleports;
  if (i <= $47) for (;;) {
    R.sound(((i * 12) + 300));
    score = ((score + 20)) | 0;
    update_info();
    R.delay(30);
    if (i >= $47) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(14, 25, 'Your Keys are worth 10,000 points each...');
  i = 1; $48 = keys;
  if (i <= $48) for (;;) {
    R.sound(((i * 30) + 100));
    score = ((score + 1000)) | 0;
    update_info();
    R.delay(50);
    if (i >= $48) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  bak(gemcolor, 7);
  x = 1; $49 = 30;
  if (x <= $49) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    if (x >= $49) break;
    x++;
  }
  bak(0, 0);
  x = 1; $50 = 30;
  if (x <= $50) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    R.sound((x * 45));
    if (x >= $50) break;
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
  R.write('   The Priceless Amulet will bring you the recognition you' + '\r\n');
  R.write(' deserve.  For now it is your most impressive discovery, and' + '\r\n');
  R.write(' should be studied closely.  That must wait though, for Kroz is' + '\r\n');
  R.write(' a huge place, and still mostly unexplored.' + '\r\n');
  R.write('   Even with the many dangers that await, you feel another' + '\r\n');
  R.write(' expedition is in order.  You must leave no puzzle unsolved, no' + '\r\n');
  R.write(' treasure unfound--to quit now would leave the job unfinished.' + '\r\n');
  R.write('   So you plan for a good night\'s rest, and think ahead to' + '\r\n');
  R.write(' tomorrow\'s new journey.  What does the mysterious Dungeons of' + '\r\n');
  R.write(' Kroz have waiting for you, what type of new creatures will' + '\r\n');
  R.write(' try for your blood, and what kind of brilliant treasure does' + '\r\n');
  R.write(' Kroz protect.  Tomorrow will tell...' + '\r\n');
  R.write('' + '\r\n');
  col(14, 15);
  R.write('                        DUNGEONS OF KROZ' + '\r\n');
  col(15, 7);
  R.write('        ( Now available -- $7.50 or write for details. )');
  clearkeys();
  R.window(1, 1, 80, 25);
  bak(0, 0);
  flash(21, 25, 'Press any key, Adventurer.');
  won();
}
function level2() {
  fp[(1) - 1] = R.trunc('LXXX2    2     2        2   2  2  2   2    2 2    2  2    2    +', 64);
  fp[(2) - 1] = R.trunc('+XXX  2     2      2        2          2  2    2     2      XXX ', 64);
  fp[(3) - 1] = R.trunc(' XXX2   2      2       2  2     2   2       2      2  2  2  XTX ', 64);
  fp[(4) - 1] = R.trunc('+XXX          2  2           2         2  2     2   2       XXX ', 64);
  fp[(5) - 1] = R.trunc(' XXX   2   2         2   2     2    2      2  2        2     2  ', 64);
  fp[(6) - 1] = R.trunc('+XXX 2                                                          ', 64);
  fp[(7) - 1] = R.trunc(' XXX  2  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  2  2 ', 64);
  fp[(8) - 1] = R.trunc('+XXX2    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    2  ', 64);
  fp[(9) - 1] = R.trunc(' XXX  2  XXX2                    W                   2XXX 2     ', 64);
  fp[(10) - 1] = R.trunc('+XXX   2 XXX  2                FFFFF               2  XXX   2 2 ', 64);
  fp[(11) - 1] = R.trunc(' XXX2 2  XXX                   F111F                  XXX       ', 64);
  fp[(12) - 1] = R.trunc('+XXX2    XXX+   3  3        W  F1P1F  W       3  3   +XXX  2    ', 64);
  fp[(13) - 1] = R.trunc('XXXX   2 XXX                   F111F                  XXX 2    2', 64);
  fp[(14) - 1] = R.trunc('WXXX 2   XXX  2                FFFFF               2  XXX   2   ', 64);
  fp[(15) - 1] = R.trunc('WXXX2    XXX2                    W                   2XXX    2  ', 64);
  fp[(16) - 1] = R.trunc('WXXX  2  XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX 2     ', 64);
  fp[(17) - 1] = R.trunc('WXXX   2 XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX    2  ', 64);
  fp[(18) - 1] = R.trunc('WXXX2                                                      2    ', 64);
  fp[(19) - 1] = R.trunc('WXXX    2   2      2   2     2    2   2    2    2      2      2 ', 64);
  fp[(20) - 1] = R.trunc('XXXX 2    2   2 2    2    2     2       2     2     2     2 XXX ', 64);
  fp[(21) - 1] = R.trunc('XXXX2  2    2  2  2      2    2     2  2  2  2    2         XTX ', 64);
  fp[(22) - 1] = R.trunc('XXXX 2   2 2    2   2  2    2   2       2       2   2   2   XXX ', 64);
  fp[(23) - 1] = R.trunc('CXXX   2    2  2 2    2 2     2    2  2  2   2    2  2    2    +', 64);
  convert_format();
}
function level4() {
  fp[(1) - 1] = R.trunc('WFP I        C3+3+3+3+3+3+3+2+2+2+2+2+2+2+2+1+1+1+1+1+1+1+1 W   ', 64);
  fp[(2) - 1] = R.trunc('XX############################################################CC', 64);
  fp[(3) - 1] = R.trunc('             C3+3+3+3+3+3+3+2+2+2+2+2+2+2+2+1+1+1+1+1+1+1+1 W   ', 64);
  fp[(4) - 1] = R.trunc('  ##############################################################', 64);
  fp[(5) - 1] = R.trunc('  #     1        +              1     +                  X      ', 64);
  fp[(6) - 1] = R.trunc(' 1#I##################################################   #   #  ', 64);
  fp[(7) - 1] = R.trunc('  #X #XX    X    XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX#1  #   #+ ', 64);
  fp[(8) - 1] = R.trunc('  # X#XX XX X XX XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX#   # 1 #  ', 64);
  fp[(9) - 1] = R.trunc('+ #X #X +XX  +X  XXLX  W + + + + + T + + + + + W   XX#   #   # 1', 64);
  fp[(10) - 1] = R.trunc('  # X#X XXXXXXX XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  X# 1 #+  #  ', 64);
  fp[(11) - 1] = R.trunc('1 #X #X   X     +XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX X#   #   #  ', 64);
  fp[(12) - 1] = R.trunc('  # X#XXX X ####################################### X#  +#1  #  ', 64);
  fp[(13) - 1] = R.trunc('  #X #XXXIX     1   +    1   +   1  +               X#   #   #  ', 64);
  fp[(14) - 1] = R.trunc('  # X#X   ###################################XXX######  1#   #  ', 64);
  fp[(15) - 1] = R.trunc('  #X #X #####################################XXX######   #   #1 ', 64);
  fp[(16) - 1] = R.trunc(' 1# X#X     1 +1 +1 +1 +1 +1++++                     #+  #  1#  ', 64);
  fp[(17) - 1] = R.trunc('  #X ########################################XXX#### #   #   # +', 64);
  fp[(18) - 1] = R.trunc('  # XXXXXXXXXXXCXXXXXXXXXCXXXXXXXXXCXXXXXXXXXWWWXXX# # 1 #  +#  ', 64);
  fp[(19) - 1] = R.trunc('  # XXXXXXCXXXXXXXXXCXXXXXXXXXCXXXXXXXXXCXXXXXXXXXX#1#   #1  #  ', 64);
  fp[(20) - 1] = R.trunc(' +# ################################################ #   #   # 1', 64);
  fp[(21) - 1] = R.trunc('  #    1+++1            C           1+++1            #       #  ', 64);
  fp[(22) - 1] = R.trunc('1 ############################################################  ', 64);
  fp[(23) - 1] = R.trunc('         1       +            1         +               1       ', 64);
  convert_format();
}
function level7() {
  fp[(1) - 1] = R.trunc('X3 3 3 3 3 X+X             XX  L  XX             X3X 3 3 3 3 3X ', 64);
  fp[(2) - 1] = R.trunc(' X+ + + + + X3XX           XX     XX           XX+X + + + + +X  ', 64);
  fp[(3) - 1] = R.trunc('  X3 3 3 3 3 X+XX     W    XX  3  XX    K     XX3X 3 3 3 3 3X   ', 64);
  fp[(4) - 1] = R.trunc('   X          X3XX         XX3 + 3XX         XX+X          X    ', 64);
  fp[(5) - 1] = R.trunc('+   X3 3 3 3 3 X+XX   3    XX  3  XX    3   XX3X 3 3 3 3 3X    +', 64);
  fp[(6) - 1] = R.trunc('#    X          X3XX       XX  +  XX       XX+X          X     #', 64);
  fp[(7) - 1] = R.trunc('##    X3 3 3 3 3 X+XX      XX  3  XX      XX3X 3 3 3 3 3X     ##', 64);
  fp[(8) - 1] = R.trunc('C##    X          X3XX     XX3 + 3XX     XX+X          X     ##C', 64);
  fp[(9) - 1] = R.trunc('+###    X3 3 3 3 3 X+XX    XX  3  XX    XX3X 3 3 3 3 3X     ###+', 64);
  fp[(10) - 1] = R.trunc(' ####    XI I I I I X3XX   XX  +  XX   XX+X I I I I IX     #### ', 64);
  fp[(11) - 1] = R.trunc(' #####    X3 3 3 3 3 X+XX  XX  3  XX  XX3X 3 3 3 3 3X     ##### ', 64);
  fp[(12) - 1] = R.trunc(' ######    X          X3XX XX  +  XX XX+X          X     ###### ', 64);
  fp[(13) - 1] = R.trunc(' #######    X3 3 3 3 3 X+XXXX  X  XXXX3X 3 3 3 3 3X     ####### ', 64);
  fp[(14) - 1] = R.trunc(' ########    X          X3XXX  C  XXX+X          X     ######## ', 64);
  fp[(15) - 1] = R.trunc(' #########    X3 3 3 3 3 X+XX  F  XX3X 3 3 3 3 3X     ######### ', 64);
  fp[(16) - 1] = R.trunc(' ##########    X+ + + + +3X3X3 T 3X+X3+ + + + +X     ########## ', 64);
  fp[(17) - 1] = R.trunc(' ###########    X          X       X          X     ########### ', 64);
  fp[(18) - 1] = R.trunc(' ###     ####    X      XXXXXXXXXXXXXXX      X     ###run#for## ', 64);
  fp[(19) - 1] = R.trunc(' ### CCC #####    X     X      S      X     X     ####your##### ', 64);
  fp[(20) - 1] = R.trunc(' ###     ######    X    X             X    X     #####life!#### ', 64);
  fp[(21) - 1] = R.trunc(' ###############    X   X             X   X     ############### ', 64);
  fp[(22) - 1] = R.trunc(' ################    X  X   XXXXXXX   X  X     ################ ', 64);
  fp[(23) - 1] = R.trunc('33333333333333333  3  X+X + XXXPXXX + X+X  3   33333333333333333', 64);
  convert_format();
}
function level9() {
  fp[(1) - 1] = R.trunc('XXXXX+++XX  XXXXXXXX2#XXXXXXXXX3XXXXXXXXXX2XXX XWXXX#######XXXXX', 64);
  fp[(2) - 1] = R.trunc('XXXX+XXX+XXX XXXXX  X2#XXXXXXX# #XXXXXXX#2#XXXXXX X #+++++#XXXXX', 64);
  fp[(3) - 1] = R.trunc('XXXX+XXX+XXXX XXXX XX#2#XXXXXX#3#XXXXXX#2#XXX XWXXXX#++T++#XXXXX', 64);
  fp[(4) - 1] = R.trunc('XXXXX+++XXXXXXX    XXX#2#XXXXX# #XXXXX#2#XXXXXXXXX XD+W+W+#XXXXX', 64);
  fp[(5) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXX#2#XXXX#3#XXXX#2#XXXXXXXX XXX#++T++#XXXXX', 64);
  fp[(6) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXX#2#XXX# #XXX#2#XXXXXXXXXXXXX#+++++#XXXXX', 64);
  fp[(7) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXX#2#XX#3#XX#2#XXXXXXXXCXXXXX#######XXXXX', 64);
  fp[(8) - 1] = R.trunc('XXXWWWWWWWWWWXXXXXXXXXXXXX#2#X# #X#2#XXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(9) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXX       XXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(10) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXX# XXXXX #XXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(11) - 1] = R.trunc('############################ XIIIX #############################', 64);
  fp[(12) - 1] = R.trunc('L1  +1   1   1   1   1   1   XIPIX  1   1   1   1   1    1+   1L', 64);
  fp[(13) - 1] = R.trunc('############################ XIIIX #############################', 64);
  fp[(14) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXX# XXXXX #XXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(15) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXX       XXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 64);
  fp[(16) - 1] = R.trunc('XXXXXXXXXXXX##########XXXXXX### ###X XXX   XXXXXXXX   +  XXXXXXX', 64);
  fp[(17) - 1] = R.trunc('XXXXXXXXXXXX##sm#was##XXXXXXXX#1#XXX XX XXX XXXX XX XXXXX XX XXX', 64);
  fp[(18) - 1] = R.trunc('XXXXXXXXXXXX###here###XXXXXXXX# #XX XX XX I XX+ X X + XXX#X X XX', 64);
  fp[(19) - 1] = R.trunc('XXXXXX XXXXX##########XXXXXXXX#1#XXX  XX XXXXX XX XXX XXX  XXX X', 64);
  fp[(20) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXQXXXX# #XXXXXXX+XXXX XX XXX  XXXXXXXXX ', 64);
  fp[(21) - 1] = R.trunc('XXXXXXXXXXXXX XXXXXXXXXXXXXXXX#1#XX      XX  XX XXXX XXX  XXXX X', 64);
  fp[(22) - 1] = R.trunc('LXXXXXXXXXXXXXXXXXXXXXXXXXXXXX# #XX XXXXXX XXXXX X  XXX XX XXXX ', 64);
  fp[(23) - 1] = R.trunc(' CCCCCXXXXXXXXXXXXXXXXXXXXXXXX#1#XXX   +  XXXXXX  XXXXC XXX    X', 64);
  convert_format();
}
function level11() {
  fp[(1) - 1] = R.trunc('3           3           3+ X +P   1 1 1 1 1 1 1 1 1 1 1 1 1 1 1K', 64);
  fp[(2) - 1] = R.trunc('       3           3       X   ## # # # # # # # # # # # # # # ##', 64);
  fp[(3) - 1] = R.trunc('  3           3          + X   # # # # # # #C# # # #W# # # #+# #', 64);
  fp[(4) - 1] = R.trunc('         3           3     XFFF#################D###############', 64);
  fp[(5) - 1] = R.trunc('    3           3        + X    3  3  3  3  3XX#++++++++++++++++', 64);
  fp[(6) - 1] = R.trunc('           3           3   X                 XX#111111111111111C', 64);
  fp[(7) - 1] = R.trunc('      3           3      + X                 XX#111111111111111L', 64);
  fp[(8) - 1] = R.trunc(' 3           3             X                 XX#############D###', 64);
  fp[(9) - 1] = R.trunc('        3           3    + X          3      XXXXXXXXXXXXXXXXXXX', 64);
  fp[(10) - 1] = R.trunc('   3           3           X                                    ', 64);
  fp[(11) - 1] = R.trunc('          3           3  + X                                    ', 64);
  fp[(12) - 1] = R.trunc('     3           3         X                       RRRRR        ', 64);
  fp[(13) - 1] = R.trunc('3           3           3+ X                      RRRRRRRRR     ', 64);
  fp[(14) - 1] = R.trunc('       3           3       X         3             RRRRRRTT.    ', 64);
  fp[(15) - 1] = R.trunc('  3           3          + X                        RRRRRRRRR   ', 64);
  fp[(16) - 1] = R.trunc('         3           3     X                           RRRRR    ', 64);
  fp[(17) - 1] = R.trunc('    3           3        + X                                    ', 64);
  fp[(18) - 1] = R.trunc('           3           3   X                         3          ', 64);
  fp[(19) - 1] = R.trunc('      3           3      + X  3                                 ', 64);
  fp[(20) - 1] = R.trunc(' 3           3             X                                    ', 64);
  fp[(21) - 1] = R.trunc('        3           3    + X                  XXXXXXXXXXXXXXXXXX', 64);
  fp[(22) - 1] = R.trunc('   3           3           X                  XIIIIIIIIIIIIIIIII', 64);
  fp[(23) - 1] = R.trunc('          3           3  + X +  3   3   3     XI+ + + +WW+ + + +', 64);
  convert_format();
}
function level12() {
  fp[(1) - 1] = R.trunc('333          F    .        RRRRRRRRR       .              3 XXX ', 64);
  fp[(2) - 1] = R.trunc('3######D######            RRRRRRRRR     3                   XKX ', 64);
  fp[(3) - 1] = R.trunc('3#3.........3#    3      RRRRRRRRR.           3     .       XXX ', 64);
  fp[(4) - 1] = R.trunc(' #...........# .      .  RRRRRRRRRR       .                  .  ', 64);
  fp[(5) - 1] = R.trunc(' #....+L+....#          RRRRRRRRRRRR   3            .    3      ', 64);
  fp[(6) - 1] = R.trunc(' #3.........3#     .    RRRRRRRRRRRRR           .               ', 64);
  fp[(7) - 1] = R.trunc('F#############         RRRRRRRRRRRRRRR       3               3  ', 64);
  fp[(8) - 1] = R.trunc('               3      RRRRRRRRRRRRRRRRR.                   .    ', 64);
  fp[(9) - 1] = R.trunc('    .              .RRRRRR########RRRRRRR            ##D##      ', 64);
  fp[(10) - 1] = R.trunc('            .    RRRRRR#####  P  .##RRRRRR    .      ##1##      ', 64);
  fp[(11) - 1] = R.trunc('   3             RRRRR##           ##RRRRRR          ##1##      ', 64);
  fp[(12) - 1] = R.trunc(' .              RRRRR##  2   1  2  3##RRRRRR.  3     ##1##      ', 64);
  fp[(13) - 1] = R.trunc('      .        RRRRR## 3  12  3   13 ##RRRRRR    ######I######  ', 64);
  fp[(14) - 1] = R.trunc('3             .RRRR##3  23  31 2 3  2##RRRRRR    #+XXXXXXXXX+#  ', 64);
  fp[(15) - 1] = R.trunc('         3    RRRRRR##12  3 2 2 3  1##RRRRRR     #XXXWXXXWXXX#  ', 64);
  fp[(16) - 1] = R.trunc('              RRRRRRR###XXXXXXXXXXX##RRRRRR    . #XXXXXXXXXXX#  ', 64);
  fp[(17) - 1] = R.trunc(' .         .   RRRRRRRR#######K+WT##RRRRRR       #XXXXXWXXXXX#  ', 64);
  fp[(18) - 1] = R.trunc('                RRRRRRRRRRRR#######RRRRRR  .     #XXXXXXXXXXX#  ', 64);
  fp[(19) - 1] = R.trunc('  3        3       .RRRRRRRRRRRRRRRRRRR         3#XXXXX.XXXXX#  ', 64);
  fp[(20) - 1] = R.trunc('       .              RRRRRRRRRRRRRRR.      3    #XXXXXXXXXXX#  ', 64);
  fp[(21) - 1] = R.trunc('               .        RRRRRRRRRRRRR         .  #+XXWC.CWXX+#  ', 64);
  fp[(22) - 1] = R.trunc(' .          .      3      RRRRRRRRRRRRR    .     ############# +', 64);
  fp[(23) - 1] = R.trunc('          3       .        .RRRRRRRRRRRRR                    + .', 64);
  convert_format();
}
function level14() {
  fp[(1) - 1] = R.trunc('RRRRRRR.                   K                  .RRRRRRRRRRRRRRRRR', 64);
  fp[(2) - 1] = R.trunc('RRRR+                                              +RRRRRRRRRRRR', 64);
  fp[(3) - 1] = R.trunc('RR      2       2       2       2       2       2        RRRRRRR', 64);
  fp[(4) - 1] = R.trunc('.                                                              .', 64);
  fp[(5) - 1] = R.trunc('.                                                               ', 64);
  fp[(6) - 1] = R.trunc('RRRRRRR+                                                        ', 64);
  fp[(7) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRR+                                .', 64);
  fp[(8) - 1] = R.trunc('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(9) - 1] = R.trunc('.  3                   .RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR', 64);
  fp[(10) - 1] = R.trunc('                          RRRRR3 . . . . . . . . . . . . RRRRRRR', 64);
  fp[(11) - 1] = R.trunc('                            RRRR. . . . . .K. . . . . . . . . .+', 64);
  fp[(12) - 1] = R.trunc('.                           .RRRRR . . . . . . . . . . . . . . .', 64);
  fp[(13) - 1] = R.trunc('#########################FFFFFRRRRR . . . . . . . . . . . ......', 64);
  fp[(14) - 1] = R.trunc('#C+222222222#3333333333L#      RRRRRR. . . . . . . . .+. . .....', 64);
  fp[(15) - 1] = R.trunc('#+2222222222#33333333333#         RRRRRR. . . . . . . . . .....C', 64);
  fp[(16) - 1] = R.trunc('#22222222222#33333333333#            RRRRRRR+. . . . . . . .....', 64);
  fp[(17) - 1] = R.trunc('#22222222222D33333333333#               RRRRRRR . . . . . ......', 64);
  fp[(18) - 1] = R.trunc('#D#######################                  .RRRRR. . . . . . . .', 64);
  fp[(19) - 1] = R.trunc('#11111111111D           X                     RRRRR . . . . . . ', 64);
  fp[(20) - 1] = R.trunc('#11111111111#           X                      RRRRRRR . . . . .', 64);
  fp[(21) - 1] = R.trunc('#+1111111111#S          X                         3RRRRR. . . . ', 64);
  fp[(22) - 1] = R.trunc('#C+111111111#          PX                           RRRRRRR. .K.', 64);
  fp[(23) - 1] = R.trunc('#########################                             .RRRRRR . ', 64);
  convert_format();
}
function level16() {
  fp[(1) - 1] = R.trunc('##################+++++++++##   ##########2   2######RRRRRRRRRRR', 64);
  fp[(2) - 1] = R.trunc('###C+TWK.FS+XXXXXX++++W++++# ### ######2    .     #####RRRRRRRRR', 64);
  fp[(3) - 1] = R.trunc('###############2##+++++++++#   ## #     ##2   2###2######RRR####', 64);
  fp[(4) - 1] = R.trunc('####WWW#########2#####D# # ### ### ################ #########W##', 64);
  fp[(5) - 1] = R.trunc('####WWWD  2    ##2#### ## # ## ######   # ##+C+####   WFDXX.XXDL', 64);
  fp[(6) - 1] = R.trunc('####WWW######## ##2###2###2#2# ##### ### # #+C+###33#########+##', 64);
  fp[(7) - 1] = R.trunc('################ ##2## #### ## #### ###### ##D###33########T####', 64);
  fp[(8) - 1] = R.trunc('##WI############# #### ### # ## ## #### # ###C##33##XXXXXX#+####', 64);
  fp[(9) - 1] = R.trunc('#KCIX3 3 3 3 3 3X      ###2## ##22#### # ###.##33##XXXXX#3#2####', 64);
  fp[(10) - 1] = R.trunc('##WI##############F###########T###### #######D33##XXXXX##3#2####', 64);
  fp[(11) - 1] = R.trunc('################## # ### ### ### ### 3333333333###++C++##3#X####', 64);
  fp[(12) - 1] = R.trunc('##########        PI# # # # # # # # ##################### #X####', 64);
  fp[(13) - 1] = R.trunc('#####      ########### ### ### ### # #################.......###', 64);
  fp[(14) - 1] = R.trunc('#### RRRR ######3####################     2     2     .....WK###', 64);
  fp[(15) - 1] = R.trunc('### RRXXRR ####3##                ####################.......###', 64);
  fp[(16) - 1] = R.trunc('### RRX XRR ##3### ##############S##############################', 64);
  fp[(17) - 1] = R.trunc('## RRXCCCXRR  #### ##             ###+W+K+W+####beware#####  X##', 64);
  fp[(18) - 1] = R.trunc('##2RRXCCCXRRR2#### ## ##################.################# ##X##', 64);
  fp[(19) - 1] = R.trunc('### RXX XRRR #        ##X#X#X#X#3#3#3#3#3#3#3#3#3#3#3#3#3 ###X##', 64);
  fp[(20) - 1] = R.trunc('### RRRXXRR #########F# # # # # # # # # # # # # # # # # # #+#.#+', 64);
  fp[(21) - 1] = R.trunc('#### RRRRR+##C 2  2   ## # # # # # # # # # # # # # # # # ##WTKTW', 64);
  fp[(22) - 1] = R.trunc('#####+++W############ # # # # # # # # # # # # # # # # # # ######', 64);
  fp[(23) - 1] = R.trunc('#####################                                  . . +++KC', 64);
  convert_format();
}
function level18() {
  fp[(1) - 1] = R.trunc('L#  2   2  22 ##...  ...##WWWW###X3X3X3X3X3X3X3X3X3X3X3X3X3X3X3C', 64);
  fp[(2) - 1] = R.trunc('+#2 2  22  2 2+F . .. ..##      +3+3+3+3+3+3+3+3+3+3+3+3+3+3+3+3', 64);
  fp[(3) - 1] = R.trunc('+# 2    2 2   ##.+..  ..##    #####################C############', 64);
  fp[(4) - 1] = R.trunc('1# 2 2 2 2  2 ##...... .##    ###++X          2                S', 64);
  fp[(5) - 1] = R.trunc('1#2     2     ##..... ..##    #l#++X                    2      W', 64);
  fp[(6) - 1] = R.trunc('1###########+###....+...##    #e###W############################', 64);
  fp[(7) - 1] = R.trunc('1#            ##.... ...      #v#1               ##            S', 64);
  fp[(8) - 1] = R.trunc('D#  33333333  ##++..  . ##1111#e#1               ##             ', 64);
  fp[(9) - 1] = R.trunc('C#            ##++.... .##1111#l#1               WW   1         ', 64);
  fp[(10) - 1] = R.trunc('1# ####################################################### #####', 64);
  fp[(11) - 1] = R.trunc('1#  I        3               K#o#KXWX+XWX+XWX+XW               W', 64);
  fp[(12) - 1] = R.trunc('1##############################f#############################X##', 64);
  fp[(13) - 1] = R.trunc('1#S                           ###  1  33  2  1   33 2 1  33 2 1 ', 64);
  fp[(14) - 1] = R.trunc('1# XXXXXXXXXXXXXXXXXXXXXXXXXX #p#   1   3    RRRRRRRR  2   2    ', 64);
  fp[(15) - 1] = R.trunc('D# X                        X #e# 3  3  RRRRRRRRRRRRRRRR 1   1  ', 64);
  fp[(16) - 1] = R.trunc('Q# X XXXXXXXXXXXXXXXXXXXXXX X #r#  3   1  +RRRRRRRRRRRRRRRRR    ', 64);
  fp[(17) - 1] = R.trunc('1# X X  W                CX X #i# 1  3   +RRRRRRRRRRRRRRRRW 1   ', 64);
  fp[(18) - 1] = R.trunc('1# X X XXXXXXXXXXXXXXXXXXXX X #l#     RRRRRRRRRRRRRRRRR++++ 2 2 ', 64);
  fp[(19) - 1] = R.trunc('1# X X                      X ###  1 RRRRRRRRRRRRRRRRRRRR++1   W', 64);
  fp[(20) - 1] = R.trunc('1# X XXXXXXXXXXXXXXXXXXXXXXXX ###     RRRRRRRRRRRRRRRRRRRRR   2 ', 64);
  fp[(21) - 1] = R.trunc('1# X                          +++         RRRRRRRRRRRRRRRRRRRR  ', 64);
  fp[(22) - 1] = R.trunc('D# XXXXXXXXXXXXXXXXXXXXXXXXXXX###    1  1  2 WRRRRRRRRRRRRR 1 2W', 64);
  fp[(23) - 1] = R.trunc('..                           P### 2    2    +RRRRRRRRRRRRRRR  WK', 64);
  convert_format();
}
function level20() {
  fp[(1) - 1] = R.trunc('..LLLL..###+                            +  . .   .   .   .    C ', 64);
  fp[(2) - 1] = R.trunc('..LLLL.. D                 +                   .    .  .   .  . ', 64);
  fp[(3) - 1] = R.trunc('..LLLL..###3 3 3 3 3 3 3                    .    . .     .      ', 64);
  fp[(4) - 1] = R.trunc('#################################  #############################', 64);
  fp[(5) - 1] = R.trunc('X  XX   X X X##CCCCC  X X X X X X X X X X X X X X X X X X X     ', 64);
  fp[(6) - 1] = R.trunc(' XX   XX X X+##3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#   ', 64);
  fp[(7) - 1] = R.trunc(' XXXXXXX XXXX## 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3   ', 64);
  fp[(8) - 1] = R.trunc('X XX+XX XX  X#################################################  ', 64);
  fp[(9) - 1] = R.trunc('X XX+XXX  XX  TD3I                      .         W      ++     ', 64);
  fp[(10) - 1] = R.trunc('  ##############################################################', 64);
  fp[(11) - 1] = R.trunc('      3     3    ##K                3                 I         ', 64);
  fp[(12) - 1] = R.trunc('     3 3   3 3   #############################################  ', 64);
  fp[(13) - 1] = R.trunc('    3   3 3   3 3##    3        3    3  33     3    3   3XXXXX  ', 64);
  fp[(14) - 1] = R.trunc('   3     3     3 ##  3  3     3   3       3   3    3     #####  ', 64);
  fp[(15) - 1] = R.trunc('XX#################3      33     3    3     3     3    3 ##+  3 ', 64);
  fp[(16) - 1] = R.trunc('                             3      3      3    3    3  W##     ', 64);
  fp[(17) - 1] = R.trunc('   XXXXXXXXXXXX       3  3  3  3   3   3     3   3    3WW##     ', 64);
  fp[(18) - 1] = R.trunc('###############  ##########################################     ', 64);
  fp[(19) - 1] = R.trunc('Q.X.X.X.X.X.X.X  F                     C     3  3       K##   33', 64);
  fp[(20) - 1] = R.trunc('###########################################################  ###', 64);
  fp[(21) - 1] = R.trunc(' +##   +##3    +     +##I  ##+   3+##+  ##+    3  +##W  +##3 XX ', 64);
  fp[(22) - 1] = R.trunc('P       ##     ##     ##    3      ##   + 3   ##   ##    ##  XX ', 64);
  fp[(23) - 1] = R.trunc(' +##    FF    3##+    3    ##+       3  ##   +## 3  +    +     3', 64);
  convert_format();
}
function level21() {
  fp[(1) - 1] = R.trunc('+ + + + + + + + + + + + + + + + +XXXRRRRRRRRR##K111111111111111C', 64);
  fp[(2) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXRRRRRRRRR###111111111111111111', 64);
  fp[(3) - 1] = R.trunc('XXXXXRRRRRXXXXXXXXXXXXWXXXXXXXXXRRRRRRRR###111111111111111111111', 64);
  fp[(4) - 1] = R.trunc('XXRRRRRRRRRRRXWXXXXXXXXXXXXXXXRRRRRRRR###11111111111111111111111', 64);
  fp[(5) - 1] = R.trunc('XXWRRRRRRRRRRRRRXXXXXXXXXXWXRRRRRRRR####1111111111B1111111111111', 64);
  fp[(6) - 1] = R.trunc('XXRRRRRRRRRRRRXXXXXXXXXXXXRRRRRRRR####11111111111111111111111111', 64);
  fp[(7) - 1] = R.trunc('XXXRRRRRRRRRRRRXXXXWXXXXXRRRRRRRRRRR###1111111111111111111111111', 64);
  fp[(8) - 1] = R.trunc('XXXXXRRRRRRRRRRRRXXXXXXXXXCRRRRRRRRRRR###11111111111111111111111', 64);
  fp[(9) - 1] = R.trunc('XXXXXXXXRRRRRRXXXXXXXXXXXXCRRRRRRRRRRRR###1111111111111111111111', 64);
  fp[(10) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXX###########################XXXXXXXXXXXXXXX', 64);
  fp[(11) - 1] = R.trunc('P      F               FI  .  I  .  I  .  I  . I               W', 64);
  fp[(12) - 1] = R.trunc('X XXXXXXXXXXXXXXXXXXXX###########################XXXXXXXXXXXXXXX', 64);
  fp[(13) - 1] = R.trunc('XFXXXXXXXXXX   F     XXXXXXXXXXXRRRRRRRRRRRRR###1111111111111111', 64);
  fp[(14) - 1] = R.trunc('X XX   F   X XXXXXXX        XXXXXRRRRRRRRRRR###11111111111111111', 64);
  fp[(15) - 1] = R.trunc('X XX XXXXX X XXXXXXXXXXXXXX   +XRRRRRRRRRRRRR###1111111111111111', 64);
  fp[(16) - 1] = R.trunc('X    XXXXX X    +XXXXX      XXXRRRRRRRRRRRR###111111111111111111', 64);
  fp[(17) - 1] = R.trunc('XXXXXXXXXX X XXXXXXXXX XXXXXXRRRRRRRRRRRR###11111111111111111111', 64);
  fp[(18) - 1] = R.trunc('XXXXXXX+   X XXXX      XXXRRRRRRRRRRRRR###1111111111111111111111', 64);
  fp[(19) - 1] = R.trunc('XX    XXXX   XXXX XXXXXRRRRRRRRRRRRR####111111111111111111#####X', 64);
  fp[(20) - 1] = R.trunc('XX XX XXXXXXXXXXX XXXRRRRRRRRRRR######11111111111B11111111X+++++', 64);
  fp[(21) - 1] = R.trunc('   XX             XRRRRRRRRRR#####111111111111111111111111#+++++', 64);
  fp[(22) - 1] = R.trunc(' ################RRRRRRRRRR####111111111111111111111111111#+++++', 64);
  fp[(23) - 1] = R.trunc('  1  1  1  1  CRRRRRRRRR#####LD111111111111111111111111111#+++++', 64);
  convert_format();
}
function level23() {
  fp[(1) - 1] = R.trunc('W   2     K   +      VVV#XC  2        #VVVV2 + XVV+             ', 64);
  fp[(2) - 1] = R.trunc('  VVVVV#            2#VVVVVVV   T     VVVV     VVVVW       K## +', 64);
  fp[(3) - 1] = R.trunc(' +#VVVVV#      #VV   VVVVVV      VV#           WVVVV#2     ###  ', 64);
  fp[(4) - 1] = R.trunc(' VVVVV#  2    VVVVV    #VVV +    VVVV2  #VVV2  VVVVVVV   2VV##  ', 64);
  fp[(5) - 1] = R.trunc('      +       V+VVVV  W    VVV#   #V   VVVVV#     XX   #VVVV##2 ', 64);
  fp[(6) - 1] = R.trunc('          2    VVVW2     2VVVVVV  2 +  +VVVVVV#2#VVV  +VVVVV##  ', 64);
  fp[(7) - 1] = R.trunc('  ############################################################+ ', 64);
  fp[(8) - 1] = R.trunc('      XXXXXXXXX  ++++  XXXXXXXX T K T XXXXXXXXX  C  XXXXWWWW##  ', 64);
  fp[(9) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX##  ', 64);
  fp[(10) - 1] = R.trunc(' 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 IIIII## 2', 64);
  fp[(11) - 1] = R.trunc('2222222222222222222222222222222222222222222222222222222IIIII##  ', 64);
  fp[(12) - 1] = R.trunc('#############################D################################  ', 64);
  fp[(13) - 1] = R.trunc('S2  2  2  2  2###+2222222K###   2               2           ## +', 64);
  fp[(14) - 1] = R.trunc('              ###222222222### VVVV      2           VVVVVV  ##  ', 64);
  fp[(15) - 1] = R.trunc('              ###2222222222DF  VVVVVVVVVVVVVV2  +VVVVVVVVVV ##  ', 64);
  fp[(16) - 1] = R.trunc('              ###222222222### VVVVVVVVVVVVVVVVVVVVVVVVVVVV  ##2 ', 64);
  fp[(17) - 1] = R.trunc('              ###2222B2222###  VVVVVVVVVVVVVVVVVVVVVVVVVV   ##  ', 64);
  fp[(18) - 1] = R.trunc('              ###222222222###    .VVVVVVVVVVVVVVVVVVVVVVVVV ##+ ', 64);
  fp[(19) - 1] = R.trunc('               D2222222222###  2VVVVVVVVVVcarefulVVVVVVVVVVV##  ', 64);
  fp[(20) - 1] = R.trunc('              ###222222222### 2  VVVVVVVVVVVVVVVVVVVVVVVV+++## 2', 64);
  fp[(21) - 1] = R.trunc('P            K###C2222222+###      TVVVVVVVVVVVVVVVVVVVKC+++##  ', 64);
  fp[(22) - 1] = R.trunc('##############################################################  ', 64);
  fp[(23) - 1] = R.trunc('LLD+D      2++++        .  2+++             2++             ID +', 64);
  convert_format();
}
function level25() {
  fp[(1) - 1] = R.trunc('CCWXXVVVV11111111111111111RRRRRRRT                             P', 64);
  fp[(2) - 1] = R.trunc('CCTXVVVVVV1111111111111111111RRRRRRR          3VVV3             ', 64);
  fp[(3) - 1] = R.trunc('WTVVVVVV1                  1RRRRRRRT          3VVVVV3           ', 64);
  fp[(4) - 1] = R.trunc('XXVVVVVVV1    3RRRR          1RRRRRRRR          3VVVVV3         ', 64);
  fp[(5) - 1] = R.trunc('XXVVVVV1    3RRRRR3      3     1RRRRRRRRRW     3VVVVV3          ', 64);
  fp[(6) - 1] = R.trunc('VVVVV1      RRRRRRRRR3            1RRRRRRRRRRW   3VVV3          ', 64);
  fp[(7) - 1] = R.trunc('VVV1          3RRRRRRRRR3    3       1RRRRRRRRRR                ', 64);
  fp[(8) - 1] = R.trunc('V1      3      3RRRRRRRRRRR         1RRRRRRRRRRRRR33333333333333', 64);
  fp[(9) - 1] = R.trunc('1                   3RRRRR3             1RRRRRRRRRRRR33333333333', 64);
  fp[(10) - 1] = R.trunc('1                  RRRR3            3      1RRRRRRRRRR3333333333', 64);
  fp[(11) - 1] = R.trunc('1   3                                          1RRRRRRRRRR333333', 64);
  fp[(12) - 1] = R.trunc('1              #############D#############         1RRRRRRRRR333', 64);
  fp[(13) - 1] = R.trunc('1              #B K  F  B  XKX  B  F  K B#            1RRRRRRRRK', 64);
  fp[(14) - 1] = R.trunc('1          3   ###########################      3        1RRRRRR', 64);
  fp[(15) - 1] = R.trunc('11                                                           1RR', 64);
  fp[(16) - 1] = R.trunc('111                         3                                  1', 64);
  fp[(17) - 1] = R.trunc('1111             3                                     3      11', 64);
  fp[(18) - 1] = R.trunc('11111    3                             3                     111', 64);
  fp[(19) - 1] = R.trunc('111111                                                      1111', 64);
  fp[(20) - 1] = R.trunc('1111111111111111111111111111111111111111111111111111111111111111', 64);
  fp[(21) - 1] = R.trunc('1111111111111111111111111111111111111111111111111111111111111111', 64);
  fp[(22) - 1] = R.trunc('111111111111111111111111111111111111111111111111111111111#######', 64);
  fp[(23) - 1] = R.trunc('+ . + . + . + . + . + . + . + . + . + . + . + . + . + . +DWD+DLL', 64);
  convert_format();
}
function level27() {
  fp[(1) - 1] = R.trunc('IDK3 3 3 3 VK3 3 3 3 VK3 3 3 3 VK3 3 3 3 VK3 3 3 3 VK3 3 3 3 D  ', 64);
  fp[(2) - 1] = R.trunc('F#3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V  ', 64);
  fp[(3) - 1] = R.trunc('F# 3 3 3 3 D 3 3 3 3 V 3 3 3 3 V 3 3 3 3 V 3 3 3 3 V 3 3 3 3 V  ', 64);
  fp[(4) - 1] = R.trunc('F#3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V  ', 64);
  fp[(5) - 1] = R.trunc('F# 3 3B3 3 V 3 3B3 3 D 3 3B3 3 V 3 3B3 3 V 3 3B3 3 V 3 3B3 3 V  ', 64);
  fp[(6) - 1] = R.trunc('F#3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V  ', 64);
  fp[(7) - 1] = R.trunc('W# 3 3 3 3 V 3 3 3 3 V 3 3 3 3 D 3 3 3 3 V 3 3 3 3 V 3 3 3 3 V  ', 64);
  fp[(8) - 1] = R.trunc('W#3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3V3 3 3 3 3D3 3 3 3 3V  ', 64);
  fp[(9) - 1] = R.trunc('+# 3 3 3 3 V 3 3 3 3 V 3 3 3 3 V 3 3 3 3 D 3 3 3 3 V 3 3 3 3 V  ', 64);
  fp[(10) - 1] = R.trunc('+#VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVDD', 64);
  fp[(11) - 1] = R.trunc('+3##KK  3   3    3   XF V V V V VVV   VVVV                      ', 64);
  fp[(12) - 1] = R.trunc('+#3##C 3 3      3    VVV V V V V VV V VVVV  VVVVVVVVVVVVVVVVVV  ', 64);
  fp[(13) - 1] = R.trunc('+##3## 3  3  3     3 VVVVVVVVVVVV V V VVVV    3      3     3WV  ', 64);
  fp[(14) - 1] = R.trunc('+3##3##    3    3    VVV    .  +  V V   VV      3      3    +V  ', 64);
  fp[(15) - 1] = R.trunc('+#3##3## 3  3     3  VV VVVVVVVVVVV VVV VV  3  3    3       +V  ', 64);
  fp[(16) - 1] = R.trunc('+##3##3##     3      V VVVVV    VVV V   VV                3 +V  ', 64);
  fp[(17) - 1] = R.trunc('+3##3##3## 3   3 3   V V  VV VV  VV V VVVV   3   3    3     +V  ', 64);
  fp[(18) - 1] = R.trunc('+#3##3##3##  3     3 V  V VV +VV  V V VV           3     3  +V  ', 64);
  fp[(19) - 1] = R.trunc('+##3##3##3##3   3    V+VV    +VVV   V    V 3      3     3   WV  ', 64);
  fp[(20) - 1] = R.trunc('+#VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV  ', 64);
  fp[(21) - 1] = R.trunc('+#   + 3   3   3  +    3     + 3 +  3 +3      3 +      + 3   3  ', 64);
  fp[(22) - 1] = R.trunc('+#      + 3  +   +  3+   3+   3    +3    3 +   3 +  3 +   +     ', 64);
  fp[(23) - 1] = R.trunc('L#P     3   +   3    3+    3  +  3   +      3 +    3     3  +   ', 64);
  convert_format();
}
function level29() {
  fp[(1) - 1] = R.trunc('P W W W W W W W W W W W W W W W W W W W W W W W W W W W W W W#LL', 64);
  fp[(2) - 1] = R.trunc('/////////////////////////////////////////////////////////////#DD', 64);
  fp[(3) - 1] = R.trunc('/////////////////1/////////\\\\///////////1//////////////////\\\\#I1', 64);
  fp[(4) - 1] = R.trunc('//////////////////////////\\\\\\\\\\/////////////////////////\\\\\\\\\\#I1', 64);
  fp[(5) - 1] = R.trunc('//////\\\\\\//////1////////\\\\\\\\\\\\///////////////1///////\\\\\\\\\\\\\\\\#1I', 64);
  fp[(6) - 1] = R.trunc('///\\\\\\\\\\\\\\///////////////\\\\\\\\\\\\\\///////////////////\\\\\\\\\\\\\\\\\\\\#I1', 64);
  fp[(7) - 1] = R.trunc('//\\\\\\\\\\\\\\\\\\\\///////////////\\\\\\//////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\#I1', 64);
  fp[(8) - 1] = R.trunc('////\\\\\\\\\\\\////1///////////////////////////////\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#1I', 64);
  fp[(9) - 1] = R.trunc('/////////////////////////////////RRR///////\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\#1I', 64);
  fp[(10) - 1] = R.trunc('///////#X#/////////////////////RRRRRRRR//\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#I1', 64);
  fp[(11) - 1] = R.trunc('///////#+#///////////////////RRRRRRRRRRR\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#I1', 64);
  fp[(12) - 1] = R.trunc('///////#+#//////1//////////RRRRRRRRRRRR\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#1I', 64);
  fp[(13) - 1] = R.trunc('///////#C#////////////////RRRRRRRRRR+X\\\\\\\\\\\\\\\\\\\\\\#####\\\\\\\\\\\\\\#I1', 64);
  fp[(14) - 1] = R.trunc('///////#+#//////////////RRRRRRRRRK+++X\\\\1\\\\\\\\\\\\\\\\#CCC#\\\\\\\\\\\\\\#I1', 64);
  fp[(15) - 1] = R.trunc('///////#+#///////////\\\\\\\\RRRRRWWW++++X\\\\\\\\\\\\\\\\\\\\\\#CCC#\\\\\\\\\\\\\\#1I', 64);
  fp[(16) - 1] = R.trunc('///////#X#//////\\\\\\\\\\\\\\\\\\\\\\RRXXXXXXXXX\\\\\\\\\\\\\\\\1\\\\##D##\\\\\\\\\\\\\\#I1', 64);
  fp[(17) - 1] = R.trunc('////////\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\111\\\\\\\\\\\\\\\\#I1', 64);
  fp[(18) - 1] = R.trunc('///\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#I1', 64);
  fp[(19) - 1] = R.trunc('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#1I', 64);
  fp[(20) - 1] = R.trunc('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#1I', 64);
  fp[(21) - 1] = R.trunc('\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\#II', 64);
  fp[(22) - 1] = R.trunc(' 1 1   1 1   1    1 1   1   1   1   1 1    1 1   1  1  1  1 1 II', 64);
  fp[(23) - 1] = R.trunc('K    1  1    1 1 11    1 1   1    1  11   1    1  1  11 1   1 IS', 64);
  convert_format();
}
function level31() {
  fp[(1) - 1] = R.trunc('K 3 + 3 3+3  3 3+ 3  # 3  +3  +3 3 + 3 3 +3 3 +3  3VVVXXV3.3.3DL', 64);
  fp[(2) - 1] = R.trunc('3   3  3   3  3 3  3 #  3 3   3 3   3  3  3  3  3 VVVVXVVV33.3##', 64);
  fp[(3) - 1] = R.trunc('3 3   3  3  3   3  3 # 3   3  3  3  3   3  3   3 3 KVVVVVVVVD###', 64);
  fp[(4) - 1] = R.trunc(' 3  3    3 ///3   3  # 3     3 ==  3   3==W===   3VVXXVVVVV3.33.', 64);
  fp[(5) - 1] = R.trunc('3  3 3  3 //////3   3#3  3  3 === 3   3  ====  3 VVVVXXVV33.3.33', 64);
  fp[(6) - 1] = R.trunc(' 3  3  3///\\\\\\/// 3  #  3 3  =====    ======3 3  3VVVVVVVV3.....', 64);
  fp[(7) - 1] = R.trunc('3  3  ///\\\\\\\\\\\\//  3 #3  3 ======== ======3  3  3VVVVVVVVVV3..3.', 64);
  fp[(8) - 1] = R.trunc('3 3  3////\\C\\\\////  3# 3 ========++++=======3  3  VVVVVXVV3.....', 64);
  fp[(9) - 1] = R.trunc(' 3  3////\\\\C\\\\///33  #  3  ======++++======3  3  VVVVVXXVV3....3', 64);
  fp[(10) - 1] = R.trunc('3 3/////\\\\\\C\\\\\\///  3#3   3 3=====++===== 3 3  3VVVVVVXVV3......', 64);
  fp[(11) - 1] = R.trunc(' 3 3//////\\\\\\///3 3  # 3 3 3  +=========== 3  3VVVVVVVVVV3...3..', 64);
  fp[(12) - 1] = R.trunc('3 3  3///\\\\/// 3   3 #3  3   ======== 3 === 3  3VVVXVVVVVV3.....', 64);
  fp[(13) - 1] = R.trunc(' 3 3  3///// 3  3  3 #3 3  3  3== 3  3 3  3 3  3+VVXXVVVVVV3..3.', 64);
  fp[(14) - 1] = R.trunc('.....................#..........................VVXVVVVVXXVV3...', 64);
  fp[(15) - 1] = R.trunc('###############################################VVVVXVVVXQXVV3..3', 64);
  fp[(16) - 1] = R.trunc('............#......................#...........##VVVVVVVVVVV##..', 64);
  fp[(17) - 1] = R.trunc('3 3   3  3  # 3 3  3 +RRRR+ 3  3   #3   33  3  ###############..', 64);
  fp[(18) - 1] = R.trunc(' 3 3 3  3  3#3  3 3 +RRRRRRR+ 3  3 #  3   3   3F X W XD CCC3F...', 64);
  fp[(19) - 1] = R.trunc('3 3  33   3 # 3  3  RRRRRRRRRRR3  3# 3  3 3  3 ###############3.', 64);
  fp[(20) - 1] = R.trunc(' 3 3  3 33 3# 3   3  +RRRRRRRR3 3  #3  3  3 33 ##VVVXVVVVVVV##D#', 64);
  fp[(21) - 1] = R.trunc('3 3 3  3  3 #3  3  3  3+RRRR3  3 3 #  3 3  3P3  VVVXVVVXVVVV3..3', 64);
  fp[(22) - 1] = R.trunc(' 3  3 3 3  3# 3   3 3  3 3   3  3 3# 3   3 33  VVVVVVVVXXVVVV33+', 64);
  fp[(23) - 1] = R.trunc('K3+3 +3 +3 +#+ 3+3 + 3  3+ 3  + 3 +#+  3+  3+ VVAVVVVVVVXVVVVVWC', 64);
  convert_format();
}
function level33() {
  fp[(1) - 1] = R.trunc('K##########B1111111111111111111111111111111111111111B\\\\\\\\\\\\\\\\\\\\K', 64);
  fp[(2) - 1] = R.trunc(' #circle##11111111111111111111111111111111111111111111\\\\\\\\\\\\\\\\\\ ', 64);
  fp[(3) - 1] = R.trunc('+#of#####11111111              B               11111111\\\\\\\\\\\\\\\\+', 64);
  fp[(4) - 1] = R.trunc(' #fate##11111111   RRRRRRRRRRRRRRRRRRRRRRRRRR   11111111\\\\\\\\\\\\\\ ', 64);
  fp[(5) - 1] = R.trunc('+######11111111   RRRRRRRRRRRRRRRRRRRRRRRRRRRR   11111111\\\\\\\\\\\\+', 64);
  fp[(6) - 1] = R.trunc(' #####11111111   RRR###########L############RRR   11111111\\\\\\\\\\ ', 64);
  fp[(7) - 1] = R.trunc('+####11111111   RRR#VV#1111111#D#11111111#VV#RRR   11111111\\\\\\\\+', 64);
  fp[(8) - 1] = R.trunc(' ###11111111   RRR#V1Q#111111111111111111#Q1V#RRR   11111111\\\\\\ ', 64);
  fp[(9) - 1] = R.trunc('+##11111111   RRR#VVVVDVVVVVVVVDVVVVVVVVVDVVVV#RRR   11111111\\\\+', 64);
  fp[(10) - 1] = R.trunc(' #111111111   RRR#++VV11++11++111++111++11VV++#RRR   111111111\\ ', 64);
  fp[(11) - 1] = R.trunc(' 11111==111   RRR#++VVVVVVVVVVVDVVVVVVVVVVVV++#RRR   111==11111 ', 64);
  fp[(12) - 1] = R.trunc(' 1111====11  TRRR#C+XX11++11++111++111++11XX+C#RRRT  11====1111 ', 64);
  fp[(13) - 1] = R.trunc(' 11111==111   RRR#++VVVVVVVVVVVVVVVVVVVVVVVV++#RRR   111==11111 ', 64);
  fp[(14) - 1] = R.trunc(' =111111111   RRR#++XD++111111XPX1111111++DX++#RRR   111111111V ', 64);
  fp[(15) - 1] = R.trunc('+==11111111   RRR#VVVVVVVVVVVVVDVVVVVVVVVVVVVV#RRR   11111111VV+', 64);
  fp[(16) - 1] = R.trunc(' ===11111111   RRR#VV+11111111111111111111+VV#RRR   11111111VVV ', 64);
  fp[(17) - 1] = R.trunc('+====11111111   RRR#KV11111111111111111111VK#RRR   11111111VVVV+', 64);
  fp[(18) - 1] = R.trunc(' =====11111111   RRR###########T############RRR   11111111VVVVV ', 64);
  fp[(19) - 1] = R.trunc('+======11111111   RRRRRRRRRRRR#+#RRRRRRRRRRRRR   11111111VVVVVV+', 64);
  fp[(20) - 1] = R.trunc(' =======11111111   RRRRRRRRR###S###RRRRRRRRRR   11111111VVVVVVV ', 64);
  fp[(21) - 1] = R.trunc('+========11111111                              11111111VVVVVVVV+', 64);
  fp[(22) - 1] = R.trunc(' =========11111111111111111111111111111111111111111111VVVVVVVVV ', 64);
  fp[(23) - 1] = R.trunc('K==========B1111111111111111111111111111111111111111BVVVVVVVVVVK', 64);
  convert_format();
}
function level35() {
  fp[(1) - 1] = R.trunc('2222222RK   .2 2  2 == 2      2     ==   22    /XXXXXQ#C#C#C#2D+', 64);
  fp[(2) - 1] = R.trunc('2222222R#########  ====2VV 2    VV ====2VV    2VVVVVVV#D#D#D#C#W', 64);
  fp[(3) - 1] = R.trunc('2222222RK/\\/\\/\\WV  2== VVVV == VVVV == VVVV2==  2  2  2   2 #I#T', 64);
  fp[(4) - 1] = R.trunc('222P222R#########    2 2VV ====2VV  2   VV ====   2         DF#K', 64);
  fp[(5) - 1] = R.trunc('2222222RLDDDDDDDD2  2    2  ==     2        ==2  2   2     2#C##', 64);
  fp[(6) - 1] = R.trunc('2222222R##########################VVVVVVVVVVVVVVVVVVVVVVFVVVVVVV', 64);
  fp[(7) - 1] = R.trunc('222222KRC+   +   +  B  +   +   + #V+ ===  ====     =====  ==   V', 64);
  fp[(8) - 1] = R.trunc('   RRRRRRRRRRRRRRRRRRRRRRRRRRRR//#V =   == == =====    == = == V', 64);
  fp[(9) - 1] = R.trunc('   R2222222222222222222222222KR//#V ======= = ==K ===== == == =V', 64);
  fp[(10) - 1] = R.trunc('   R22                      22R//#V ===   = ==   =    == === ==V', 64);
  fp[(11) - 1] = R.trunc('   R22                      22R/2#V= == == =========== == === =V', 64);
  fp[(12) - 1] = R.trunc('   R22                      22R//#V== = ====  ==  =  = = == == V', 64);
  fp[(13) - 1] = R.trunc('   R22          \\\\\\         22R//#V  ==     ==  == ==  ==  =  +V', 64);
  fp[(14) - 1] = R.trunc('   R22          \\C\\         22R//#V VVVVVVVVVVVVVVVVVVVVVVVVVVVV', 64);
  fp[(15) - 1] = R.trunc('   R22222       \\\\\\         22R//#2 2 2 2B2 2 2 2 2 2 2 2 /222\\K', 64);
  fp[(16) - 1] = R.trunc('   R ===22                  22R//# 2 2 2 2 2 2 2 2 2 2 2 2/222\\2', 64);
  fp[(17) - 1] = R.trunc('   R +====22                22R2/#2 2 2 2 2 2 2 2 2 2 2 2 /222\\2', 64);
  fp[(18) - 1] = R.trunc('   R ======22               22R//# 2 2 2 2 2 2 2 2 2 2 2 2/222\\2', 64);
  fp[(19) - 1] = R.trunc('   R=K======222222222222222222R//#2 2 2 2 2 2 2 2 2 2 2 2 //////', 64);
  fp[(20) - 1] = R.trunc(' C RRRRRRRRRRRRRRRRRRRRRRRRR  R//# 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2', 64);
  fp[(21) - 1] = R.trunc('   R22222222222222222222222R  R/K#2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 ', 64);
  fp[(22) - 1] = R.trunc('   R+++++++++++++++++++++++R  RXX# 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2', 64);
  fp[(23) - 1] = R.trunc('222                                                           B ', 64);
  convert_format();
}
function level37() {
  fp[(1) - 1] = R.trunc('            W+T           XXXXXXXXX           T+W            D  ', 64);
  fp[(2) - 1] = R.trunc('                          XXXXBXXXX                          #  ', 64);
  fp[(3) - 1] = R.trunc('22############################X############################22#1+', 64);
  fp[(4) - 1] = R.trunc('22#22222222222X2X2X2X2X22/C###X###C/22X2X2X2X2X22222222222#22#  ', 64);
  fp[(5) - 1] = R.trunc('22#22#\\/\\#222#################X#################222#\\/\\#22#22# 1', 64);
  fp[(6) - 1] = R.trunc('WW#22# B #222#            XXXXXXXXX            #222# B #22#WW#  ', 64);
  fp[(7) - 1] = R.trunc('WW#22#   #222#    #########################    #222#   #22#WW#1 ', 64);
  fp[(8) - 1] = R.trunc('WW#22#   #222#   2#K2222222222222222222222#2   #222#   #22#WW#  ', 64);
  fp[(9) - 1] = R.trunc('  #22# 2 #222#  22#22222222222222222222222#22  #222# 2 #22#  # 1', 64);
  fp[(10) - 1] = R.trunc('  #  #   #+++#  22#22222222#######22222222#22  #+++#   #  #  #  ', 64);
  fp[(11) - 1] = R.trunc('  #  # 2 #+++#  22#22222222##+K+##22222222#22  #+++# 2 #  #  #1+', 64);
  fp[(12) - 1] = R.trunc('  #  #   #+++#  22V22B222222D+P+D222222B22V22  #+++#   #  #  #  ', 64);
  fp[(13) - 1] = R.trunc('  #  # 2 #+++#  22#22222222##+++##22222222#22  #+++# 2 #  #  # 1', 64);
  fp[(14) - 1] = R.trunc('  #  #   #   #  22#22222222#######22222222#22  #   #   #  #  #  ', 64);
  fp[(15) - 1] = R.trunc('  #  # 2 #   #  22#22222222222222222222222#22  #   # 2 #  #  #1 ', 64);
  fp[(16) - 1] = R.trunc('  #  #   #   #   2#2222222222222222222222C#2   #   #   #  #  #  ', 64);
  fp[(17) - 1] = R.trunc('  #  #   # S #    ############D############    # S #   #  #  # 1', 64);
  fp[(18) - 1] = R.trunc('  #  #   #   #             DK# #KD             #   #   #  #  #1+', 64);
  fp[(19) - 1] = R.trunc('  #  #   #   ################# #################   #   #  #  #DD', 64);
  fp[(20) - 1] = R.trunc('  #  #XXX#      ====   =         ==   ===    =     #XXX#  #  #DD', 64);
  fp[(21) - 1] = R.trunc('  #  #       ==      =   ====VVV    =     ==   =       #  #  #LL', 64);
  fp[(22) - 1] = R.trunc('  #  ########################VBV########################  #  #  ', 64);
  fp[(23) - 1] = R.trunc('                  222222XXXXXXKXXXXXX222222                  #CC', 64);
  convert_format();
}
function level39() {
  fp[(1) - 1] = R.trunc('C++RRR.2.2\\  W   3   W   KD     W  B#///333333333333333\\KK#     ', 64);
  fp[(2) - 1] = R.trunc('++RRRR2.2.#################X#########///333333333333333\\\\\\#XX#3 ', 64);
  fp[(3) - 1] = R.trunc('+RRRR2.2.2#333333333333333#X#C\\\\\\///////333333333333333333#VI#  ', 64);
  fp[(4) - 1] = R.trunc('+##R2.2.2.#333/////////333#X#\\\\\\\\///////333333333333333333#IV# 3', 64);
  fp[(5) - 1] = R.trunc('#+#2.2.2.2#333/C3223/K/333#X#\\\\\\\\///////333333333333333333#VI#  ', 64);
  fp[(6) - 1] = R.trunc('##2.2.2.2.#333/32332///333#.#XXXXXXXXXX/333333333333333333# V#3 ', 64);
  fp[(7) - 1] = R.trunc('RR.2.2.2.2#333/22322///333#X#XXXXXXXXXX/333333333333333333#V2#  ', 64);
  fp[(8) - 1] = R.trunc('R.2.2.2.2.#333/332B332/333#X#XXXXXXXXXX/333333333333333333# V# 3', 64);
  fp[(9) - 1] = R.trunc('+2.2.2.2.2#333/3233232/333#X#XXXXXXXXXX/################### V#  ', 64);
  fp[(10) - 1] = R.trunc('++2.2.2.2.#333/3223322/333#X#XXXXXXXXXX/#K3..+.+.+===B....#VK#3 ', 64);
  fp[(11) - 1] = R.trunc('+++2.2.2.2\\333/2323233/333\\XXXXXXXXXXXX/#####....====.....# V#  ', 64);
  fp[(12) - 1] = R.trunc('##################\\######################C/B#.....====....#VC# 3', 64);
  fp[(13) - 1] = R.trunc('X222222222222222222222222222222222222222#//##....====.....# V#P ', 64);
  fp[(14) - 1] = R.trunc('X==+++++++++====+++++++++++++++====+++++#22##.....==......#V #  ', 64);
  fp[(15) - 1] = R.trunc('K===XXXXX=========XXXXXXX==XX========## #22##.............#V #DV', 64);
  fp[(16) - 1] = R.trunc('======================================# #DD############## #2V#VD', 64);
  fp[(17) - 1] = R.trunc('2 +=========  2  ============== 2 2==##S# 2#QXXXXXXX#W33  #V #VD', 64);
  fp[(18) - 1] = R.trunc(' 2    2 ===C2===   +=====+ 2    ==   2    +########X##### # V#DV', 64);
  fp[(19) - 1] = R.trunc('+B===    ======== 2   2===    ====+ ===  =====   ##X#W33  #V+#VD', 64);
  fp[(20) - 1] = R.trunc('====+  2   ============   ==+2 ====  =2 2 =====  ##X##### # V#DV', 64);
  fp[(21) - 1] = R.trunc('=K=====  2   +=====2   2 ====  +==     == 2  +2  ##X#W33  #V #DV', 64);
  fp[(22) - 1] = R.trunc('   2====   ==    2   =   W==  =====  ==== =====  ##X##### #XX#VD', 64);
  fp[(23) - 1] = R.trunc(' 2  2  2  =====+    === 2   2    2   +==2  +==            F  #LL', 64);
  convert_format();
}
function level40() {
  fp[(1) - 1] = R.trunc('K++//33X33X33X33X33X33X33X33X+XFX+X33X33X33X33X33X33X33X333//++K', 64);
  fp[(2) - 1] = R.trunc('+B//333X33X33X33X33X33X33X33XSXPXSX33X33X33X33X33X33X33X3333//B+', 64);
  fp[(3) - 1] = R.trunc('+//3333XXXXXX==============VVVVDVVVV==============XXXXXX33333//+', 64);
  fp[(4) - 1] = R.trunc('//33==3333333D33X33X33X33/CVV.....VVC/33X33X33X33D3333333==333//', 64);
  fp[(5) - 1] = R.trunc('/33====3333//RRRRRRRRRRRRRRRRD#D#DRRRRRRRRRRRRRRRR//3333====333/', 64);
  fp[(6) - 1] = R.trunc('333====3333VCRRRCVVV2222222222#B#1111111111VVVCRRRCV3333====3333', 64);
  fp[(7) - 1] = R.trunc('3333==33333VVRRCVVV22222222222###11111111111VVVCRRVV33333==33333', 64);
  fp[(8) - 1] = R.trunc('333333333333VRRVVV2222###################1111VVVRRV3333333333333', 64);
  fp[(9) - 1] = R.trunc('3333333333333RRVV22222#s#///3//+//3///###11111VVRR33333333333333', 64);
  fp[(10) - 1] = R.trunc('3333333333333RRV222222#a#3/RRRRDRRRR/3#t#111111VRR33333333333333', 64);
  fp[(11) - 1] = R.trunc('\\\\33XXX333VVDRR2222222#c#//RRRVVVRRR//#e#1111111RRDVV333XXX333//', 64);
  fp[(12) - 1] = R.trunc('C\\33XBX333V+KVD222B222#r#DDRRRVAVRRRDD#m#111B111DVK+V333XBX333/C', 64);
  fp[(13) - 1] = R.trunc('\\\\33XXX333V+KRR2222222#e#//RRRVVVRRR//#p#1111111RRK+V333XXX333//', 64);
  fp[(14) - 1] = R.trunc('3333333333VV+RRV222222#d#W/RRRRRRRRR/+#l#111111VRR+VV33333333333', 64);
  fp[(15) - 1] = R.trunc('33333333333VVRRVV22222###///W/DWD/+///#e#11111VVRRVV333333333333', 64);
  fp[(16) - 1] = R.trunc('333333333333VRRVVV2222#########D#########1111VVVRRV3333333333333', 64);
  fp[(17) - 1] = R.trunc('3333==3333333RRCVVV222222222\\K#D#K\\111111111VVVCRR3333333==33333', 64);
  fp[(18) - 1] = R.trunc('333====333333RRRCVVV22222222\\K#D#K\\11111111VVVCRRR333333====3333', 64);
  fp[(19) - 1] = R.trunc('/33====333333RRRRRRRRRRRRRRRRRRDRRRRRRRRRRRRRRRRRR333333====333/', 64);
  fp[(20) - 1] = R.trunc('//33==33333333333333333BXXXXXXXSXXXXXXXB33333333333333333==333//', 64);
  fp[(21) - 1] = R.trunc('+//33333333333333333333XXXXXXX+++XXXXXXX333333333333333333333//+', 64);
  fp[(22) - 1] = R.trunc('+B//333333333333333333XXXXXXX+++++XXXXXXX3333333333333333333//B+', 64);
  fp[(23) - 1] = R.trunc('K++//3333333333333333XXXXXXX+++++++XXXXXXX33333333333333333//++K', 64);
  convert_format();
}
function title() {
  let startgame = false;
  let $51, $52, $53, $54, $55, $56, $57, $58, $59;
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
    R.write('CAVERNS OF KROZ II -- UPDATED VOLUME ONE OF THE KROZ SERIES' + '\r\n');
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
  R.gotoxy(30, 1);
  col(4, 7);
  bak(1, 0);
  R.write('\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc\xdc');
  R.gotoxy(30, 3);
  R.write('\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf\xdf');
  R.gotoxy(25, 5);
  col(15, 15);
  R.write('An Apogee Software Production');
  R.gotoxy(28, 7);
  R.write('Created by Scott Miller');
  R.gotoxy(1, 9);
  col(11, 7);
  R.write('  Caverns of Kroz is a game of adventure, exploration and survival.  You\'re a' + '\r\n');
  R.write('  feerless archaeologist in search of the Priceless Amulet,  hidden somewhere' + '\r\n');
  R.write('  deep in the vast and dangerous underground caverns.   You enter the caverns' + '\r\n');
  R.write('  through a secret tunnel and ignite your brass lantern. Your only protection' + '\r\n');
  R.write('  is a worn leather whip and your ingenuity.  Sweat beading on your forehead,' + '\r\n');
  R.write('                you embark on a journey that may be your last...' + '\r\n');
  R.gotoxy(1, 17);
  col(10, 7);
  R.write('         Use the cursor keys to move yourself (');
  col(14, 15);
  R.write('\x02');
  col(10, 7);
  R.write(') through the Caverns.' + '\r\n');
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
      R.gotoxy(30, 2);
      col(R.random(16), 0);
      R.write(' CAVERNS OF KROZ II ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($51 = R.upcase(ch).charCodeAt(0), $51 === 13 || $51 === 78 || $51 === 32 || $51 === 69 || $51 === 65 || $51 === 88)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x = 1; $52 = 28;
  if (x <= $52) for (;;) {
    R.write('  ');
    if (x >= $52) break;
    x++;
  }
  col(30, 31);
  bak(1, 0);
  $53 = R.upcase(ch);
  if ($53 === 'N' || $53 === ' ' || $53 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($53 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($53 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($53 === 'X') {
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
    R.gotoxy(30, 2);
    col(R.random(16), 0);
    R.write(' CAVERNS OF KROZ II ');
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
    R.write('CAVERNS OF KROZ II');
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
    x = 1; $54 = 80;
    if (x <= $54) for (;;) {
      R.write('\xc4');
      if (x >= $54) break;
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
    $55 = R.upcase(ch);
    if ($55 === 'B') {
      x = 100; $56 = 20;
      if (x >= $56) for (;;) {
        y = 10; $57 = 1;
        if (y >= $57) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $57) break;
          y--;
        }
        if (x <= $56) break;
        x--;
      }
      R.nosound();
      startgame = true;
    } else if ($55 === 'I') {
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
      R.write('   Caverns of Kroz is a game of exploration and survival.  Your journey will' + '\r\n');
      R.write(' take you through 40 very dangerous chambers, each riddled with diabolical' + '\r\n');
      R.write(' traps and hideous creatures.   Hidden in the deepest chamber lies a hidden' + '\r\n');
      R.write(' treasure of immense value. Use the cursor pad to move 8 directions.' + '\r\n');
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
      R.write('   Caverns of Kroz will present you with many challenges. You will venture deep' + '\r\n');
      R.write(' underground and probably not make it out alive!' + '\r\n');
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
      R.write(' likely to find in the Caverns of Kroz:' + '\r\n');
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
    } else if ($55 === 'M') {
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
      R.write('   Caverns of Kroz II is a user-supported game.  This means that the creator of' + '\r\n');
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
    } else if ($55 === 'S') {
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
    } else if ($55 === 'O') {
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
    } else if ($55 === 'A') {
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
      x = 100; $58 = 20;
      if (x >= $58) for (;;) {
        y = 10; $59 = 1;
        if (y >= $59) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $59) break;
          y--;
        }
        if (x <= $58) break;
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
  R.write('CAVERNS OF KROZ II');
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
  let $60, $61;
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
  $60 = difficulty;
  if ($60 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($60 === 8) {
    gems = (20) << 16 >> 16;
    whips = (10) << 16 >> 16;
  } else if ($60 === 5) {
    gems = (15) << 16 >> 16;
  } else if ($60 === 2) {
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
  x = 1; $61 = 9;
  if (x <= $61) for (;;) {
    t[(x) - 1] = -(1);
    if (x >= $61) break;
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
  let $62;
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
    ($62 = R.val(fetch), parsed[(counter$2) - 1] = $62[0], test = ($62[1]) << 16 >> 16);
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
  let $63, $64, $65, $66, $67, $68;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$9 = 1; $63 = 999;
  if (x$9 <= $63) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    if (x$9 >= $63) break;
    x$9++;
  }
  new_gem_color();
  x$9 = 2; $64 = 65;
  if (x$9 <= $64) for (;;) {
    y$3 = 2; $65 = 24;
    if (y$3 <= $65) for (;;) {
      pf[(x$9) * 25 + (y$3) - 26] = 0;
      if (y$3 >= $65) break;
      y$3++;
    }
    if (x$9 >= $64) break;
    x$9++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $66 = 83;
  if (obj <= $66) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $67 = parsed[(obj) - 1];
      if (loop$2 <= $67) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $68 = obj;
            if ($68 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($68 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($68 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            }
          }
        } while (!(done));
        if (loop$2 >= $67) break;
        loop$2++;
      }
    }
    if (obj >= $66) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $69, $70, $71;
  xloop$2 = 2; $69 = 65;
  if (xloop$2 <= $69) for (;;) {
    yloop$2 = 2; $70 = 24;
    if (yloop$2 <= $70) for (;;) {
      if ((((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0) || floorpattern) && !(hidelevel))) {
        R.gotoxy(xloop$2, yloop$2);
        $71 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($71 === 0) {
          col(cf1, cf2);
          bak(bf1, bf2);
          R.write(tile);
          bak(0, 0);
        } else if ($71 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($71 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($71 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($71 === 4) {
          if ((level !== 71)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($71 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($71 === 6) {
          if (!(hidestairs)) {
            bak(7, 7);
            col(16, 16);
            R.write('\xf0');
            bak(0, 0);
          }
        } else if ($71 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($71 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($71 === 9) {
          if (!(hidegems)) {
            col(gemcolor, 7);
            R.write('\x04');
          }
        } else if ($71 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($71 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($71 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($71 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($71 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($71 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($71 === 16) {
          if (!(hidetrap)) {
            col(7, 7);
            R.write('\xf9');
          }
        } else if ($71 === 17) {
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
        } else if ($71 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x09');
          }
        } else if ($71 === 19) {
          col(2, 7);
          R.write('\xdb');
          bak(0, 0);
        } else if ($71 === 20 || $71 === 252) {
          col(6, 0);
          bak(2, 7);
          R.write('\x05');
          bak(0, 0);
        } else if ($71 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($71 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($71 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($71 === 24) {
          col(31, 31);
          bak(5, 0);
          R.write('\x0c');
          bak(0, 0);
        } else if ($71 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($71 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($71 === 27) {
          col(14, 7);
          R.write('\x0f');
        } else if ($71 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($71 === 29) {

        } else if ($71 === 30) {

        } else if ($71 === 31) {

        } else if ($71 === 32) {

        } else if ($71 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($71 === 35) {
          if (!(hidecreate)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($71 === 33 || $71 === 37 || $71 === 39 || $71 === 67 || ($71 >= 224 && $71 <= 231)) {

        } else if ($71 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($71 === 222) {
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
      if (yloop$2 >= $70) break;
      yloop$2++;
    }
    if (xloop$2 >= $69) break;
    xloop$2++;
  }
  floorpattern = false;
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $72;
    R.sound(540);
    R.delay(40);
    x = 1; $72 = 4;
    if (x <= $72) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x >= $72) break;
      x++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $73, $74;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($73 = key.charCodeAt(0), $73 === 72 || $73 === 80 || $73 === 77 || $73 === 75 || $73 === 71 || $73 === 79 || $73 === 73 || $73 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $74 = key.charCodeAt(0);
      if ($74 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($74 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($74 === 43) {
        foundset = R.EMPTY;
        flash(13, 25, 'Newly found object desciptions are reset.');
      } else if ($74 === 45) {
        foundset = R.setOf(0, 255);
        flash(10, 25, 'References to new objects will not be displayed.');
      } else if ($74 === 119 || $74 === 87) {
        $result = (87) & 255;
      } else if ($74 === 116 || $74 === 84) {
        $result = (84) & 255;
      } else if ($74 === 112 || $74 === 80) {
        $result = (80) & 255;
      } else if ($74 === 113 || $74 === 81) {
        $result = (81) & 255;
      } else if ($74 === 115 || $74 === 83) {
        $result = (83) & 255;
      } else if ($74 === 114 || $74 === 82) {
        $result = (82) & 255;
      } else if ($74 === 117 || $74 === 85) {
        $result = (171) & 255;
      } else if ($74 === 105 || $74 === 73) {
        $result = (172) & 255;
      } else if ($74 === 111 || $74 === 79) {
        $result = (173) & 255;
      } else if ($74 === 106 || $74 === 74) {
        $result = (175) & 255;
      } else if ($74 === 107 || $74 === 75) {
        $result = (177) & 255;
      } else if ($74 === 110 || $74 === 78) {
        $result = (179) & 255;
      } else if ($74 === 109 || $74 === 77) {
        $result = (180) & 255;
      } else if ($74 === 44) {
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
  let $75, $76, $77, $78, $79, $80;
  thing = String.fromCharCode(pf[(x$10) * 25 + (y$4) - 26]);
  bak(0, 0);
  i$3 = 1; $75 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $75) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$10, y$4);
    R.write(ch$3);
    if (i$3 >= $75) break;
    i$3++;
  }
  R.gotoxy(x$10, y$4);
  $76 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($76 >= 1 && $76 <= 3)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($76 === 4 || $76 === 19 || $76 === 20 || $76 === 252) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $77 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($77 === 4) {
      thing = '\xb2';
    } else if ($77 === 19) {
      thing = '\xdb';
    } else if ($77 === 20 || $77 === 252) {
      thing = '\x05';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $78 = 20;
      if (i$3 >= $78) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $78) break;
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
  } else if ($76 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($76 === 10 || $76 === 15 || $76 === 16 || $76 === 18 || $76 === 36 || ($76 >= 48 && $76 <= 51)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $79 = 20;
      if (i$3 >= $79) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $79) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($76 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($76 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($76 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($76 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($76 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($76 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($76 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($76 === 14 || $76 === 52 || $76 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($76 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($76 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($76 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($76 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($76 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($76 === 24) {
    col(31, 31);
    bak(5, 0);
    R.write('\x0c');
    bak(0, 0);
  } else if ($76 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($76 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($76 === 27) {
    col(14, 7);
    R.write('\x0f');
  } else if (($76 >= 28 && $76 <= 31) || $76 === 33 || $76 === 37 || $76 === 39 || $76 === 41 || $76 === 44 || $76 === 67 || ($76 >= 224 && $76 <= 231)) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($76 === 32) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
  } else if ($76 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($76 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($76 === 42) {
    col(9, 7);
    R.write('\xfe');
  } else if ($76 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($76 >= 58 && $76 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($76 === 66) {
    col(12, 0);
    bak(4, 7);
    R.write('X');
    bak(0, 0);
  } else if ($76 === 47 || ($76 >= 55 && $76 <= 57) || ($76 >= 61 && $76 <= 63) || ($76 >= 68 && $76 <= 74)) {
    R.write(' ');
  } else if (($76 >= 76 && $76 <= 80)) {
    col(7, 7);
    R.write('\x19');
  } else if ($76 === 75) {
    col(7, 7);
    R.write('\xb3');
  } else if ($76 === 81) {
    col(31, 31);
    R.write('\x0c');
  } else if ($76 === 82) {
    col(7, 7);
    R.write('\x1a');
  } else if ($76 === 83) {
    col(7, 7);
    R.write('\x1b');
  } else if ($76 === 38 || $76 === 43 || $76 === 64) {
    if ((R.random(7) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $80 = 20;
      if (i$3 >= $80) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $80) break;
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
  } else if ($76 === 0) {
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
  flash(18, 25, ' the Priceless Amulet of Kroz. ');
  flash(7, 25, ' Your body surges with electricity as you clutch it! ');
}
function tome_effects() {
  let $81, $82, $83;
  bak(0, 0);
  b = 14; $81 = 0;
  if (b >= $81) for (;;) {
    x = 2; $82 = 65;
    if (x <= $82) for (;;) {
      y = 2; $83 = 24;
      if (y <= $83) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 0)) {
          R.sound(((x * y) * (b + 1)));
          R.gotoxy(x, y);
          col((b * 2), ((+(((b & 1) !== 0)) * 7) + (+(!(((b & 1) !== 0))) * 0)));
          R.write('\xdb');
        }
        if (y >= $83) break;
        y++;
      }
      if (x >= $82) break;
      x++;
    }
    if (b <= $81) break;
    b--;
  }
  R.nosound();
}
function prayer() {

}
function tablet_message(level$2) {

}
function next_level() {
  let $84;
  $84 = level;
  if ($84 === 2) {
    level2();
  } else if ($84 === 4) {
    level4();
  } else if ($84 === 7) {
    level7();
  } else if ($84 === 9) {
    level9();
  } else if ($84 === 11) {
    level11();
  } else if ($84 === 12) {
    level12();
  } else if ($84 === 14) {
    level14();
  } else if ($84 === 16) {
    level16();
  } else if ($84 === 18) {
    level18();
  } else if ($84 === 20) {
    level20();
  } else if ($84 === 21) {
    level21();
  } else if ($84 === 23) {
    level23();
  } else if ($84 === 25) {
    level25();
  } else if ($84 === 27) {
    level27();
  } else if ($84 === 29) {
    level29();
  } else if ($84 === 31) {
    level31();
  } else if ($84 === 33) {
    level33();
  } else if ($84 === 35) {
    level35();
  } else if ($84 === 37) {
    level37();
  } else if ($84 === 39) {
    level39();
  } else if ($84 === 40) {
    level40();
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
  let $85, $86, $87, $88, $89, $90, $91, $92, $93, $94, $95, $96, $97, $98, $99, $100, $101, $102, $103, $104, $105, $106, $107, $108, $109, $110, $111, $112, $113, $114, $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131, $132, $133, $134, $135, $136;
  L2_jump_end: {
  if ((((sideways && (yway$5 === -(1))) && (replacement !== 75)) && !(($85 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], ($85 >= 75 && $85 <= 80))))) {
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
  $86 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
  if ($86 === 0) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if (($86 >= 1 && $86 <= 3)) {
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
  } else if ($86 === 4 || $86 === 43 || $86 === 64) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 4))) {
        foundset = R.union(foundset, R.setOf(4, 4));
        flash(17, 25, 'A Breakable Wall blocks your way.');
      }
    }
  } else if ($86 === 5) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($86 === 6) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    clearkeys();
    if ((level === 40)) {
      end_routine();
    }
    if (mixup) {
      level = ((R.random(37) + 2)) << 16 >> 16;
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
    x = 1; $87 = 30;
    if (x <= $87) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      if (x >= $87) break;
      x++;
    }
    bak(0, 0);
    x = 1; $88 = 30;
    if (x <= $88) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      R.sound((x * 45));
      if (x >= $88) break;
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
    x = 1; $89 = 600;
    if (x <= $89) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x / 2));
      if (x >= $89) break;
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
    if ((level === 31)) {
      flash(9, 25, 'You see a wonderful vision floating above the lava!');
    }
    if ((level === 40)) {
      flash(16, 25, 'You have found the Temple of Kroz!');
    }
  } else if ($86 === 7) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
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
  } else if ($86 === 8) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(5);
    x = 7; $92 = 1;
    if (x >= $92) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x <= $92) break;
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
  } else if ($86 === 9) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($86 === 10) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(10);
    x = 1; $93 = 4;
    if (x <= $93) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x >= $93) break;
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
  } else if ($86 === 11) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($86 === 12) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($86 === 13) {
    if (human$4) {
      if ((keys < 1)) {
        x = 1; $94 = 15;
        if (x <= $94) for (;;) {
          R.sound((R.random(99) + 30));
          R.delay(15);
          R.nosound();
          R.delay(15);
          if (x >= $94) break;
          x++;
        }
        flash(18, 25, 'To pass the Door you need a Key.');
      } else {
        keys = ((keys - 1)) << 16 >> 16;
        addscore(11);
        x = 10; $95 = 90;
        if (x <= $95) for (;;) {
          R.sound(x);
          R.delay(15);
          if (x >= $95) break;
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
  } else if ($86 === 14 || $86 === 17) {
    if (human$4) {
      if ((pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] === 14)) {
        blocksound();
      } else {
        x = 1; $96 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
        if (x <= $96) for (;;) {
          R.sound((R.random(((x * 2) + 200)) + x));
          if (x >= $96) break;
          x++;
        }
        R.nosound();
      }
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $97 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($97 === 14) {
          flash(20, 25, 'A Solid Wall blocks your way.');
        } else if ($97 === 17) {
          flash(18, 25, 'You cannot travel through Water.');
        }
      }
    }
  } else if ($86 === 15) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(15);
    x = 1; $98 = 7;
    if (x <= $98) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x >= $98) break;
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
  } else if ($86 === 16) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(16);
    x = 1; $99 = 500;
    if (x <= $99) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $99) break;
      x++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $100 = 1;
    if (yb >= $100) for (;;) {
      x = 550; $101 = 20;
      if (x >= $101) for (;;) {
        R.sound((yb * x));
        if (x <= $101) break;
        x--;
      }
      if (yb <= $100) break;
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
    x = 1; $102 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $102) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $102) break;
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
  } else if ($86 === 18) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    whippower = ((whippower + 1)) << 16 >> 16;
    x = 3; $103 = 35;
    if (x <= $103) for (;;) {
      y = 45; $104 = 52;
      if (y <= $104) for (;;) {
        R.sound((x * y));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y >= $104) break;
        y++;
      }
      if (x >= $103) break;
      x++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    addscore(15);
    flash(9, 25, 'A Power Ring--your whip is now a little stronger!');
  } else if ($86 === 19 || $86 === 20) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $105 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($105 === 19) {
          flash(14, 25, 'You cannot travel through forest terrain.');
        } else if ($105 === 20) {
          flash(24, 25, 'A tree blocks your way.');
        }
      }
    }
  } else if ($86 === 21) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i = 70; $106 = 600;
    if (i <= $106) for (;;) {
      R.sound((i * 2));
      R.delay(3);
      if (i >= $106) break;
      i++;
    }
    bor(15);
    i = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $107 = 20;
    if (i >= $107) for (;;) {
      R.sound(R.random(i));
      if (i <= $107) break;
      i--;
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
      x = (px - xl); $109 = (px + xr);
      if (x <= $109) for (;;) {
        y = (py - yl); $110 = (py + yr);
        if (y <= $110) for (;;) {
          if (($111 = pf[(x) * 25 + (y) - 26], ($111 >= 0 && $111 <= 4) || $111 === 13 || $111 === 16 || $111 === 19 || ($111 >= 28 && $111 <= 32) || $111 === 33 || $111 === 35 || ($111 >= 36 && $111 <= 39) || $111 === 43 || $111 === 45 || ($111 >= 48 && $111 <= 51) || $111 === 64 || $111 === 67 || ($111 >= 68 && $111 <= 74) || ($111 >= 224 && $111 <= 231))) {
            R.gotoxy(x, y);
            col(12, 15);
            R.write('\xdb');
          }
          if (y >= $110) break;
          y++;
        }
        if (x >= $109) break;
        x++;
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
      x = (px - xl); $113 = (px + xr);
      if (x <= $113) for (;;) {
        y = (py - yl); $114 = (py + yr);
        if (y <= $114) for (;;) {
          if (($115 = pf[(x) * 25 + (y) - 26], ($115 >= 0 && $115 <= 4) || $115 === 13 || $115 === 16 || $115 === 19 || ($115 >= 28 && $115 <= 32) || $115 === 33 || $115 === 35 || ($115 >= 36 && $115 <= 39) || $115 === 43 || $115 === 45 || ($115 >= 48 && $115 <= 51) || $115 === 64 || $115 === 67 || ($115 >= 68 && $115 <= 74) || ($115 >= 224 && $115 <= 231))) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            if (($116 = pf[(x) * 25 + (y) - 26], ($116 >= 1 && $116 <= 3))) {
              score = ((score + pf[(x) * 25 + (y) - 26])) | 0;
            }
            pf[(x) * 25 + (y) - 26] = 0;
          }
          if (y >= $114) break;
          y++;
        }
        if (x >= $113) break;
        x++;
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
  } else if ($86 === 22) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    gems = ((gems - 10)) << 16 >> 16;
    x = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $117 = 20;
    if (x >= $117) for (;;) {
      y = 9; $118 = 2;
      if (y >= $118) for (;;) {
        R.sound((R.random(((y * x) + 100)) + (y * x)));
        if (y <= $118) break;
        y--;
      }
      if (x <= $117) break;
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
  } else if ($86 === 23) {
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
    i = 1; $119 = 16;
    if (i <= $119) for (;;) {
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
      y = 2; $120 = 24;
      if (y <= $120) for (;;) {
        x = ((x - 8)) << 16 >> 16;
        R.sound(x);
        R.gotoxy(34, y);
        R.write('\x02');
        R.delay((52 - (3 * i)));
        R.gotoxy(34, y);
        R.write(' ');
        if (y >= $120) break;
        y++;
      }
      R.nosound();
      if (i >= $119) break;
      i++;
    }
    R.gotoxy(34, 24);
    R.write('_');
    i = 8000; $121 = 20;
    if (i >= $121) for (;;) {
      R.sound(R.random(i));
      if (i <= $121) break;
      i--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT!! *');
    dead(false);
  } else if ($86 === 24) {
    if ((level === 31)) {
      go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
      flash(8, 25, 'The illusion vanishes before your eyes, Adventurer!');
      return;
    }
    tome_message();
    i = 1; $122 = 5;
    if (i <= $122) for (;;) {
      tome_effects();
      if (i >= $122) break;
      i++;
    }
    bak(0, 0);
    x = 1; $123 = 24;
    if (x <= $123) for (;;) {
      y = 5; $124 = 1;
      if (y >= $124) for (;;) {
        R.sound(((x * 45) + (y * 10)));
        R.delay((y * 3));
        R.nosound();
        R.delay(40);
        R.gotoxy(33, 13);
        col(R.random(16), R.random(16));
        R.write('\x0c');
        if (y <= $124) break;
        y--;
      }
      if (x >= $123) break;
      x++;
    }
    R.gotoxy(33, 13);
    col(16, 16);
    bak(2, 7);
    R.write('\xf0');
    bak(0, 0);
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 6;
    score = ((score + 5000)) | 0;
    update_info();
    clearkeys();
    flash(4, 25, 'The Priceless Amulet of Kroz is finally yours--50,000 points!');
    flash(9, 25, 'Congratualtions, Adventurer, you finally did it!!!');
  } else if ($86 === 25) {
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
    i = 1; $125 = 100;
    if (i <= $125) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($126 = pf[((x + a)) * 25 + ((y + b)) - 26], $126 === 0 || $126 === 32 || $126 === 33 || $126 === 37 || $126 === 39 || ($126 >= 55 && $126 <= 57) || $126 === 67 || ($126 >= 224 && $126 <= 231)) && (done === false))) {
        if (!((((((x + a) < 2) || ((x + a) > 65)) || ((y + b) < 2)) || ((y + b) > 24)))) {
          done = true;
          x = ((x + a)) << 16 >> 16;
          y = ((y + b)) << 16 >> 16;
        }
      }
      if (i >= $125) break;
      i++;
    }
    R.nosound();
    if ((done === false)) {
      x = (pxold) << 16 >> 16;
      y = (pyold) << 16 >> 16;
    }
    px = (x) << 16 >> 16;
    py = (y) << 16 >> 16;
    if (($127 = pf[(px) * 25 + (py) - 26], ($127 >= 55 && $127 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x = 1; $128 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x <= $128) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x >= $128) break;
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
  } else if ($86 === 26) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(11);
    grabsound();
    x = 1; $129 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x <= $129) for (;;) {
      R.sound(((R.random(1000) + x) + 200));
      if (x >= $129) break;
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
  } else if ($86 === 27) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($86 === 28) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    i = 1; $130 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i <= $130) for (;;) {
      R.sound(R.random(i));
      if (i >= $130) break;
      i++;
    }
    R.nosound();
    i = 1; $131 = 50;
    if (i <= $131) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($132 = pf[(x) * 25 + (y) - 26], ($132 >= 0 && $132 <= 3) || $132 === 5 || ($132 >= 7 && $132 <= 11) || ($132 >= 15 && $132 <= 16) || $132 === 26 || $132 === 32 || $132 === 33 || $132 === 37 || $132 === 39 || $132 === 67 || ($132 >= 224 && $132 <= 231))) {
          done = true;
          pf[(x) * 25 + (y) - 26] = 65;
          R.gotoxy(x, y);
          col(7, 7);
          R.write('O');
        }
      } while (!(((R.random(100) === 0) || done)));
      x = 1; $133 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x <= $133) for (;;) {
        R.sound(R.random(200));
        if (x >= $133) break;
        x++;
      }
      R.nosound();
      if (i >= $131) break;
      i++;
    }
    i = 2500; $134 = 20;
    if (i >= $134) for (;;) {
      R.sound(R.random(i));
      if (i <= $134) break;
      i--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($86 === 29) {
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
  } else if ($86 === 30) {
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
  } else if ($86 === 31) {
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
  } else if ($86 === 32) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if ($86 === 33) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $135 = 65;
    if (x <= $135) for (;;) {
      y = 2; $136 = 24;
      if (y <= $136) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 33)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $136) break;
        y++;
      }
      if (x >= $135) break;
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
  let $137, $138, $139, $140, $141, $142, $143, $144, $145;
  $137 = getkey();
  if ($137 === 0) {

  } else if ($137 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(18, 25, ' Press any key to resume game. ');
    restore_border();
  } else if ($137 === 81) {
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
  } else if ($137 === 82) {
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
    $138 = R.upcase(ch);
    if ($138 === '\x1b') {
      break L3_abort_restore;
    } else if ($138 === 'B' || $138 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    print(20, 25, (('  Restoring from file ' + ch) + '...  '));
    R.assign(savefile, (('CAVERNS' + ch) + '.SAV'));
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
      $139 = savestuff;
      level = ($139.s_level) << 16 >> 16;
      score = ($139.s_score) | 0;
      gems = ($139.s_gems) << 16 >> 16;
      whips = ($139.s_whips) << 16 >> 16;
      teleports = ($139.s_teleports) << 16 >> 16;
      keys = ($139.s_keys) << 16 >> 16;
      whippower = ($139.s_whippower) << 16 >> 16;
      difficulty = ($139.s_difficulty) << 16 >> 16;
      px = ($139.s_px) << 16 >> 16;
      py = ($139.s_py) << 16 >> 16;
      foundset = $139.s_foundset;
      mixup = $139.s_mixup;
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
      x = 1; $140 = 600;
      if (x <= $140) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x / 2));
        if (x >= $140) break;
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
  } else if ($137 === 83) {
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
    $141 = R.upcase(ch);
    if ($141 === '\x1b') {
      break L4_abort_save;
    } else if ($141 === 'B' || $141 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    $142 = savestuff;
    $142.s_level = (level) | 0;
    $142.s_score = (i_score) | 0;
    $142.s_gems = (i_gems) | 0;
    $142.s_whips = (i_whips) | 0;
    $142.s_teleports = (i_teleports) | 0;
    $142.s_keys = (i_keys) | 0;
    $142.s_whippower = (i_whippower) | 0;
    $142.s_difficulty = (i_difficulty) | 0;
    $142.s_px = (i_px) | 0;
    $142.s_py = (i_py) | 0;
    $142.s_foundset = i_foundset;
    $142.s_mixup = mixup;
    print(22, 25, (('  Saving to file ' + ch) + '...  '));
    R.assign(savefile, (('CAVERNS' + ch) + '.SAV'));
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    }
    restore_border();
  } else if ($137 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x = 1; $143 = 250;
    if (x <= $143) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $143) break;
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
      if (($144 = pf[(x) * 25 + (y) - 26], $144 === 0 || $144 === 32 || $144 === 33 || $144 === 37 || $144 === 39 || $144 === 41 || $144 === 44 || $144 === 47 || ($144 >= 55 && $144 <= 57) || ($144 >= 61 && $144 <= 63) || $144 === 67 || ($144 >= 68 && $144 <= 74) || ($144 >= 224 && $144 <= 231))) {
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
    x = 1; $145 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $145) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $145) break;
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
  } else if ($137 === 87) {
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
  } else if ($137 === 172) {
    move(0, -(1), true);
  } else if ($137 === 180) {
    move(0, 1, true);
  } else if ($137 === 177) {
    move(1, 0, true);
  } else if ($137 === 175) {
    move(-(1), 0, true);
  } else if ($137 === 171) {
    move(-(1), -(1), true);
  } else if ($137 === 173) {
    move(1, -(1), true);
  } else if ($137 === 179) {
    move(-(1), 1, true);
  } else if ($137 === 181) {
    move(1, 1, true);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $146, $147;
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
  loop$3 = 1; $146 = snum;
  if (loop$3 <= $146) for (;;) {
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
    $147 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($147 === 0 || ($147 >= 68 && $147 <= 74)) {
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
    } else if (($147 >= 1 && $147 <= 3) || $147 === 6 || $147 === 13 || $147 === 14 || $147 === 17 || ($147 >= 19 && $147 <= 25) || ($147 >= 28 && $147 <= 37) || $147 === 39 || $147 === 41 || $147 === 42 || ($147 >= 44 && $147 <= 47) || ($147 >= 52 && $147 <= 56) || ($147 >= 58 && $147 <= 63) || $147 === 65 || $147 === 66 || $147 === 67 || ($147 >= 75 && $147 <= 80) || ($147 >= 224 && $147 <= 231)) {
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
    } else if ($147 === 4 || $147 === 38 || $147 === 43 || $147 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($147 === 40) {
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
    } else if ($147 === 5 || ($147 >= 7 && $147 <= 12) || $147 === 15 || $147 === 16 || $147 === 18 || $147 === 26 || $147 === 27 || ($147 >= 48 && $147 <= 51) || $147 === 82 || $147 === 83) {
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
    if (loop$3 >= $146) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $148, $149;
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
  loop$4 = 1; $148 = mnum;
  if (loop$4 <= $148) for (;;) {
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
    $149 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($149 === 0 || ($149 >= 68 && $149 <= 74)) {
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
    } else if (($149 >= 1 && $149 <= 3) || $149 === 6 || $149 === 13 || $149 === 14 || $149 === 17 || ($149 >= 19 && $149 <= 25) || ($149 >= 28 && $149 <= 37) || $149 === 39 || $149 === 41 || $149 === 42 || ($149 >= 44 && $149 <= 47) || ($149 >= 52 && $149 <= 56) || ($149 >= 58 && $149 <= 63) || $149 === 65 || $149 === 66 || $149 === 67 || ($149 >= 75 && $149 <= 80) || ($149 >= 224 && $149 <= 231)) {
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
    } else if ($149 === 4 || $149 === 38 || $149 === 43 || $149 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($149 === 40) {
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
    } else if ($149 === 5 || ($149 >= 7 && $149 <= 12) || $149 === 15 || $149 === 16 || $149 === 18 || $149 === 26 || $149 === 27 || ($149 >= 48 && $149 <= 51) || $149 === 82 || $149 === 83) {
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
    if (loop$4 >= $148) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $150, $151;
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
  loop$5 = 1; $150 = fnum;
  if (loop$5 <= $150) for (;;) {
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
    $151 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($151 === 0 || ($151 >= 68 && $151 <= 74)) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($151 >= 1 && $151 <= 3) || $151 === 6 || $151 === 13 || $151 === 14 || $151 === 17 || ($151 >= 19 && $151 <= 25) || ($151 >= 28 && $151 <= 37) || $151 === 39 || $151 === 41 || $151 === 42 || ($151 >= 44 && $151 <= 47) || ($151 >= 52 && $151 <= 56) || ($151 >= 58 && $151 <= 63) || $151 === 65 || $151 === 66 || $151 === 67 || ($151 >= 75 && $151 <= 80) || ($151 >= 224 && $151 <= 231)) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($151 === 4 || $151 === 38 || $151 === 43 || $151 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($151 === 40) {
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
    } else if ($151 === 5 || ($151 >= 7 && $151 <= 12) || $151 === 15 || $151 === 16 || $151 === 18 || $151 === 26 || $151 === 27 || ($151 >= 48 && $151 <= 51) || $151 === 82 || $151 === 83) {
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
    if (loop$5 >= $150) break;
    loop$5++;
  }
}
function move_mblock() {

}

export function main() {
  let $152, $153, $154;





  screen();
  L8_newgame: for (;;) {
  title();
  border();
  init_screen();
  update_info();
  define_levels();
  create_playfield();
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
  x = 1; $152 = 800;
  if (x <= $152) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x / 2));
    if (x >= $152) break;
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
      x = 1; $153 = 9;
      if (x <= $153) for (;;) {
        t[(x) - 1] = (t[(x) - 1] - 1);
        if (x >= $153) break;
        x++;
      }
      if ((skiptime > 3000)) {
        x = 1; $154 = 9;
        if (x <= $154) for (;;) {
          t[(x) - 1] = (t[(x) - 1] - 5);
          if (x >= $154) break;
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
