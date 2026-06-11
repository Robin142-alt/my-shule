import { Settings } from "lucide-react";
import { Panel } from "./shared-components";

export function MyProfileWorkspace() {
  return (
    <Panel title="My Profile" description="View and edit your personal employment profile and preferences." icon={Settings}>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] p-4">
          <h3 className="font-black text-[#071D49] mb-3">Personal Details</h3>
          <div className="space-y-2">
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">Name:</span> <strong>Mr. Kamau</strong></p>
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">Email:</span> <strong>kamau@myshule.com</strong></p>
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">Phone:</span> <strong>+254 700 000000</strong></p>
          </div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] p-4">
          <h3 className="font-black text-[#071D49] mb-3">Staff Details</h3>
          <div className="space-y-2">
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">Staff No:</span> <strong>T-0042</strong></p>
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">TSC No:</span> <strong>123456</strong></p>
            <p className="text-sm"><span className="text-[#64748B] w-24 inline-block">Roles:</span> <strong>Teacher</strong></p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Edit Contact Info</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Change Password</button>
      </div>
    </Panel>
  );
}
