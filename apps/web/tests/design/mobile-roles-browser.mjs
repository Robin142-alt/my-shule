// Read-only browser coverage of actual role workspaces with isolated school fixtures.
// No requests leave the local QA server and no records are persisted.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import bundledWebpack from 'next/dist/compiled/webpack/webpack.js';
import {auditWorkspaceContrast} from './contrast-audit.mjs';
const require=createRequire(import.meta.url);
const {webpack}=bundledWebpack;
const web=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const out=path.resolve(web,'../../output/mobile-roles');fs.mkdirSync(out,{recursive:true});
const source=value=>JSON.stringify(value.replaceAll('\\','/'));
// Reuse the workflow suite's contract-shaped data for loaded Principal screens.
const ts=require('typescript');
const principalTest=ts.createSourceFile('principal.test.tsx',fs.readFileSync(path.join(web,'tests/design/principal-production-readiness.test.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const fixtureDeclarations=principalTest.statements.filter(ts.isVariableStatement).flatMap(statement=>statement.declarationList.declarations).filter(declaration=>['activeStudentId','canonicalResponses'].includes(declaration.name.getText(principalTest)));
assert.equal(fixtureDeclarations.length,2,'Principal workflow fixtures must be available');
fs.writeFileSync(path.join(out,'principal-fixtures.ts'),fixtureDeclarations.map(declaration=>`export const ${declaration.getText(principalTest)};`).join('\n'));
fs.writeFileSync(path.join(out,'loader.cjs'),`const ts=require(${source(require.resolve('typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;};`);
fs.writeFileSync(path.join(out,'link.tsx'),'export default function Link({children,...props}){return <a {...props}>{children}</a>;}');
fs.writeFileSync(path.join(out,'css-loader.cjs'), `module.exports=function(source){if(!this.resourcePath.endsWith('exam-analytics.module.css'))return 'export default {workspace:"dean-workspace",table:"dean-table"};';return 'export default '+JSON.stringify(Object.fromEntries([...source.matchAll(/\\.([A-Za-z_][\\w-]*)/g)].map(m=>[m[1],'analytics-'+m[1]])))+';';};`);
fs.writeFileSync(path.join(out,'navigation.ts'),`export function useRouter(){return {push:href=>window.history.replaceState(null,'',href),refresh(){},replace(){},back(){}};}export function usePathname(){return location.pathname;}export function useSearchParams(){return new URLSearchParams(location.search);}`);
fs.writeFileSync(path.join(out,'hooks.ts'),`
import {canonicalResponses} from './principal-fixtures';
const state={isLoading:false,isFetching:false,error:null,mutationError:null,refetch:()=>{},pendingIds:new Set()};
const identity={schoolName:'Mwangaza School · QA'};
export function useSchoolQuery(url){let data=canonicalResponses[url];
 if(url==='/school/identity')data=identity;
 if(url==='/admin-command/librarian/books')data={metrics:{total_titles:1,total_copies:4,available_copies:3,categories:1},books:[{id:'qa-book',title:'A comprehensive guide to Mathematics and practical problem solving',author:'QA Library Author',isbn:'9780000000000',category:'Mathematics',copies_total:4,copies_available:3,shelf_location:'Upper library · Shelf 12',status:'Available'}]};
 if(url==='/admin-command/nurse/visits')data={metrics:{},visits:[{id:'qa-visit',student_name:'QA learner with a long name',class_name:'Grade 8 · North',complaint:'Headache and feeling unwell during the afternoon lesson',diagnosis:'Under observation',visit_date:'2026-09-23',status:'Waiting'}]};
 if(url==='/admin-command/accountant/overview')data={generated_at:'2026-09-23',metrics:{collected_today_minor:'0',receipts_today_count:0,outstanding_balance_minor:'0',balances_above_threshold_count:0,open_invoice_count:0,mpesa_review_count:0,active_fee_structure_count:0},recent_activity:[]};
 if(url?.startsWith('/dashboard/layout'))data={widgets:[],buttons:[]};
 return {...state,data};}
export function isSchoolQueryForPath(){return false;}
export function useSchoolMutation(){return {isPending:false,mutateAsync:async()=>{throw new Error('Read-only visual fixture');}};}
export function useDashboardTasks(){return {...state,tasks:[],completeTask:async()=>{throw new Error('Read-only fixture');}};}
export function useApprovals(){return {...state,approvals:[],approve:async()=>{},reject:async()=>{}};}
export function useNotifications(){return {...state,notifications:[],unreadCount:0,markAsRead:async()=>{}};}
export function useNotificationBadges(){return {...state,badges:{unreadCount:0,urgentCount:0,byModule:{}}};}
export function useOptionalSchoolDashboardRole(){const role=location.pathname.split('/')[2];const name=role.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');return {userId:'qa-only',liveDataEnabled:!['parent','student'].includes(role),userLabel:'QA user',availableRoles:[{roleCode:role,authorizationRoleCode:role,roleName:name,isPrimary:true},{roleCode:role==='teacher'?'principal':'teacher',authorizationRoleCode:role==='teacher'?'principal':'teacher',roleName:role==='teacher'?'Principal':'Teacher',isTeacherMode:role!=='teacher'}],activeAuthorizationRoleCode:role,switchDashboardRole:async()=>{}};}
`);
const imports=[['PrincipalCommandCenter','principal-command-center'],['DeputyPrincipalCommandCenter','deputy-principal-command-center'],['AccountantCommandCenter','accountant-command-center'],['AdmissionsDashboardCommandCenter','admissions-dashboard/admissions-dashboard-command-center'],['LiveRoleCommandCenter','live-role-command-center'],['TeacherCommandCenter','teacher-command-center'],['ClassTeacherCommandCenter','class-teacher-command-center'],['GradeMasterCommandCenter','grade-master-command-center'],['HodCommandCenter','hod-command-center'],['DeanAcademicsCommandCenter','dean-academics-command-center'],['ExamsManagerCommandCenter','exams-manager-command-center']];
imports.push(['HosCommandCenter','hos-command-center']);
fs.writeFileSync(path.join(out,'entry.tsx'),`
import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
${imports.map(([name,file])=>`import {${name}} from ${source(path.join(web,'src/components/school',file))};`).join('\n')}
import {SchoolCommandIdentityProvider} from ${source(path.join(web,'src/components/school/integrated-school-command-header'))};
import {SchoolTenantScopeProvider} from ${source(path.join(web,'src/lib/data/school-tenant-scope'))};
import {SystemMonitorDashboard} from ${source(path.join(web,'src/components/platform/system-monitor-dashboard'))};
import {SuperadminPages} from ${source(path.join(web,'src/components/platform/superadmin-pages'))};
const [, ,role,section]=location.pathname.split('/');
const props={role,section,tenantSlug:'qa-only',userLabel:'QA user',activeSection:section,routeMode:'public'};
const screens={principal:PrincipalCommandCenter,'deputy-principal':DeputyPrincipalCommandCenter,accountant:AccountantCommandCenter,admissions:AdmissionsDashboardCommandCenter,teacher:TeacherCommandCenter,'class-teacher':ClassTeacherCommandCenter,'grade-master':GradeMasterCommandCenter,hod:HodCommandCenter,'dean-academics':DeanAcademicsCommandCenter,'exams-manager':ExamsManagerCommandCenter,'system-monitor':SystemMonitorDashboard,superadmin:SuperadminPages};
screens['head-of-subject']=HosCommandCenter;
const Screen=screens[role];
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><SchoolTenantScopeProvider tenantId="qa-only"><SchoolCommandIdentityProvider tenantSlug="qa-only" userLabel="QA user">{Screen?<Screen {...props}/>:<LiveRoleCommandCenter {...props} role={role} experience={role==='parent'||role==='student'?'portal':'school'}/>}</SchoolCommandIdentityProvider></SchoolTenantScopeProvider></QueryClientProvider>);
`);
const hookAliases=['@/lib/data/school-hooks','@/hooks/useDashboardTasks','@/hooks/useApprovals','@/hooks/useNotifications','@/lib/auth/school-dashboard-role-context'];
await new Promise((resolve,reject)=>webpack({mode:'development',devtool:false,entry:path.join(out,'entry.tsx'),output:{path:out,filename:'bundle.js'},resolve:{extensions:['.tsx','.ts','.js'],modules:[path.join(web,'node_modules'),'node_modules'],alias:{...Object.fromEntries(hookAliases.map(key=>[key,path.join(out,'hooks.ts')])),'next/link':path.join(out,'link.tsx'),'next/navigation':path.join(out,'navigation.ts'),'@':path.join(web,'src')}},plugins:[new webpack.DefinePlugin({'process.env':JSON.stringify({NODE_ENV:'development'})})],module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:[path.join(out,'loader.cjs')]},{test:/\.css$/,use:[path.join(out,'css-loader.cjs')]}]},optimization:{minimize:false}},(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
const globalsPath=path.join(web,'src/app/globals.css');
const globals=fs.readFileSync(globalsPath,'utf8').replace('@import "tailwindcss";',`@import "tailwindcss" source(none);\n@source ${source(path.join(web,'src/components'))};`);
const css=(await require('postcss')([require('@tailwindcss/postcss')()]).process(globals,{from:globalsPath})).css+'\n'+fs.readFileSync(path.join(web,'src/components/school/dean-academics/dean-workspace.module.css'),'utf8').replaceAll('.workspace','.dean-workspace').replaceAll('.table','.dean-table').replace(/:global\(([^)]+)\)/g,'$1')+'\n'+fs.readFileSync(path.join(web,'src/components/school/exams-manager/exam-analytics.module.css'),'utf8').replace(/\.([A-Za-z_][\w-]*)/g,'.analytics-$1');
const server=http.createServer((req,res)=>{
 const assetName=new URL(req.url,'http://localhost').pathname.slice(1);
 if(/^[\w.-]+\.js$/.test(assetName)){
  const assetPath=path.join(out,assetName);
  res.setHeader('Content-Type','application/javascript');
  if(!fs.existsSync(assetPath)){res.statusCode=404;res.end('');return;}
  res.setHeader('Cache-Control','public, max-age=3600');res.end(fs.readFileSync(assetPath));
 }
 else if(req.url==='/fonts/InterVariable.woff2'){res.setHeader('Content-Type','font/woff2');res.end(fs.readFileSync(path.join(web,'public/fonts/InterVariable.woff2')));}
 else if(req.url?.startsWith('/_next/image?')||req.url?.startsWith('/brand/')){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(path.join(web,'public/brand/myshule-mark-512.png')));}
 else if(req.url?.startsWith('/api/billing/reconciliation?')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data:{rows:[],method_summaries:[],totals:{cleared_amount_minor:'0',pending_amount_minor:'0',exception_amount_minor:'0',transaction_count:0}}}));}
 else if(req.url?.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('/finance-activity')?[]:{data:process.argv.includes('--contrast')&&req.url.startsWith('/api/permissions/me')?['*:*']:[]}));}
 else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${css}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`);}
});
await new Promise(resolve=>server.listen(process.argv.includes('--preview')?3016:0,'127.0.0.1',resolve));
if(process.argv.includes('--preview')){console.log('Isolated role preview: http://127.0.0.1:3016/school/principal/overview');await new Promise(()=>{});}
const browser=await chromium.launch({headless:true});const results=[];
let cases=[...['teacher','class-teacher','grade-master','hod','dean-academics','exams-manager','system-monitor','superadmin'].map(role=>[role,'overview']),['principal','overview'],['principal','students'],['principal','settings'],['deputy-principal','overview'],['deputy-principal','timetable'],['accountant','overview'],['accountant','payments'],['admissions','overview'],...['secretary','librarian','storekeeper','nurse','guidance-counselling','discipline-master','laboratory-technician','ict-manager','security-officer','transport-manager','boarding-master'].map(role=>[role,'overview']),['librarian','books'],['nurse','visits'],['parent','dashboard'],['parent','fees'],['student','dashboard'],['student','academics']];
cases.push(['teacher','lesson-log']);
cases.push(['head-of-subject','overview']);
for(const role of ['principal','deputy-principal','dean-academics','exams-manager','hod','head-of-subject','grade-master','class-teacher','teacher'])cases.push([role,'exam-analytics']);
if(process.argv.includes('--all-workspaces')){
 const configSource=ts.createSourceFile('roles.tsx',fs.readFileSync(path.join(web,'src/components/school/live-role-command-center.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(configSource)==='LIVE_ROLE_CONFIG'&&ts.isObjectLiteralExpression(node.initializer)){
   for(const role of node.initializer.properties){
    const workspaces=role.initializer.properties.find(prop=>prop.name?.getText(configSource)==='workspaces');
    for(const workspace of workspaces.initializer.properties)cases.push([role.name.text,workspace.name.text]);
   }
  }
  ts.forEachChild(node,visit);
 }visit(configSource);
 for(const [role,file,typeName] of [['principal','principal-command-center.tsx','PrincipalSection'],['accountant','accountant-command-center.tsx','AccountantSection']]){
  const sourceFile=ts.createSourceFile(file,fs.readFileSync(path.join(web,'src/components/school',file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  for(const statement of sourceFile.statements){
   if(ts.isTypeAliasDeclaration(statement)&&statement.name.text===typeName&&ts.isUnionTypeNode(statement.type))
    for(const section of statement.type.types)if(ts.isLiteralTypeNode(section)&&ts.isStringLiteral(section.literal))cases.push([role,section.literal.text]);
  }
 }
 cases=[...new Map(cases.map(item=>[item.join('/'),item])).values()];
}
const roleFilter=process.argv.find(arg=>arg.startsWith('--roles='))?.slice(8).split(',');
if(roleFilter)cases=cases.filter(([role])=>roleFilter.includes(role));
const viewports=process.argv.includes('--all-workspaces')?[[320,740],[1440,1000]]:[[320,740],[390,844],[768,1024],[1024,768],[1440,1000]];
async function checkNavigation(navigation) {
 assert.equal(await navigation.getByText('Academic Intelligence',{exact:true}).count(),0,'Exam Analytics replaces the duplicate Academic Intelligence entry');
 const rows=navigation.locator('.dashboard-nav-item:visible');
 await rows.first().waitFor({state:'visible'});
 assert.ok(await rows.count()>0,'The role menu keeps its navigation actions');
 const failures=await rows.evaluateAll(nodes=>nodes.flatMap(el=>{
  const style=getComputedStyle(el),box=el.getBoundingClientRect(),issues=[];
  if(box.height<44||style.fontSize!=='13px'||style.borderRadius!=='10px')issues.push('inconsistent row size');
  if(el.scrollWidth>el.clientWidth+1)issues.push('clipped menu content');
  if([...el.querySelectorAll('svg')].some(icon=>Math.abs(icon.getBoundingClientRect().width-16)>1))issues.push('inconsistent icon size');
  if(el.getAttribute('aria-current')==='page'&&style.backgroundColor!=='rgb(41, 74, 110)')issues.push('inconsistent active state');
  return issues.map(issue=>`${el.textContent.trim()}: ${issue}`);
 }));
 assert.deepEqual(failures,[],'Desktop and mobile use the same compact menu style');
}
try{
 for(const [width,height] of viewports){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',timezoneId:'Africa/Nairobi'});
  // Greeting length must not depend on the runner's timezone or execution hour.
  await page.clock.setFixedTime(new Date('2026-10-03T14:00:00Z'));
  await page.addInitScript(()=>{window.EventSource=undefined;});
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
  for(const [role,section] of cases){
   const errors=[];const handler=error=>errors.push(error.message);page.on('pageerror',handler);
   await page.goto(`http://127.0.0.1:${server.address().port}/school/${role}/${section}`);
   await page.locator('.authenticated-app').waitFor({timeout:10000}).catch(()=>{});
   if(section==='exam-analytics'||(role==='head-of-subject'&&section==='overview'))await page.getByRole('heading',{name:'Exam Analytics',exact:true,level:2}).waitFor();
   await page.evaluate(()=>document.fonts.ready);
   await page.evaluate(()=>new Promise(requestAnimationFrame));
   if(width===1440)await checkNavigation(page.locator('aside .dashboard-navigation:visible').first());
   const edgeTab=page.locator('.app-side-menu-tab');
   if(width<1024){
    await edgeTab.waitFor({state:'visible',timeout:10000}).catch(()=>{throw new Error(`${role}/${section}: mobile navigation unavailable: ${errors.join('; ')}`);});
    assert.equal(await edgeTab.count(),1,`${role}: exactly one primary mobile MENU tab`);
    const tabBox=await edgeTab.boundingBox();
    assert.ok(tabBox&&Math.abs(tabBox.x)<1&&tabBox.width<=56&&tabBox.height>=44,`${role}: narrow left-edge touch target`);
    assert.ok(await edgeTab.evaluate(el=>getComputedStyle(el).backgroundColor==='rgba(23, 53, 89, 0.84)'),'The MENU tab is slightly translucent with an opaque label');
    assert.ok(await edgeTab.evaluate(el=>el.parentElement===document.body&&getComputedStyle(el).position==='fixed'),'The tab is fixed to the viewport, outside transformed toolbars');
    assert.equal(await page.locator('.app-top-menu-trigger:visible').count(),0,'No duplicate top menu trigger on mobile');
    await page.evaluate(()=>window.scrollTo(0,240));
    const scrolledBox=await edgeTab.boundingBox();
    assert.ok(Math.abs(scrolledBox.y-tabBox.y)<1,'The MENU tab stays fixed while the workspace scrolls');
    assert.ok(await edgeTab.evaluate(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),'The tab stays tappable above the workspace');
    await page.evaluate(()=>window.scrollTo(0,0));
   }else{
    assert.equal(await edgeTab.count(),0,'Larger-screen navigation remains unchanged');
   }
   const metrics=await page.evaluate(()=>({pageWidth:document.documentElement.scrollWidth,hasShell:!!document.querySelector('.authenticated-app'),headings:[...document.querySelectorAll('main h1,main h2')].map(el=>el.textContent),overflow:[...document.querySelectorAll('main *')].filter(el=>{const r=el.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0&&!el.closest('.overflow-x-auto,.overflow-auto,aside');}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent?.slice(0,80)}))}));
   if(width<640){
    const fieldOverflow=await page.locator('.app-record-table .app-cell-value').evaluateAll(nodes=>nodes.some(el=>{const b=el.getBoundingClientRect();return b.right>innerWidth+1||el.scrollWidth>el.clientWidth+1;}));
    if(fieldOverflow)errors.push('A mobile record field overflows');
   }
   if(role==='principal'&&section==='settings'&&width<640){
    const settings=page.getByRole('region',{name:'Principal settings workspace'});
    const reset=settings.getByRole('link',{name:'Open secure reset'});
    if(!await reset.evaluate(el=>el.scrollHeight<=el.clientHeight+1&&getComputedStyle(el).color==='rgb(255, 255, 255)'))errors.push('The secure reset link is clipped or has insufficient dark-surface contrast');
    if(!await settings.locator('label:has(input[type="checkbox"])').evaluateAll(nodes=>nodes.length===3&&nodes.every(el=>el.getBoundingClientRect().height>=44)))errors.push('Settings switches need comfortable touch targets');
   }
   if(width<640){
    const intro=page.locator('[data-testid="integrated-school-command-header"]');
    if(await intro.count()){
     metrics.introHeight=await intro.evaluate(el=>el.getBoundingClientRect().height);
     if(role==='teacher'&&metrics.introHeight>140)errors.push(`Teacher intro too tall: ${metrics.introHeight}`);
    }
    if(role==='teacher'){
     metrics.topbarHeight=await page.locator('.app-command-topbar').evaluate(el=>el.getBoundingClientRect().height);
     assert.ok(metrics.topbarHeight<=64,'Teacher mobile toolbar must fit one row');
    }
    const switcher=page.getByTestId('school-dashboard-role-switcher').first();
    if(await switcher.count()){
     await switcher.click();
     const roles=page.getByRole('dialog',{name:'Switch dashboard'});
     assert.equal(await roles.getByRole('radio').count(),2,'All assigned role options stay available');
     await page.keyboard.press('Escape');
     assert.ok(await switcher.evaluate(el=>el===document.activeElement),'Role picker restores focus');
    }
    const trigger=page.locator('.app-side-menu-tab[aria-haspopup="dialog"]').first();
    if(await trigger.count()){
     await trigger.click();
     const drawer=page.locator('.app-navigation-sheet');
     await drawer.waitFor({state:'visible'});
     await checkNavigation(drawer.locator('.dashboard-navigation'));
     await drawer.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished)));
     const box=await drawer.boundingBox();
     assert.ok(box&&Math.abs(box.x)<1&&box.width<=280&&box.width<=width*.78+1,`Navigation must leave the page edge visible: ${role} ${width} ${JSON.stringify(box)}`);
     assert.ok(box.height>=height-1,'Navigation slides from the left, not the bottom');
     assert.ok(await drawer.locator('nav button').evaluateAll(nodes=>nodes.every(el=>el.getBoundingClientRect().height>=44)),'Menu touch targets must be at least 44px');
     const last=drawer.locator('nav button').last();await last.scrollIntoViewIfNeeded();
     assert.ok(await last.isVisible(),'Last workspace must remain reachable');
     await drawer.locator('nav').evaluate(el=>{el.scrollTop=0;});
     if(width===390)await page.screenshot({path:path.join(out,`${role}-${section}-drawer-${width}.png`)});
     await page.mouse.click(width-8,height/2);
     await drawer.waitFor({state:'hidden'});
     assert.equal(await page.evaluate(()=>document.body.style.overflow),'','Backdrop dismissal unlocks the page');
     assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Outside dismissal restores focus to MENU');
     if(role==='teacher'&&section==='overview'&&width===390){
      await trigger.click();
      await drawer.getByRole('button',{name:'Close teacher workspace sidebar'}).click();
      await drawer.waitFor({state:'hidden'});
      await trigger.click();
      await drawer.locator('nav button[aria-current="page"]').click();
      await drawer.waitFor({state:'hidden'});
      assert.ok(await trigger.evaluate(el=>el===document.activeElement),'Selecting a destination restores MENU focus');
      await trigger.click();
      await page.setViewportSize({width:1440,height:1000});
      await drawer.waitFor({state:'hidden'});
      assert.equal(await page.locator('.app-side-menu-tab').count(),0,'Resizing to desktop removes the side tab');
      assert.equal(await page.evaluate(()=>document.body.style.overflow),'','Desktop navigation unlocks the page');
      await page.setViewportSize({width,height});
      await trigger.waitFor({state:'visible'});
     }
    }
    if(role==='principal'){
     await page.getByRole('button',{name:'Open principal navigation'}).click();
     const drawer=page.getByRole('dialog',{name:'Principal navigation',exact:true});
     await checkNavigation(drawer.locator('.dashboard-navigation'));
     const box=await drawer.boundingBox();
     assert.ok(box&&box.width<=280&&box.width<=width*.78+1,'Principal drawer uses the same compact width');
     if(width===390)await page.screenshot({path:path.join(out,`principal-${section}-drawer-${width}.png`)});
     await page.keyboard.press('Escape');
    }
   }
   if(role==='accountant'&&section==='overview'&&(width===320||width===1440)){
    const shell=await page.getByTestId('accountant-command-center').elementHandle();
    const steps=[['fee-structures','Fee Structures'],['invoices','Invoices & statements'],['collections','Collections & exceptions'],['payments','Cash & cheques'],['payment-setup','Payment Setup'],['m-pesa-reconciliation','M-Pesa Reconciliation'],['receipts','Receipts'],['arrears','Arrears'],['waivers-discounts','Waivers & Discounts'],['expenses','Expenses'],['reports','Finance Reports'],['overview','Today']];
    metrics.financeNavigation=[];
    for(const [destination,label] of steps){
     let nav=page.getByRole('navigation',{name:'Accountant workspace navigation'});
     if(width<1024){
      await page.locator('.app-side-menu-tab').click();
      nav=page.getByRole('dialog').locator('nav');
     }
     const start=performance.now();
     await nav.getByRole('button',{name:label,exact:true}).click();
     await page.locator('.app-workspace-heading').getByRole('heading',{name:label,exact:true}).waitFor({state:'visible'});
     assert.equal(new URL(page.url()).pathname,`/school/accountant/${destination}`);
     assert.ok(await shell.evaluate(el=>el.isConnected),'Finance navigation preserves the mounted shell');
     metrics.financeNavigation.push({destination,elapsedMs:Math.round(performance.now()-start)});
    }
    await page.goBack();
    await page.locator('.app-workspace-heading').getByRole('heading',{name:'Finance Reports',exact:true}).waitFor({state:'visible'});
    await page.goForward();
    await page.locator('.app-workspace-heading').getByRole('heading',{name:'Today',exact:true}).waitFor({state:'visible'});
   }
   if(process.argv.includes('--contrast')){
    metrics.contrast=await auditWorkspaceContrast(page);
    if(metrics.contrast.failures.length)errors.push('Metric or action text fails WCAG AA contrast');
   }
   const passed=metrics.hasShell&&metrics.pageWidth<=width&&errors.length===0;
   results.push({role,section,width,height,passed,...metrics,errors});
   if(width===390||width===1440||role==='principal'&&width===320||!passed)await page.screenshot({path:path.join(out,`${role}-${section}-${width}.png`),fullPage:true});
   console.log(`${passed?'PASS':'FAIL'} ${role}/${section} ${width}${passed?'':' '+JSON.stringify({errors,metrics})}`);
   if(role==='librarian'&&section==='books'&&width===320){
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.app-record-table tbody tr').first().evaluate(el=>getComputedStyle(el).display),'table-row','Print must keep tabular records');
    assert.equal(await page.locator('.app-cell-label').first().evaluate(el=>getComputedStyle(el).display),'none','Print must not duplicate column labels');
    await page.emulateMedia({media:'screen'});
   }
   page.off('pageerror',handler);
  }
  await page.close();
 }
 fs.writeFileSync(path.join(out,roleFilter?'filtered-workspaces-results.json':process.argv.includes('--all-workspaces')?'all-workspaces-results.json':'results.json'),JSON.stringify(results,null,2));
 assert.ok(results.every(result=>result.passed),'Some role layouts failed; inspect output/mobile-roles/results.json');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
