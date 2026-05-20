import type { JsonLd } from "@/lib/seo/structured-data";

export function SeoJsonLd({ data }: { data: JsonLd | JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
