const SERVICE_WORKER_URL = "/service-worker.js";

type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, "register">;
type WindowLike = Pick<Window, "addEventListener" | "removeEventListener">;
type DocumentLike = Pick<Document, "readyState">;

type RegistrationSchedulerOptions = {
  documentObject?: DocumentLike | null;
  onError?: (error: unknown) => void;
  serviceWorkerContainer?: ServiceWorkerContainerLike | null;
  windowObject?: WindowLike | null;
};

function defaultRegistrationErrorHandler(error: unknown) {
  console.warn("MyShule service worker registration failed.", error);
}

function resolveRegistrationEnvironment() {
  const windowObject = typeof window === "undefined" ? null : window;
  const documentObject = typeof document === "undefined" ? null : document;
  const serviceWorkerContainer =
    typeof navigator === "undefined" || !("serviceWorker" in navigator)
      ? null
      : navigator.serviceWorker;

  return {
    windowObject,
    documentObject,
    serviceWorkerContainer,
  };
}

export async function registerMyShuleServiceWorker(
  serviceWorkerContainer: ServiceWorkerContainerLike,
) {
  return serviceWorkerContainer.register(SERVICE_WORKER_URL, {
    scope: "/",
    updateViaCache: "none",
  });
}

export function scheduleMyShuleServiceWorkerRegistration(
  options: RegistrationSchedulerOptions = {},
) {
  const environment = resolveRegistrationEnvironment();
  const windowObject = options.windowObject ?? environment.windowObject;
  const documentObject = options.documentObject ?? environment.documentObject;
  const serviceWorkerContainer =
    options.serviceWorkerContainer ?? environment.serviceWorkerContainer;
  const onError = options.onError ?? defaultRegistrationErrorHandler;

  if (!windowObject || !documentObject || !serviceWorkerContainer) {
    return () => undefined;
  }

  let disposed = false;
  const register = () => {
    if (disposed) {
      return;
    }

    void registerMyShuleServiceWorker(serviceWorkerContainer).catch(onError);
  };

  if (documentObject.readyState === "complete") {
    register();
  } else {
    windowObject.addEventListener("load", register, { once: true });
  }

  return () => {
    disposed = true;
    windowObject.removeEventListener("load", register);
  };
}
