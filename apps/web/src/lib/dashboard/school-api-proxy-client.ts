import { getCsrfToken } from "@/lib/auth/csrf-client";

type ApiEnvelope<T> = {
  data: T;
  meta: Record<string, unknown>;
};

function isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "meta" in value
  );
}

export async function requestSchoolApiProxy<T>(
  path: string,
  options?: {
    unwrapEnvelope?: boolean;
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: BodyInit | object | null;
    onProgress?: (progress: Record<string,number|string>)=>void;
  },
): Promise<T> {
  const method = options?.method ?? "GET";
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;
  const hasBody = options?.body !== null && options?.body !== undefined;
  const requestBody =
    !hasBody
      ? undefined
      : isFormData
        ? (options.body as FormData)
        : JSON.stringify(options.body);
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (method !== "GET") {
    headers["x-myshule-csrf"] = await getCsrfToken();
  }

  if (hasBody && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`/api${path}`, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    ...(requestBody !== undefined ? { body: requestBody } : {}),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  const json = (await response.json()) as T | ApiEnvelope<T>;

  if (options?.unwrapEnvelope === false) {
    return json as T;
  }

  const data=isEnvelope<T>(json) ? json.data : (json as T);
  if (method==='POST' && /^\/exams\/report-cards\/(generate|regenerate|batches|generation-scope)$/.test(path)) {
    const job=data as { job_id?:string;state?:string;result?:T;progress?:Record<string,number|string>;message?:string };
    if (job.job_id) {
      let current=job;
      const started=Date.now();
      while (current.state!=='completed') {
        if (current.state==='failed') {
          if (current.result && typeof current.result==='object' && 'failed_students' in current.result) return current.result;
          throw new Error(current.message ?? 'Report generation failed. Retry to reuse completed reports.');
        }
        if (Date.now()-started>15*60*1000) throw new Error('Report generation is still running. It is saved and can be followed in Recent report tasks.');
        options?.onProgress?.({ ...current.progress,job_id:job.job_id });
        await new Promise(resolve=>setTimeout(resolve,Math.min(5000,1000+(Date.now()-started)/30)));
        current=await requestSchoolApiProxy(`/exams/report-cards/jobs/${job.job_id}`);
      }
      return current.result as T;
    }
  }
  return data;
}
