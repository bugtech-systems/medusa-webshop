import LocalizedClientLink from "@/modules/common/components/localized-client-link"

const StoreBreadcrumbItem = ({
  title,
  handle,
}: {
  title: string
  handle?: string
}) => {
  return (
    <li className="text-neutral-500">
      <LocalizedClientLink
        className="hover:text-neutral-900"
        href={handle ? `${handle}` : "/store"}
      >
        {title}
      </LocalizedClientLink>
    </li>
  )
}

const StoreBreadcrumb = () => {
  return (
      <div className="overflow-hidden shadow-breadcrumb pt-[159px] sm:pt-[155px] lg:pt-[95px] xl:pt-[145px]">
      <div className="border-t border-gray-3">
        <div className="max-w-[1170px] w-full mx-auto px-4 sm:px-8 xl:px-0 py-5 xl:py-10">
    <ul className="flex items-center gap-x-3 text-sm">
      <StoreBreadcrumbItem title="Shop" key="base" />
      <span className="text-neutral-500">{">"}</span>
      <StoreBreadcrumbItem title="All products" handle="/store" />
    </ul>
    </div>
    </div>
    </div>
  )
}

export default StoreBreadcrumb
