# Report Fonts

Liberation Sans Regular, Bold and Italic are embedded (subsetted) into the official
report-card PDFs. This prevents PDF viewers and printers from substituting fonts.

Source: `pdfjs-dist@6.4.299/standard_fonts`, copied without modification.
Redistribution and PDF embedding are covered by `LICENSE_LIBERATION`, included
alongside the font files. These assets are required in both API and reports-worker
runtime images; the root Dockerfile copies them explicitly.

The report uses the existing, unmodified MyShule mark from
`apps/web/public/brand/myshule-mark-512.png`, fitted with its aspect ratio preserved.
