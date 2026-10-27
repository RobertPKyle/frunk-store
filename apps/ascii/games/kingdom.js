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
  R.gotoxy(31, 2);
  R.write('KINGDOM OF KROZ II');
  R.gotoxy(26, 3);
  R.write('An Apogee Software Production' + '\r\n');
  R.write('' + '\r\n');
  R.write('Other great games available from Scott Miller:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 15);
  R.write('\xfe Six more Kroz games!  KINGDOM OF KROZ I, CAVERNS OF KROZ, DUNGEONS OF KROZ,' + '\r\n');
  R.write('     RETURN TO KROZ, TEMPLE OF KROZ and THE FINAL CRUSADE OF KROZ.' + '\r\n');
  R.write('     Each volume is just $7.50, or order all six for $35!' + '\r\n');
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
  R.write('KINGDOM OF KROZ II \xc4 HOW TO REGISTER' + '\r\n');
  R.gotoxy(1, 2);
  x = 1; $18 = 80;
  if (x <= $18) for (;;) {
    R.write('\xc4');
    if (x >= $18) break;
    x++;
  }
  R.gotoxy(1, 3);
  col(7, 7);
  R.write('  This is a shareware game, meaning it\'s user-supported.  If you enjoy this' + '\r\n');
  R.write('game you are asked by the author to please send a registration check in the' + '\r\n');
  R.write('amount of $7.50 to Apogee Software.' + '\r\n');
  R.write('  This registration fee will qualify you to order any of the other Kroz' + '\r\n');
  R.write('volumes available:' + '\r\n');
  R.write('' + '\r\n');
  col(15, 7);
  R.write('  \xfe Caverns of Kroz   - the first discovery of Kroz' + '\r\n');
  R.write('  \xfe Dungeons of Kroz  - the dark side of Kroz, fast-paced action' + '\r\n');
  R.write('  \xfe Kingdom of Kroz I - the national contest winner ("Best Game" in 1988)' + '\r\n');
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
  print(5, 1, 'YOUR QUEST FOR THE MAGICAL AMULET OF KROZ WAS SUCCESSFUL!!');
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
  R.assign(hsfile, 'KINGDOM2.HS');
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
        $23.name = R.trunc('Terry Nagy', 15);
        $23.highscore = (6995) | 0;
        $23.highlevel = (11) | 0;
      } else if ($24 === 4) {
        $23.name = R.trunc('Cmdr. Keen', 15);
        $23.highscore = (3501) | 0;
        $23.highlevel = (8) | 0;
      } else if ($24 === 5) {
        $23.name = R.trunc('Banzai Boyd', 15);
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
  R.write('KINGDOM OF KROZ II');
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
      R.write('You\'ve completed KINGDOM OF KROZ II!' + '\r\n');
    } else {
      R.gotoxy(17, 2);
      R.write('KINGDOM OF KROZ II' + '\r\n');
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
  df[(7) - 1] = R.trunc((('         976 20  3  2     9            320     9             20                 9                                    ' + '                       3  2  2  2  2                                                ') + '                 9   '), 222);
  df[(9) - 1] = R.trunc(((' 50          90  2  2                         25     1200 50                   55                                    ' + '        1                 1  1  1  1                                                ') + '                     '), 222);
  df[(11) - 1] = R.trunc((('100              2       45                                               8   100  3                                 ' + '                                                                           100600   ') + '                     '), 222);
  df[(13) - 1] = R.trunc((('350          20  2     9 40                                                    20  1                       3         ' + '     1                                                                              ') + ' 30                  '), 222);
  df[(15) - 1] = R.trunc((('                 4                                             300            500 20                                 ' + '                          2  2  2  2                                                ') + '                     '), 222);
  df[(17) - 1] = R.trunc((('                 1                                                                                     15            ' + '                 1                                                                  ') + '                     '), 222);
  df[(19) - 1] = R.trunc((('600          20  1     5 30     5                                              20  5                           700   ' + '                                                                                    ') + '                     '), 222);
  df[(21) - 1] = R.trunc(((' 40              3                            30                               80                    2               ' + '                          1  1  1  1                                       800      ') + '                     '), 222);
  df[(23) - 1] = R.trunc((('                 1                                                                                         3         ' + '                          1  1  1  1                                                ') + ' 70 50  9 25  9 18   '), 222);
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
function end_routine() {
  let $50, $51, $52, $53, $54, $55, $56, $57, $58;
  footstep();
  R.delay(300);
  footstep();
  R.delay(300);
  footstep();
  x = 1; $50 = ((+(fastpc) * 2650) + (+(!(fastpc)) * 250));
  if (x <= $50) for (;;) {
    R.sound((R.random(3000) + x));
    R.gotoxy(px, py);
    bak(R.random(8), 0);
    col(14, 15);
    R.write('\x02');
    col(R.random(16), R.random(16));
    bak(0, 0);
    print(15, 25, 'Oh no, something strange is happening!');
    if (x >= $50) break;
    x++;
  }
  i = ((+(fastpc) * 9000) + (+(fastpc) * 2200)); $51 = 20;
  if (i >= $51) for (;;) {
    R.sound(R.random(i));
    if (i <= $51) break;
    i--;
  }
  col(14, 15);
  bak(0, 0);
  x = 1; $52 = ((+(fastpc) * 3500) + (+(!(fastpc)) * 650));
  if (x <= $52) for (;;) {
    R.sound((x * 3));
    R.gotoxy(px, py);
    R.write(String.fromCharCode(((220 + R.random(4))) & 255));
    if (x >= $52) break;
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
  i = 1; $53 = gems;
  if (i <= $53) for (;;) {
    R.sound(((i * 8) + 100));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $53) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(15, 25, 'Your Whips are worth 100 points each...');
  i = 1; $54 = whips;
  if (i <= $54) for (;;) {
    R.sound(((i * 10) + 200));
    score = ((score + 10)) | 0;
    update_info();
    R.delay(20);
    if (i >= $54) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(9, 25, 'Your Teleport Scrolls are worth 200 points each...');
  i = 1; $55 = teleports;
  if (i <= $55) for (;;) {
    R.sound(((i * 12) + 300));
    score = ((score + 20)) | 0;
    update_info();
    R.delay(30);
    if (i >= $55) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  col(15, 15);
  bak(0, 0);
  print(14, 25, 'Your Keys are worth 10,000 points each...');
  i = 1; $56 = keys;
  if (i <= $56) for (;;) {
    R.sound(((i * 30) + 100));
    score = ((score + 1000)) | 0;
    update_info();
    R.delay(50);
    if (i >= $56) break;
    i++;
  }
  R.nosound();
  ch = R.readKbd();
  restore_border();
  clearkeys();
  bak(gemcolor, 7);
  x = 1; $57 = 30;
  if (x <= $57) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    if (x >= $57) break;
    x++;
  }
  bak(0, 0);
  x = 1; $58 = 30;
  if (x <= $58) for (;;) {
    R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
    R.clrscr();
    R.sound((x * 45));
    if (x >= $58) break;
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
  R.write('   The Magical Amulet will bring you great fame, and even more' + '\r\n');
  R.write(' so if you ever learn how to harness the Amulet\'s magical' + '\r\n');
  R.write(' abilities.  For now it must wait, though, for Kroz is a huge' + '\r\n');
  R.write(' place, and still mostly unexplored.' + '\r\n');
  R.write('   Even with the many dangers that await, you feel another' + '\r\n');
  R.write(' expedition is in order.  You must leave no puzzle unsolved, no' + '\r\n');
  R.write(' treasure unfound--to quit now would leave the job unfinished.' + '\r\n');
  R.write('   So you plan for a good night\'s rest, and think ahead to' + '\r\n');
  R.write(' tomorrow\'s new journey.  What does the mysterious kingdom of' + '\r\n');
  R.write(' Kroz have waiting for you, what type of new creatures will' + '\r\n');
  R.write(' try for your blood, and what kind of brilliant treasure does' + '\r\n');
  R.write(' Kroz protect.  Tomorrow will tell...' + '\r\n');
  R.write('' + '\r\n');
  col(14, 15);
  R.write('                         RETURN TO KROZ' + '\r\n');
  col(15, 7);
  R.write('        ( Now available -- $7.50 or write for details. )');
  clearkeys();
  R.window(1, 1, 80, 25);
  bak(0, 0);
  flash(21, 25, 'Press any key, Adventurer.');
  won();
}
function level1() {
  fp[(1) - 1] = R.trunc('W W W W             2 2 2 2 2  C  2 2 2 2 2              W W W W', 64);
  fp[(2) - 1] = R.trunc('XXXXXXXXXXXXXXXXXXX###########   ###########XXXXXXXXXXXXXXXXXXXX', 64);
  fp[(3) - 1] = R.trunc(' 1           1                               1                  ', 64);
  fp[(4) - 1] = R.trunc('                                    1            XX         1   ', 64);
  fp[(5) - 1] = R.trunc('       1            1                           XXXX            ', 64);
  fp[(6) - 1] = R.trunc('#        XX                    +                 XX            #', 64);
  fp[(7) - 1] = R.trunc('##      XXXX  1                +          1          1        ##', 64);
  fp[(8) - 1] = R.trunc('T##      XX               2    +    2                        ##T', 64);
  fp[(9) - 1] = R.trunc('T1##                       W   +   W                        ##1T', 64);
  fp[(10) - 1] = R.trunc('T########X                 WX     XW             1    X########T', 64);
  fp[(11) - 1] = R.trunc('.        X                2WX  P  XW2                 X        .', 64);
  fp[(12) - 1] = R.trunc('T########X         1       WX     XW                  X########T', 64);
  fp[(13) - 1] = R.trunc('T1##                       W   +   W         1              ##1T', 64);
  fp[(14) - 1] = R.trunc('T##                       2    +    2                        ##T', 64);
  fp[(15) - 1] = R.trunc('##   1                         +                      XX      ##', 64);
  fp[(16) - 1] = R.trunc('#       XX      1              +                 1   XXXX     1#', 64);
  fp[(17) - 1] = R.trunc('       XXXX                 ##   ##                   XX        ', 64);
  fp[(18) - 1] = R.trunc('1       XX                 ##     ##     1        1           1 ', 64);
  fp[(19) - 1] = R.trunc('                    1#######       ########                     ', 64);
  fp[(20) - 1] = R.trunc('    1         ########11111  +++++  111111########              ', 64);
  fp[(21) - 1] = R.trunc('WW     ########+++++        #######         WWWWW########1    WW', 64);
  fp[(22) - 1] = R.trunc('########\xaf                    2 2 2                     C########', 64);
  fp[(23) - 1] = R.trunc('L2  +  X      #kingdom#of#kroz#ii#by#scott#miller#      X  +  2L', 64);
  fast = '\xea';
  convert_format();
}
function level2() {
  fp[(1) - 1] = R.trunc('\x92                                                           .   ', 64);
  fp[(2) - 1] = R.trunc('  2#############################K############################   ', 64);
  fp[(3) - 1] = R.trunc('   ##\x91  2    2   2 2    2   2  ###  2  2   2    2    2    2##   ', 64);
  fp[(4) - 1] = R.trunc('  2##+#2   2   2    2  2 2   2  2 2  2   2 2   2   2    2  ##   ', 64);
  fp[(5) - 1] = R.trunc('   ##+#   2  2    2   2   2   2    2    2  2    2    2   2 ##   ', 64);
  fp[(6) - 1] = R.trunc('  2##+# 2    2  2   2  2 2 2 2  2 2  2 2 2   2    2   2   2##   ', 64);
  fp[(7) - 1] = R.trunc('   ##+#2   2  2   2                            2   2   2   ## W ', 64);
  fp[(8) - 1] = R.trunc('  2##+#  2   2   2   XXXXXXXXXXXXXXXXXXXXXXX  2    2  2   2##@@@', 64);
  fp[(9) - 1] = R.trunc('   ##+#2   2  2   2  XXXXXXXXXXXXXXXXXXXXXXX    2   2  2   ##   ', 64);
  fp[(10) - 1] = R.trunc('  2##+# 2   2  2 2   XXXXXXXXXXXXXXXXXXXXXXX   2  2   2  2 ##   ', 64);
  fp[(11) - 1] = R.trunc('   ##+#   2 2 2   2  XXXXXX    -+-    XXXXXX  2 2    2  2  ##   ', 64);
  fp[(12) - 1] = R.trunc('  2##+#2   2   2 2   XXXXXX1   -P-   1XXXXXX  2  2 2   2 2 ##   ', 64);
  fp[(13) - 1] = R.trunc('   ##+#  2  2  2  2  XXXXXX    -+-    XXXXXX   2  2 2     2##   ', 64);
  fp[(14) - 1] = R.trunc('  2##+# 2 2  2  2    XXXXXXXXXXXXXXXXXXXXXXX  2   2   2 2  ##   ', 64);
  fp[(15) - 1] = R.trunc('   ##+#2 2    2   2  XXXXXXXXXXXXXXXXXXXXXXX    2  2   2 2 ##   ', 64);
  fp[(16) - 1] = R.trunc('  2##+# 2  2  2  2   XXXXXXXXXXXXXXXXXXXXXXX   2    2 2 2  ##   ', 64);
  fp[(17) - 1] = R.trunc('   ##+#  2  2 2   2                           2  2   2   2 ##   ', 64);
  fp[(18) - 1] = R.trunc('  2##+#2   2    2   2 2  2  2  2 2  2 2  2  2   2   2  2  2##   ', 64);
  fp[(19) - 1] = R.trunc('   ##+# 2    2  2  2 2  2   2   2   2  2  2    2    2   2  ##   ', 64);
  fp[(20) - 1] = R.trunc('  2##3#   2   2   2   2   2   2   2   2 2    2    2   2   2##@@@', 64);
  fp[(21) - 1] = R.trunc('   ##T#2   2     2  2  2 2   2 ###   2   2 2  2    2   2   ##222', 64);
  fp[(22) - 1] = R.trunc('   #############################S#######################XXX##@@@', 64);
  fp[(23) - 1] = R.trunc('                                                          I##LLL', 64);
  fast = '\xea';
  convert_format();
}
function level4() {
  fp[(1) - 1] = R.trunc('-..............................3#1#2#3##------;------------;----', 64);
  fp[(2) - 1] = R.trunc('-##############################-##1#2#3#-######################-', 64);
  fp[(3) - 1] = R.trunc('-#.....----......- I#S###### ##K###1#2#3-#///////1///////////1//', 64);
  fp[(4) - 1] = R.trunc('-#.-..-....-....-.# # I####1# ######1#2#-#\\1\\\\\\\\\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\', 64);
  fp[(5) - 1] = R.trunc('-#-.-..-..-.....-.# # # ### ## ##1###1#2-#/////1////////////////', 64);
  fp[(6) - 1] = R.trunc('-#-.-.-..-..---..-# # ## # ##1## # ###1#-#CCC\\\\\\\\\\\\\\\\\\1\\\\\\\\\\\\1\\\\', 64);
  fp[(7) - 1] = R.trunc('-#-.-..-.-.-..-..-# # ### ####  ### K##1-#CCC/////1//////1/////K', 64);
  fp[(8) - 1] = R.trunc('-#-..--...-....--.# # ##################-#######################', 64);
  fp[(9) - 1] = R.trunc('-#-################                                           \xe0 ', 64);
  fp[(10) - 1] = R.trunc('---3333333333-CC### #F######################XXXXXXXX###\xe0####-##+', 64);
  fp[(11) - 1] = R.trunc('################## ###------------------\xae###############2###-##+', 64);
  fp[(12) - 1] = R.trunc('big#######     ## ####22222222222222222#-##-----------###2##-##K', 64);
  fp[(13) - 1] = R.trunc('trouble## RRRRR  #######################-##-####U####-####2####+', 64);
  fp[(14) - 1] = R.trunc('######## RRRKRRRR #########$;$$$$$$3$T##-##-----------#####2###3', 64);
  fp[(15) - 1] = R.trunc('+++++### RR 2 2 RR ####Z###$############-############\x91##Q###2###', 64);
  fp[(16) - 1] = R.trunc('++T++## RR 2 P  2RR ### #-U--------------###TT.TT####----####2##', 64);
  fp[(17) - 1] = R.trunc('+++++## RR2   2 RR ####1#-####################;###############2#', 64);
  fp[(18) - 1] = R.trunc('#O#O#### RR 2  2RR #3## #C####3#3#3#3#3#3#3#3#3#3#3#3#3#3#3#3##D', 64);
  fp[(19) - 1] = R.trunc('#X#X##### RRR2CRR ##3## # ###@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@###D', 64);
  fp[(20) - 1] = R.trunc('#X#X###### RRRRRR ##3## #3##@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@##K#D', 64);
  fp[(21) - 1] = R.trunc('-----; #### RRR  ### ## ###@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#D', 64);
  fp[(22) - 1] = R.trunc('-----# #####   # ##W W# ##@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@#@##@#D', 64);
  fp[(23) - 1] = R.trunc('22222#      #####       @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#L', 64);
  fast = '\xea';
  convert_format();
}
function level6() {
  fp[(1) - 1] = R.trunc('---###########RRRRR##W        ############W////1/C//\\//\\\\\\\\\\\\\\\\\\', 64);
  fp[(2) - 1] = R.trunc('-U---------Z###RRRRR##7######   ##KK\xf4   Z##-//////\\///1/\\\\\\\\\\\\U\\', 64);
  fp[(3) - 1] = R.trunc('---###########RRRRR##7####### P ######## ###-////////\\///\\\\1\\\\\\\\', 64);
  fp[(4) - 1] = R.trunc('@#############RRRRR#7####                ####-///\\/////////\\\\\\\\\\', 64);
  fp[(5) - 1] = R.trunc('@2#------.###RRRRR##7#W3; ############## #####-////1//\\//1///\\\\\\', 64);
  fp[(6) - 1] = R.trunc('@##;-;###.##RRRRR##7##W3; #WWWWWWWWWWW## #2####--//////////\\///\\', 64);
  fp[(7) - 1] = R.trunc('@2#-;;##..##RRRRR##7##W3; ######-####### ##2#####-/////\\/////1//', 64);
  fp[(8) - 1] = R.trunc('@##;-;##..-##RRRRR##7#### #11111111111## ###2##2##-/////1/////\\/', 64);
  fp[(9) - 1] = R.trunc('@2#;;-##..#D##RRRRR##7##T #11111111111## #2##2##2##--///////\\///', 64);
  fp[(10) - 1] = R.trunc('@##;;;##..#D###RRRRR##7####11111111111## ##2##2##2###---///////1', 64);
  fp[(11) - 1] = R.trunc('@2#-;;##..#KK###RRRRR##7###11111111111## ###)##)##)#####--////\\/', 64);
  fp[(12) - 1] = R.trunc('@##-;;##..#KK##RRRRRRR#7###11111B11111----)))))))))))#####---///', 64);
  fp[(13) - 1] = R.trunc('@2#;;;##22####RRRR#RRR##7##11111111111##############)########--/', 64);
  fp[(14) - 1] = R.trunc('@##;;-##22###RRRR###RRR##7#11111111111#?#\x95#---#*YYYY-63333####D#', 64);
  fp[(15) - 1] = R.trunc('@2#;-;##22##RRRR##L##RRR#7#11111111111#O#T#-#-#*YYYY-63333---#D#', 64);
  fp[(16) - 1] = R.trunc('@##;;;##22#RRRR##DD##RRR#7#11111111111#O#-4-#-#*YYYY-63333-#-4-#', 64);
  fp[(17) - 1] = R.trunc('@2#;-;##-##RRRR#DDD#RRR##7###########-#O#-#-#-#*YYYY-63333-#-#-#', 64);
  fp[(18) - 1] = R.trunc('@##;;-##C#RRRR##DDD##RRR##7###+++++##-#O#-#-#-#*YYYY-63333-#-#-#', 64);
  fp[(19) - 1] = R.trunc('@2#;;;##H##RRRR#DDDD##RRR##7##+++++##-#O#-#-#-#*YYYY-63333-#-#-#', 64);
  fp[(20) - 1] = R.trunc('@##;-;####RRRR##44444##RRR##7###.####-#O#-#-#-#*YYYY-63333-#-#-#', 64);
  fp[(21) - 1] = R.trunc('@2#-;;###RRRR##\xf1\xf1\xf1\xf1\xf1\xf1\xf1##RRR#7###.#K-#-#O#-#-#-#*YYYY-63333-#-#-#', 64);
  fp[(22) - 1] = R.trunc('@###-###RRRR##X--------#RRR##\xf4##.#--#-#-#---#-######-#####-#---#', 64);
  fp[(23) - 1] = R.trunc('-----##RRRR##%X---U----##RRR#K##--------#111#--------------#111#', 64);
  fast = '\xea';
  convert_format();
  hideopenwall = true;
}
function level8() {
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
  fp[(22) - 1] = R.trunc('\xbc       1 1 1 1 1 1 1 1 1 1 1 1 1 1 1##--#########\x91\xb3###\xb3####;   ', 64);
  fp[(23) - 1] = R.trunc('###this#is#the#first#sideways#level####111111111  \xe4C##\x95       \x91 ', 64);
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (75) << 16 >> 16;
  gravon = true;
  gravrate = (0) << 16 >> 16;
  sideways = true;
}
function level10() {
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
  fp[(23) - 1] = R.trunc('\xf31111111111111111111##C-------D-D-D]]E\xf2&LL##K)))))333))))-*I*I*C', 64);
  fast = '\xea';
  convert_format();
  hidegems = true;
}
function level12() {
  fp[(1) - 1] = R.trunc('LLL##U##@@@@@@@@@@@|000---0000000000000000-0--00000000VVV000Y-0V', 64);
  fp[(2) - 1] = R.trunc('```##-##@00000000000000---0000222222220---0000-00000000000--Y-0V', 64);
  fp[(3) - 1] = R.trunc('```##K##@@022222222K000---0000-0000000000-0000-0)))))YYYW-W0Y-0V', 64);
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
  fp[(20) - 1] = R.trunc('--000----------------- ---0WWWWWWWWK01110-000-000000000000000000', 64);
  fp[(21) - 1] = R.trunc('00000-00000000000000000---000-00000001110-000K--<000OO000OOOOO\xf3*', 64);
  fp[(22) - 1] = R.trunc('--000-000000~~~0000000#---#00-00000000000-000000000000OOOO000000', 64);
  fp[(23) - 1] = R.trunc('00C000000********3000##VVV##0-------------00000000boulderville\xc30', 64);
  fast = '\xea';
  convert_format();
  lavaflow = true;
  lavarate = (30) << 16 >> 16;
}
function level14() {
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
function level16() {
  fp[(1) - 1] = R.trunc('##tunnels#of#kroz###########-P--################################', 64);
  fp[(2) - 1] = R.trunc('########################X###----######X##-------\x91--------##X####', 64);
  fp[(3) - 1] = R.trunc('############################----#########----------------#######', 64);
  fp[(4) - 1] = R.trunc('L---N----H######\xf2  \xf2 \xf2######-----------------########----#######', 64);
  fp[(5) - 1] = R.trunc('L---N-----##X###  CC  555555-----------------#####X##1111#######', 64);
  fp[(6) - 1] = R.trunc('######----######\xf2 \xf2  \xf2###############################----#####X#', 64);
  fp[(7) - 1] = R.trunc('######1111###########################################1111#######', 64);
  fp[(8) - 1] = R.trunc('#X####----##############X#######magic#####X##########----#######', 64);
  fp[(9) - 1] = R.trunc('######1111####################\x93-\x95-\x96-\x95-\x93##############----N-----#', 64);
  fp[(10) - 1] = R.trunc('######----####################----K----##############----N-----#', 64);
  fp[(11) - 1] = R.trunc('######1111#######X############\x91-\x91-\x91-\x91-\x91#########X##########----#', 64);
  fp[(12) - 1] = R.trunc('######----########################-########################1111#', 64);
  fp[(13) - 1] = R.trunc('######1111################X#######-########################----#', 64);
  fp[(14) - 1] = R.trunc('######----########################---------N-------------------#', 64);
  fp[(15) - 1] = R.trunc('###X##----##########################################-----------#', 64);
  fp[(16) - 1] = R.trunc('######---------------7\xf1########################X####----########', 64);
  fp[(17) - 1] = R.trunc('######---------------7-444444444444444444###########1111########', 64);
  fp[(18) - 1] = R.trunc('#####O#############--77##################444########----#####X##', 64);
  fp[(19) - 1] = R.trunc('####O##############1111#############X#######4\xf4%-####1111########', 64);
  fp[(20) - 1] = R.trunc('###O#####XXX#######----#############################----########', 64);
  fp[(21) - 1] = R.trunc('##O#####X###Q######-------N------`----------------------########', 64);
  fp[(22) - 1] = R.trunc('##O##OOO###########-------N------`--------\x91-------------##X#####', 64);
  fp[(23) - 1] = R.trunc('###OO###########################################################', 64);
  fast = '\xea';
  convert_format();
  hidestairs = true;
  hideopenwall = true;
}
function level18() {
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
function level20() {
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
function level22() {
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
function level25() {
  fp[(1) - 1] = R.trunc('K\xaf    -++++++++++++++++#the#sacred#temple#+++++++++++++++-    \xaeK', 64);
  fp[(2) - 1] = R.trunc(' VVVVVV11111111111111111111111111111111111111111111111111\\\\\\\\\\\\ ', 64);
  fp[(3) - 1] = R.trunc(' VVVV;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\\\\\\\\ ', 64);
  fp[(4) - 1] = R.trunc(' VV1111111111;:::-:::111111111#####111111111::-:::::111111111\\\\ ', 64);
  fp[(5) - 1] = R.trunc(' V11         :-:-:-::        ###A###        :-:-:--:        11\\ ', 64);
  fp[(6) - 1] = R.trunc('X 1          ::-:::B:        RR#`#RR        :B::-::;         1 X', 64);
  fp[(7) - 1] = R.trunc('X  22####-####-------------RRRR#D#RRRR-------------####-####22 X', 64);
  fp[(8) - 1] = R.trunc('X  22##3@-@3##;3;3;3;3;3;3RRRRR#`#RRRRR3;3;3;3;3;3;##~~~~~##22 X', 64);
  fp[(9) - 1] = R.trunc('X  22##3@-@3##3;3;3;3;3;3RR1\x92C##D##C\x921RR3;3;3;3;3;3##~~~~~##22 X', 64);
  fp[(10) - 1] = R.trunc('X  22##3@-@3##;3;3;3;3;3RR11\x92\x92##`##\x92\x9211RR3;3;3;3;3;##~~~~~##22 X', 64);
  fp[(11) - 1] = R.trunc('X--####3@-@3####3;3;3;3RR11#####D#####11RR3;3;3;3####~~~~~####-X', 64);
  fp[(12) - 1] = R.trunc('X   U##3@@@3##U ;3;3;3RRB11-+T1   1T+-11BRR3;3;3; U##~~~~~##U  X', 64);
  fp[(13) - 1] = R.trunc('X--####3@@@3####3;3;3;3RR11#####P#####11RR3;3;3;3####~~~~~####-X', 64);
  fp[(14) - 1] = R.trunc('X  22##3@@@3##;3;3;3;3;3RR1111##U##1111RR3;3;3;3;3;##~~~~~##22 X', 64);
  fp[(15) - 1] = R.trunc('X  22##3@@@3##3;3;3;3;3;3RR111#####111RR3;3;3;3;3;3##~~~~~##22 X', 64);
  fp[(16) - 1] = R.trunc('X  22##3@K@3##;3;3;3;3;3;3RR111\xe4\xe4\xe4111RR3;3;3;3;3;3;##~~K~~##22 X', 64);
  fp[(17) - 1] = R.trunc('X  22#########-----B-------RRRR\xe4C\xe4RRRR-------B-----#########22 X', 64);
  fp[(18) - 1] = R.trunc('X 1  ##|0<0                   RRRRR                   0[0"## 1 X', 64);
  fp[(19) - 1] = R.trunc(' R11 #######  11111111111111;--->---;11111111111111  #######11= ', 64);
  fp[(20) - 1] = R.trunc(' RR111111111111-VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV-11111111111== ', 64);
  fp[(21) - 1] = R.trunc(' RRRR111111111-V V V-V V V-2-V*VCV*V-2-V V-V-V V V-11111111==== ', 64);
  fp[(22) - 1] = R.trunc('\xe1RRRRRR111111-V V V-2-V V V-V*V*V*V*V-V V V-2-V V V-11111======\xe2', 64);
  fp[(23) - 1] = R.trunc('K\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1\xe1VGV\x91V V V V V\x91V*V*V*V*V*V\x91V V V V V\x91VGV\xe2\xe2\xe2\xe2\xe2\xe2\xe2\xe2\xe2\xe2\xe2K', 64);
  fast = '\xea';
  convert_format();
  magicewalls = true;
}
function title() {
  let startgame = false;
  let $59, $60, $61, $62, $63, $64, $65, $66, $67;
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
    R.gotoxy(10, R.wherey());
    R.write('KINGDOM OF KROZ II -- UPDATED VOLUME THREE OF THE KROZ SERIES' + '\r\n');
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
  R.write('  Kingdom of Kroz is a game of adventure, exploration and survival.   You are' + '\r\n');
  R.write('  a fearless archaeologist in search of the Magical Amulet,  hidden somewhere' + '\r\n');
  R.write('  deep in the vast and dangerous underground kingdom.   You enter the kingdom' + '\r\n');
  R.write('  through a secret tunnel and ignite your brass lantern. Your only protection' + '\r\n');
  R.write('  is a worn leather whip and your ingenuity.  Sweat beading on your forehead,' + '\r\n');
  R.write('                you embark on a journey that may be your last...' + '\r\n');
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
      R.gotoxy(30, 2);
      col(R.random(16), 0);
      R.write(' KINGDOM OF KROZ II ');
      R.delay(50);
    } while (!(R.keypressed()));
    ch = R.readKbd();
    R.sound(300);
    R.delay(100);
    R.nosound();
  } while (!(($59 = R.upcase(ch).charCodeAt(0), $59 === 13 || $59 === 78 || $59 === 32 || $59 === 69 || $59 === 65 || $59 === 88)));
  R.sound(700);
  R.delay(100);
  R.nosound();
  R.gotoxy(13, 22);
  col(0, 0);
  bak(1, 0);
  x = 1; $60 = 28;
  if (x <= $60) for (;;) {
    R.write('  ');
    if (x >= $60) break;
    x++;
  }
  col(30, 31);
  bak(1, 0);
  $61 = R.upcase(ch);
  if ($61 === 'N' || $61 === ' ' || $61 === '\x0d') {
    difficulty = (8) << 16 >> 16;
    R.gotoxy(37, 22);
    R.write('NOVICE');
  } else if ($61 === 'E') {
    difficulty = (5) << 16 >> 16;
    R.gotoxy(34, 22);
    R.write('EXPERIENCED');
  } else if ($61 === 'A') {
    difficulty = (2) << 16 >> 16;
    R.gotoxy(36, 22);
    R.write('ADVANCED');
  } else if ($61 === 'X') {
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
    R.write(' KINGDOM OF KROZ II ');
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
    R.write('KINGDOM OF KROZ II');
    R.gotoxy(17, 4);
    col(6, 7);
    R.write('Copyright (c) 1990 Apogee Software Productions');
    R.gotoxy(25, 6);
    R.write('Version 2.0 -- by Scott Miller');
    R.gotoxy(6, 8);
    col(2, 7);
    R.write('THIS GAME MAY BE DISTRIBUTED BY SHAREWARE OR PUBLIC DOMAIN LIBRARIES,' + '\r\n');
    R.gotoxy(6, 9);
    R.write('OR BULLETIN BOARD SYSTEMS. NO NEED TO INQUIRE FOR WRITTEN PERMISSION.' + '\r\n');
    R.gotoxy(1, 10);
    col(4, 7);
    x = 1; $62 = 80;
    if (x <= $62) for (;;) {
      R.write('\xc4');
      if (x >= $62) break;
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
    $63 = R.upcase(ch);
    if ($63 === 'B') {
      x = 100; $64 = 20;
      if (x >= $64) for (;;) {
        y = 10; $65 = 1;
        if (y >= $65) for (;;) {
          R.sound(((x * y) * y));
          R.delay(Math.trunc(y / 2));
          if (y <= $65) break;
          y--;
        }
        if (x <= $64) break;
        x--;
      }
      R.nosound();
      startgame = true;
    } else if ($63 === 'I') {
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
      R.write('   Kingdom of Kroz is a game of exploration and survival.  Your journey will' + '\r\n');
      R.write(' take you through 25 very dangerous chambers, each riddled with diabolical' + '\r\n');
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
      R.write('   Kingdom of Kroz will present you with many challenges. You will venture deep' + '\r\n');
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
      R.write(' levels the game is played as if viewing the level from a side angle.  On' + '\r\n');
      R.write(' these levels you can only move upward by using a rope, a secret tunnel, or' + '\r\n');
      R.write(' by using a teleport scroll.  These unique "Sideways Levels" may take a' + '\r\n');
      R.write(' little getting used to, but are well worth the effort.  At the beginning of' + '\r\n');
      R.write(' a "sideways" level a message at the bottom of the screen will alert you.' + '\r\n');
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
      R.write(' likely to find in the Kingdom of Kroz:' + '\r\n');
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
      R.write('' + '\r\n');
      R.write('  \xfe Kingdom of Kroz II is a completely updated and improved version over the' + '\r\n');
      R.write('    original version of Kingdom of Kroz.  If you desire to play the original' + '\r\n');
      R.write('    Kingdom of Kroz, please send $7.50.  Over 17 levels are different!' + '\r\n');
      flash(27, 25, 'Press any key to continue.');
    } else if ($63 === 'M') {
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
      R.write('   Kingdom of Kroz II is a user-supported game.  This means that the creator of' + '\r\n');
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
    } else if ($63 === 'S') {
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
    } else if ($63 === 'O') {
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
    } else if ($63 === 'A') {
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
  R.write('KINGDOM OF KROZ II');
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
  let $68, $69;
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
  $68 = difficulty;
  if ($68 === 9) {
    gems = (250) << 16 >> 16;
    whips = (100) << 16 >> 16;
    teleports = (50) << 16 >> 16;
    keys = (1) << 16 >> 16;
    whippower = (3) << 16 >> 16;
  } else if ($68 === 8) {
    gems = (20) << 16 >> 16;
    whips = (10) << 16 >> 16;
  } else if ($68 === 5) {
    gems = (15) << 16 >> 16;
  } else if ($68 === 2) {
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
  x = 1; $69 = 9;
  if (x <= $69) for (;;) {
    t[(x) - 1] = -(1);
    if (x >= $69) break;
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
  let $70;
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
    ($70 = R.val(fetch), parsed[(counter$2) - 1] = $70[0], test = ($70[1]) << 16 >> 16);
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
  let $71, $72, $73, $74, $75, $76, $77;
  snum = (0) << 16 >> 16;
  mnum = (0) << 16 >> 16;
  fnum = (0) << 16 >> 16;
  bnum = (0) << 16 >> 16;
  gennum = (0) << 16 >> 16;
  lavaflow = false;
  t[(9) - 1] = -(1);
  x$9 = 1; $71 = 999;
  if (x$9 <= $71) for (;;) {
    sx[(x$9) - 1] = 0;
    sy[(x$9) - 1] = 0;
    mx[(x$9) - 1] = 0;
    my[(x$9) - 1] = 0;
    fx[(x$9) - 1] = 0;
    fy[(x$9) - 1] = 0;
    if (x$9 >= $71) break;
    x$9++;
  }
  x$9 = 1; $72 = 1300;
  if (x$9 <= $72) for (;;) {
    bx[(x$9) - 1] = 0;
    by[(x$9) - 1] = 0;
    if (x$9 >= $72) break;
    x$9++;
  }
  new_gem_color();
  x$9 = 2; $73 = 65;
  if (x$9 <= $73) for (;;) {
    y$3 = 2; $74 = 24;
    if (y$3 <= $74) for (;;) {
      pf[(x$9) * 25 + (y$3) - 26] = 0;
      if (y$3 >= $74) break;
      y$3++;
    }
    if (x$9 >= $73) break;
    x$9++;
  }
  pf[(px) * 25 + (py) - 26] = 40;
  parse_field();
  obj = 1; $75 = 83;
  if (obj <= $75) for (;;) {
    if ((parsed[(obj) - 1] > 0)) {
      loop$2 = 1; $76 = parsed[(obj) - 1];
      if (loop$2 <= $76) for (;;) {
        done = false;
        do {
          xspot = ((R.random(64) + 2)) << 16 >> 16;
          yspot = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(xspot) * 25 + (yspot) - 26] === 0)) {
            pf[(xspot) * 25 + (yspot) - 26] = obj;
            done = true;
            $77 = obj;
            if ($77 === 1) {
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = xspot;
              sy[(snum) - 1] = yspot;
            } else if ($77 === 2) {
              mnum = ((mnum + 1)) << 16 >> 16;
              mx[(mnum) - 1] = xspot;
              my[(mnum) - 1] = yspot;
            } else if ($77 === 3) {
              fnum = ((fnum + 1)) << 16 >> 16;
              fx[(fnum) - 1] = xspot;
              fy[(fnum) - 1] = yspot;
            } else if ($77 === 36) {
              gennum = ((gennum + 1)) << 16 >> 16;
            } else if ($77 === 38) {
              bnum = ((bnum + 1)) << 16 >> 16;
              bx[(bnum) - 1] = xspot;
              by[(bnum) - 1] = yspot;
            } else if ($77 === 46) {
              t[(9) - 1] = 32000;
            }
          }
        } while (!(done));
        if (loop$2 >= $76) break;
        loop$2++;
      }
    }
    if (obj >= $75) break;
    obj++;
  }
}
function display_playfield() {
  let xloop$2 = 0;
  let yloop$2 = 0;
  let $78, $79, $80;
  xloop$2 = 2; $78 = 65;
  if (xloop$2 <= $78) for (;;) {
    yloop$2 = 2; $79 = 24;
    if (yloop$2 <= $79) for (;;) {
      if ((((pf[(xloop$2) * 25 + (yloop$2) - 26] > 0) || floorpattern) && !(hidelevel))) {
        R.gotoxy(xloop$2, yloop$2);
        $80 = pf[(xloop$2) * 25 + (yloop$2) - 26];
        if ($80 === 0) {
          col(cf1, cf2);
          bak(bf1, bf2);
          R.write(tile);
          bak(0, 0);
        } else if ($80 === 1) {
          col(12, 7);
          R.write(slow);
        } else if ($80 === 2) {
          col(10, 7);
          R.write(medium);
        } else if ($80 === 3) {
          col(9, 7);
          R.write(fast);
        } else if ($80 === 4) {
          if ((level !== 71)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($80 === 5) {
          col(15, 7);
          R.write('\xf4');
        } else if ($80 === 6) {
          if (!(hidestairs)) {
            bak(7, 7);
            col(16, 16);
            R.write('\xf0');
            bak(0, 0);
          }
        } else if ($80 === 7) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(14, 7);
            bak(4, 0);
            R.write('C');
            bak(0, 0);
          }
        } else if ($80 === 8) {
          if ((R.random(35) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe8');
          }
        } else if ($80 === 9) {
          if (!(hidegems)) {
            col(gemcolor, 7);
            R.write('\x04');
          }
        } else if ($80 === 10) {
          col(2, 7);
          R.write('\xad');
        } else if ($80 === 11) {
          col(13, 7);
          R.write('\x18');
        } else if ($80 === 12) {
          if ((R.random(25) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(12, 15);
            R.write('\x8c');
          }
        } else if ($80 === 13) {
          bak(5, 7);
          col(3, 0);
          R.write('\xec');
          bak(0, 0);
        } else if ($80 === 14) {
          col(6, 7);
          R.write('\xdb');
        } else if ($80 === 15) {
          if ((R.random(10) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(11, 7);
            R.write('\xe9');
          }
        } else if ($80 === 16) {
          if (!(hidetrap)) {
            col(7, 7);
            R.write('\xf9');
          }
        } else if ($80 === 17) {
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
        } else if ($80 === 18) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x09');
          }
        } else if ($80 === 19) {
          col(2, 7);
          R.write('\xdb');
          bak(0, 0);
        } else if ($80 === 20 || $80 === 252) {
          col(6, 0);
          bak(2, 7);
          R.write('\x05');
          bak(0, 0);
        } else if ($80 === 21) {
          if ((R.random(40) === 0)) {
            col(15, 7);
            R.write('?');
          } else {
            col(15, 7);
            R.write('\x9d');
          }
        } else if ($80 === 22) {
          col(12, 16);
          bak(4, 7);
          R.write('\xb2');
          bak(0, 0);
        } else if ($80 === 23) {
          col(7, 7);
          R.write('\xb0');
        } else if ($80 === 24) {
          col(31, 31);
          bak(5, 0);
          R.write('\x0c');
          bak(0, 0);
        } else if ($80 === 25) {
          col(15, 7);
          R.write('\xef');
        } else if ($80 === 26) {
          col(11, 7);
          R.write('\x9f');
        } else if ($80 === 27) {
          col(14, 7);
          R.write('\x0f');
        } else if ($80 === 28) {
          if ((R.random(15) === 0)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($80 === 29) {

        } else if ($80 === 30) {

        } else if ($80 === 31) {

        } else if ($80 === 32) {

        } else if ($80 === 34) {
          col(12, 7);
          R.write('\x1e');
        } else if ($80 === 35) {
          if (!(hidecreate)) {
            col(15, 7);
            R.write('?');
          }
        } else if ($80 === 36) {
          col(30, 31);
          R.write('\x06');
        } else if ($80 === 38) {
          if (!(hidemblock)) {
            col(6, 7);
            R.write('\xb2');
          }
        } else if ($80 === 33 || $80 === 37 || $80 === 39 || $80 === 67 || ($80 >= 224 && $80 <= 231)) {

        } else if ($80 === 40) {
          bak(7, 7);
          col(16, 16);
          R.write('\xf0');
          bak(0, 0);
        } else if ($80 === 41) {

        } else if ($80 === 42) {
          col(9, 7);
          R.write('\xfe');
        } else if ($80 === 43) {
          col(6, 7);
          R.write('\xb2');
        } else if ($80 === 44) {

        } else if ($80 === 45) {
          col(15, 7);
          R.write('?');
        } else if ($80 === 46) {
          col(31, 23);
          R.write('\x01');
        } else if ($80 === 48) {
          col(14, 15);
          R.write('K');
        } else if ($80 === 49) {
          col(14, 15);
          R.write('R');
        } else if ($80 === 50) {
          col(14, 15);
          R.write('O');
        } else if ($80 === 51) {
          col(14, 15);
          R.write('Z');
        } else if ($80 === 52 || $80 === 53) {
          col(6, 7);
          R.write('\xdb');
        } else if ($80 === 54) {
          col(7, 7);
          R.write('\xdb');
        } else if (($80 >= 55 && $80 <= 57)) {

        } else if (($80 >= 58 && $80 <= 60)) {
          if (!(hideopenwall)) {
            col(11, 7);
            R.write('\x7f');
          }
        } else if (($80 >= 61 && $80 <= 63)) {

        } else if (($80 >= 68 && $80 <= 74)) {

        } else if ($80 === 64) {
          col(7, 7);
          R.write('\xb2');
        } else if ($80 === 65) {
          if (!(hiderock)) {
            col(7, 7);
            R.write('O');
          }
        } else if ($80 === 66) {
          col(12, 0);
          bak(4, 7);
          R.write('X');
          bak(0, 0);
        } else if ($80 === 47) {
          if ((R.random(20) === 0)) {
            col(15, 7);
            R.write('?');
          } else {

          }
        } else if ($80 === 75) {
          col(7, 7);
          R.write('\xb3');
        } else if (($80 >= 76 && $80 <= 80)) {
          col(7, 7);
          R.write('\x19');
        } else if ($80 === 82) {
          col(7, 7);
          R.write('\x1a');
        } else if ($80 === 83) {
          col(7, 7);
          R.write('\x1b');
        } else if ($80 === 81) {
          col(31, 31);
          R.write('\x0c');
        } else if ($80 === 180) {
          col(15, 0);
          bak(6, 7);
          R.write('.');
          bak(0, 0);
        } else if ($80 === 181) {
          col(15, 0);
          bak(6, 7);
          R.write('?');
          bak(0, 0);
        } else if ($80 === 182) {
          col(15, 0);
          bak(6, 7);
          R.write('\'');
          bak(0, 0);
        } else if ($80 === 183) {
          col(15, 0);
          bak(6, 7);
          R.write(',');
          bak(0, 0);
        } else if ($80 === 184) {
          col(15, 0);
          bak(6, 7);
          R.write(':');
          bak(0, 0);
        } else if ($80 === 195) {
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
      if (yloop$2 >= $79) break;
      yloop$2++;
    }
    if (xloop$2 >= $78) break;
    xloop$2++;
  }
  floorpattern = false;
}
function getkey() {
  let $result = 0;
  function badkeysound() {
    let $81;
    R.sound(540);
    R.delay(40);
    x = 1; $81 = 4;
    if (x <= $81) for (;;) {
      R.sound(100);
      R.delay(15);
      R.nosound();
      R.delay(15);
      if (x >= $81) break;
      x++;
    }
    R.nosound();
  }
  let key = '\x00';
  let $82, $83;
  if (R.keypressed()) {
    key = R.readKbd();
    if ((key === '\x1b')) {
      if (R.keypressed()) {
        key = R.readKbd();
        if (($82 = key.charCodeAt(0), $82 === 72 || $82 === 80 || $82 === 77 || $82 === 75 || $82 === 71 || $82 === 79 || $82 === 73 || $82 === 81)) {
          $result = ((key.charCodeAt(0) + 100)) & 255;
        } else {
          badkeysound();
          $result = (0) & 255;
        }
      } else {
        $result = (81) & 255;
      }
    } else {
      $83 = key.charCodeAt(0);
      if ($83 === 40) {
        if ((difficulty === 9)) {
          pf[((px + 1)) * 25 + (py) - 26] = 6;
          R.sound(2000);
          R.delay(40);
          R.nosound();
          $result = (0) & 255;
        }
      } else if ($83 === 41) {
        if ((difficulty === 9)) {
          gems = (150) << 16 >> 16;
          whips = (99) << 16 >> 16;
          teleports = (99) << 16 >> 16;
          keys = (9) << 16 >> 16;
          $result = (0) & 255;
          update_info();
        }
      } else if ($83 === 43) {
        foundset = R.EMPTY;
        flash(13, 25, 'Newly found object desciptions are reset.');
      } else if ($83 === 45) {
        foundset = R.setOf(0, 255);
        flash(10, 25, 'References to new objects will not be displayed.');
      } else if ($83 === 119 || $83 === 87) {
        $result = (87) & 255;
      } else if ($83 === 116 || $83 === 84) {
        $result = (84) & 255;
      } else if ($83 === 112 || $83 === 80) {
        $result = (80) & 255;
      } else if ($83 === 113 || $83 === 81) {
        $result = (81) & 255;
      } else if ($83 === 115 || $83 === 83) {
        $result = (83) & 255;
      } else if ($83 === 114 || $83 === 82) {
        $result = (82) & 255;
      } else if ($83 === 117 || $83 === 85) {
        $result = (171) & 255;
      } else if ($83 === 105 || $83 === 73) {
        $result = (172) & 255;
      } else if ($83 === 111 || $83 === 79) {
        $result = (173) & 255;
      } else if ($83 === 106 || $83 === 74) {
        $result = (175) & 255;
      } else if ($83 === 107 || $83 === 75) {
        $result = (177) & 255;
      } else if ($83 === 110 || $83 === 78) {
        $result = (179) & 255;
      } else if ($83 === 109 || $83 === 77) {
        $result = (180) & 255;
      } else if ($83 === 44) {
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
  let $84, $85, $86, $87, $88, $89, $90, $91, $92, $93, $94;
  thing = String.fromCharCode(pf[(x$10) * 25 + (y$4) - 26]);
  bak(0, 0);
  i$3 = 1; $84 = ((+(fastpc) * 150) + (+(!(fastpc)) * 45));
  if (i$3 <= $84) for (;;) {
    col(R.random(16), 15);
    R.gotoxy(x$10, y$4);
    R.write(ch$3);
    if (i$3 >= $84) break;
    i$3++;
  }
  R.gotoxy(x$10, y$4);
  $85 = (thing.charCodeAt(0)) << 16 >> 16;
  if (($85 >= 1 && $85 <= 3)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    score = ((score + (thing.charCodeAt(0)) << 16 >> 16)) | 0;
    R.sound(400);
    R.delay(20);
    R.sound(90);
  } else if ($85 === 4 || $85 === 19 || $85 === 20 || $85 === 252) {
    i$3 = (whippower) << 16 >> 16;
    if (((thing.charCodeAt(0)) << 16 >> 16 === 19)) {
      i$3 = (8) << 16 >> 16;
    }
    $86 = (thing.charCodeAt(0)) << 16 >> 16;
    if ($86 === 4) {
      thing = '\xb2';
    } else if ($86 === 19) {
      thing = '\xdb';
    } else if ($86 === 20 || $86 === 252) {
      thing = '\x05';
    }
    if ((R.random(7) < i$3)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $87 = 20;
      if (i$3 >= $87) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $87) break;
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
  } else if ($85 === 6) {
    col(16, 16);
    bak(7, 7);
    R.write('\xf0');
    bak(0, 0);
  } else if ($85 === 10 || $85 === 15 || $85 === 16 || $85 === 18 || $85 === 36 || ($85 >= 48 && $85 <= 51)) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
    R.sound(400);
    R.delay(20);
    R.sound(90);
    if (((thing.charCodeAt(0)) << 16 >> 16 === 36)) {
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $88 = 20;
      if (i$3 >= $88) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $88) break;
        i$3--;
      }
      R.sound(90);
      addscore(36);
      gennum = ((gennum - 1)) << 16 >> 16;
    }
  } else if ($85 === 5) {
    col(15, 7);
    R.write('\xf4');
  } else if ($85 === 7) {
    col(14, 7);
    bak(4, 0);
    R.write('C');
    bak(0, 0);
  } else if ($85 === 8) {
    col(11, 7);
    R.write('\xe8');
  } else if ($85 === 9) {
    col(gemcolor, 7);
    R.write('\x04');
  } else if ($85 === 11) {
    col(13, 7);
    R.write('\x18');
  } else if ($85 === 12) {
    col(12, 15);
    R.write('\x8c');
  } else if ($85 === 13) {
    col(3, 0);
    bak(5, 7);
    R.write('\xec');
    bak(0, 0);
  } else if ($85 === 14 || $85 === 52 || $85 === 53) {
    col(6, 7);
    R.write('\xdb');
  } else if ($85 === 54) {
    col(7, 7);
    R.write('\xdb');
  } else if ($85 === 17) {
    col(9, 0);
    bak(1, 7);
    R.write('\xf7');
    bak(0, 0);
  } else if ($85 === 21) {
    col(15, 7);
    R.write('\x9d');
  } else if ($85 === 22) {
    col(12, 16);
    bak(4, 7);
    R.write('\xb2');
    bak(0, 0);
  } else if ($85 === 23) {
    col(7, 7);
    R.write('\xb0');
  } else if ($85 === 24) {
    col(31, 31);
    bak(5, 0);
    R.write('\x0c');
    bak(0, 0);
  } else if ($85 === 25) {
    col(15, 7);
    R.write('\xef');
  } else if ($85 === 26) {
    col(11, 7);
    R.write('\x9f');
  } else if ($85 === 27) {
    col(14, 7);
    R.write('\x0f');
  } else if (($85 >= 28 && $85 <= 31) || $85 === 33 || $85 === 37 || $85 === 39 || $85 === 41 || $85 === 44 || $85 === 67 || ($85 >= 224 && $85 <= 231)) {
    col(0, 0);
    bak(0, 0);
    R.write(' ');
  } else if ($85 === 32) {
    pf[(x$10) * 25 + (y$4) - 26] = 0;
    R.write(' ');
  } else if ($85 === 34) {
    col(12, 7);
    R.write('\x1e');
  } else if ($85 === 35) {
    col(14, 7);
    R.write('\x1f');
  } else if ($85 === 42) {
    col(9, 7);
    R.write('\xfe');
  } else if ($85 === 45) {
    col(15, 7);
    R.write('?');
  } else if (($85 >= 58 && $85 <= 60)) {
    col(11, 7);
    R.write('\x7f');
  } else if ($85 === 66) {
    col(12, 0);
    bak(4, 7);
    R.write('X');
    bak(0, 0);
  } else if ($85 === 47 || ($85 >= 55 && $85 <= 57) || ($85 >= 61 && $85 <= 63) || ($85 >= 68 && $85 <= 74)) {
    R.write(' ');
  } else if (($85 >= 76 && $85 <= 80)) {
    col(7, 7);
    R.write('\x19');
  } else if ($85 === 75) {
    col(7, 7);
    R.write('\xb3');
  } else if ($85 === 81) {
    col(31, 31);
    R.write('\x0c');
  } else if ($85 === 82) {
    col(7, 7);
    R.write('\x1a');
  } else if ($85 === 83) {
    col(7, 7);
    R.write('\x1b');
  } else if ($85 === 46) {
    i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $89 = 20;
    if (i$3 >= $89) for (;;) {
      R.sound(R.random(i$3));
      if (i$3 <= $89) break;
      i$3--;
    }
    R.sound(90);
    if ((R.random(50) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = 1; $90 = 32000;
      if (i$3 <= $90) for (;;) {
        R.sound(R.random(5000));
        if (i$3 >= $90) break;
        i$3++;
      }
      i$3 = 18900; $91 = 20;
      if (i$3 >= $91) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $91) break;
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
  } else if ($85 === 65) {
    if ((R.random(30) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 8700) + (+(!(fastpc)) * 5300)); $92 = 20;
      if (i$3 >= $92) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $92) break;
        i$3--;
      }
      R.sound(90);
      score = ((score + 100)) | 0;
      update_info();
    } else {
      i$3 = ((+(fastpc) * 4700) + (+(!(fastpc)) * 2300)); $93 = 20;
      if (i$3 >= $93) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $93) break;
        i$3--;
      }
      R.sound(90);
      col(7, 7);
      R.write('O');
    }
  } else if ($85 === 38 || $85 === 43 || $85 === 64) {
    if ((R.random(7) < whippower)) {
      R.write(' ');
      pf[(x$10) * 25 + (y$4) - 26] = 0;
      i$3 = ((+(fastpc) * 5700) + (+(!(fastpc)) * 3300)); $94 = 20;
      if (i$3 >= $94) for (;;) {
        R.sound(R.random(i$3));
        if (i$3 <= $94) break;
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
  } else if ($85 === 0) {
    R.write(' ');
  } else {
    col(15, 0);
    bak(6, 7);
    R.write(R.upcase(String.fromCharCode((pf[(x$10) * 25 + (y$4) - 26]) & 255)));
    bak(0, 0);
  }
}
function secret_message() {
  let $95;
  x = 20; $95 = 8000;
  if (x <= $95) for (;;) {
    R.sound(x);
    if (x >= $95) break;
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
function shoot_right(xway$3, yway$3, human$2) {
  let $96, $97, $98, $99, $100;
  go({ get v() { return xway$3; }, set v($v) { xway$3 = $v; } }, { get v() { return yway$3; }, set v($v) { yway$3 = $v; } }, human$2);
  x = (px) << 16 >> 16;
  R.sound((x + 30));
  x = (x + 1) << 16 >> 16;
  while (((x < 66) && !(($96 = pf[(x) * 25 + (py) - 26], $96 === 4 || $96 === 6 || $96 === 13 || $96 === 14 || $96 === 22 || $96 === 25 || $96 === 31 || $96 === 36 || $96 === 38 || $96 === 42 || $96 === 43 || $96 === 46 || ($96 >= 52 && $96 <= 54) || ($96 >= 64 && $96 <= 66) || $96 === 81)))) {
    b = 1; $97 = 60;
    if (b <= $97) for (;;) {
      R.gotoxy(x, py);
      col(R.random((15 + 1)), 15);
      R.write('\xc4');
      if (b >= $97) break;
      b++;
    }
    R.gotoxy(x, py);
    col(15, 15);
    R.write('\xc4');
    if (!(($98 = pf[(x) * 25 + (py) - 26], $98 === 0 || $98 === 17 || $98 === 23 || ($98 >= 28 && $98 <= 30) || $98 === 32 || $98 === 33 || $98 === 37 || $98 === 39 || $98 === 41 || $98 === 44 || $98 === 47 || ($98 >= 55 && $98 <= 57) || ($98 >= 61 && $98 <= 63) || ($98 >= 67 && $98 <= 75)))) {
      R.sound(300);
      R.delay(10);
      if (($99 = pf[(x) * 25 + (py) - 26], ($99 >= 1 && $99 <= 3))) {
        pf[(x) * 25 + (py) - 26] = 32;
      } else {
        pf[(x) * 25 + (py) - 26] = 0;
      }
    }
    R.sound((x + 30));
    R.gotoxy(x, py);
    col(7, 7);
    $100 = pf[(x) * 25 + (py) - 26];
    if ($100 === 17) {
      col(9, 0);
      bak(1, 7);
      R.write('\xf7');
      bak(0, 0);
    } else if ($100 === 23) {
      R.write('\xb0');
    } else if ($100 === 75) {
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
function shoot_left(xway$4, yway$4, human$3) {
  let $101, $102, $103, $104, $105;
  go({ get v() { return xway$4; }, set v($v) { xway$4 = $v; } }, { get v() { return yway$4; }, set v($v) { yway$4 = $v; } }, human$3);
  x = (px) << 16 >> 16;
  R.sound((x + 30));
  x = (x - 1) << 16 >> 16;
  while (((x > 1) && !(($101 = pf[(x) * 25 + (py) - 26], $101 === 4 || $101 === 6 || $101 === 13 || $101 === 14 || $101 === 22 || $101 === 25 || $101 === 31 || $101 === 36 || $101 === 38 || $101 === 42 || $101 === 43 || $101 === 46 || ($101 >= 52 && $101 <= 54) || ($101 >= 64 && $101 <= 66) || $101 === 81)))) {
    b = 1; $102 = 60;
    if (b <= $102) for (;;) {
      R.gotoxy(x, py);
      col(R.random((15 + 1)), 15);
      R.write('\xc4');
      if (b >= $102) break;
      b++;
    }
    R.gotoxy(x, py);
    col(15, 15);
    R.write('\xc4');
    if (!(($103 = pf[(x) * 25 + (py) - 26], $103 === 0 || $103 === 17 || $103 === 23 || ($103 >= 28 && $103 <= 30) || $103 === 32 || $103 === 33 || $103 === 37 || $103 === 39 || $103 === 41 || $103 === 44 || $103 === 47 || ($103 >= 55 && $103 <= 57) || ($103 >= 61 && $103 <= 63) || ($103 >= 67 && $103 <= 75)))) {
      R.sound(300);
      R.delay(10);
      if (($104 = pf[(x) * 25 + (py) - 26], ($104 >= 1 && $104 <= 3))) {
        pf[(x) * 25 + (py) - 26] = 32;
      } else {
        pf[(x) * 25 + (py) - 26] = 0;
      }
    }
    R.sound((x + 30));
    R.gotoxy(x, py);
    col(7, 7);
    $105 = pf[(x) * 25 + (py) - 26];
    if ($105 === 17) {
      col(9, 0);
      bak(1, 7);
      R.write('\xf7');
      bak(0, 0);
    } else if ($105 === 23) {
      R.write('\xb0');
    } else if ($105 === 75) {
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
  flash(6, 25, ' You reach out to grab the object of your long quest... ');
  flash(19, 25, ' the Magical Amulet of Kroz. ');
  flash(7, 25, ' Your body surges with electricity as you clutch it! ');
}
function tome_effects() {
  let $106, $107, $108;
  bak(0, 0);
  b = 7; $106 = 0;
  if (b >= $106) for (;;) {
    x = 2; $107 = 65;
    if (x <= $107) for (;;) {
      y = 2; $108 = 24;
      if (y <= $108) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 0)) {
          R.sound(((x * y) * (b + 1)));
          R.gotoxy(x, y);
          col((b * 2), ((+(((b & 1) !== 0)) * 7) + (+(!(((b & 1) !== 0))) * 0)));
          R.write('\xdb');
        }
        if (y >= $108) break;
        y++;
      }
      if (x >= $107) break;
      x++;
    }
    if (b <= $106) break;
    b--;
  }
  R.nosound();
}
function prayer() {
  flash(8, 25, 'On the Ancient Tablet is a short Mantra, a prayer...');
  flash(8, 25, 'You take a deep breath and speak the words aloud...');
}
function tablet_message(level$2) {
  let $109, $110, $111, $112, $113;
  $109 = level$2;
  if ($109 === 1) {
    flash(5, 25, 'Once again you uncover the hidden tunnel leading to Kroz!');
  } else if ($109 === 2) {
    flash(7, 25, 'Warning to all Adventurers:  No one returns from Kroz!');
  } else if ($109 === 4) {
    flash(8, 25, 'Adventurer, try the top right corner if you desire.');
  } else if ($109 === 6) {
    flash(6, 25, 'A strange magical gravity force is tugging you downward!');
  } else if ($109 === 8 || $109 === 24) {
    flash(12, 25, 'You have choosen the greedy path Adventurer!');
  } else if ($109 === 9) {
    flash(3, 25, 'A magical forest grows out of control in this region of Kroz!');
  } else if ($109 === 10) {
    flash(9, 25, 'Sometimes, Adventurer, Gems can be crystal clear.');
  } else if ($109 === 12) {
    flash(11, 25, 'The lava will block a slow Adventurer\'s path!');
  } else if ($109 === 14) {
    flash(9, 25, 'Follow the sequence if you wish to be successful.');
  } else if ($109 === 18) {
    prayer();
    flash(4, 25, '"Barriers of water, like barriers in life, can always be..."');
    bak(0, 0);
    x = 2; $110 = 65;
    if (x <= $110) for (;;) {
      y = 2; $111 = 24;
      if (y <= $111) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 17)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 43;
          R.gotoxy(x, y);
          col(6, 7);
          R.write('\xb2');
          R.delay(4);
        }
        if (y >= $111) break;
        y++;
      }
      if (x >= $110) break;
      x++;
    }
    R.nosound();
    flash(26, 25, '"...Overcome!"');
  } else if ($109 === 20) {
    flash(16, 25, 'These walls will seek to entrap you!');
  } else if ($109 === 22) {
    prayer();
    flash(6, 25, '"If goodness is in my heart, that which flows shall..."');
    bak(0, 0);
    x = 2; $112 = 65;
    if (x <= $112) for (;;) {
      y = 2; $113 = 24;
      if (y <= $113) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 17)) {
          R.sound((x * y));
          pf[(x) * 25 + (y) - 26] = 27;
          R.gotoxy(x, y);
          col(14, 7);
          R.write('\x0f');
          R.delay(1);
        }
        if (y >= $113) break;
        y++;
      }
      if (x >= $112) break;
      x++;
    }
    R.nosound();
    flash(25, 25, '"...Turn to Gold!"');
  }
}
function next_level() {
  let $114;
  $114 = level;
  if ($114 === 1) {
    level1();
  } else if ($114 === 2) {
    level2();
  } else if ($114 === 4) {
    level4();
  } else if ($114 === 6) {
    level6();
  } else if ($114 === 8) {
    level8();
  } else if ($114 === 10) {
    level10();
  } else if ($114 === 12) {
    level12();
  } else if ($114 === 14) {
    level14();
  } else if ($114 === 16) {
    level16();
  } else if ($114 === 18) {
    level18();
  } else if ($114 === 20) {
    level20();
  } else if ($114 === 22) {
    level22();
  } else if ($114 === 24) {
    level24();
  } else if ($114 === 25) {
    level25();
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
  let $115, $116, $117, $118, $119, $120, $121, $122, $123, $124, $125, $126, $127, $128, $129, $130, $131, $132, $133, $134, $135, $136, $137, $138, $139, $140, $141, $142, $143, $144, $145, $146, $147, $148, $149, $150, $151, $152, $153, $154, $155, $156, $157, $158, $159, $160, $161, $162, $163, $164, $165, $166, $167, $168, $169, $170, $171, $172, $173, $174, $175, $176, $177, $178, $179, $180, $181, $182, $183, $184, $185, $186, $187, $188, $189, $190, $191, $192, $193, $194, $195, $196, $197, $198, $199, $200, $201, $202, $203, $204, $205, $206, $207, $208, $209, $210, $211, $212, $213, $214, $215, $216, $217, $218;
  L2_jump_end: {
  if ((((sideways && (yway$5 === -(1))) && (replacement !== 75)) && !(($115 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], ($115 >= 75 && $115 <= 80))))) {
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
  $116 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
  if ($116 === 0) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if (($116 >= 1 && $116 <= 3)) {
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
  } else if ($116 === 4 || $116 === 43 || $116 === 64) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 4))) {
        foundset = R.union(foundset, R.setOf(4, 4));
        flash(17, 25, 'A Breakable Wall blocks your way.');
      }
    }
  } else if ($116 === 5) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    whips = ((whips + 1)) << 16 >> 16;
    addscore(5);
    if (!(R.inSet(foundset, 5))) {
      foundset = R.union(foundset, R.setOf(5, 5));
      flash(26, 25, 'You found a Whip.');
    }
  } else if ($116 === 6) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    clearkeys();
    if ((level === 25)) {
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
    if ((level === 9)) {
      treerate = (40) << 16 >> 16;
    }
    if ((level === 15)) {
      lavaflow = true;
      lavarate = (40) << 16 >> 16;
    }
    footstep();
    bak(gemcolor, 7);
    x = 1; $117 = 30;
    if (x <= $117) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      if (x >= $117) break;
      x++;
    }
    bak(0, 0);
    x = 1; $118 = 30;
    if (x <= $118) for (;;) {
      R.window((32 - x), (12 - Math.trunc(x / 3)), (35 + x), (14 + Math.trunc(x / 3)));
      R.clrscr();
      R.sound((x * 45));
      if (x >= $118) break;
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
    x = 1; $119 = 600;
    if (x <= $119) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      R.sound(Math.trunc(x / 2));
      if (x >= $119) break;
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
  } else if ($116 === 7) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    xb = 3; $120 = 42;
    if (xb <= $120) for (;;) {
      yb = 3; $121 = 42;
      if (yb <= $121) for (;;) {
        R.sound((xb * yb));
        R.delay(1);
        if (yb >= $121) break;
        yb++;
      }
      if (xb >= $120) break;
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
  } else if ($116 === 8) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(5);
    x = 7; $122 = 1;
    if (x >= $122) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x <= $122) break;
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
  } else if ($116 === 9) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    gems = ((gems + 1)) << 16 >> 16;
    addscore(9);
    if (!(R.inSet(foundset, 9))) {
      foundset = R.union(foundset, R.setOf(9, 9));
      flash(15, 25, 'Gems give you both points and strength.');
    }
  } else if ($116 === 10) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(10);
    x = 1; $123 = 4;
    if (x <= $123) for (;;) {
      R.sound(600);
      R.delay(50);
      R.nosound();
      R.delay(50);
      if (x >= $123) break;
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
  } else if ($116 === 11) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    teleports = ((teleports + 1)) << 16 >> 16;
    addscore(11);
    if (!(R.inSet(foundset, 11))) {
      foundset = R.union(foundset, R.setOf(11, 11));
      flash(20, 25, 'You found a Teleport scroll.');
    }
  } else if ($116 === 12) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    keys = ((keys + 1)) << 16 >> 16;
    grabsound();
    update_info();
    if (!(R.inSet(foundset, 12))) {
      foundset = R.union(foundset, R.setOf(12, 12));
      flash(22, 25, 'Use Keys to unlock doors.');
    }
  } else if ($116 === 13) {
    if (human$4) {
      if ((keys < 1)) {
        x = 1; $124 = 15;
        if (x <= $124) for (;;) {
          R.sound((R.random(99) + 30));
          R.delay(15);
          R.nosound();
          R.delay(15);
          if (x >= $124) break;
          x++;
        }
        flash(18, 25, 'To pass the Door you need a Key.');
      } else {
        keys = ((keys - 1)) << 16 >> 16;
        addscore(11);
        x = 10; $125 = 90;
        if (x <= $125) for (;;) {
          R.sound(x);
          R.delay(15);
          if (x >= $125) break;
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
  } else if ($116 === 14 || $116 === 17) {
    if (human$4) {
      if ((pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] === 14)) {
        blocksound();
      } else {
        x = 1; $126 = ((+(fastpc) * 2000) + (+(!(fastpc)) * 500));
        if (x <= $126) for (;;) {
          R.sound((R.random(((x * 2) + 200)) + x));
          if (x >= $126) break;
          x++;
        }
        R.nosound();
      }
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $127 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($127 === 14) {
          flash(20, 25, 'A Solid Wall blocks your way.');
        } else if ($127 === 17) {
          flash(18, 25, 'You cannot travel through Water.');
        }
      }
    }
  } else if ($116 === 15) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(15);
    x = 1; $128 = 7;
    if (x <= $128) for (;;) {
      R.sound(((x * 50) + 300));
      R.delay(((x * 10) + 40));
      if (x >= $128) break;
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
  } else if ($116 === 16) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(16);
    x = 1; $129 = 500;
    if (x <= $129) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $129) break;
      x++;
    }
    R.gotoxy(px, py);
    bak(0, 0);
    col(0, 0);
    R.write(' ');
    yb = 60; $130 = 1;
    if (yb >= $130) for (;;) {
      x = 550; $131 = 20;
      if (x >= $131) for (;;) {
        R.sound((yb * x));
        if (x <= $131) break;
        x--;
      }
      if (yb <= $130) break;
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
    x = 1; $132 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $132) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $132) break;
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
  } else if ($116 === 18) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    whippower = ((whippower + 1)) << 16 >> 16;
    x = 3; $133 = 35;
    if (x <= $133) for (;;) {
      y = 45; $134 = 52;
      if (y <= $134) for (;;) {
        R.sound((x * y));
        R.delay(7);
        R.nosound();
        R.delay(15);
        col(R.random(8), R.random(8));
        R.gotoxy(px, py);
        R.write('\x02');
        if (y >= $134) break;
        y++;
      }
      if (x >= $133) break;
      x++;
    }
    bak(0, 0);
    col(14, 15);
    R.gotoxy(px, py);
    R.write('\x02');
    bak(0, 0);
    addscore(15);
    flash(9, 25, 'A Power Ring--your whip is now a little stronger!');
  } else if ($116 === 19 || $116 === 20) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]))) {
        foundset = R.union(foundset, R.setOf(pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26], pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]));
        $135 = pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26];
        if ($135 === 19) {
          flash(14, 25, 'You cannot travel through forest terrain.');
        } else if ($135 === 20) {
          flash(24, 25, 'A tree blocks your way.');
        }
      }
    }
  } else if ($116 === 21) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    xr = (0) << 16 >> 16;
    xl = (0) << 16 >> 16;
    yr = (0) << 16 >> 16;
    yl = (0) << 16 >> 16;
    i = 70; $136 = 600;
    if (i <= $136) for (;;) {
      R.sound((i * 2));
      R.delay(3);
      if (i >= $136) break;
      i++;
    }
    bor(15);
    i = ((+(fastpc) * 8230) + (+(!(fastpc)) * 5000)); $137 = 20;
    if (i >= $137) for (;;) {
      R.sound(R.random(i));
      if (i <= $137) break;
      i--;
    }
    width = 1; $138 = 4;
    if (width <= $138) for (;;) {
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
      x = (px - xl); $139 = (px + xr);
      if (x <= $139) for (;;) {
        y = (py - yl); $140 = (py + yr);
        if (y <= $140) for (;;) {
          if (($141 = pf[(x) * 25 + (y) - 26], ($141 >= 0 && $141 <= 4) || $141 === 13 || $141 === 16 || $141 === 19 || ($141 >= 28 && $141 <= 32) || $141 === 33 || $141 === 35 || ($141 >= 36 && $141 <= 39) || $141 === 43 || $141 === 45 || ($141 >= 48 && $141 <= 51) || $141 === 64 || $141 === 67 || ($141 >= 68 && $141 <= 74) || ($141 >= 224 && $141 <= 231))) {
            R.gotoxy(x, y);
            col(12, 15);
            R.write('\xdb');
          }
          if (y >= $140) break;
          y++;
        }
        if (x >= $139) break;
        x++;
      }
      if (width >= $138) break;
      width++;
    }
    R.delay(100);
    width = 1; $142 = 4;
    if (width <= $142) for (;;) {
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
      x = (px - xl); $143 = (px + xr);
      if (x <= $143) for (;;) {
        y = (py - yl); $144 = (py + yr);
        if (y <= $144) for (;;) {
          if (($145 = pf[(x) * 25 + (y) - 26], ($145 >= 0 && $145 <= 4) || $145 === 13 || $145 === 16 || $145 === 19 || ($145 >= 28 && $145 <= 32) || $145 === 33 || $145 === 35 || ($145 >= 36 && $145 <= 39) || $145 === 43 || $145 === 45 || ($145 >= 48 && $145 <= 51) || $145 === 64 || $145 === 67 || ($145 >= 68 && $145 <= 74) || ($145 >= 224 && $145 <= 231))) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            if (($146 = pf[(x) * 25 + (y) - 26], ($146 >= 1 && $146 <= 3))) {
              score = ((score + pf[(x) * 25 + (y) - 26])) | 0;
            }
            pf[(x) * 25 + (y) - 26] = 0;
          }
          if (y >= $144) break;
          y++;
        }
        if (x >= $143) break;
        x++;
      }
      if (width >= $142) break;
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
  } else if ($116 === 22) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    gems = ((gems - 10)) << 16 >> 16;
    x = ((+(fastpc) * 2000) + (+(!(fastpc)) * 1400)); $147 = 20;
    if (x >= $147) for (;;) {
      y = 9; $148 = 2;
      if (y >= $148) for (;;) {
        R.sound((R.random(((y * x) + 100)) + (y * x)));
        if (y <= $148) break;
        y--;
      }
      if (x <= $147) break;
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
  } else if ($116 === 23) {
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
    i = 1; $149 = 16;
    if (i <= $149) for (;;) {
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
      y = 2; $150 = 24;
      if (y <= $150) for (;;) {
        x = ((x - 8)) << 16 >> 16;
        R.sound(x);
        R.gotoxy(34, y);
        R.write('\x02');
        R.delay((52 - (3 * i)));
        R.gotoxy(34, y);
        R.write(' ');
        if (y >= $150) break;
        y++;
      }
      R.nosound();
      if (i >= $149) break;
      i++;
    }
    R.gotoxy(34, 24);
    R.write('_');
    i = 8000; $151 = 20;
    if (i >= $151) for (;;) {
      R.sound(R.random(i));
      if (i <= $151) break;
      i--;
    }
    R.nosound();
    clearkeys();
    flash(29, 1, '* SPLAT!! *');
    dead(false);
  } else if ($116 === 24) {
    tome_message();
    i = 1; $152 = 3;
    if (i <= $152) for (;;) {
      tome_effects();
      if (i >= $152) break;
      i++;
    }
    bak(0, 0);
    x = 1; $153 = 24;
    if (x <= $153) for (;;) {
      y = 5; $154 = 1;
      if (y >= $154) for (;;) {
        R.sound(((x * 45) + (y * 10)));
        R.delay((y * 3));
        R.nosound();
        R.delay(40);
        R.gotoxy(34, 6);
        col(R.random(16), R.random(16));
        R.write('\x0c');
        if (y <= $154) break;
        y--;
      }
      if (x >= $153) break;
      x++;
    }
    R.gotoxy(34, 6);
    col(16, 16);
    bak(2, 7);
    R.write('\xf0');
    bak(0, 0);
    pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26] = 6;
    score = ((score + 5000)) | 0;
    update_info();
    clearkeys();
    flash(5, 25, 'The Magical Amulet of Kroz is finally yours--50,000 points!');
    flash(9, 25, 'Congratualtions, Adventurer, you finally did it!!!');
  } else if ($116 === 25) {
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
    i = 1; $155 = 100;
    if (i <= $155) for (;;) {
      R.sound((R.random(3000) + 100));
      a = ((R.random(3) - 1)) << 16 >> 16;
      b = ((R.random(3) - 1)) << 16 >> 16;
      if ((($156 = pf[((x + a)) * 25 + ((y + b)) - 26], $156 === 0 || $156 === 32 || $156 === 33 || $156 === 37 || $156 === 39 || ($156 >= 55 && $156 <= 57) || $156 === 67 || ($156 >= 224 && $156 <= 231)) && (done === false))) {
        if (!((((((x + a) < 2) || ((x + a) > 65)) || ((y + b) < 2)) || ((y + b) > 24)))) {
          done = true;
          x = ((x + a)) << 16 >> 16;
          y = ((y + b)) << 16 >> 16;
        }
      }
      if (i >= $155) break;
      i++;
    }
    R.nosound();
    if ((done === false)) {
      x = (pxold) << 16 >> 16;
      y = (pyold) << 16 >> 16;
    }
    px = (x) << 16 >> 16;
    py = (y) << 16 >> 16;
    if (($157 = pf[(px) * 25 + (py) - 26], ($157 >= 55 && $157 <= 57))) {
      replacement = (pf[(px) * 25 + (py) - 26]) << 16 >> 16;
    } else {
      replacement = (0) << 16 >> 16;
    }
    pf[(px) * 25 + (py) - 26] = 40;
    x = 1; $158 = ((+(fastpc) * 2100) + (+(!(fastpc)) * 400));
    if (x <= $158) for (;;) {
      R.sound(R.random(1000));
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), 0);
      R.write('\x02');
      if (x >= $158) break;
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
  } else if ($116 === 26) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(11);
    grabsound();
    x = 1; $159 = ((+(fastpc) * 8000) + (+(!(fastpc)) * 5000));
    if (x <= $159) for (;;) {
      R.sound(((R.random(1000) + x) + 200));
      if (x >= $159) break;
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
  } else if ($116 === 27) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    addscore(27);
    grabsound();
    if (!(R.inSet(foundset, 27))) {
      foundset = R.union(foundset, R.setOf(27, 27));
      flash(15, 25, 'You found a Gold Nugget...500 points!');
    }
  } else if ($116 === 28) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    i = 1; $160 = ((+(fastpc) * 5500) + (+(!(fastpc)) * 2500));
    if (i <= $160) for (;;) {
      R.sound(R.random(i));
      if (i >= $160) break;
      i++;
    }
    R.nosound();
    i = 1; $161 = 50;
    if (i <= $161) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($162 = pf[(x) * 25 + (y) - 26], ($162 >= 0 && $162 <= 3) || $162 === 5 || ($162 >= 7 && $162 <= 11) || ($162 >= 15 && $162 <= 16) || $162 === 26 || $162 === 32 || $162 === 33 || $162 === 37 || $162 === 39 || $162 === 67 || ($162 >= 224 && $162 <= 231))) {
          done = true;
          pf[(x) * 25 + (y) - 26] = 65;
          R.gotoxy(x, y);
          col(7, 7);
          R.write('O');
        }
      } while (!(((R.random(100) === 0) || done)));
      x = 1; $163 = ((+(fastpc) * 700) + (+(!(fastpc)) * 400));
      if (x <= $163) for (;;) {
        R.sound(R.random(200));
        if (x >= $163) break;
        x++;
      }
      R.nosound();
      if (i >= $161) break;
      i++;
    }
    i = 2500; $164 = 20;
    if (i >= $164) for (;;) {
      R.sound(R.random(i));
      if (i <= $164) break;
      i--;
    }
    R.nosound();
    if (!(R.inSet(foundset, 28))) {
      foundset = R.union(foundset, R.setOf(28, 28));
      clearkeys();
      flash(15, 25, 'Oh no, you set off an Earthquake trap!');
    }
  } else if ($116 === 29) {
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
  } else if ($116 === 30) {
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
  } else if ($116 === 31) {
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
  } else if ($116 === 32) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if ($116 === 33) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $165 = 65;
    if (x <= $165) for (;;) {
      y = 2; $166 = 24;
      if (y <= $166) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 33)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $166) break;
        y++;
      }
      if (x >= $165) break;
      x++;
    }
  } else if ($116 === 34) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    killed = (0) << 16 >> 16;
    trycounter = (0) << 16 >> 16;
    do {
      trycounter = ((trycounter + 1)) << 16 >> 16;
      $167 = (R.random(3) + 1);
      if ($167 === 1) {
        if ((snum > 1)) {
          i = ((R.random(snum) + 1)) << 16 >> 16;
          if ((sx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $168 = 3;
            if (x >= $168) for (;;) {
              R.sound((x * 5));
              R.gotoxy(sx[(i) - 1], sy[(i) - 1]);
              col(R.random(16), 15);
              R.write(slow);
              if (x <= $168) break;
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
      } else if ($167 === 2) {
        if ((mnum > 1)) {
          i = ((R.random(mnum) + 1)) << 16 >> 16;
          if ((mx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $169 = 3;
            if (x >= $169) for (;;) {
              R.sound((x * 5));
              R.gotoxy(mx[(i) - 1], my[(i) - 1]);
              col(R.random(16), 15);
              R.write(medium);
              if (x <= $169) break;
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
      } else if ($167 === 3) {
        if ((fnum > 1)) {
          i = ((R.random(fnum) + 1)) << 16 >> 16;
          if ((fx[(i) - 1] !== 0)) {
            killed = ((killed + 1)) << 16 >> 16;
            x = ((+(fastpc) * 230) + (+(!(fastpc)) * 80)); $170 = 3;
            if (x >= $170) for (;;) {
              R.sound((x * 5));
              R.gotoxy(fx[(i) - 1], fy[(i) - 1]);
              col(R.random(16), 15);
              R.write(fast);
              if (x <= $170) break;
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
  } else if ($116 === 35) {
    if (!(sideways)) {
      go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
      if ((snum < 945)) {
        i = 1; $171 = 45;
        if (i <= $171) for (;;) {
          done = false;
          do {
            x = ((R.random(64) + 2)) << 16 >> 16;
            y = ((R.random(23) + 2)) << 16 >> 16;
            if (($172 = pf[(x) * 25 + (y) - 26], $172 === 0 || $172 === 224)) {
              done = true;
              pf[(x) * 25 + (y) - 26] = 1;
              R.gotoxy(x, y);
              col(12, 7);
              R.write(slow);
              snum = ((snum + 1)) << 16 >> 16;
              sx[(snum) - 1] = x;
              sy[(snum) - 1] = y;
              x = 5; $173 = 50;
              if (x <= $173) for (;;) {
                R.sound((x * 12));
                R.delay(1);
                if (x >= $173) break;
                x++;
              }
              R.nosound();
            }
          } while (!(((R.random(120) === 0) || done)));
          if (i >= $171) break;
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
      go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
      gems = ((gems - 3)) << 16 >> 16;
      x = 6000; $174 = 3000;
      if (x >= $174) for (;;) {
        R.sound((R.random(x) + 999));
        if (x <= $174) break;
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
  } else if ($116 === 36) {
    if (human$4) {
      blocksound();
      if (!(R.inSet(foundset, 36))) {
        flash(14, 25, 'You have discovered a Creature Generator!');
        foundset = R.union(foundset, R.setOf(36, 36));
      }
    }
  } else if ($116 === 37) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $175 = 65;
    if (x <= $175) for (;;) {
      y = 2; $176 = 24;
      if (y <= $176) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 37)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $176) break;
        y++;
      }
      if (x >= $175) break;
      x++;
    }
  } else if ($116 === 38) {
    if (human$4) {
      blocksound();
      addscore(4);
      clearkeys();
      if (!(R.inSet(foundset, 38))) {
        foundset = R.union(foundset, R.setOf(38, 38));
        flash(19, 25, 'A Moving Wall blocks your way.');
      }
    }
  } else if ($116 === 39) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $177 = 65;
    if (x <= $177) for (;;) {
      y = 2; $178 = 24;
      if (y <= $178) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 39)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $178) break;
        y++;
      }
      if (x >= $177) break;
      x++;
    }
  } else if ($116 === 41) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    i = 1; $179 = ((+(fastpc) * 120) + (+(!(fastpc)) * 70));
    if (i <= $179) for (;;) {
      x = 7; $180 = 1;
      if (x >= $180) for (;;) {
        R.sound((i * x));
        if (x <= $180) break;
        x--;
      }
      if (i >= $179) break;
      i++;
    }
    R.nosound();
    i = 1; $181 = ((difficulty * 2) + 5);
    if (i <= $181) for (;;) {
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
      if (i >= $181) break;
      i++;
    }
    clearkeys();
    flash(11, 25, 'Yah Hoo! You discovered a Reveal Gems Scroll!');
  } else if ($116 === 42) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    score = (((score + level) + 250)) | 0;
    update_info();
    if (!(R.inSet(foundset, 42))) {
      foundset = R.union(foundset, R.setOf(42, 42));
      flash(7, 25, 'You found an Ancient Tablet of Wisdom...2,500 points!');
    }
    clearkeys();
    tablet_message(level);
  } else if ($116 === 44) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $182 = 65;
    if (x <= $182) for (;;) {
      y = 2; $183 = 24;
      if (y <= $183) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 43)) {
          R.sound(200);
          pf[(x) * 25 + (y) - 26] = 0;
          i = 1; $184 = 20;
          if (i <= $184) for (;;) {
            R.gotoxy(x, y);
            col(R.random(16), 15);
            R.write('\xb2');
            R.delay(3);
            if (i >= $184) break;
            i++;
          }
          R.gotoxy(x, y);
          col(0, 0);
          R.write(' ');
          R.nosound();
        }
        if (y >= $183) break;
        y++;
      }
      if (x >= $182) break;
      x++;
    }
    x = 2; $185 = 65;
    if (x <= $185) for (;;) {
      y = 2; $186 = 24;
      if (y <= $186) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === 44)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $186) break;
        y++;
      }
      if (x >= $185) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, 44))) {
      foundset = R.union(foundset, R.setOf(44, 44));
      flash(19, 25, 'You triggered Exploding Walls!');
    } else {
      clearkeys();
    }
  } else if ($116 === 45) {
    a = ((R.random(difficulty) + 13)) << 16 >> 16;
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
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
  } else if ($116 === 46) {
    if (human$4) {
      blocksound();
      clearkeys();
      flash(9, 25, 'Statues are very dangerous...they drain your Gems!');
    }
  } else if ($116 === 47) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    i = 1; $187 = 75;
    if (i <= $187) for (;;) {
      done = false;
      do {
        x = ((R.random(64) + 2)) << 16 >> 16;
        y = ((R.random(23) + 2)) << 16 >> 16;
        if (($188 = pf[(x) * 25 + (y) - 26], $188 === 4 || $188 === 14)) {
          R.sound((R.random(2500) + 999));
          done = true;
          $189 = pf[(x) * 25 + (y) - 26];
          if ($189 === 4) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 29;
          } else if ($189 === 14) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 30;
          }
          R.delay(5);
          R.nosound();
        }
      } while (!(((R.random(200) === 0) || done)));
      if (i >= $187) break;
      i++;
    }
    clearkeys();
    flash(4, 25, 'Yikes!  A trap has made many of the wall sections invisible!');
  } else if ($116 === 48) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    if ((bonus === 0)) {
      bonus = (1) << 16 >> 16;
    }
  } else if ($116 === 49) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    if ((bonus === 1)) {
      bonus = (2) << 16 >> 16;
    }
  } else if ($116 === 50) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    if ((bonus === 2)) {
      bonus = (3) << 16 >> 16;
    }
  } else if ($116 === 51) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    grabsound();
    if ((bonus === 3)) {
      clearkeys();
      x = 10; $190 = 45;
      if (x <= $190) for (;;) {
        y = 1; $191 = 13;
        if (y <= $191) for (;;) {
          R.sound(((x * x) * y));
          R.delay((y + 1));
          if (y >= $191) break;
          y++;
        }
        if (x >= $190) break;
        x++;
      }
      R.nosound();
      score = ((score + 1000)) | 0;
      update_info();
      flash(17, 25, 'Super Kroz Bonus -- 10,000 points!');
    }
  } else if (($116 >= 52 && $116 <= 54)) {
    if (human$4) {
      blocksound();
      addscore(14);
      clearkeys();
      if (!(R.inSet(foundset, 14))) {
        foundset = R.union(foundset, R.setOf(14, 14));
        flash(20, 25, 'A Solid Wall blocks your way.');
      }
    }
  } else if (($116 >= 55 && $116 <= 57)) {
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
  } else if (($116 >= 58 && $116 <= 60)) {
    original = (pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]) & 255;
    $192 = original;
    if ($192 === 58) {
      spot = (52) & 255;
    } else if ($192 === 59) {
      spot = (53) & 255;
    } else if ($192 === 60) {
      spot = (54) & 255;
    }
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $193 = 65;
    if (x <= $193) for (;;) {
      y = 2; $194 = 24;
      if (y <= $194) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === spot)) {
          pf[(x) * 25 + (y) - 26] = 0;
          i = 1; $195 = 30;
          if (i <= $195) for (;;) {
            R.gotoxy(x, y);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i >= $195) break;
            i++;
          }
          a = 60; $196 = 1;
          if (a >= $196) for (;;) {
            R.sound((a * 40));
            R.delay(1);
            if (a <= $196) break;
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
        if (y >= $194) break;
        y++;
      }
      if (x >= $193) break;
      x++;
    }
    x = 2; $197 = 65;
    if (x <= $197) for (;;) {
      y = 2; $198 = 24;
      if (y <= $198) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === original)) {
          pf[(x) * 25 + (y) - 26] = 0;
          R.gotoxy(x, y);
          R.write(' ');
        }
        if (y >= $198) break;
        y++;
      }
      if (x >= $197) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, original))) {
      foundset = R.union(foundset, R.setOf(original, original));
      flash(14, 25, 'Magic has been released is this chamber!');
    }
  } else if (($116 >= 61 && $116 <= 63)) {
    original = (pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]) & 255;
    $199 = original;
    if ($199 === 61) {
      spot = (55) & 255;
    } else if ($199 === 62) {
      spot = (56) & 255;
    } else if ($199 === 63) {
      spot = (57) & 255;
    }
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $200 = 65;
    if (x <= $200) for (;;) {
      y = 2; $201 = 24;
      if (y <= $201) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === spot)) {
          pf[(x) * 25 + (y) - 26] = 14;
          i = 1; $202 = 30;
          if (i <= $202) for (;;) {
            R.gotoxy(x, y);
            col(R.random(15), 15);
            R.write(String.fromCharCode(((220 + R.random(4))) & 255));
            if (i >= $202) break;
            i++;
          }
          a = 20; $203 = 80;
          if (a <= $203) for (;;) {
            R.sound((a * 50));
            R.delay(1);
            if (a >= $203) break;
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
        if (y >= $201) break;
        y++;
      }
      if (x >= $200) break;
      x++;
    }
    x = 2; $204 = 65;
    if (x <= $204) for (;;) {
      y = 2; $205 = 24;
      if (y <= $205) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === original)) {
          pf[(x) * 25 + (y) - 26] = 0;
          R.gotoxy(x, y);
          R.write(' ');
        }
        if (y >= $205) break;
        y++;
      }
      if (x >= $204) break;
      x++;
    }
    clearkeys();
    if (!(R.inSet(foundset, original))) {
      foundset = R.union(foundset, R.setOf(original, original));
      flash(18, 25, 'New Walls have magically appeared!');
    }
  } else if ($116 === 65) {
    if (human$4) {
      rxway = (0) << 16 >> 16;
      ryway = (0) << 16 >> 16;
      nogo = false;
      if ((xway$5 === 1)) {
        rxway = (2) << 16 >> 16;
      }
      if ((xway$5 === -(1))) {
        rxway = (-(2)) << 16 >> 16;
      }
      if ((yway$5 === 1)) {
        ryway = (2) << 16 >> 16;
      }
      if ((yway$5 === -(1))) {
        ryway = (-(2)) << 16 >> 16;
      }
      rx = ((px + rxway)) << 16 >> 16;
      ry = ((py + ryway)) << 16 >> 16;
      if (((xway$5 === 1) && (rx > 65))) {
        nogo = true;
      }
      if (((xway$5 === -(1)) && (rx < 2))) {
        nogo = true;
      }
      if (((yway$5 === 1) && (ry > 24))) {
        nogo = true;
      }
      if (((yway$5 === -(1)) && (ry < 2))) {
        nogo = true;
      }
      clearkeys();
      if (!(nogo)) {
        $206 = pf[(rx) * 25 + (ry) - 26];
        if ($206 === 0 || $206 === 32 || $206 === 33 || $206 === 37 || $206 === 39 || $206 === 41 || $206 === 44 || $206 === 47 || ($206 >= 55 && $206 <= 57) || ($206 >= 61 && $206 <= 63) || $206 === 67 || ($206 >= 68 && $206 <= 74) || ($206 >= 224 && $206 <= 231)) {
          if (((replacement !== 75) || ((replacement === 75) && (yway$5 === 0)))) {
            moverock({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } });
          } else {
            blocksound();
          }
        } else if (($206 >= 1 && $206 <= 3)) {
          score = ((score + pf[(rx) * 25 + (ry) - 26])) | 0;
          moverock({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } });
          R.sound(600);
          R.delay(20);
          R.nosound();
        } else if ($206 === 4 || $206 === 13 || $206 === 14 || $206 === 17 || $206 === 19 || $206 === 20 || $206 === 22 || $206 === 24 || $206 === 25 || ($206 >= 29 && $206 <= 31) || $206 === 36 || $206 === 38 || $206 === 43 || $206 === 46 || ($206 >= 52 && $206 <= 54) || $206 === 64 || $206 === 65 || $206 === 75) {
          blocksound();
        } else if ($206 === 5 || ($206 >= 7 && $206 <= 12) || $206 === 16 || $206 === 18 || $206 === 21 || $206 === 26 || $206 === 27 || $206 === 34 || $206 === 35 || $206 === 42 || $206 === 45 || ($206 >= 48 && $206 <= 51) || ($206 >= 58 && $206 <= 60) || ($206 >= 76 && $206 <= 80) || $206 === 82 || $206 === 83) {
          moverock({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } });
          grabsound();
        } else if ($206 === 66) {
          moverock({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } });
          pf[(rx) * 25 + (ry) - 26] = 0;
          R.sound(90);
          clearkeys();
          i = 1; $207 = 20;
          if (i <= $207) for (;;) {
            R.gotoxy(rx, ry);
            col((R.random(15) + 1), 15);
            bak(R.random(8), 0);
            R.write('X');
            bor((R.random(15) + 1));
            if (i >= $207) break;
            i++;
          }
          bor(4);
          bak(0, 0);
          R.gotoxy(rx, ry);
          col(0, 0);
          R.write(' ');
          i = 30000; $208 = 20;
          if (i >= $208) for (;;) {
            R.sound(R.random(i));
            if (i <= $208) break;
            i--;
          }
          R.nosound();
          if (!(R.inSet(foundset, 0))) {
            foundset = R.union(foundset, R.setOf(0, 0));
            clearkeys();
            flash(21, 25, 'The Boulder is vaporized!');
          }
        } else if ($206 === 6 || $206 === 23) {
          i = 1; $209 = ((+(fastpc) * 500) + (+(!(fastpc)) * 330));
          if (i <= $209) for (;;) {
            R.sound((R.random(100) + 20));
            R.delay(1);
            if (i >= $209) break;
            i++;
          }
          R.nosound();
          R.gotoxy((px + xway$5), (py + yway$5));
          col(0, 0);
          R.write(' ');
          go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
          i = 130; $210 = 5;
          if (i >= $210) for (;;) {
            R.sound((i * 8));
            R.delay(3);
            if (i <= $210) break;
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
  } else if ($116 === 66) {
    if (human$4) {
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
  } else if ($116 === 67 || ($116 >= 224 && $116 <= 231)) {
    a = (pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]) << 16 >> 16;
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $211 = 65;
    if (x <= $211) for (;;) {
      y = 2; $212 = 24;
      if (y <= $212) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === a)) {
          pf[(x) * 25 + (y) - 26] = 0;
        }
        if (y >= $212) break;
        y++;
      }
      if (x >= $211) break;
      x++;
    }
  } else if (($116 >= 68 && $116 <= 74)) {
    a = (pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]) << 16 >> 16;
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    $213 = a;
    if ($213 === 68) {
      i = (4) << 16 >> 16;
      col(6, 7);
      ch = '\xb2';
    } else if ($213 === 69) {
      i = (65) << 16 >> 16;
      col(7, 7);
      ch = 'O';
    } else if ($213 === 70) {
      i = (9) << 16 >> 16;
      col(gemcolor, 7);
      ch = '\x04';
    } else if ($213 === 71) {
      i = (10) << 16 >> 16;
      col(2, 7);
      ch = '\xad';
    } else if ($213 === 72) {
      i = (5) << 16 >> 16;
      col(15, 7);
      ch = '\xf4';
    } else if ($213 === 73) {
      i = (27) << 16 >> 16;
      col(14, 7);
      ch = '\x0f';
    } else if ($213 === 74) {
      i = (20) << 16 >> 16;
      col(6, 7);
      bak(2, 7);
      ch = '\x05';
    }
    b = 1; $214 = 10;
    if (b <= $214) for (;;) {
      bak(R.random(8), R.random(8));
      R.sound((((b + 25) * b) * 2));
      trigger_trap(false, i, ch);
      R.delay(5);
      if (b >= $214) break;
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
  } else if ($116 === 75) {
    if (human$4) {
      onemove = true;
      go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
      if (!(R.inSet(foundset, 75))) {
        foundset = R.union(foundset, R.setOf(75, 75));
        clearkeys();
        flash(24, 25, 'You grabbed a Rope.');
      } else {

      }
    } else {

    }
  } else if ($116 === 252) {
    secret_message();
  } else if ($116 === 82) {
    shoot_right(xway$5, yway$5, human$4);
  } else if ($116 === 83) {
    shoot_left(xway$5, yway$5, human$4);
  } else if (($116 >= 76 && $116 <= 80)) {
    a = (pf[((px + xway$5)) * 25 + ((py + yway$5)) - 26]) << 16 >> 16;
    if (human$4) {
      onemove = true;
    }
    go({ get v() { return xway$5; }, set v($v) { xway$5 = $v; } }, { get v() { return yway$5; }, set v($v) { yway$5 = $v; } }, human$4);
    x = 2; $215 = 65;
    if (x <= $215) for (;;) {
      y = 2; $216 = 24;
      if (y <= $216) for (;;) {
        if ((pf[(x) * 25 + (y) - 26] === a)) {
          i = (y) << 16 >> 16;
          do {
            if ((pf[(x) * 25 + (i) - 26] === 40)) {
              replacement = (75) << 16 >> 16;
            } else {
              pf[(x) * 25 + (i) - 26] = 75;
            }
            b = 20; $217 = 40;
            if (b <= $217) for (;;) {
              R.gotoxy(x, i);
              col(R.random(16), 7);
              R.write('\x19');
              R.sound(((i * b) * 3));
              R.delay(4);
              if (b >= $217) break;
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
          } while (!(((i > 23) || ($218 = pf[(x) * 25 + ((i + 1)) - 26], $218 === 4 || $218 === 13 || $218 === 14 || $218 === 17 || ($218 >= 19 && $218 <= 25) || ($218 >= 29 && $218 <= 31) || $218 === 42 || $218 === 43 || ($218 >= 52 && $218 <= 60) || ($218 >= 64 && $218 <= 66) || $218 === 75 || ($218 >= 100 && $218 <= 223) || ($218 >= 232 && $218 <= 254)))));
        }
        if (y >= $216) break;
        y++;
      }
      if (x >= $215) break;
      x++;
    }
  } else if ($116 === 81) {
    R.write('ERROR!!!' + '\r\n');
  } else {
    if (human$4) {
      blocksound();
    }
  }
  }
  onemove = false;
}
function player_move() {
  let $219, $220, $221, $222, $223, $224, $225, $226, $227;
  $219 = getkey();
  if ($219 === 0) {

  } else if ($219 === 80) {
    bak(0, 0);
    play(500, 500, 100);
    play(200, 100, 2);
    clearkeys();
    flash(18, 25, ' Press any key to resume game. ');
    restore_border();
  } else if ($219 === 81) {
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
  } else if ($219 === 82) {
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
    $220 = R.upcase(ch);
    if ($220 === '\x1b') {
      break L3_abort_restore;
    } else if ($220 === 'B' || $220 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    print(20, 25, (('  Restoring from file ' + ch) + '...  '));
    R.assign(savefile, (('KINGDOM' + ch) + '.SAV'));
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
      $221 = savestuff;
      level = ($221.s_level) << 16 >> 16;
      score = ($221.s_score) | 0;
      gems = ($221.s_gems) << 16 >> 16;
      whips = ($221.s_whips) << 16 >> 16;
      teleports = ($221.s_teleports) << 16 >> 16;
      keys = ($221.s_keys) << 16 >> 16;
      whippower = ($221.s_whippower) << 16 >> 16;
      difficulty = ($221.s_difficulty) << 16 >> 16;
      px = ($221.s_px) << 16 >> 16;
      py = ($221.s_py) << 16 >> 16;
      foundset = $221.s_foundset;
      mixup = $221.s_mixup;
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
      if ((level === 9)) {
        treerate = (40) << 16 >> 16;
      }
      if ((level === 15)) {
        lavaflow = true;
        lavarate = (40) << 16 >> 16;
      }
      R.window(2, 2, (64 + 1), (23 + 1));
      bak(0, 0);
      R.clrscr();
      cur(3);
      R.window(1, 1, 80, 25);
      border();
      display_playfield();
      x = 1; $222 = 600;
      if (x <= $222) for (;;) {
        R.gotoxy(px, py);
        col(R.random(16), R.random(16));
        bak(R.random(8), 0);
        R.write('\x02');
        R.sound(Math.trunc(x / 2));
        if (x >= $222) break;
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
  } else if ($219 === 83) {
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
    $223 = R.upcase(ch);
    if ($223 === '\x1b') {
      break L4_abort_save;
    } else if ($223 === 'B' || $223 === 'C') {
      ch = R.upcase(ch);
    } else {
      ch = 'A';
    }
    $224 = savestuff;
    $224.s_level = (level) | 0;
    $224.s_score = (i_score) | 0;
    $224.s_gems = (i_gems) | 0;
    $224.s_whips = (i_whips) | 0;
    $224.s_teleports = (i_teleports) | 0;
    $224.s_keys = (i_keys) | 0;
    $224.s_whippower = (i_whippower) | 0;
    $224.s_difficulty = (i_difficulty) | 0;
    $224.s_px = (i_px) | 0;
    $224.s_py = (i_py) | 0;
    $224.s_foundset = i_foundset;
    $224.s_mixup = mixup;
    print(22, 25, (('  Saving to file ' + ch) + '...  '));
    R.assign(savefile, (('KINGDOM' + ch) + '.SAV'));
    R.rewrite(savefile);
    R.fwrite(savefile, savestuff);
    R.close(savefile);
    R.delay(1000);
    }
    restore_border();
  } else if ($219 === 84) {
    if ((teleports < 1)) {
      nonesound();
      return;
    }
    teleports = ((teleports - 1)) << 16 >> 16;
    update_info();
    x = 1; $225 = 250;
    if (x <= $225) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $225) break;
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
      if (($226 = pf[(x) * 25 + (y) - 26], $226 === 0 || $226 === 32 || $226 === 33 || $226 === 37 || $226 === 39 || $226 === 41 || $226 === 44 || $226 === 47 || ($226 >= 55 && $226 <= 57) || ($226 >= 61 && $226 <= 63) || $226 === 67 || ($226 >= 68 && $226 <= 74) || ($226 >= 224 && $226 <= 231))) {
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
    x = 1; $227 = ((+(fastpc) * 3000) + (+(!(fastpc)) * 500));
    if (x <= $227) for (;;) {
      R.gotoxy(px, py);
      col(R.random(16), R.random(16));
      bak(R.random(8), R.random(8));
      R.write('\x02');
      if (x >= $227) break;
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
  } else if ($219 === 87) {
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
  } else if ($219 === 172) {
    move(0, -(1), true);
  } else if ($219 === 180) {
    move(0, 1, true);
  } else if ($219 === 177) {
    move(1, 0, true);
  } else if ($219 === 175) {
    move(-(1), 0, true);
  } else if ($219 === 171) {
    move(-(1), -(1), true);
  } else if ($219 === 173) {
    move(1, -(1), true);
  } else if ($219 === 179) {
    move(-(1), 1, true);
  } else if ($219 === 181) {
    move(1, 1, true);
  }
}
function move_slow() {
  let loop$3 = 0;
  let $228, $229;
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
  loop$3 = 1; $228 = snum;
  if (loop$3 <= $228) for (;;) {
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
    $229 = pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26];
    if ($229 === 0 || ($229 >= 68 && $229 <= 74)) {
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
    } else if (($229 >= 1 && $229 <= 3) || $229 === 6 || $229 === 13 || $229 === 14 || $229 === 17 || ($229 >= 19 && $229 <= 25) || ($229 >= 28 && $229 <= 37) || $229 === 39 || $229 === 41 || $229 === 42 || ($229 >= 44 && $229 <= 47) || ($229 >= 52 && $229 <= 56) || ($229 >= 58 && $229 <= 63) || $229 === 65 || $229 === 66 || $229 === 67 || ($229 >= 75 && $229 <= 80) || ($229 >= 224 && $229 <= 231)) {
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
    } else if ($229 === 4 || $229 === 38 || $229 === 43 || $229 === 64) {
      pf[(sx[(loop$3) - 1]) * 25 + (sy[(loop$3) - 1]) - 26] = 0;
      sx[(loop$3) - 1] = 0;
      R.write(' ');
      score = ((score + 1)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($229 === 40) {
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
    } else if ($229 === 5 || ($229 >= 7 && $229 <= 12) || $229 === 15 || $229 === 16 || $229 === 18 || $229 === 26 || $229 === 27 || ($229 >= 48 && $229 <= 51) || $229 === 82 || $229 === 83) {
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
    if (loop$3 >= $228) break;
    loop$3++;
  }
}
function move_medium() {
  let loop$4 = 0;
  let $230, $231;
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
  loop$4 = 1; $230 = mnum;
  if (loop$4 <= $230) for (;;) {
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
    $231 = pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26];
    if ($231 === 0 || ($231 >= 68 && $231 <= 74)) {
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
    } else if (($231 >= 1 && $231 <= 3) || $231 === 6 || $231 === 13 || $231 === 14 || $231 === 17 || ($231 >= 19 && $231 <= 25) || ($231 >= 28 && $231 <= 37) || $231 === 39 || $231 === 41 || $231 === 42 || ($231 >= 44 && $231 <= 47) || ($231 >= 52 && $231 <= 56) || ($231 >= 58 && $231 <= 63) || $231 === 65 || $231 === 66 || $231 === 67 || ($231 >= 75 && $231 <= 80) || ($231 >= 224 && $231 <= 231)) {
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
    } else if ($231 === 4 || $231 === 38 || $231 === 43 || $231 === 64) {
      pf[(mx[(loop$4) - 1]) * 25 + (my[(loop$4) - 1]) - 26] = 0;
      mx[(loop$4) - 1] = 0;
      R.write(' ');
      score = ((score + 2)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($231 === 40) {
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
    } else if ($231 === 5 || ($231 >= 7 && $231 <= 12) || $231 === 15 || $231 === 16 || $231 === 18 || $231 === 26 || $231 === 27 || ($231 >= 48 && $231 <= 51) || $231 === 82 || $231 === 83) {
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
    if (loop$4 >= $230) break;
    loop$4++;
  }
}
function move_fast() {
  let loop$5 = 0;
  let $232, $233;
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
  loop$5 = 1; $232 = fnum;
  if (loop$5 <= $232) for (;;) {
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
    $233 = pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26];
    if ($233 === 0 || ($233 >= 68 && $233 <= 74)) {
      col(9, 7);
      R.write(fast);
      R.sound(20);
      R.nosound();
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
    } else if (($233 >= 1 && $233 <= 3) || $233 === 6 || $233 === 13 || $233 === 14 || $233 === 17 || ($233 >= 19 && $233 <= 25) || ($233 >= 28 && $233 <= 37) || $233 === 39 || $233 === 41 || $233 === 42 || ($233 >= 44 && $233 <= 47) || ($233 >= 52 && $233 <= 56) || ($233 >= 58 && $233 <= 63) || $233 === 65 || $233 === 66 || $233 === 67 || ($233 >= 75 && $233 <= 80) || ($233 >= 224 && $233 <= 231)) {
      fx[(loop$5) - 1] = (fx[(loop$5) - 1] + xdir);
      fy[(loop$5) - 1] = (fy[(loop$5) - 1] + ydir);
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 3;
      R.gotoxy(fx[(loop$5) - 1], fy[(loop$5) - 1]);
      col(9, 7);
      R.write(fast);
    } else if ($233 === 4 || $233 === 38 || $233 === 43 || $233 === 64) {
      pf[(fx[(loop$5) - 1]) * 25 + (fy[(loop$5) - 1]) - 26] = 0;
      fx[(loop$5) - 1] = 0;
      R.write(' ');
      score = ((score + 3)) | 0;
      R.sound(800);
      R.delay(18);
      R.sound(400);
      R.delay(20);
      R.nosound();
    } else if ($233 === 40) {
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
    } else if ($233 === 5 || ($233 >= 7 && $233 <= 12) || $233 === 15 || $233 === 16 || $233 === 18 || $233 === 26 || $233 === 27 || ($233 >= 48 && $233 <= 51) || $233 === 82 || $233 === 83) {
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
    if (loop$5 >= $232) break;
    loop$5++;
  }
}
function move_mblock() {
  let loop$6 = 0;
  let $234, $235;
  t[(8) - 1] = btime;
  if ((bnum < 1)) {
    return;
  }
  loop$6 = 1; $234 = bnum;
  if (loop$6 <= $234) for (;;) {
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
    $235 = pf[(bx[(loop$6) - 1]) * 25 + (by[(loop$6) - 1]) - 26];
    if ($235 === 0) {
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
    if (loop$6 >= $234) break;
    loop$6++;
  }
}

export function main() {
  let $236, $237, $238, $239, $240, $241, $242, $243, $244, $245, $246, $247, $248, $249, $250, $251;





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
  x = 1; $236 = 800;
  if (x <= $236) for (;;) {
    R.gotoxy(px, py);
    col(R.random(16), R.random(16));
    bak(R.random(8), 0);
    R.write('\x02');
    R.sound(Math.trunc(x / 2));
    if (x >= $236) break;
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
      x = 1; $237 = 9;
      if (x <= $237) for (;;) {
        t[(x) - 1] = (t[(x) - 1] - 1);
        if (x >= $237) break;
        x++;
      }
      if ((skiptime > 3000)) {
        x = 1; $238 = 9;
        if (x <= $238) for (;;) {
          t[(x) - 1] = (t[(x) - 1] - 5);
          if (x >= $238) break;
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
            x = 5; $239 = 70;
            if (x <= $239) for (;;) {
              R.sound((x * 8));
              R.delay(1);
              if (x >= $239) break;
              x++;
            }
            R.nosound();
          }
        } while (!(((R.random(50) === 0) || done)));
      }
      if ((lavaflow && (R.random(10) === 0))) {
        i = 1; $240 = lavarate;
        if (i <= $240) for (;;) {
          done = false;
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if (($241 = pf[(x) * 25 + (y) - 26], ($241 >= 0 && $241 <= 4) || $241 === 5 || ($241 >= 7 && $241 <= 11) || $241 === 15 || $241 === 16 || ($241 >= 18 && $241 <= 21) || ($241 >= 26 && $241 <= 28) || ($241 >= 32 && $241 <= 35) || ($241 >= 37 && $241 <= 39) || $241 === 41 || ($241 >= 42 && $241 <= 44) || $241 === 45 || ($241 >= 47 && $241 <= 51) || $241 === 57 || $241 === 60 || $241 === 64 || ($241 >= 67 && $241 <= 74) || ($241 >= 77 && $241 <= 83))) {
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
          if (i >= $240) break;
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
        i = 1; $242 = 100;
        if (i <= $242) for (;;) {
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
          if (i >= $242) break;
          i++;
        }
        i = 1; $243 = 100;
        if (i <= $243) for (;;) {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 66)) {
            pf[(x) * 25 + (y) - 26] = 55;
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
          }
          if (i >= $243) break;
          i++;
        }
      }
      if (((evaporate > 0) && (R.random(10) === 0))) {
        i = 1; $244 = evaporate;
        if (i <= $244) for (;;) {
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if ((pf[(x) * 25 + (y) - 26] === 17)) {
            R.gotoxy(x, y);
            col(0, 0);
            R.write(' ');
            pf[(x) * 25 + (y) - 26] = 0;
            b = 1; $245 = ((+(fastpc) * 1000) + (+(!(fastpc)) * 250));
            if (b <= $245) for (;;) {
              R.sound((R.random(((x * 2) + 200)) + x));
              if (b >= $245) break;
              b++;
            }
            R.nosound();
          }
          if (i >= $244) break;
          i++;
        }
      }
      if (((treerate > 0) && (R.random(10) === 0))) {
        i = 1; $246 = treerate;
        if (i <= $246) for (;;) {
          done = false;
          x = ((R.random(64) + 2)) << 16 >> 16;
          y = ((R.random(23) + 2)) << 16 >> 16;
          if (($247 = pf[(x) * 25 + (y) - 26], $247 === 0 || $247 === 16 || $247 === 27 || $247 === 28 || $247 === 32 || $247 === 33 || $247 === 37 || $247 === 39)) {
            if (($248 = pf[((x + 1)) * 25 + (y) - 26], $248 === 19 || $248 === 20)) {
              done = true;
            } else if (($249 = pf[((x - 1)) * 25 + (y) - 26], $249 === 19 || $249 === 20)) {
              done = true;
            } else if (($250 = pf[(x) * 25 + ((y + 1)) - 26], $250 === 19 || $250 === 20)) {
              done = true;
            } else if (($251 = pf[(x) * 25 + ((y - 1)) - 26], $251 === 19 || $251 === 20)) {
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
          if (i >= $246) break;
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
