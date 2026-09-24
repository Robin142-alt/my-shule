import { requestSchoolApiProxy } from '@/lib/dashboard/school-api-proxy-client';

export interface ReportDeliveryJob {
  state: string;
  job_id?: string;
  download_url?: string;
  message?: string;
  progress?: { rendered?: number };
}
export async function awaitReportDelivery(
  initial: ReportDeliveryJob,
  onProgress: (job: ReportDeliveryJob) => void,
) {
  let job = initial;
  const started = Date.now();
  while (!job.download_url) {
    if (job.state === 'failed')
      throw new Error(
        job.message ?? 'Report preparation failed. Preview and retry.',
      );
    if (!job.job_id)
      throw new Error('The report task reference is missing. Retry.');
    if (Date.now() - started > 15 * 60 * 1000)
      throw new Error(
        'Your report is still being prepared. Follow it in Recent report tasks.',
      );
    onProgress(job);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(5000, 1000 + (Date.now() - started) / 30)),
    );
    job = await requestSchoolApiProxy(`/exams/report-cards/jobs/${job.job_id}`);
  }
  return job.download_url;
}
export function reportDeliveryUrl(value: string) {
  if (value.startsWith('/exams/report-cards/')) return `/api${value}`;
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    !url.hostname.endsWith('.r2.cloudflarestorage.com')
  )
    throw new Error('Invalid report download destination');
  return url.toString();
}
export function openReportDelivery(
  value: string,
  printWindow: Window | null,
  filename = 'report-cards.pdf',
) {
  const url = reportDeliveryUrl(value);
  if (printWindow) {
    printWindow.opener = null;
    printWindow.location.href = url;
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noreferrer noopener';
  link.referrerPolicy = 'no-referrer';
  // R2 sends Content-Disposition; navigation avoids buffering a school PDF in JS.
  // Use the existing tab if a preview window was unavailable. Creating a new
  // window after asynchronous polling is commonly blocked by browsers.
  link.target = '_self';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
