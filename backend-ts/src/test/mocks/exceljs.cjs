/** Jest-only shim: exceljs pulls in ESM `uuid`, which ts-jest cannot load from node_modules. */
class Workbook {
  addWorksheet() {
    return {
      columns: [],
      getRow: () => ({ font: {} }),
      addRow: () => {},
    };
  }

  xlsx = {
    writeBuffer: async () => Buffer.from(''),
  };
}

module.exports = { Workbook };
