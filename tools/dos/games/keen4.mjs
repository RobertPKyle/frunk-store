// Commander Keen 4: Secret of the Oracle, the shareware episode of
// "Goodbye Galaxy" (v1.4, 1991-92), as Apogee released it: 4keen.zip, whose
// CK4SW14.SHR is Apogee's installer archive (tools/dos/apogee.mjs).
export default ({ FTP, unpackShr }) => ({
  app: 'keen4', zip: '4keen.zip', sha256: 'f7c63feb8bbec817646d95aa26313df1654c01eda8f7ccc5cfd0c0bc0b5e305e',
  urls: [`${FTP}4keen.zip`],
  unpack: unpackShr('CK4SW14.SHR', 'KEEN4'),
  // the files VENDOR.DOC lists, with their sizes, and the three it comes with
  files: ['AUDIO.CK4', 'EGAGRAPH.CK4', 'GAMEMAPS.CK4', 'KEEN4E.EXE', 'DOPEFISH.ANS', 'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'AUDIO.CK4': 33325, 'EGAGRAPH.CK4': 520581, 'GAMEMAPS.CK4': 99040, 'KEEN4E.EXE': 105108 },
  dir: 'KEEN4',
  license: 'VENDOR.DOC',
});
