interface PageHeadingProps {
  eyebrow: string
  title: string
  description?: string
}

export function PageHeading({ eyebrow, title, description }: PageHeadingProps) {
  return (
    <div className="space-y-2">
      <p className="eyebrow-label">{eyebrow}</p>
      <h1
        className="text-[1.6rem] font-bold leading-tight tracking-[-0.03em] text-white md:text-[2rem] xl:text-[2.4rem]"
        style={{ fontFamily: "Syne, sans-serif" }}
      >
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-sm leading-7 text-[#7A8099] md:text-[15px]">
          {description}
        </p>
      )}
    </div>
  )
}
