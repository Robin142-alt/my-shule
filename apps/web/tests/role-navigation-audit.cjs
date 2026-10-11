const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const base = process.env.NAVIGATION_BASE_URL || 'http://127.0.0.1:3017';
const switches = (process.env.NAVIGATION_SWITCH_ROLES || 'teacher,principal,teacher').split(',');
const roles = [...new Set(['principal', ...switches])];
const label = role => role.split('-').map(word => word[0].toUpperCase()+word.slice(1)).join(' ');
(async () => {
  const browser = await chromium.launch({ headless:true });
  const results = [];
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport:{width,height:900}, serviceWorkers:'block' });
    const page = await context.newPage();
    let activeRole = 'principal'; let roleRequests = 0; let authRequests = 0; let legalRequests = 0;
    function session() {
      const user = { user_id:'switch-test',tenant_id:'switch-school',role:activeRole,display_name:'Switch Test',email:'switch@example.test',session_id:'switch-session',permissions:['*:*'] };
      return { audience:'school',tenantSlug:user.tenant_id,userLabel:user.display_name,user,role:activeRole,homePath:`/school/${activeRole}`,redirectTo:`/school/${activeRole}`,roleContext:{primaryRole:'principal',activeRole,primaryAuthorizationRoleCode:'principal',activeAuthorizationRoleCode:activeRole,assignedRoles:roles,assignedAuthorizationRoleCodes:roles,availableRoles:roles.map(role=>({roleCode:role,authorizationRoleCode:role,roleName:label(role),isPrimary:role==='principal',isTeacherMode:role==='teacher',sources:['primary_membership']})),teacherDashboardEligible:true} };
    }
    await context.addCookies([{name:'myshule.school.session',value:encodeURIComponent(JSON.stringify({experience:'school',role:'principal',tenantSlug:'switch-school',userLabel:'Switch Test',homePath:'/school/principal'})),url:base}]);
    await context.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if(path==='/api/auth/me') {authRequests++;const value=session();return route.fulfill({json:{session:value,user:value.user}});}
      if(path==='/api/auth/csrf')return route.fulfill({json:{token:'test-csrf'}});
      if(path==='/api/auth/active-role') {
        roleRequests++; await new Promise(resolve=>setTimeout(resolve,500));
        activeRole=route.request().postDataJSON().role_code;
        const value=session();
        return route.fulfill({json:{session:value,user:value.user,roleContext:value.roleContext}});
      }
      if((path==='/api/legal/access'||path==='/api/legal/status')) {legalRequests++;return route.fulfill({json:{ready:true,user_id:'switch-test',school_id:'switch-school'}});}
      if(path==='/api/school/modules/me')return route.fulfill({json:['principal_dashboard','students','academics','finance','reports']});
      if(path==='/api/permissions/me')return route.fulfill({json:{data:['*:*']}});
      return route.fulfill({status:503,json:{message:'Controlled test: unavailable data'}});
    });
    await page.goto(base+'/school/principal/students');
    await expect(page.locator('[data-testid="school-dashboard-role-switcher"]')).toBeVisible();
    await page.evaluate(()=>{window.__documentMarker='same-document'; window.__flashes=0; window.__flashDetails=[]; const observer=new MutationObserver(()=>{const loader=document.querySelector('[data-testid="workspace-loading"],.legal-page');if(loader){window.__flashes++;window.__flashDetails.push({role:window.__switchTarget,path:location.pathname,text:loader.textContent});}});observer.observe(document.body,{childList:true,subtree:true});});
    for(const role of switches) {
      await page.evaluate(role=>{window.__switchTarget=role;},role);
      await page.getByTestId('school-dashboard-role-switcher').click();
      const option=page.getByRole('radio',{name:new RegExp('^'+label(role)+'(?: |$)')});
      await option.click();
      await expect(option).toBeDisabled();
      await expect(page).toHaveURL(new RegExp(`/school/${role}(?:/students)?$`));
      await expect(page.getByRole('dialog',{name:'Switch dashboard'})).toHaveCount(0);
      await expect(page.getByTestId('school-dashboard-role-switcher')).toContainText(label(role));
      expect(await page.evaluate(()=>window.__documentMarker)).toBe('same-document');
      if(role==='principal') await expect(page).toHaveURL(/\/school\/principal\/students$/);
    }
    expect(roleRequests).toBe(switches.length);
    const flashDetails=await page.evaluate(()=>window.__flashDetails);
    if(flashDetails.length) console.log(JSON.stringify({width,flashDetails}));
    expect(await page.evaluate(()=>window.__flashes)).toBe(0);
    results.push({width,roleRequests,authRequests,legalRequests,flashes:await page.evaluate(()=>window.__flashes),documents:await page.evaluate(()=>performance.getEntriesByType('navigation').length)});
    await context.close();
  }
  fs.writeFileSync(process.argv[2]||'../../tmp/role-navigation-audit.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
