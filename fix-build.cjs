const fs = require('fs');

const content = `import { buildAssessment } from '../components/assessment-builder.js';
import { readFileSync } from 'fs';

const green = '\\u001b[32m';
const red = '\\u001b[31m';
const yellow = '\\u001b[33m';
const reset = '\\u001b[0m';

async function main() {
  console.log(\`\${yellow}Building Assessment Report...\${reset}\\n\`);

  const inputData = JSON.parse(
    readFileSync('examples/sample-assessment.json', 'utf8')
  );

  const result = await buildAssessment(inputData);

  if (result.success) {
    console.log(\`\${green}Assessment built successfully!\${reset}\`);
    console.log(\`  HTML: \${result.files.html}\`);
    console.log(\`  PDF:  \${result.files.pdf}\`);
    process.exit(0);
  } else {
    console.log(\`\${red}Build failed at \${result.stage}\${reset}\`);
    console.log(\`  Error: \${result.error}\`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(\`\${red}Fatal error:\${reset}\`, err);
  process.exit(1);
});
`;

fs.writeFileSync('scripts/build.js', content, 'utf8');
console.log('✅ scripts/build.js rewritten successfully');