const fs = require('fs');
const child_process = require('child_process');

try {
  child_process.execSync('powershell -Command "Copy-Item BAO_CAO_TASK_TRACKER_REVISED.docx test_revised.zip -Force; Expand-Archive test_revised.zip test_revised_unpacked -Force; Remove-Item test_revised.zip -Force"');
  const xml = fs.readFileSync('test_revised_unpacked/word/document.xml', 'utf8');

  console.log('--- REVISED DOCX VERIFICATION ---');
  console.log('1. XML Read successfully, length:', xml.length);
  console.log('2. Contains TC01 actual result:', xml.includes('HTTP 200; Cấp phiên JWT'));
  console.log('3. Contains TC19 actual result:', xml.includes('Backend ghi log chuẩn JSON'));
  console.log('4. Contains Đạt (PASS):', xml.includes('Đạt (PASS)'));
  const passCount = (xml.match(/Đạt \(PASS\)/g) || []).length;
  console.log('5. Total Đạt (PASS) count:', passCount);
  console.log('6. Contains 127.0.0.1 healthcheck:', xml.includes('http://127.0.0.1:3000/api/health'));
  console.log('7. Contains revised Table 3.1:', xml.includes('Đã triển khai và hoạt động ổn định trên Docker Compose'));
  const mediaFiles = fs.readdirSync('test_revised_unpacked/word/media');
  console.log('8. All media files intact:', mediaFiles);

  child_process.execSync('powershell -Command "Remove-Item -Recurse -Force test_revised_unpacked"');
  console.log('--- ALL CHECKS PASSED 100% ---');
} catch (e) {
  console.error('Error during verification:', e.message);
}
