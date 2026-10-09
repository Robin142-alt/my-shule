import { test, expect } from '@playwright/test';
import { LEGAL_DOCUMENTS } from '../../../../shared/legal/documents';
const pending={user_id:'test-staff',school_id:'test-school',school_name:'Amani School',display_name:'Amina',ready:false,required_documents:LEGAL_DOCUMENTS.filter(d=>d.kind!=='dpa'),documents:LEGAL_DOCUMENTS,blockers:[],school_accepted:false,school_authority_verified:false,guardian_required:false,dpa_active:false,incorporated_documents:[],guardian_children:[],can_verify_school_authority:false,can_verify_guardians:false,statements:{school:'',guardian:''},receipts:[]};

for(const width of [320,390,1280]) test(`compact acceptance and accessible viewer at ${width}px`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:844});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  let submitted:unknown;let accepted=false;let failFirst=true;
  await page.route('**/api/auth/csrf',route=>route.fulfill({json:{token:'browser-test-csrf'}}));
  await page.route('**/api/legal/status',route=>route.fulfill({json:{...pending,...(accepted?{ready:true,required_documents:[]}: {})}}));
  await page.route('**/api/legal/accept',async route=>{
    submitted=route.request().postDataJSON();
    if(failFirst){failFirst=false;await route.fulfill({status:503,json:{message:'Unable to record agreements. Please retry.'}});return;}
    accepted=true;await route.fulfill({json:{...pending,ready:true,required_documents:[]}});
  });
  await page.route('**/api/legal/destination',route=>route.fulfill({json:{path:'/legal/accept?verified=1'}}));
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

test('public documents and approved original PDF open without a session',async({page})=>{
  for(const [path,title] of [['/privacy','Privacy Policy'],['/terms','Terms of Use']]) {
    const response=await page.goto(path);expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
    await expect(page.locator('.legal-document')).toContainText('Orbitlane Technologies');
  }
  const pdf=await page.request.get('/legal-assets/MyShule_School_DPA_Contract_v2.0.pdf');expect(pdf.ok()).toBe(true);expect(pdf.headers()['content-type']).toContain('application/pdf');
});
