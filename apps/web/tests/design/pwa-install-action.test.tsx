import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { PwaInstallAction } from "@/components/pwa/pwa-install-action";
import { InstalledPublicSiteRedirect } from "@/components/pwa/installed-public-site-redirect";
import { isInstalledPwa, isIosDevice } from "@/lib/pwa/installed-mode";
import { routerReplaceMock } from "./router-mock";

jest.mock("@/lib/pwa/installed-mode", () => ({
  isInstalledPwa: jest.fn(),
  isIosDevice: jest.fn(),
}));

const isInstalledPwaMock = jest.mocked(isInstalledPwa);
const isIosDeviceMock = jest.mocked(isIosDevice);

describe("MyShule installation experience", () => {
  beforeEach(() => {
    isInstalledPwaMock.mockReset();
    isIosDeviceMock.mockReset();
    isInstalledPwaMock.mockReturnValue(false);
    isIosDeviceMock.mockReturnValue(false);
  });

  it("offers the native prompt only after the browser exposes installability", async () => {
    const prompt = jest.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({
      outcome: "dismissed",
      platform: "web",
    });
    render(<PwaInstallAction />);

    expect(
      screen.queryByRole("button", { name: /Install MyShule/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      window.dispatchEvent(
        Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
          prompt,
          userChoice,
        }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: /Install MyShule/i }));
    await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Install MyShule/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it("shows user-requested Add to Home Screen guidance on iPhone and iPad", async () => {
    isIosDeviceMock.mockReturnValue(true);
    render(<PwaInstallAction />);

    fireEvent.click(
      await screen.findByRole("button", { name: /Install MyShule/i }),
    );

    expect(
      screen.getByRole("dialog", { name: "Add MyShule to your Home Screen" }),
    ).toBeVisible();
    expect(screen.getByText("Add to Home Screen")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Close install instructions" }),
    ).toHaveClass("h-11", "w-11");
  });

  it("does not offer installation from an already installed app", () => {
    isInstalledPwaMock.mockReturnValue(true);
    isIosDeviceMock.mockReturnValue(true);

    render(<PwaInstallAction />);

    expect(
      screen.queryByRole("button", { name: /Install MyShule/i }),
    ).not.toBeInTheDocument();
  });

  it("recovers legacy installed launches that still open a public page", async () => {
    isInstalledPwaMock.mockReturnValue(true);

    render(<InstalledPublicSiteRedirect />);

    await waitFor(() => expect(routerReplaceMock).toHaveBeenCalledWith("/app"));
    expect(screen.getByTestId("installed-public-site-redirect")).toHaveClass(
      "is-visible",
    );
  });

  it("allows an installed user to continue into a login selected from the app chooser", () => {
    isInstalledPwaMock.mockReturnValue(true);

    render(<InstalledPublicSiteRedirect disabled />);

    expect(
      screen.queryByTestId("installed-public-site-redirect"),
    ).not.toBeInTheDocument();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });
});
