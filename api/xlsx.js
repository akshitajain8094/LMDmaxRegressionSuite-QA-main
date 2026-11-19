// Reads and writes simple .xlsx files (one sheet, text and numbers) with Node only, no extra package.
// Used by the report tests: to read Amazon / Netradyne Excel exports and to make changed copies of them
// (a column removed, a header-only file, a few rows for the curation tests).
// An .xlsx file is a zip of XML files: readXlsx unzips the first sheet, writeXlsx zips a minimal workbook.
const fs = require('fs');
const zlib = require('zlib');

// ---- zip ------------------------------------------------------------------------------------------------------

// The files inside a zip, as { name: Buffer }
function unzip(buffer) {
  const files = {};
  // End of central directory: the last 22+ bytes, signature 0x06054b50
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Not a zip file');
  const count = buffer.readUInt16LE(end + 10);
  let p = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < count; i++) {
    const method = buffer.readUInt16LE(p + 10);
    const size = buffer.readUInt32LE(p + 20);
    const nameLength = buffer.readUInt16LE(p + 28);
    const extraLength = buffer.readUInt16LE(p + 30);
    const commentLength = buffer.readUInt16LE(p + 32);
    const local = buffer.readUInt32LE(p + 42);
    const name = buffer.toString('utf8', p + 46, p + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    files[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    p += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

// A zip (deflated) of { name: string | Buffer }
function zip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const packed = zlib.deflateRawSync(data);
    const crc = zlib.crc32(data);
    const nameBuffer = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuffer, packed);
    centrals.push(central, nameBuffer);
    offset += 30 + nameBuffer.length + packed.length;
  }
  const centralSize = centrals.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, ...centrals, end]);
}

// ---- xlsx -----------------------------------------------------------------------------------------------------

const unescape = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const columnIndex = (letters) => [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
const columnLetters = (i) => (i < 26 ? '' : columnLetters(Math.floor(i / 26) - 1)) + String.fromCharCode(65 + (i % 26));

// The first sheet as rows of text (row 1 = index 0; empty rows are empty arrays)
function readXlsx(file) {
  const files = unzip(fs.readFileSync(file));
  const shared = files['xl/sharedStrings.xml']
    ? [...files['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
        unescape([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
      )
    : [];
  const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  const xml = files[sheetName].toString('utf8');
  const rows = [];
  for (const row of xml.matchAll(/<row r="(\d+)"[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells = [];
    for (const c of (row[2] || '').matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const body = c[3] || '';
      const value = body.match(/<v>([\s\S]*?)<\/v>/);
      const inline = body.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>/);
      let text = '';
      if (/t="s"/.test(c[2]) && value) text = shared[Number(value[1])] ?? '';
      else if (inline) text = unescape(inline[1]);
      else if (value) text = unescape(value[1]);
      cells[columnIndex(c[1])] = text;
    }
    rows[Number(row[1]) - 1] = Array.from(cells, (v) => v ?? '');
  }
  return Array.from(rows, (r) => r ?? []);
}

// Writes rows of text into a one-sheet .xlsx (sheet name like the export, all cells as text)
function writeXlsx(file, rows, sheetName = 'Alerts Report') {
  const sheetRows = rows
    .map((row, r) => {
      const cells = row
        .map((v, c) => (v === '' || v === undefined || v === null ? '' : `<c r="${columnLetters(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${escape(v)}</t></is></c>`))
        .join('');
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join('');
  const files = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escape(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  };
  fs.writeFileSync(file, zip(files));
}

module.exports = { readXlsx, writeXlsx, unzip, zip };
