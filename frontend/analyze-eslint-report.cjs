const fs = require('fs');
const path = require('path');
const f = path.join(process.cwd(),'eslint-report.json');
if (!fs.existsSync(f)) {
  console.error('Missing eslint-report.json');
  process.exit(2);
}
const raw = fs.readFileSync(f,'utf8');
let data;
try{ data = JSON.parse(raw); } catch(e){ console.error('JSON parse error', e && e.message); process.exit(2); }
const ruleCounts = Object.create(null);
const fileCounts = [];
const samples = Object.create(null);
for (const fileResult of data){
  const { filePath, messages } = fileResult;
  let errs = 0;
  for (const m of messages){
    const rid = m.ruleId || '(parse/error)';
    const key = rid;
    ruleCounts[key] = (ruleCounts[key] || 0) + 1;
    if (!samples[key]) samples[key] = [];
    if (samples[key].length < 3) samples[key].push({ file: filePath, line: m.line, col: m.column, msg: m.message });
    if (m.severity === 2) errs++;
  }
  fileCounts.push({ file: filePath, problems: messages.length, errors: errs });
}
const rulesSorted = Object.keys(ruleCounts).map(k=>({rule:k,count:ruleCounts[k]})).sort((a,b)=>b.count-a.count);
fileCounts.sort((a,b)=>b.problems-a.problems);
let out = [];
out.push('ESLint Summary');
out.push('===============');
out.push(`Files analyzed: ${data.length}`);
out.push('');
out.push('Top rules by occurrence:');
for (let i=0;i<20 && i<rulesSorted.length;i++){
  const r = rulesSorted[i];
  out.push(`${i+1}. ${r.rule} — ${r.count} occurrences`);
  const s = samples[r.rule] || [];
  for (const ex of s){
    out.push(`   • ${ex.file}:${ex.line}:${ex.col} — ${ex.msg}`);
  }
}
out.push('');
out.push('Top files by problem count:');
for (let i=0;i<20 && i<fileCounts.length;i++){
  const f0 = fileCounts[i];
  out.push(`${i+1}. ${f0.file} — ${f0.problems} problems (${f0.errors} errors)`);
}
fs.writeFileSync('eslint-summary.txt', out.join('\n'), 'utf8');
console.log('WROTE eslint-summary.txt');
