// Hocus Pocus, the 1994 shareware episode 1 (v1.1) by Moonlite Software,
// published by Apogee: 1hp11.zip, whose HPSW11.SHR is a self-extracting zip
// (PKLITE) of the game's folder, as Death Rally's is.
import { mkdirSync } from 'node:fs';

export default ({ FTP, run }) => ({
  app: 'hocus', zip: '1hp11.zip', sha256: '83352f33279c05f8e6137c285e2432d0500cb07623a9d3875a17829ec7a342a4',
  urls: [`${FTP}1hp11.zip`],
  unpack(zipDir, out) {
    mkdirSync(`${out}HOCUS`);
    run('unzip', ['-q', '-o', `${zipDir}HPSW11.SHR`, '-d', `${out}HOCUS`]);
  },
  // the files VENDOR.DOC lists, with their sizes, and the two it comes with
  files: ['HOCUS.DAT', 'HOCUS.EXE', 'HOCUSG.BAT', 'SETUP.EXE', 'ULTRAMID.EXE', 'ULTRAMID.INI', '__HPGRVS.EXE', 'HPHELP.EXE', 'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'HOCUS.DAT': 2882601, 'HOCUS.EXE': 179360, 'HOCUSG.BAT': 42, 'SETUP.EXE': 18176, 'ULTRAMID.EXE': 34696, 'ULTRAMID.INI': 6314, '__HPGRVS.EXE': 153536, 'HPHELP.EXE': 17091 },
  dir: 'HOCUS',
  license: 'VENDOR.DOC',
});
