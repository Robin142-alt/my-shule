import Image from "next/image";

const MYSHULE_MARK_SRC = "/brand/myshule-mark-512.png";

export function MyShuleMark({
  size = 40,
  className = "",
  preload = false,
  label,
}: {
  size?: number;
  className?: string;
  preload?: boolean;
  label?: string;
}) {
  return (
    <span
      data-myshule-brand-mark="true"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : "true"}
      className={`inline-flex shrink-0 overflow-hidden rounded-[28%] bg-white shadow-sm ring-1 ring-slate-900/8 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={MYSHULE_MARK_SRC}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        preload={preload}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

export function MyShuleBrand({
  markSize = 40,
  tone = "light",
  className = "",
  nameClassName = "",
  preload = false,
}: {
  markSize?: number;
  tone?: "light" | "brand";
  className?: string;
  nameClassName?: string;
  preload?: boolean;
}) {
  return (
    <span
      data-myshule-brand="true"
      className={`inline-flex items-center gap-3 ${className}`}
    >
      <MyShuleMark size={markSize} preload={preload} />
      <span
        className={`whitespace-nowrap text-lg font-extrabold tracking-[-0.02em] ${
          tone === "light" ? "text-white" : "text-[#071D49]"
        } ${nameClassName}`}
      >
        My<span className="text-[#F4B000]">Shule</span>
      </span>
    </span>
  );
}

export { MYSHULE_MARK_SRC };
