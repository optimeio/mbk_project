import fs from 'fs';

try {
  const html = fs.readFileSync('error_dump.html', 'utf8');
  
  // Method 1: Next.js dev overlay JSON embedded in script tags
  const reactDevOverlayMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (reactDevOverlayMatch) {
     const data = JSON.parse(reactDevOverlayMatch[1]);
     if (data.err) {
       fs.writeFileSync('error_message.txt', data.err.message || data.err);
       process.exit(0);
     }
  }

  // Method 2: Extract from title or basic DOM error body
  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  console.log("Title: ", titleMatch ? titleMatch[1] : "No Title");
  
  const h1Match = html.match(/<h1.*?>(.*?)<\/h1>/);
  const h2Match = html.match(/<h2.*?>(.*?)<\/h2>/);
  console.log("H1/H2:", (h1Match ? h1Match[1] : ""), (h2Match ? h2Match[1] : ""));

  // Just strip all scripts & styles and print raw text
  const cleanBody = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                        
  console.log("RAW BODY TEXT:");
  console.log(cleanBody.substring(0, 1000));
} catch (e) {
  console.error(e);
}
