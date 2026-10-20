import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '../../guards/rbac.guard';
import { TenantBoundGuard } from '../../guards/tenant-bound.guard';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SmartLibraryController } from './smart-library.controller';
import { LibraryController } from './library.controller';
import { LibrarianCommandController } from '../admin-command/librarian-command.controller';

test('all library mutations, including legacy routes, reject readers and anonymous callers',()=>{
  const context=new RequestContextService();
  const guard=new RbacGuard(new Reflector(),context);
  for(const [controller,names] of [
    [SmartLibraryController,['allocate','import','register','issue','returns','incident','startStocktake','stocktakeScan','complete']],
    [LibraryController,['createLoan','issueCopy','issueByScan','returnCopy','returnByScan','scanIssue','scanReturn','issueBook']],
    [LibrarianCommandController,['addBook','deleteBook','issueBook','issueDepartmentResource','returnBook']],
  ] as const){
    for(const name of names){
      const execution={getClass:()=>controller,getHandler:()=>(controller.prototype as any)[name]} as never;
      context.run({tenant_id:'school',user_id:'actor',is_authenticated:true,role:'parent',permissions:['library:read']} as never,()=>{
        assert.throws(()=>guard.canActivate(execution),/Permission-based/);
      });
      context.run({tenant_id:'school',user_id:'actor',is_authenticated:false,role:'librarian',permissions:['library:write']} as never,()=>{
        assert.throws(()=>guard.canActivate(execution),/Authenticated/);
      });
      context.run({tenant_id:'school',user_id:'actor',is_authenticated:true,role:'librarian',permissions:['library:write']} as never,()=>{
        assert.equal(guard.canActivate(execution),true);
      });
    }
  }
});
test('read and export endpoints require permission and a school context',()=>{
  const context=new RequestContextService(),guard=new RbacGuard(new Reflector(),context);
  for(const name of ['summary','catalogue','inventory','scan','borrowers','history','loans','batches','barcodes','stocktakes','stocktake','pdf','calibration']){
    const execution={getClass:()=>SmartLibraryController,getHandler:()=>(SmartLibraryController.prototype as any)[name]} as never;
    context.run({tenant_id:'school',is_authenticated:true,permissions:[]} as never,()=>assert.throws(()=>guard.canActivate(execution),/Permission-based/));
  }
  context.run({tenant_id:null} as never,()=>assert.throws(()=>new TenantBoundGuard(context).canActivate({} as never),/Tenant context/));
});
