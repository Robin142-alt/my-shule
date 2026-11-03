import { expect, test } from "@playwright/test";
import { populatedPrincipalFixtures } from "./principal-populated-fixtures";
const canonicalResponses = populatedPrincipalFixtures();
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { SCHOOL_SESSION_COOKIE, serializeExperienceSession } from "@/lib/auth/experience-routing";

test.use({serviceWorkers:"block"});
const sections = [
  ["academic-setup","Academic Calendar"],["subjects-departments","Subjects by department"],
  ["academics","Academic oversight"],["staff","Teaching workload"],
  ["exams-reports","Exam Performance Trend"],["communication","School communication"],
  ["reports","Generated reports"],["discipline","Incident register"],
  ["timetable","School master timetable"],["syllabus-coverage","Syllabus Coverage"],
  ["finance","Collection Trend"],["students","Students Directory"],
  ["approvals","Pending by Category"],["attendance-monitoring","Weekly Attendance Rate"]
] as const;

for(const width of [320,390,768,1024,1440]) {
  test(`Principal workspaces preserve readable content and navigation at ${width}px`,async({page})=>{
    test.setTimeout(240000);
    await page.setViewportSize({width,height:960});
    const user={user_id:"fixture-principal",tenant_id:"fixture-tenant",role:"principal",display_name:"Fixture Principal",email:"principal@example.test",session_id:"fixture-session",permissions:["*:*"]};
    const session={audience:"school",tenantSlug:user.tenant_id,userLabel:user.display_name,user,role:"principal",roleContext:normalizeDashboardRoleContext(null,"principal"),homePath:"/school/principal",redirectTo:"/school/principal"};
    await page.context().addCookies([{name:SCHOOL_SESSION_COOKIE,value:serializeExperienceSession({experience:"school",role:"principal",tenantSlug:user.tenant_id,userLabel:user.display_name,homePath:"/school/principal"}),url:"http://127.0.0.1:3005"}]);
    const errors:string[]=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/api/**",async route=>{
      const url=new URL(route.request().url());
      const path=url.pathname.replace(/^\/api/,"");
      if(path==="/auth/me")return route.fulfill({json:{session,user}});
      if(path==="/legal/access")return route.fulfill({json:{ready:true}});
      if(path==="/school/modules/me")return route.fulfill({json:["principal_dashboard","students","admissions","academics","finance","reports","exams","timetable","discipline","staff","communication_sms"]});
      if(path.includes("/permissions/me"))return route.fulfill({json:{data:["*:*"]}});
      if(path.endsWith("/dashboard/stream"))return route.fulfill({contentType:"text/event-stream",body:""});
      const data=canonicalResponses[url.pathname+url.search]??canonicalResponses[path+url.search]??canonicalResponses[path]??[];
      return route.fulfill({json:{data,meta:{}}});
    });
    for(const [section,heading] of sections) {
      await page.goto("/school/principal/"+section,{waitUntil:"domcontentloaded"});
      await expect(page.getByRole("heading",{name:heading,exact:true}).first()).toBeVisible({timeout:30000});
      await expect(page.getByRole("alert",{name:"Principal workspace unavailable"})).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),section+" horizontal overflow").toBe(true);
      const menu=page.getByRole("button",{name:"Open principal navigation",exact:true});
      if(width<1024)await expect(menu).toHaveClass("app-side-menu-tab");
      else await expect(page.getByRole("navigation",{name:"Principal dashboard sidebar"})).toBeVisible();
      if(width===390||width===1440)await page.screenshot({path:`../../output/principal-${section}-${width}.png`,fullPage:true});
    }
    expect(errors).toEqual([]);
  });
}
