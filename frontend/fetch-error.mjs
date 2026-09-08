import http from 'http';
import fs from 'fs';

http.get('http://localhost:3000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Write out the full HTML for debugging, but print a snippet
    fs.writeFileSync('error_dump.html', data);
    
    // Attempt to extract the literal Error from the Next.js overlay
    const match = data.match(/<title>(.*?)<\/title>/);
    const bodyMatch = data.match(/<div id="__next-build-error".*?>(.*?)<\/div>/s);
    
    console.log("Status Code: " + res.statusCode);
    if (match) console.log("Next Error Title: " + match[1]);
    
    // Strip HTML and print first 1000 chars of actual error trace
    let rawText = data.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    console.log("TRACE PREVIEW:");
    console.log(rawText.substring(0, 1500));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
