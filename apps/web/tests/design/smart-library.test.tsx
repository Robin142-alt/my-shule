import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { dateText, ScannerInput } from "@/components/library/smart-library-shared";
import { SmartCirculation, SmartBarcodeWorkspace, SmartBorrowerRecords, SmartScannerSettings } from "@/components/library/smart-library-workspaces";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { SmartCatalogue } from "@/components/library/smart-library-catalogue";
import { RenewLoan } from "@/components/library/smart-library-tools";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
jest.mock("@/lib/dashboard/api-client",()=>({requestDashboardApi:jest.fn()}));
jest.mock("@/components/providers/permission-context",()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock("@/lib/dashboard/export",()=>({downloadCsvFile:jest.fn(),openPrintDocument:jest.fn()}));
const request=jest.mocked(requestDashboardApi);
const borrower={subject_id:"student-1",borrower_type:"student",name:"Brian Otieno",identifier:"2451"};
const book=(code:string)=>({id:code,title:`Book ${code}`,barcode:code,status:"available"});
beforeEach(()=>{request.mockReset();localStorage.clear();});
it("keeps one title selected across rapid registrations and counts only saved copies",async()=>{
  request.mockImplementation(async(path,options)=>{
    if(String(path).includes("/catalogue?"))return [{id:"title-1",title:"Mathematics",total_copies:0,available_copies:0}];
    if(String(path).endsWith("/register")){const body=options?.body as Record<string,unknown>;return {id:body.barcode,catalog_item_id:"title-1",title:"Mathematics"};}
    if(String(path).endsWith("/classifications"))return {subjects:[],classes:[]};return [];
  });
  render(<SmartCatalogue registration/>);
  fireEvent.click(await screen.findByRole("button",{name:/Mathematics/}));
  const field=screen.getByLabelText("Scan a sticker to register");
  for(const code of ["000001","000002"]){fireEvent.change(field,{target:{value:code}});fireEvent.keyDown(field,{key:"Enter"});}
  await screen.findByText("2 registered this session");
  const calls=request.mock.calls.filter(([path])=>String(path).endsWith("/register"));
  expect(calls.map(([,options])=>(options?.body as Record<string,unknown>).barcode)).toEqual(["000001","000002"]);
  expect(calls.every(([,options])=>(options?.body as Record<string,unknown>).catalog_item_id==="title-1")).toBe(true);
});
it("saves a library-only subject and multiple classes without academic mutations",async()=>{
  request.mockImplementation(async(path,options)=>{
    if(String(path).endsWith("/classifications"))return {subjects:[{id:"s1",name:"Fiction",source:"library"}],classes:[{id:"c1",name:"Grade 9"},{id:"c2",name:"Grade 10"}]};
    if(String(path).endsWith("/subjects"))return {id:"s2",name:"Astronomy"};
    if(String(path).endsWith("/register"))return {id:"copy",catalog_item_id:"title",title:(options?.body as Record<string,unknown>).title};
    return [];
  });
  render(<SmartCatalogue registration/>);
  fireEvent.click(screen.getByRole("button",{name:"Create a new title"}));
  fireEvent.change(screen.getByLabelText("Book title"),{target:{value:"Sky stories"}});
  fireEvent.click(screen.getByText("Subjects & suitable classes (optional)"));
  fireEvent.click(await screen.findByLabelText("Fiction"));fireEvent.click(screen.getByLabelText("Grade 9"));fireEvent.click(screen.getByLabelText("Grade 10"));
  fireEvent.change(screen.getByLabelText("Find or add a subject"),{target:{value:"Astronomy"}});
  fireEvent.click(screen.getByRole("button",{name:"Add library-only subject"}));
  await screen.findByText("Library subject saved. Academic settings are unchanged.");
  const field=screen.getByLabelText("Scan a sticker to register");fireEvent.change(field,{target:{value:"000010"}});fireEvent.keyDown(field,{key:"Enter"});
  await screen.findByText("1 registered this session");
  const body=request.mock.calls.find(([path])=>String(path).endsWith("/register"))?.[1]?.body;
  expect(body).toMatchObject({title:"Sky stories",subject_ids:["s1","s2"],class_ids:["c1","c2"],barcode:"000010"});
  expect(request.mock.calls.every(([path])=>!String(path).includes("/academics"))).toBe(true);
});
it("renews an existing loan through the guarded command and refreshes its history",async()=>{
  request.mockResolvedValue({loan_id:"loan-1",due_on:"2099-12-31"});const refresh=jest.fn();
  render(<RenewLoan loan={{id:"loan-1",barcode:"000001",due_on:"2098-12-31",renewal_count:0}} onSaved={refresh}/>);
  fireEvent.click(screen.getByRole("button",{name:"Renew loan"}));fireEvent.change(screen.getByLabelText("New due date for 000001"),{target:{value:"2099-12-31"}});
  fireEvent.click(screen.getByRole("button",{name:"Confirm renewal"}));await waitFor(()=>expect(refresh).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledWith("/api/library/smart/renew",expect.objectContaining({method:"POST",body:expect.objectContaining({loan_id:"loan-1",due_on:"2099-12-31"})}));
});
it("shows issue and return dates in Nairobi while preserving date-only due dates",()=>{
  expect(dateText("2026-10-19T23:30:00.000Z")).toBe("2026-10-20");
  expect(dateText("2026-10-19")).toBe("2026-10-19");
  expect(dateText(null)).toBe("—");
});
it("consumes Enter only in its own field, preserves leading zeros and serializes continuous scans",async()=>{
  const processed:string[]=[];let finish:()=>void=()=>{};
  const handler=jest.fn(async(code:string)=>{processed.push(code);if(code==="000001")await new Promise<void>(r=>{finish=r;});});
  render(<><input aria-label="Unrelated notes"/><ScannerInput onScan={handler}/></>);
  fireEvent.keyDown(screen.getByLabelText("Unrelated notes"),{key:"Enter"});
  expect(handler).not.toHaveBeenCalled();
  const field=screen.getByLabelText("Scan barcode"),form=field.closest("form")!;
  fireEvent.change(field,{target:{value:"000001"}});fireEvent.submit(form);
  await waitFor(()=>expect(handler).toHaveBeenCalledTimes(1));
  fireEvent.change(field,{target:{value:"000001"}});fireEvent.submit(form);
  fireEvent.change(field,{target:{value:"000002"}});fireEvent.submit(form);
  expect(handler).toHaveBeenCalledTimes(1);finish();
  await waitFor(()=>expect(handler).toHaveBeenCalledTimes(2));
  expect(processed).toEqual(["000001","000002"]);
});
it("shows scanner focus, received characters and completion without writing library records",async()=>{
  render(<SmartScannerSettings/>);
  const field=screen.getByLabelText("Test your scanner");
  expect(field).toHaveFocus();
  expect(screen.getByText(/Ready for scanner input/)).toBeInTheDocument();
  expect(screen.getByText(/No completed tests yet/)).toBeInTheDocument();
  fireEvent.change(field,{target:{value:"000001"}});
  expect(screen.getByText(/6 characters received/)).toBeInTheDocument();
  fireEvent.keyDown(field,{key:"Enter"});
  expect(await screen.findByText(/Received exactly:/)).toHaveTextContent("000001");
  expect(screen.getByText(/Completed tests: 1/)).toHaveTextContent("Enter received");
  await waitFor(()=>expect(screen.queryByText(/scan\(s\) processing/)).not.toBeInTheDocument());
  fireEvent.change(field,{target:{value:"000001"}});
  fireEvent.click(screen.getByRole("button",{name:"Complete test"}));
  expect(await screen.findByText(/Completed tests: 2/)).toHaveTextContent("Completed with button");
  expect(request).not.toHaveBeenCalled();
});
it("makes a lost focus visible and restores it without submitting the barcode",async()=>{
  const handler=jest.fn(async()=>{});
  render(<><input aria-label="Unrelated notes"/><ScannerInput autoFocus onScan={handler}/></>);
  fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:"000001"}});
  act(()=>screen.getByLabelText("Unrelated notes").focus());
  expect(await screen.findByText(/Scanner input is not focused/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Focus scanner"}));
  expect(screen.getByLabelText("Scan barcode")).toHaveFocus();
  expect(handler).not.toHaveBeenCalled();
});
it("keeps continuous scanning operational when browser storage is blocked",async()=>{
  const get=jest.spyOn(Storage.prototype,"getItem").mockImplementation(()=>{throw new DOMException("Storage blocked","SecurityError");});
  const handler=jest.fn(async()=>{});
  try {
    render(<ScannerInput onScan={handler}/>);
    for(const code of ["000001","000002"]){
      fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:code}});
      fireEvent.click(screen.getByRole("button",{name:"Add scan"}));
    }
    await waitFor(()=>expect(handler).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  } finally {get.mockRestore();}
});
it("reports blocked settings storage and offers a non-mutating troubleshooting path",()=>{
  render(<SmartScannerSettings/>);
  const save=jest.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new DOMException("Storage blocked","SecurityError");});
  try {
    fireEvent.click(screen.getByRole("checkbox",{name:/Optional sound/}));
    expect(screen.getByRole("alert")).toHaveTextContent(/could not save/i);
    expect(screen.getByText(/Notepad/)).toBeInTheDocument();
    expect(screen.getByText(/cannot detect a connected keyboard-mode scanner/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Scanner completion key"),{target:{value:"tab"}});
    expect(screen.getByRole("alert")).toHaveTextContent(/could not save scanner settings/i);
    expect(screen.getByLabelText("Scanner completion key")).toHaveValue("enter");
    expect(request).not.toHaveBeenCalled();
  } finally {save.mockRestore();}
});
it("persists sound preferences and reports unavailable audio without claiming a device passed",async()=>{
  const {unmount}=render(<SmartScannerSettings/>);
  fireEvent.click(screen.getByRole("checkbox",{name:/Optional sound/}));
  expect(localStorage.getItem("myshule-library-scanner-sound")).toBe("true");
  unmount();render(<SmartScannerSettings/>);
  expect(screen.getByRole("checkbox",{name:/Optional sound/})).toBeChecked();
  fireEvent.click(screen.getByRole("button",{name:"Test sound"}));
  expect(await screen.findByText(/Sound is unavailable/)).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Test sound"})).toBeEnabled();
  expect(request).not.toHaveBeenCalled();
});
it("supports a saved Tab suffix across scanner desks without changing default keyboard navigation",async()=>{
  const handler=jest.fn(async()=>{});
  const first=render(<ScannerInput onScan={handler}/>);
  fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:"000001"}});
  fireEvent.keyDown(screen.getByLabelText("Scan barcode"),{key:"Tab"});
  expect(handler).not.toHaveBeenCalled();
  first.unmount();
  const settings=render(<SmartScannerSettings/>);
  fireEvent.change(screen.getByLabelText("Scanner completion key"),{target:{value:"tab"}});
  expect(localStorage.getItem("myshule-library-scanner-completion")).toBe("tab");
  fireEvent.change(screen.getByLabelText("Test your scanner"),{target:{value:"000001"}});
  fireEvent.keyDown(screen.getByLabelText("Test your scanner"),{key:"Tab"});
  expect(await screen.findByText(/Completed tests: 1/)).toHaveTextContent("Tab received");
  settings.unmount();
  render(<ScannerInput autoFocus onScan={handler}/>);
  fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:"000002"}});
  fireEvent.keyDown(screen.getByLabelText("Scan barcode"),{key:"Tab"});
  await waitFor(()=>expect(handler).toHaveBeenCalledWith("000002","tab"));
  expect(screen.getByLabelText("Scan barcode")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:"000003"}});
  fireEvent.keyDown(screen.getByLabelText("Scan barcode"),{key:"Tab",shiftKey:true});
  expect(handler).toHaveBeenCalledTimes(1);
  expect(request).not.toHaveBeenCalled();
});
it("keeps large barcode strings exact and accepts CR/LF endings without numeric conversion",async()=>{
  const handler=jest.fn(async()=>{});
  render(<ScannerInput onScan={handler}/>);
  const code="00009007199254740993";
  fireEvent.change(screen.getByLabelText("Scan barcode"),{target:{value:code+"\r\n"}});
  fireEvent.keyDown(screen.getByLabelText("Scan barcode"),{key:"Enter"});
  await waitFor(()=>expect(handler).toHaveBeenCalledWith(code,"enter"));
});
it("releases the sound-test button when the browser never resumes audio",async()=>{
  jest.useFakeTimers();
  const original=Object.getOwnPropertyDescriptor(window,"AudioContext");
  const context={state:"suspended",resume:jest.fn(()=>new Promise<void>(()=>{}))};
  Object.defineProperty(window,"AudioContext",{configurable:true,value:jest.fn(()=>context)});
  try {
    render(<SmartScannerSettings/>);
    fireEvent.click(screen.getByRole("button",{name:"Test sound"}));
    expect(screen.getByRole("button",{name:"Testing sound…"})).toBeDisabled();
    await act(async()=>{await jest.advanceTimersByTimeAsync(2000);});
    expect(screen.getByText(/Sound is unavailable/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Test sound"})).toBeEnabled();
  } finally {
    context.state="closed";
    if(original)Object.defineProperty(window,"AudioContext",original);else Reflect.deleteProperty(window,"AudioContext");
    jest.useRealTimers();
  }
});
it("keeps the selected borrower for multiple scans and submits one atomic issue command",async()=>{
  request.mockImplementation(async(path,options)=>{
    if(path.includes("/borrowers?"))return [borrower];
    if(path.includes("/history?"))return {outstanding:0,overdue:0,max_active_loans:5};
    if(path.includes("/scan?"))return book(new URL(`https://example.test${path}`).searchParams.get("barcode")!);
    if(path.endsWith("/issue"))return {transaction_id:"transaction-1",loans:[{id:"1"},{id:"2"}]};
    return {};
  });
  render(<SmartCirculation mode="issue"/>);
  fireEvent.click(await screen.findByRole("button",{name:/Brian Otieno/}));
  await waitFor(()=>expect(screen.getByLabelText("Scan a book")).toHaveFocus());
  for(const barcode of ["000001","000002"]){
    fireEvent.change(screen.getByLabelText("Scan a book"),{target:{value:barcode}});
    fireEvent.click(screen.getByRole("button",{name:"Add scan"}));
    await screen.findByText(`Book ${barcode}`);
  }
  await waitFor(()=>expect(screen.getByRole("button",{name:"Confirm issue of 2 book(s)"})).toBeEnabled());
  fireEvent.click(screen.getByRole("button",{name:"Confirm issue of 2 book(s)"}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/api/library/smart/issue",expect.objectContaining({
    method:"POST",body:expect.objectContaining({barcodes:["000001","000002"],subject_id:"student-1",borrower_type:"student",request_id:expect.any(String)}),
  })));
  expect(screen.getByText("Brian Otieno")).toBeInTheDocument();
});
it("returns only scanned books and retains the pending list on a server error",async()=>{
  request.mockImplementation(async(path)=>{
    if(path.includes("/scan?"))return {...book("000001"),loan:{borrower_name:"Brian Otieno",borrower_number:"2451",due_on:"2026-10-30"}};
    if(path.endsWith("/return"))throw new Error("Network unavailable; retry this return.");
    return {};
  });
  render(<SmartCirculation mode="return"/>);
  fireEvent.change(screen.getByLabelText("Scan a book"),{target:{value:"000001"}});
  fireEvent.click(screen.getByRole("button",{name:"Add scan"}));await screen.findByText("Book 000001");
  await waitFor(()=>expect(screen.getByRole("button",{name:"Confirm return of 1 book(s)"})).toBeEnabled());
  fireEvent.click(screen.getByRole("button",{name:"Confirm return of 1 book(s)"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable");
  expect(screen.getByText("Book 000001")).toBeInTheDocument();
  const first=(request.mock.calls.find(([path])=>path.endsWith("/return"))![1]!.body as Record<string,unknown>).request_id;
  await waitFor(()=>expect(screen.getByRole("button",{name:"Confirm return of 1 book(s)"})).toBeEnabled());
  fireEvent.click(screen.getByRole("button",{name:"Confirm return of 1 book(s)"}));
  await waitFor(()=>expect(request.mock.calls.filter(([path])=>path.endsWith("/return"))).toHaveLength(2));
  const next=(request.mock.calls.filter(([path])=>path.endsWith("/return"))[1][1]!.body as Record<string,unknown>).request_id;
  expect(next).toBe(first);
});
it("shows 1,000 labels as 11 sheets and offers an explicit calibration path",()=>{
  request.mockResolvedValue([]);
  render(<SmartBarcodeWorkspace/>);
  fireEvent.change(screen.getByLabelText("Custom quantity"),{target:{value:"1000"}});
  expect(screen.getByText(/11 sheet\(s\) · 56 empty positions/)).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"Print test sheet"})).toBeEnabled();
});
it("shows independent current and returned borrower records",async()=>{
  request.mockImplementation(async path=>{
    if(path.includes("/borrowers?"))return [borrower];
    return {outstanding:1,overdue:0,loans:[
      {id:"1",title:"Mathematics",barcode:"000001",borrower_name:"Brian Otieno",due_on:"2026-10-30"},
      {id:"2",title:"English",barcode:"000002",borrower_name:"Brian Otieno",returned_at:"2026-10-19",return_condition:"good"},
    ]};
  });
  render(<SmartBorrowerRecords/>);fireEvent.click(await screen.findByRole("button",{name:/Brian Otieno/}));
  expect(await screen.findByText("Currently borrowed")).toBeInTheDocument();
  expect(await screen.findByText("Returned 2026-10-19 (good)")).toBeInTheDocument();
});
it("allows direct navigation to every integrated librarian workspace",()=>{
  for(const section of ["barcode_print","barcodes","scan","scanner_settings","stocktake","issue","return","borrowers","catalogue","add_books"]){
    expect(isSchoolWorkspaceSection("librarian",section)).toBe(true);
  }
});
it("preserves the existing exact-recipient overdue reminder action",async()=>{
  request.mockImplementation(async path=>{
    if(path.includes("/loans?"))return [{id:"loan-1",title:"Mathematics",barcode:"000001",overdue:true,borrower_name:"Brian Otieno",due_on:"2026-10-01"}];
    return {recipientCount:1};
  });
  render(<SmartBorrowerRecords loansOnly/>);
  fireEvent.click(await screen.findByRole("button",{name:"Send overdue reminder"}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/api/admin-command/librarian/overdue-books/loan-1/remind",
    expect.objectContaining({method:"POST",body:expect.objectContaining({request_id:expect.any(String)})})));
  expect(await screen.findByText(/Overdue reminder queued for the exact active/)).toBeInTheDocument();
});
