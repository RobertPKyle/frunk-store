// Rise of the Triad: The HUNT Begins, the shareware episode 1 (v1.3, 1995)
// by Apogee: 1rott13.zip, whose ROTTSW13.SHR is not Apogee's usual installer
// archive but a PKLITE-packed PKZIP self-extractor, so unzip reads it as it is.
import { mkdirSync } from 'node:fs';

export default ({ FTP, run }) => ({
  app: 'rott', zip: '1rott13.zip', sha256: 'eea67a85845d52fa0ee7272e3ae24b79769ed1e8bdff7b1360904078bc51ad1e',
  urls: [`${FTP}1rott13.zip`],
  // the game's folder as the installer would make it
  unpack(zipDir, out) {
    mkdirSync(`${out}ROTT`);
    run('unzip', ['-q', '-o', `${zipDir}ROTTSW13.SHR`, '-d', `${out}ROTT`]);
  },
  // the files VENDOR.DOC lists, with their sizes, and the four it comes with
  files: ['DEMO1_3.DMO', 'DEMO2_3.DMO', 'HUNTBGIN.RTC', 'HUNTBGIN.RTL', 'HUNTBGIN.WAD', 'MODEM.PCK', 'README.EXE', 'REMOTE1.RTS',
    'ROTT.EXE', 'ROTTHELP.EXE', 'ROTTIPX.EXE', 'ROTTSER.EXE', 'SETUP.EXE', 'SNDSETUP.EXE',
    'DEMO3_3.DMO', 'DEMO4_3.DMO', 'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'DEMO1_3.DMO': 27028, 'DEMO2_3.DMO': 34360, 'HUNTBGIN.RTC': 54258, 'HUNTBGIN.RTL': 103316, 'HUNTBGIN.WAD': 6436871,
    'MODEM.PCK': 2174, 'README.EXE': 31256, 'REMOTE1.RTS': 110484, 'ROTT.EXE': 1076849, 'ROTTHELP.EXE': 76171, 'ROTTIPX.EXE': 16624,
    'ROTTSER.EXE': 21905, 'SETUP.EXE': 32682, 'SNDSETUP.EXE': 5756, 'DEMO3_3.DMO': 47704, 'DEMO4_3.DMO': 36412 },
  dir: 'ROTT',
  license: 'VENDOR.DOC',
});
