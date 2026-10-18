import { test, expect } from '@playwright/test';
import { LEGAL_DOCUMENTS } from '../../../../shared/legal/documents';
const pending={user_id:'test-staff',school_id:'test-school',school_name:'Amani School',display_name:'Amina',ready:false,required_documents:LEGAL_DOCUMENTS.filter(d=>d.kind!=='dpa'),documents:LEGAL_DOCUMENTS,blockers:[],school_accepted:false,school_authority_verified:false,guardian_required:false,dpa_active:false,incorporated_documents:[],guardian_children:[],can_verify_school_authority:false,can_verify_guardians:false,statements:{school:'',guardian:''},receipts:[]};

for(const width of [320,390,1280]) test(`compact acceptance and accessible viewer at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let submitted:unknown;let accepted=false;let failFirst=true;
  await page.route('**/api/auth/csrf',route=>route.fulfill({json:{token:'browser-test-csrf'}}));
  await page.route('**/api/legal/access',route=>route.fulfill({json:{ready:accepted}}));
  await page.route('**/api/legal/status',route=>route.fulfill({json:{...pending,...(accepted?{ready:true,required_documents:[]}: {})}}));
  await page.route('**/api/legal/accept',async route=>{
    submitted=route.request().postDataJSON();
    if(failFirst){failFirst=false;await route.fulfill({status:503,json:{message:'Unable to record agreements. Please retry.'}});return;}
    accepted=true;await route.fulfill({json:{...pending,ready:true,required_documents:[]}});
  });
  // Use the canonical public document: /terms redirects and drops the query marker.
  // This destination avoids forging a protected server session.
  await page.route('**/api/legal/destination',route=>route.fulfill({json:{path:'/legal/documents/terms-1.0?verified=1'}}));
  await page.goto('/legal/accept');
  await expect(page.getByRole('heading',{name:'A moment before you begin'})).toBeVisible();
  const privacy=page.getByRole('checkbox',{name:/Privacy Policy/});const terms=page.getByRole('checkbox',{name:/Terms of Use/});
  await expect(privacy).not.toBeChecked();await expect(terms).not.toBeChecked();
  await expect(page.getByRole('button',{name:'Agree & Continue'})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`acceptance-${width}.png`),fullPage:true});
  const link=page.getByRole('link',{name:'Privacy Policy',exact:true}).first();await link.click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const body=dialog.locator('.app-modal-body');expect(await body.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`viewer-${width}.png`),fullPage:true});
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(link).toBeFocused();await expect(privacy).not.toBeChecked();
  await privacy.check();await terms.check();
  await page.getByRole('button',{name:'Agree & Continue'}).click();
  await expect(page.locator('.legal-card').getByRole('alert')).toContainText('Unable to record');await expect(privacy).toBeChecked();
  await page.getByRole('button',{name:'Agree & Continue'}).click();
  await expect(page).toHaveURL(/verified=1/);
  expect(submitted).toEqual({selections:pending.required_documents.map(doc=>({document_id:doc.id,checked:true}))});
  expect(errors).toEqual([]);
});

for(const width of [390,1280]) test(`recorded acceptance skips the form on return and reload at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:844});
  const flashes:string[]=[];
  await page.exposeFunction('recordAgreementFlash',(text:string)=>flashes.push(text));
  await page.addInitScript(()=>{
    const observer=new MutationObserver(()=>{
      const text=document.body?.innerText??'';
      if(/Your agreements are up to date|Continue to dashboard|A moment before you begin/.test(text)) {
        void (window as unknown as {recordAgreementFlash:(text:string)=>Promise<void>}).recordAgreementFlash(text);
      }
    });
    observer.observe(document,{childList:true,subtree:true});
  });
  let accessChecks=0;let statusReads=0;let writes=0;
  await page.route('**/api/legal/access',route=>{accessChecks++;return route.fulfill({json:{ready:true}});});
  await page.route('**/api/legal/status',route=>{statusReads++;return route.fulfill({json:{...pending,ready:true,required_documents:[]}});});
  await page.route('**/api/legal/accept',route=>{writes++;return route.abort();});
  await page.route('**/api/legal/destination',route=>route.fulfill({json:{path:'/legal/documents/terms-1.0?verified=1'}}));
  for(let visit=0;visit<2;visit++) {
    await page.goto('/legal/accept');
    await expect(page).toHaveURL(/\/legal\/documents\/terms-1\.0\?verified=1$/);
    await expect(page.getByRole('heading',{name:'Terms of Use',exact:true})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading',{name:'Terms of Use',exact:true})).toBeVisible();
  }
  expect(accessChecks).toBe(2);expect(statusReads).toBe(0);expect(writes).toBe(0);expect(flashes).toEqual([]);
});

test('manual agreement review keeps guardian controls available outside the login flow',async({page})=>{
  await page.route('**/api/legal/status',route=>route.fulfill({json:{...pending,ready:true,required_documents:[],guardian_children:[{student_id:'test-child',name:'Alex',verified:true,authorised:false}]}}));
  await page.goto('/legal/account');
  await expect(page.getByRole('heading',{name:'Your agreements',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your children’s portal access'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Authorise portal access'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Agree & Continue'})).toHaveCount(0);
});

test('public documents and approved original PDF open without a session',async({page})=>{
  for(const [path,title] of [['/privacy','Privacy Policy'],['/terms','Terms of Use']]) {
    const response=await page.goto(path);expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await expect(page.locator('.legal-document')).toContainText('Orbitlane Technologies');
  }
  const pdf=await page.request.get('/legal-assets/MyShule_School_DPA_Contract_v2.0.pdf');expect(pdf.ok()).toBe(true);expect(pdf.headers()['content-type']).toContain('application/pdf');
});
