import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../app.js'),importer=read('../../assets/js/importer.js');
const html=read('../../importer.html'),trainer=read('../../assets/js/library-trainer.js');
const library=read('../cloud/libraries.mjs');

test('the administrator can start publication from header and profile without extra menus',()=>{
 assert.match(app,/studio-admin-publish/);
 assert.match(app,/admin-publish-home/);
 assert.match(app,/class="card profile-admin-hub"><details open>/);
 assert.match(app,/href="importer.html"/);
});
test('training page shows quick publish only after checking founder permissions',()=>{
 assert.match(trainer,/checkAdmin\(\)\.then\(async\(\)=>/);
 assert.match(trainer,/mountAdminPublishShortcut\(\)/);
 assert.match(trainer,/isAdmin\(\)&&?|\!isAdmin\(\)/);
 assert.match(trainer,/cloudUser\(\)\?\.email/);
 assert.match(trainer,/params\.set\('library',selectedLibrary\(\)\)/);
 assert.match(trainer,/new URLSearchParams\(\{stage\}\)/);
});
test('PDF importer keeps all existing controls with review and publish prominent',()=>{
 for(const id of ['import-file','import-library','import-stage','import-save','import-publish','import-publish-summary','import-approve-all','import-cards'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/importer-steps/);
 assert.match(html,/importer-publish-bar/);
 assert.match(importer,/\$\('import-file'\)\.addEventListener\('change'/);
 assert.match(importer,/saveLibraryCasesBatch\(libraryId,records/);
 assert.match(importer,/publishApprovedLibrary\(id\)/);
 assert.match(importer,/LAST_LIBRARY/);
 assert.match(importer,/data-approve/);
});
test('permission constraints still enforce founder-only writes and review before publication',()=>{
 assert.match(importer,/const owner=\(\)=>isAdmin\(\)&&cloudUser\(\)\?\.email/);
 assert.match(importer,/if\(!records\.some\(r=>r\.status==='approved'\)\)/);
 assert.match(library,/function requireOwner\(\)/);
 assert.match(library,/cfop_library_case_drafts/);
 assert.match(library,/rpc\/cfop_publish_library/);
});
