async (page) => {
  const fs = await import('fs');
  const content = fs.readFileSync('/Users/lancesmithcc/storagearea/AWEN01.cc/generated-pages/tools.html', 'utf8');
  const textarea = page.locator('textarea[placeholder="Start writing with text or HTML"]');
  await textarea.fill(content);
  return 'Pasted ' + content.length + ' chars';
}
