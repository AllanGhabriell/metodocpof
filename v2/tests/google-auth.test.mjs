import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const cloud=readFileSync(new URL('../cloud/cloud.mjs',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('Google OAuth uses Supabase authorize and a redirect back to site',()=>{
 assert.match(cloud,/export function signInWithGoogle/);
 assert.match(cloud,/auth\/v1\/authorize/);
 assert.match(cloud,/url\.searchParams\.set\('provider','google'\)/);
 assert.match(cloud,/location\.origin\+location\.pathname/);
});
test('Google login is displayed only in configured unauthenticated account panel',()=>{
 assert.match(cloud,/google-signin/);
 assert.match(app,/if\(cmd==='google'\)/);
 assert.match(app,/signInWithGoogle\(\)/);
 assert.match(cloud,/export async function acceptAuthRedirect/);
});
