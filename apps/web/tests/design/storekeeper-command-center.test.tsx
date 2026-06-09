import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StorekeeperCommandCenter } from "@/components/school/storekeeper-command-center";
import { readSchoolData, type SchoolOperationalEvent } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("StorekeeperCommandCenter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("myshule.currentSchoolId", "kb-high");
  });

  it("makes storekeeper search and inventory controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<StorekeeperCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search items, suppliers, requisition ids, grns, or departments/i), "Rice");
    await user.click(screen.getByRole("button", { name: /rice stock/i }));

    expect(screen.getByText(/rice stock focused in store records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /create purchase order/i }));
    expect(screen.getByText(/create purchase order drafted for rice stock may run out/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /bulk approve safe items/i }));
    expect(screen.getByText(/safe requisition bulk approval review ready/i)).toBeVisible();
  });

  it("records purchase order and requisition decisions as school-scoped operational events", async () => {
    const user = userEvent.setup();

    renderWithProviders(<StorekeeperCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /create purchase order/i }));

    expect(readSchoolData("purchaseOrders")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          item: "Rice stock may run out in 5 days",
          status: "Drafted",
        }),
      ]),
    );

    let events = readSchoolData<SchoolOperationalEvent>("events");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "STORE_PURCHASE_ORDER_DRAFTED",
          module: "inventory",
          actorRole: "storekeeper",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /^approve$/i })[0]);

    events = readSchoolData<SchoolOperationalEvent>("events");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "STORE_REQUISITION_APPROVED",
          entityId: "REQ-1048",
          payload: expect.objectContaining({
            department: "Kitchen",
            item: "Rice 90 kg bags",
          }),
        }),
      ]),
    );

    expect(readSchoolData("inventoryMovements")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          requisitionId: "REQ-1048",
          movementType: "Issue approved",
          department: "Kitchen",
        }),
      ]),
    );
  });
});
