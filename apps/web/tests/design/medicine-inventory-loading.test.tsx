import { fireEvent, render, screen } from "@testing-library/react";
import { MedicineInventoryWorkspace } from "@/components/school/nurse/medicine-inventory-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/components/school/nurse/api-client", () => ({ addMedicineStock: jest.fn(), adjustMedicineStock: jest.fn() }));

const query = jest.mocked(useSchoolQuery);

it("keeps the workspace actionable without reporting unavailable stock as empty", () => {
  const refetch = jest.fn();
  query.mockReturnValue({ data: undefined, isLoading: false, error: new Error("Service unavailable"), refetch } as never);
  render(<MedicineInventoryWorkspace />);
  expect(screen.getByRole("alert")).toHaveTextContent("Stock levels are unavailable");
  expect(screen.queryByText(/No medicine in stock/)).not.toBeInTheDocument();
  expect(screen.queryAllByText("0")).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Retry inventory" }));
  expect(refetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Add Medicine" }));
  expect(screen.getByText("Add New Medicine")).toBeInTheDocument();
});

it("shows truthful zero counts and an actionable empty state for a successful empty response", () => {
  query.mockReturnValue({ data: { metrics: { total_items: 0, low_stock: 0, expired: 0 }, medicines: [] }, isLoading: false, error: null, refetch: jest.fn() } as never);
  render(<MedicineInventoryWorkspace />);
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getAllByText("0")).toHaveLength(3);
  expect(screen.getByText(/No medicine in stock/)).toBeInTheDocument();
});
