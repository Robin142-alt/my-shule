import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { workspaceResource } from "@/components/shared/workspace-resource";

test("prefetched role code renders on its first commit without a loader", async () => {
  const loader = jest.fn(async () => function Workspace({ section }: { section: string }) {
    return <div>{section}</div>;
  });
  const Workspace = workspaceResource(loader);
  await Workspace.preload();
  const view = render(<Workspace section="students" />);
  expect(screen.getByText("students")).toBeInTheDocument();
  expect(screen.queryByRole("status")).toBeNull();
  view.rerender(<Workspace section="reports" />);
  expect(screen.getByText("reports")).toBeInTheDocument();
  expect(loader).toHaveBeenCalledTimes(1);
});

test("a cold resource keeps the same component mounted after its import resolves", async () => {
  let mounts = 0;
  function Content({ section }: { section: string }) {
    useEffect(() => { mounts++; }, []);
    return <div>{section}</div>;
  }
  const Workspace = workspaceResource(async () => Content);
  const view = render(<Workspace section="students" />);
  await act(async () => { await Workspace.preload(); });
  await waitFor(() => expect(screen.getByText("students")).toBeInTheDocument());
  view.rerender(<Workspace section="reports" />);
  expect(screen.getByText("reports")).toBeInTheDocument();
  expect(mounts).toBe(1);
});
