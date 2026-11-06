// Cosmo's Cosmic Adventure, the shareware episode 1 "Forbidden Planet" (v1.2,
// 1992) by Apogee, as Apogee released it: 1cosmo.zip, whose COSSW12.SHR is
// Apogee's installer archive (tools/dos/apogee.mjs).
export default ({ FTP, unpackShr }) => ({
  app: 'cosmo', zip: '1cosmo.zip', sha256: '45e30c651e2676b818187d466a1135701b0b26145c7ad2f40775ed2d43acec4c',
  urls: [`${FTP}1cosmo.zip`],
  unpack: unpackShr('COSSW12.SHR', 'COSMO'),
  // the files VENDOR.DOC lists, with their sizes, and the two it comes with
  files: ['COSMO1.EXE', 'COSMO1.STN', 'COSMO1.VOL', 'VENDOR.DOC', 'ORDER.FRM'],
  sizes: { 'COSMO1.EXE': 62081, 'COSMO1.STN': 607004, 'COSMO1.VOL': 1359939 },
  dir: 'COSMO',
  license: 'VENDOR.DOC',
});
