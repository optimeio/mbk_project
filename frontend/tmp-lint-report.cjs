const { ESLint } = require("eslint");
const fs = require('fs');

(async () => {
  try {
    const eslint = new ESLint({ cwd: process.cwd() });
    const results = await eslint.lintFiles(["src"]);
    const formatter = await eslint.loadFormatter("json");
    const resultText = formatter.format(results);
    fs.writeFileSync("eslint-report.json", resultText, "utf8");
    console.log(`WROTE ${results.length} file results to eslint-report.json`);
  } catch (err) {
    console.error('ERROR', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
})();
