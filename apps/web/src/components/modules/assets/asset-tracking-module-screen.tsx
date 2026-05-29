"use client";

import { useState, type FormEvent } from "react";

import { Implementation100LiveModuleScreen, type Implementation100Dashboard } from "@/components/modules/shared/implementation100-live-module";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addSchoolRecord,
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
  type SchoolOperationalSeverity,
} from "@/lib/school/school-operational-store";

type IctAssetRecord = {
  id: string;
  tag: string;
  asset: string;
  category: "Computer" | "Laptop" | "Projector" | "Printer" | "Router" | "Tablet";
  serial: string;
  location: string;
  assignedTo: string;
  condition: "Working" | "Faulty" | "Under Repair" | "Missing";
  status: "Available" | "Issued" | "Returned" | "Repair Needed";
};

type LabBookingRecord = {
  id: string;
  teacher: string;
  className: string;
  room: string;
  time: string;
  status: "Requested" | "Approved" | "Completed";
};

const initialIctAssets: IctAssetRecord[] = [
  {
    id: "ict-pc-001",
    tag: "ICT-PC-001",
    asset: "Dell Lab Computer 01",
    category: "Computer",
    serial: "DL-7744-KBH",
    location: "Computer Lab 1",
    assignedTo: "ICT Lab",
    condition: "Working",
    status: "Available",
  },
  {
    id: "ict-proj-014",
    tag: "ICT-PRJ-014",
    asset: "Epson Projector",
    category: "Projector",
    serial: "EPS-2219-KE",
    location: "Staffroom",
    assignedTo: "Mr. Otieno",
    condition: "Faulty",
    status: "Repair Needed",
  },
  {
    id: "ict-router-002",
    tag: "ICT-RTR-002",
    asset: "Main Office Router",
    category: "Router",
    serial: "RTR-9901-KSM",
    location: "Admin block",
    assignedTo: "Office",
    condition: "Working",
    status: "Issued",
  },
];

const initialLabBookings: LabBookingRecord[] = [
  {
    id: "lab-booking-grade8",
    teacher: "Mrs. Achieng",
    className: "Grade 8 East",
    room: "Computer Lab 1",
    time: "Today 11:20",
    status: "Requested",
  },
  {
    id: "lab-booking-form2",
    teacher: "Mr. Mwangi",
    className: "Form 2 West",
    room: "Computer Lab 2",
    time: "Tomorrow 08:20",
    status: "Approved",
  },
];

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/50 focus:shadow-[var(--shadow-focus)]";

function runtimeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AssetTrackingModuleScreen({
  tenantSlug,
  initialDashboard,
}: {
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
}) {
  const [assets, setAssets] = useState<IctAssetRecord[]>(initialIctAssets);
  const [bookings, setBookings] = useState<LabBookingRecord[]>(initialLabBookings);
  const [message, setMessage] = useState("ICT desk ready. Register assets, issue devices, approve lab bookings, report faults, and print tags.");
  const [assetName, setAssetName] = useState("HP Laptop");
  const [assetTag, setAssetTag] = useState("ICT-LAP-021");
  const [category, setCategory] = useState<IctAssetRecord["category"]>("Laptop");
  const [serial, setSerial] = useState("HP-5522-KE");
  const [location, setLocation] = useState("Computer Lab 1");
  const [assignedTo, setAssignedTo] = useState("ICT Store");
  const [bookingTeacher, setBookingTeacher] = useState("Mr. Otieno");
  const [bookingClass, setBookingClass] = useState("Form 1 North");
  const [bookingRoom, setBookingRoom] = useState("Computer Lab 1");
  const [bookingTime, setBookingTime] = useState("Today 2:00 PM");
  const [assetSearch, setAssetSearch] = useState("");
  const schoolId = getCurrentSchoolId(tenantSlug);
  const faultyAssets = assets.filter((asset) => asset.condition === "Faulty" || asset.condition === "Under Repair" || asset.status === "Repair Needed");
  const issuedAssets = assets.filter((asset) => asset.status === "Issued");
  const availableAssets = assets.filter((asset) => asset.status === "Available");
  const pendingBookings = bookings.filter((booking) => booking.status === "Requested");
  const normalizedAssetSearch = assetSearch.trim().toLowerCase();
  const visibleAssets = normalizedAssetSearch
    ? assets.filter((asset) =>
      [asset.tag, asset.asset, asset.category, asset.serial, asset.location, asset.assignedTo, asset.condition, asset.status]
        .join(" ")
        .toLowerCase()
        .includes(normalizedAssetSearch),
    )
    : assets;

  function publishAssetEvent({
    type,
    title,
    body,
    entityId,
    severity = "info",
    payload,
    audienceRoles = ["ict", "principal"],
  }: {
    type: string;
    title: string;
    body: string;
    entityId?: string;
    severity?: SchoolOperationalSeverity;
    payload?: Record<string, unknown>;
    audienceRoles?: string[];
  }) {
    publishSchoolOperationalEvent({
      schoolId,
      actorRole: "ict",
      type,
      module: "assets",
      title,
      body,
      entityId,
      severity,
      payload,
      notifications: [
        {
          audienceRoles,
          title,
          body,
          severity,
        },
      ],
    });
  }

  function addAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const record: IctAssetRecord = {
      id: runtimeId("ict-asset"),
      tag: assetTag,
      asset: assetName,
      category,
      serial,
      location,
      assignedTo,
      condition: "Working",
      status: "Available",
    };

    setAssets((currentAssets) => [record, ...currentAssets]);
    addSchoolRecord("ict-assets", record, schoolId);
    publishAssetEvent({
      type: "ICT_ASSET_REGISTERED",
      title: `${assetName} registered`,
      body: `${assetTag} registered in ${location} for ${assignedTo}.`,
      entityId: record.id,
      severity: "success",
      payload: { asset: record },
      audienceRoles: ["ict", "storekeeper", "principal"],
    });
    setMessage(`${assetName} registered with asset tag ${assetTag}.`);
  }

  function issueAsset(id: string) {
    const asset = assets.find((item) => item.id === id);

    setAssets((currentAssets) => currentAssets.map((item) => item.id === id ? { ...item, status: "Issued", assignedTo: item.assignedTo || "ICT user" } : item));
    addSchoolRecord(
      "asset-movements",
      {
        id: runtimeId("asset-movement"),
        assetId: id,
        asset: asset?.asset ?? "Asset",
        action: "Issued",
        assignedTo: asset?.assignedTo || "ICT user",
        location: asset?.location ?? "ICT store",
        createdAt: new Date().toISOString(),
      },
      schoolId,
    );
    publishAssetEvent({
      type: "ICT_ASSET_ISSUED",
      title: `${asset?.asset ?? "Asset"} issued`,
      body: `${asset?.tag ?? "Asset"} issued to ${asset?.assignedTo || "ICT user"}.`,
      entityId: id,
      severity: "warning",
      payload: { asset },
      audienceRoles: ["ict", "storekeeper", "principal"],
    });
    setMessage(`${asset?.asset ?? "Asset"} issued and movement history updated.`);
  }

  function returnAsset(id: string) {
    const asset = assets.find((item) => item.id === id);

    setAssets((currentAssets) => currentAssets.map((item) => item.id === id ? { ...item, status: "Returned", assignedTo: "ICT Store", location: "ICT Store" } : item));
    addSchoolRecord(
      "asset-movements",
      {
        id: runtimeId("asset-movement"),
        assetId: id,
        asset: asset?.asset ?? "Asset",
        action: "Returned",
        assignedTo: "ICT Store",
        location: "ICT Store",
        createdAt: new Date().toISOString(),
      },
      schoolId,
    );
    publishAssetEvent({
      type: "ICT_ASSET_RETURNED",
      title: `${asset?.asset ?? "Asset"} returned`,
      body: `${asset?.tag ?? "Asset"} returned to ICT store.`,
      entityId: id,
      severity: "success",
      payload: { asset },
      audienceRoles: ["ict", "storekeeper"],
    });
    setMessage(`${asset?.asset ?? "Asset"} returned to ICT store.`);
  }

  function reportFault(id: string) {
    const asset = assets.find((item) => item.id === id);

    setAssets((currentAssets) => currentAssets.map((item) => item.id === id ? { ...item, condition: "Under Repair", status: "Repair Needed" } : item));
    addSchoolRecord(
      "asset-repairs",
      {
        id: runtimeId("asset-repair"),
        assetId: id,
        asset: asset?.asset ?? "Asset",
        status: "Repair Needed",
        note: "Fault reported from ICT asset desk.",
        createdAt: new Date().toISOString(),
      },
      schoolId,
    );
    publishAssetEvent({
      type: "ICT_ASSET_FAULT_REPORTED",
      title: `${asset?.asset ?? "Asset"} fault reported`,
      body: `${asset?.tag ?? "Asset"} moved to repair-needed status.`,
      entityId: id,
      severity: "critical",
      payload: { asset },
      audienceRoles: ["ict", "principal", "system-monitor"],
    });
    setMessage(`${asset?.asset ?? "Asset"} fault reported and repair history updated.`);
  }

  function markRepaired(id: string) {
    const asset = assets.find((item) => item.id === id);

    setAssets((currentAssets) => currentAssets.map((item) => item.id === id ? { ...item, condition: "Working", status: "Available" } : item));
    publishAssetEvent({
      type: "ICT_ASSET_REPAIRED",
      title: `${asset?.asset ?? "Asset"} repaired`,
      body: `${asset?.tag ?? "Asset"} marked working and available.`,
      entityId: id,
      severity: "success",
      payload: { asset },
      audienceRoles: ["ict", "principal"],
    });
    setMessage(`${asset?.asset ?? "Asset"} marked repaired and available.`);
  }

  function addLabBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const booking: LabBookingRecord = {
      id: runtimeId("lab-booking"),
      teacher: bookingTeacher,
      className: bookingClass,
      room: bookingRoom,
      time: bookingTime,
      status: "Requested",
    };

    setBookings((currentBookings) => [booking, ...currentBookings]);
    addSchoolRecord("lab-bookings", booking, schoolId);
    publishAssetEvent({
      type: "ICT_LAB_BOOKING_REQUESTED",
      title: `${booking.className} lab booking requested`,
      body: `${booking.teacher} requested ${booking.room} at ${booking.time}.`,
      entityId: booking.id,
      severity: "warning",
      payload: { booking },
      audienceRoles: ["ict", "teacher"],
    });
    setMessage(`${bookingClass} computer lab booking saved for ${bookingTime}.`);
  }

  function approveLabBooking(id: string) {
    const booking = bookings.find((item) => item.id === id);

    setBookings((currentBookings) => currentBookings.map((item) => item.id === id ? { ...item, status: "Approved" } : item));
    publishAssetEvent({
      type: "ICT_LAB_BOOKING_APPROVED",
      title: `${booking?.className ?? "Class"} lab booking approved`,
      body: `${booking?.room ?? "Computer lab"} booking approved for ${booking?.time ?? "scheduled time"}.`,
      entityId: id,
      severity: "success",
      payload: { booking },
      audienceRoles: ["ict", "teacher", "principal"],
    });
    setMessage(`${booking?.className ?? "Class"} lab booking approved and teacher notified.`);
  }

  function printAssetTags() {
    publishAssetEvent({
      type: "ICT_ASSET_TAGS_PRINTED",
      title: "ICT asset tag sheet opened for printing",
      body: `${visibleAssets.length} visible ICT asset tag(s) prepared for printing.`,
      severity: "success",
      payload: { visibleAssetTags: visibleAssets.map((asset) => asset.tag) },
      audienceRoles: ["ict", "storekeeper"],
    });
    setMessage("ICT asset tag sheet opened for printing.");
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <div className="space-y-6">
      <Implementation100LiveModuleScreen
        apiBase="/api/assets"
        moduleTitle="Asset tracking"
        entityLabel="Asset record"
        tenantSlug={tenantSlug}
        initialDashboard={initialDashboard}
        categories={["asset", "assignment", "repair", "depreciation"]}
      />

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">ICT and computer lab desk</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground">ICT computer lab and asset desk</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Track computers, laptops, projectors, printers, routers, lab bookings, repairs, and device movement for Kisumu Boys High School.
        </p>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Available Devices", value: availableAssets.length, tone: "ok" as const },
          { label: "Issued Devices", value: issuedAssets.length, tone: "warning" as const },
          { label: "Repair Needed", value: faultyAssets.length, tone: faultyAssets.length > 0 ? "critical" as const : "ok" as const },
          { label: "Lab Bookings", value: bookings.length, tone: "warning" as const },
          { label: "Pending Bookings", value: pendingBookings.length, tone: pendingBookings.length > 0 ? "warning" as const : "ok" as const },
        ].map((item) => (
          <Card key={item.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</p>
              <StatusPill label={item.tone === "ok" ? "OK" : item.tone === "critical" ? "Urgent" : "Check"} tone={item.tone} />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
          </Card>
        ))}
      </section>

      <Card className="p-4">
        <p role="status" className="text-sm font-semibold text-foreground">{message}</p>
      </Card>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">ICT asset register</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">Computers, projectors, printers, routers, and laptops</h3>
              <p className="mt-1 text-sm leading-6 text-muted">Issue, return, repair, and trace every high-value digital asset.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <label className="min-w-[220px] flex-1 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Search ICT assets</span>
                <input
                  aria-label="Search ICT assets"
                  className={fieldClassName}
                  placeholder="Search tag, serial, device, location"
                  value={assetSearch}
                  onChange={(event) => setAssetSearch(event.currentTarget.value)}
                />
              </label>
              <div className="flex items-end">
                <Button variant="secondary" onClick={printAssetTags}>Print Asset Tags</Button>
              </div>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                <tr>
                  {["Asset Tag", "Asset", "Serial", "Location", "Assigned To", "Condition", "Status", "Action"].map((column) => (
                    <th key={column} className="px-3 py-3">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {visibleAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm font-medium text-muted">
                      No ICT assets match this search.
                    </td>
                  </tr>
                ) : visibleAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td className="px-3 py-3 font-semibold text-foreground">{asset.tag}</td>
                    <td className="px-3 py-3 text-muted">{asset.asset}<span className="block text-xs">{asset.category}</span></td>
                    <td className="px-3 py-3 text-muted">{asset.serial}</td>
                    <td className="px-3 py-3 text-muted">{asset.location}</td>
                    <td className="px-3 py-3 text-muted">{asset.assignedTo}</td>
                    <td className="px-3 py-3"><StatusPill label={asset.condition} tone={asset.condition === "Working" ? "ok" : asset.condition === "Missing" ? "critical" : "warning"} /></td>
                    <td className="px-3 py-3"><StatusPill label={asset.status} tone={asset.status === "Available" || asset.status === "Returned" ? "ok" : asset.status === "Repair Needed" ? "critical" : "warning"} /></td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => issueAsset(asset.id)}>Issue</Button>
                        <Button size="sm" variant="ghost" onClick={() => returnAsset(asset.id)}>Return</Button>
                        <Button size="sm" variant="ghost" onClick={() => reportFault(asset.id)}>Report Fault</Button>
                        <Button size="sm" variant="ghost" onClick={() => markRepaired(asset.id)}>Mark Repaired</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-base font-semibold text-foreground">Add ICT asset</h3>
            <form className="mt-4 space-y-3" onSubmit={addAsset}>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Asset name</span>
                <input className={fieldClassName} value={assetName} onChange={(event) => setAssetName(event.currentTarget.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Asset tag</span>
                <input className={fieldClassName} value={assetTag} onChange={(event) => setAssetTag(event.currentTarget.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Category</span>
                <select className={fieldClassName} value={category} onChange={(event) => setCategory(event.currentTarget.value as IctAssetRecord["category"])}>
                  <option>Computer</option>
                  <option>Laptop</option>
                  <option>Projector</option>
                  <option>Printer</option>
                  <option>Router</option>
                  <option>Tablet</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Serial number</span>
                <input className={fieldClassName} value={serial} onChange={(event) => setSerial(event.currentTarget.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Location</span>
                <input className={fieldClassName} value={location} onChange={(event) => setLocation(event.currentTarget.value)} required />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Assigned staff or department</span>
                <input className={fieldClassName} value={assignedTo} onChange={(event) => setAssignedTo(event.currentTarget.value)} required />
              </label>
              <Button type="submit">Add Asset</Button>
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold text-foreground">Computer lab bookings</h3>
            <form className="mt-4 space-y-3" onSubmit={addLabBooking}>
              <input className={fieldClassName} aria-label="ICT booking teacher" value={bookingTeacher} onChange={(event) => setBookingTeacher(event.currentTarget.value)} required />
              <input className={fieldClassName} aria-label="ICT booking class" value={bookingClass} onChange={(event) => setBookingClass(event.currentTarget.value)} required />
              <input className={fieldClassName} aria-label="ICT booking room" value={bookingRoom} onChange={(event) => setBookingRoom(event.currentTarget.value)} required />
              <input className={fieldClassName} aria-label="ICT booking time" value={bookingTime} onChange={(event) => setBookingTime(event.currentTarget.value)} required />
              <Button type="submit" variant="secondary">Add Lab Booking</Button>
            </form>
            <div className="mt-4 space-y-2">
              {bookings.map((booking) => (
                <div key={booking.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{booking.className}</p>
                      <p className="mt-1 text-xs text-muted">{booking.teacher} - {booking.room} - {booking.time}</p>
                    </div>
                    <StatusPill label={booking.status} tone={booking.status === "Approved" || booking.status === "Completed" ? "ok" : "warning"} />
                  </div>
                  <Button className="mt-2" size="sm" variant="ghost" onClick={() => approveLabBooking(booking.id)}>
                    Approve Lab Booking
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
