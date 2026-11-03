import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StaffConversation, StaffMessageComposer } from "@/components/common/notifications/staff-conversations";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

jest.mock("@/lib/data/school-tenant-scope",()=>({useOptionalSchoolTenantId:()=>"school-a"}));
jest.mock("@/lib/dashboard/api-client",()=>({requestDashboardApi:jest.fn()}));
const mockRefetch=jest.fn();
const messageId="11111111-1111-4111-8111-111111111111";
const threadId="22222222-2222-4222-8222-222222222222";
jest.mock("@/lib/data/school-hooks",()=>({useSchoolQuery:(path:string)=>({refetch:mockRefetch,data:path.includes("/recipients")?{items:[{id:"teacher-a",name:"Teacher A",roles:["teacher"]}]}:{
  id:threadId,subject:"Learning support",user_id:"teacher-a",participants:[{id:"principal",name:"Principal",roles:["principal"]},{id:"teacher-a",name:"Teacher A",roles:["teacher"]}],has_older:false,
  items:[{id:messageId,body:"Please review the lesson.",author_id:"principal",author_name:"Principal",created_at:"2026-11-03T08:00:00Z",read_at:null,delivered:1,read_count:0}]
}})}));
const request=jest.mocked(requestDashboardApi);

beforeEach(()=>{jest.clearAllMocks();request.mockResolvedValue({thread_id:threadId});});
test("staff opening a conversation acknowledges observed messages and can reply in the same thread",async()=>{
  render(<StaffConversation id={threadId} onBack={jest.fn()}/>);
  expect(screen.getByText("Please review the lesson.")).toBeVisible();
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/workflow/inbox/staff/conversations/"+threadId+"/read",expect.objectContaining({tenantId:"school-a",body:{message_ids:[messageId]}})));
  fireEvent.change(screen.getByLabelText("Reply to conversation"),{target:{value:"The lesson is ready."}});
  fireEvent.click(screen.getByRole("button",{name:"Send reply"}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith("/workflow/inbox/staff/messages",expect.objectContaining({tenantId:"school-a",body:expect.objectContaining({thread_id:threadId,message:"The lesson is ready.",request_id:expect.any(String)})})));
});
test("a failed send keeps the selected recipients and reuses its command reference on retry",async()=>{
  request.mockRejectedValueOnce(new Error("Temporary network failure")).mockResolvedValue({thread_id:threadId});
  const onSent=jest.fn();
  render(<StaffMessageComposer onClose={jest.fn()} onSent={onSent}/>);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Subject"),{target:{value:"Planning"}});
  fireEvent.change(screen.getByLabelText("Message"),{target:{value:"Please share the lesson plan."}});
  fireEvent.click(screen.getByRole("button",{name:"Send message"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Temporary network failure");
  fireEvent.click(screen.getByRole("button",{name:"Send message"}));
  await waitFor(()=>expect(onSent).toHaveBeenCalledWith(threadId));
  const first=request.mock.calls[0][1]!.body;
  const second=request.mock.calls[1][1]!.body;
  expect(second).toEqual(first);
  expect(first).toMatchObject({recipients:["teacher-a"],audience:"specific_staff"});
});
