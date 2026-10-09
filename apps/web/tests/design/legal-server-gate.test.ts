/** @jest-environment node */
import { NextRequest } from 'next/server';
import { requiresLegalReview } from '@/lib/legal/server-gate';
import { ACCESS_COOKIE, AUDIENCE_COOKIE, REFRESH_COOKIE, TENANT_COOKIE } from '@/lib/auth/session-cookies';
const previous=process.env.SERVER_API_BASE_URL;
beforeEach(()=>{global.fetch=jest.fn();process.env.SERVER_API_BASE_URL='https://api.example.test';});
afterAll(()=>{if(previous===undefined)delete process.env.SERVER_API_BASE_URL;else process.env.SERVER_API_BASE_URL=previous;});
function request(path='/school/teacher',access=true) {return new NextRequest(`https://school.example.test${path}`,{headers:{cookie:`${AUDIENCE_COOKIE}=school; ${TENANT_COOKIE}=school-a; ${access?ACCESS_COOKIE:REFRESH_COOKIE}=test-token`}});}
test('SSR only proceeds on a current positive authenticated check and never caches the decision',async()=>{
  jest.mocked(fetch).mockResolvedValueOnce(Response.json({data:{ready:true}})).mockResolvedValueOnce(Response.json({data:{ready:false}}));
  expect(await requiresLegalReview(request())).toBe(false);expect(await requiresLegalReview(request())).toBe(true);
  expect(jest.mocked(fetch).mock.calls[0][1]).toMatchObject({cache:'no-store',headers:{Authorization:'Bearer test-token','x-tenant-id':'school-a','x-auth-audience':'school'}});
});
test('backend failures, rejected credentials and missing access tokens route to recoverable legal review',async()=>{
  jest.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(Response.json({}, {status:401}));
  expect(await requiresLegalReview(request())).toBe(true);expect(await requiresLegalReview(request())).toBe(true);expect(await requiresLegalReview(request('/school/teacher',false))).toBe(true);
});
test('public documents and authentication recovery are not blocked by the legal gate',async()=>{
  for(const path of ['/privacy','/terms','/legal/accept','/parent/login','/invite/accept','/reset-password']) expect(await requiresLegalReview(request(path))).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});
