import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExecutionContext, Sse } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, toArray } from 'rxjs';
import { LegalStreamInterceptor } from './legal-stream.interceptor';
import { LegalService } from './legal.service';
import { AuthService } from '../../auth/auth.service';

test('a previously open stream stops before releasing data after legal authorisation is withdrawn', async () => {
  class Controller { @Sse('stream') stream() {} }
  let checks=0;const delivered:unknown[]=[];
  const legal={context:{requireStore:()=>({audience:'portal',tenant_id:'school'}),run:(_:unknown,fn:()=>unknown)=>fn()},status:async()=>({ready:++checks===1})} as unknown as LegalService;
  const auth={extractBearerToken:()=> 'test-token',authenticateAccessToken:async()=>({})} as unknown as AuthService;
  const context={getHandler:()=>Controller.prototype.stream,switchToHttp:()=>({getRequest:()=>({})})} as unknown as ExecutionContext;
  const interceptor=new LegalStreamInterceptor(new Reflector(),legal,auth);
  const stream=interceptor.intercept(context,{handle:()=>of({data:'first'},{data:'must not escape'})});
  await new Promise<void>((resolve,reject)=>stream.subscribe({next:value=>delivered.push(value),error:error=>{try{assert.equal(error.getStatus(),428);resolve();}catch(failure){reject(failure);}},complete:()=>reject(new Error('Stream did not close'))}));
  assert.deepEqual(delivered,[{data:'first'}]);
});

test('ordinary non-streaming responses retain their existing shape',async()=>{
  const interceptor=new LegalStreamInterceptor(new Reflector(),{} as LegalService,{} as AuthService);
  const context={getHandler:()=>function read(){}} as unknown as ExecutionContext;
  assert.deepEqual(await lastValueFrom(interceptor.intercept(context,{handle:()=>of({ok:true})}).pipe(toArray())),[{ok:true}]);
});
