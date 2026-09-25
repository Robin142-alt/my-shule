import { fireEvent, screen, waitFor } from '@testing-library/react';
import { SignatureUploadButton } from '@/components/report-cards/signature-upload-button';
import { inspectSignatureUpload } from '@/lib/report-cards/signature-upload';
import { renderWithProviders } from './test-utils';

let dimensions = { width: 600, height: 200 };
let damaged = false;
const originalImage = global.Image;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
beforeEach(() => {
  dimensions = { width: 600, height: 200 };
  damaged = false;
  URL.createObjectURL = jest.fn(() => 'blob:signature');
  URL.revokeObjectURL = jest.fn();
  global.Image = class {
    naturalWidth = dimensions.width;
    naturalHeight = dimensions.height;
    onload?: () => void;
    onerror?: () => void;
    set src(_url: string) { queueMicrotask(() => damaged ? this.onerror?.() : this.onload?.()); }
  } as unknown as typeof Image;
});
afterEach(() => { global.Image = originalImage; URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; });
const file = () => new File(['image-bytes'], 'signature.png', { type: 'image/png' });

it.each([[299, 100], [400, 79], [1601, 400], [1300, 601], [400, 600], [399, 200], [1201, 200]])('rejects unsuitable %s × %s images and releases their preview URL', async (width, height) => {
  dimensions = { width, height };
  await expect(inspectSignatureUpload(file())).rejects.toThrow(/pixels|landscape/);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:signature');
});

it('rejects unsupported, oversized and damaged images', async () => {
  await expect(inspectSignatureUpload(new File(['x'], 'test.webp', { type: 'image/webp' }))).rejects.toThrow(/PNG or JPEG/);
  await expect(inspectSignatureUpload(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'test.png', { type: 'image/png' }))).rejects.toThrow(/2 MB/);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  damaged = true;
  await expect(inspectSignatureUpload(file())).rejects.toThrow(/damaged/);
});

it('shows requirements and a role-only preview before explicitly saving the selected file', async () => {
  const upload = jest.fn().mockResolvedValue(undefined);
  renderWithProviders(<SignatureUploadButton available label="Principal Signature" className="" onUpload={upload} />);
  fireEvent.click(screen.getByRole('button', { name: 'Replace signature' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('600 × 200');
  expect(screen.getByRole('dialog')).toHaveTextContent('Avoid shadows and ruled paper');
  expect(screen.getByRole('button', { name: 'Use signature' })).toBeDisabled();
  const selected = file();
  fireEvent.change(screen.getByLabelText('Choose signature image'), { target: { files: [selected] } });
  expect(await screen.findByAltText('Selected signature preview')).toHaveAttribute('src', 'blob:signature');
  expect(upload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Use signature' }));
  await waitFor(() => expect(upload).toHaveBeenCalledWith(selected));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:signature');
});

it('keeps the preview for retry after a server rejection and cancels without an upload', async () => {
  const upload = jest.fn().mockRejectedValue(new Error('Signature service unavailable'));
  renderWithProviders(<SignatureUploadButton available={false} label="Class Teacher Signature" className="" onUpload={upload} />);
  fireEvent.click(screen.getByRole('button', { name: 'Upload signature' }));
  fireEvent.change(screen.getByLabelText('Choose signature image'), { target: { files: [file()] } });
  await screen.findByAltText('Selected signature preview');
  fireEvent.click(screen.getByRole('button', { name: 'Use signature' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Signature service unavailable');
  expect(screen.getByRole('button', { name: 'Use signature' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(upload).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('keeps invalid image selection visible and blocks upload', async () => {
  const upload = jest.fn();
  dimensions = { width: 400, height: 600 };
  renderWithProviders(<SignatureUploadButton available={false} label="Class Teacher Signature" className="" onUpload={upload} />);
  fireEvent.click(screen.getByRole('button', { name: 'Upload signature' }));
  fireEvent.change(screen.getByLabelText('Choose signature image'), { target: { files: [file()] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('landscape');
  expect(screen.getByRole('button', { name: 'Use signature' })).toBeDisabled();
  expect(upload).not.toHaveBeenCalled();
});
