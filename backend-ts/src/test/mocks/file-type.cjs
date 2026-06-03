/** Jest-only shim: real `file-type` is ESM and not loadable under ts-jest. */
async function fileTypeFromBuffer(buffer) {
  if (!buffer?.length) return undefined;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buffer.slice(0, 5).toString('utf8') === '%PDF-') {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  return undefined;
}

module.exports = { fileTypeFromBuffer };
