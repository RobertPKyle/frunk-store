// Duke Nukem II, the 1993 shareware episode 1 (v1.0): Apogee's 4duke.zip,
// whose DN2SW10.SHR is, unlike Keen's and Wolf3D's, a PKZIP self-extracting
// program (PKLITE-packed), which unzip opens as it is.
export default ({ FTP, run }) => ({
  app: 'duke2', zip: '4duke.zip', sha256: 'c94479ace93a8923615ddebea96bcd18242a3a31f54cdcbc84e02ca0ab685829',
  urls: [`${FTP}4duke.zip`],
  unpack(zipDir, out) {
    run('mkdir', ['-p', `${out}DUKE2`]);
    run('unzip', ['-q', '-o', `${zipDir}DN2SW10.SHR`, '-d', `${out}DUKE2`]);
  },
  // the files VENDOR.DOC lists, with their sizes, and the two it comes with
  files: ['DN2HELP.EXE', 'NUKEM2.CMP', 'NUKEM2.EXE', 'NUKEM2.F1', 'NUKEM2.F2', 'NUKEM2.F3', 'NUKEM2.F4', 'NUKEM2.F5', 'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'DN2HELP.EXE': 10795, 'NUKEM2.CMP': 3075327, 'NUKEM2.EXE': 58852, 'NUKEM2.F1': 98960, 'NUKEM2.F2': 38622, 'NUKEM2.F3': 52427, 'NUKEM2.F4': 240848, 'NUKEM2.F5': 33911 },
  dir: 'DUKE2',
  license: 'VENDOR.DOC',
});
