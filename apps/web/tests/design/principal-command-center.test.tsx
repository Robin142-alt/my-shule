import { render, screen } from "@testing-library/react";
import { PrincipalCommandCenter } from "@/components/school/principal-command-center";

describe("principal command center", () => {
  it("renders the overview workspace by default", () => {
    render(<PrincipalCommandCenter />);
    
    expect(screen.getByText("Principal Command")).toBeInTheDocument();
    expect(screen.getByText("School Operations")).toBeInTheDocument();
    expect(screen.getByText("Principal Dashboard")).toBeInTheDocument();
  });
});
