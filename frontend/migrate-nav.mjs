import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function migrate() {
  const files = await glob('src/**/*.jsx', { absolute: true });
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Link replacement
    if (content.includes('Link') && content.includes('react-router-dom')) {
       // Replace import
       content = content.replace(/import\s+\{[^}]*Link[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
          if (match.includes('useNavigate') || match.includes('useLocation') || match.includes('useParams')) {
             return match.replace(/Link,?\s*/g, '').replace(/,\s*\}/g, '}').replace(/\{\s*,/g, '{');
          }
          return '';
       });
       if (!content.includes('import Link from \'next/link\'')) {
          content = "import Link from 'next/link';\n" + content;
       }
    }

    // 2. useNavigate -> useRouter
    if (content.includes('useNavigate')) {
       content = content.replace(/useNavigate/g, 'useRouter');
       content = content.replace(/const\s+(\w+)\s*=\s*useRouter\(\)/g, 'const router = useRouter()');
       content = content.replace(/\b(\w+)\s*\(/g, (match, p1) => {
          if (p1 === 'navigate') return 'router.push(';
          return match;
       });
       
       // Fix imports
       content = content.replace(/import\s+\{[^}]*(useRouter|useNavigate)[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
          return match.replace(/useNavigate|useRouter/g, '').replace(/,\s*\}/g, '}').replace(/\{\s*,/g, '{').replace(/\{\s*\}/g, '');
       });
       if (!content.includes('import { useRouter } from \'next/navigation\'')) {
          content = "import { useRouter } from 'next/navigation';\n" + content;
       }
    }

    // 3. useLocation -> usePathname / useSearchParams
    if (content.includes('useLocation')) {
       content = content.replace(/useLocation\(\)/g, 'usePathname()');
       content = content.replace(/const\s+location\s*=\s*usePathname\(\)/g, 'const pathname = usePathname()');
       content = content.replace(/location\.pathname/g, 'pathname');
       
       // Fix imports
       content = content.replace(/import\s+\{[^}]*useLocation[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
          return match.replace(/useLocation/g, '').replace(/,\s*\}/g, '}').replace(/\{\s*,/g, '{').replace(/\{\s*\}/g, '');
       });
       if (!content.includes('import { usePathname } from \'next/navigation\'')) {
          content = "import { usePathname, useSearchParams } from 'next/navigation';\n" + content;
       }
    }

    // 4. useParams
    if (content.includes('useParams') && content.includes('react-router-dom')) {
       content = content.replace(/import\s+\{[^}]*useParams[^}]*\}\s+from\s+['"]react-router-dom['"];?/g, (match) => {
          return match.replace(/useParams/g, '').replace(/,\s*\}/g, '}').replace(/\{\s*,/g, '{').replace(/\{\s*\}/g, '');
       });
       if (!content.includes('import { useParams } from \'next/navigation\'')) {
          content = "import { useParams } from 'next/navigation';\n" + content;
       }
    }

    // Cleanup empty imports
    content = content.replace(/import\s+\{\s*\}\s+from\s+['"]react-router-dom['"];?\n?/g, '');
    
    // Ensure "use client" is present if we added hooks
    if ((content.includes('useRouter') || content.includes('usePathname') || content.includes('useParams')) && !content.startsWith('"use client"')) {
       content = '"use client";\n' + content;
    }

    if (content !== original) {
      fs.writeFileSync(file, content);
      console.log(`Migrated: ${path.basename(file)}`);
    }
  }
}

migrate();
