// Blake Stone: Aliens of Gold, the shareware episode 1 (v3.0, 1994) by JAM
// Productions, as Apogee released it: 1bs30.zip, whose BSSW30.SHR is not
// Apogee's usual installer archive but a PKLITE-packed PKZIP self-extractor,
// so unzip reads it as it is.
import { mkdirSync } from 'node:fs';

export default ({ FTP, run }) => ({
  app: 'blake', zip: '1bs30.zip', sha256: '9a7e39037689cb84054bd3ddca290ab3644e327f951eb08e7ad79500e9c0dfb3',
  urls: [`${FTP}1bs30.zip`],
  // the game's folder as the installer would make it
  unpack(zipDir, out) {
    mkdirSync(`${out}BSTONE`);
    run('unzip', ['-q', '-o', `${zipDir}BSSW30.SHR`, '-d', `${out}BSTONE`]);
  },
  // the files VENDOR.DOC lists, with their sizes, and the two it comes with
  files: ['AUDIOHED.BS1', 'AUDIOT.BS1', 'BSHELP.EXE', 'BSTONE.BAT', 'BS_AOG.EXE', 'IANIM.BS1', 'JAMERR.EXE', 'JM_ERROR.H',
    'MAPHEAD.BS1', 'MAPTEMP.BS1', 'SANIM.BS1', 'SETBLAST.EXE', 'VGADICT.BS1', 'VGAGRAPH.BS1', 'VGAHEAD.BS1', 'VSWAP.BS1',
    'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'AUDIOHED.BS1': 1280, 'AUDIOT.BS1': 267636, 'BSHELP.EXE': 17650, 'BSTONE.BAT': 101, 'BS_AOG.EXE': 138340, 'IANIM.BS1': 18977,
    'JAMERR.EXE': 11212, 'JM_ERROR.H': 9883, 'MAPHEAD.BS1': 834, 'MAPTEMP.BS1': 90786, 'SANIM.BS1': 276784, 'SETBLAST.EXE': 76751,
    'VGADICT.BS1': 1024, 'VGAGRAPH.BS1': 729462, 'VGAHEAD.BS1': 639, 'VSWAP.BS1': 1996008 },
  dir: 'BSTONE',
  license: 'VENDOR.DOC',
});
