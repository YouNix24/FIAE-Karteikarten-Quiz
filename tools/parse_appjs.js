const fs = require("fs");
const vm = require("vm");
try {
  const src = fs.readFileSync('JS/app.js','utf8');
  new vm.Script(src);
  console.log('PARSE_OK');
} catch (e) {
  console.log('PARSE_ERR');
  console.log('name=', e && e.name);
  console.log('message=', e && e.message);
  console.log('lineNumber=', e && e.lineNumber);
  console.log('columnNumber=', e && e.columnNumber);
  const m = (e && (e.stack||'')).split('\n');
  console.log(m.slice(0,6).join('\n'));
}
