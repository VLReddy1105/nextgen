import {chromium} from '../../work/ui-test/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:process.env.UI_BROWSER_CHANNEL||'msedge'}),page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,1366,1024,768,390]){
 await page.setViewportSize({width,height:1000});
 for(const [role,module] of [['company','overview'],['company','opportunities'],['university','students'],['university','announcements'],['mentor','profile'],['mentor','connections'],['mentor','sessions']]){
  await page.goto(`http://127.0.0.1:4173/?role=${role}&page=${module}&state=populated`);
  await page.locator('main h1').waitFor();
  if(module==='opportunities')await page.getByText('Create opportunity',{exact:true}).click();
  if(module==='students')await page.getByText('University email domains',{exact:true}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${role}/${module} overflow at ${width}`);
  await page.screenshot({path:`work/ui-review/${role}-${module}-${width}.png`,fullPage:true});
 }
}
await page.goto('http://127.0.0.1:4173/?page=profile&section=education');
await page.getByRole('button',{name:'Continue',exact:true}).click();
await page.getByText('Degree is required.',{exact:true}).waitFor();
assert.equal(await page.getByRole('heading',{name:'Education',exact:true}).count(),1);
await page.getByLabel('Study status').selectOption('Graduated');
assert.equal(await page.getByLabel('Current study year').count(),0);
await page.goto('http://127.0.0.1:4173/?page=profile&section=career');
await page.getByRole('combobox',{name:'Preferred locations'}).fill('hyd');
await page.getByRole('option',{name:'Hyderabad',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Remove hyderabad'}).count(),1);
await page.getByRole('combobox',{name:'Preferred roles'}).fill('back');
await page.getByRole('option',{name:'Backend Developer',exact:true}).click();
await page.getByRole('combobox',{name:'Preferred locations'}).fill('remote');
await page.getByRole('combobox',{name:'Preferred locations'}).press('Enter');
await page.getByText(/Choose individual values/).waitFor();
await page.goto('http://127.0.0.1:4173/?page=profile&section=skills');
await page.getByRole('combobox',{name:'Technical skills'}).fill('py');
await page.getByRole('combobox',{name:'Technical skills'}).press('Enter');
assert.equal(await page.getByRole('button',{name:'Remove python'}).count(),1);
await page.getByRole('combobox',{name:'Technical skills'}).fill('Django FastAPI PostgreSQL');
await page.getByRole('combobox',{name:'Technical skills'}).press('Enter');
for(const skill of ['django','fastapi','postgresql'])assert.equal(await page.getByRole('button',{name:`Remove ${skill}`}).count(),1);
await page.goto('http://127.0.0.1:4173/?page=profile&section=projects');
await page.getByRole('combobox',{name:'Languages'}).fill('eng');
await page.getByRole('option',{name:'English',exact:true}).click();
assert.equal(await page.getByRole('button',{name:'Remove english'}).count(),1);
assert.deepEqual(errors,[]);
console.log('PASS: 35 cross-role viewport cases; forms, profile gating, graduated state, hyd/py/back/eng autocomplete, domain rejection and multi-value splitting.');
await browser.close();
