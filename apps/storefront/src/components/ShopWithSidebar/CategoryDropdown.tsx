"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  handle?: string;
  products?: any[];
  metadata?: Record<string, any>;
}

interface CategoryItemProps {
  category: Category;
  regionCode: string;
  isActive: boolean;
}

interface CategoryDropdownProps {
  categories: Category[];
}

const CategoryItem = ({ category, regionCode, isActive }: CategoryItemProps) => {
  // Function to create href with region prefix
  const createHref = (categoryId: string): string => {
    // Use handle if available for SEO-friendly URLs
    const slug = category.handle || categoryId;
    
    if (regionCode) {
      return `/${regionCode}/categories/${slug}`;
    }
    return `/categories/${slug}`;
  };

  return (
    <Link
      href={createHref(category.id)}
      className={`group flex items-center justify-between ease-out duration-200 hover:text-blue ${
        isActive 
          ? "text-blue font-medium before:absolute before:left-0 before:w-1 before:h-4 before:bg-blue before:rounded-r before:-ml-1 relative" 
          : "text-dark"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="text-sm text-left truncate max-w-[70%]">
        {category.name}
      </span>

      <span
        className={`inline-flex rounded-[30px] text-custom-xs px-2 min-w-[2rem] justify-center ease-out duration-200 ${
          isActive
            ? "text-white bg-blue shadow-sm"
            : "bg-gray-2 text-dark group-hover:text-white group-hover:bg-blue"
        }`}
      >
        {category.products?.length || 0}
      </span>
    </Link>
  );
};

const CategoryDropdown = ({ categories }: CategoryDropdownProps) => {
  const [toggleDropdown, setToggleDropdown] = useState<boolean>(true);
  const [mounted, setMounted] = useState<boolean>(false);
  const pathname = usePathname();
  const params = useParams();
  const regionCode = params?.region as string || "";
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Extract category identifier from URL path
  const extractCategoryIdentifierFromPath = (): string | null => {
    // Match patterns like: /au/categories/{id-or-handle}
    const match = pathname.match(/\/categories\/([^\/?#]+)/);
    return match ? match[1] : null;
  };
  
  // Check if a category is active by comparing ID or handle
  const isCategoryActive = (category: Category): boolean => {
    if (!mounted) return false;
    
    const activeIdentifier = extractCategoryIdentifierFromPath();
    if (!activeIdentifier) return false;
    
    // Check if activeIdentifier matches category ID or handle
    return activeIdentifier === category.id || 
           activeIdentifier === category.handle;
  };
  
  const activeCategoryId = extractCategoryIdentifierFromPath();
  
  // Create category map for quick lookup
  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category;
    if (category.handle) {
      acc[category.handle] = category;
    }
    return acc;
  }, {} as Record<string, Category>);
  
  // Get the active category object
  const activeCategory = activeCategoryId ? categoryMap[activeCategoryId] : null;

  return (
  <>

    <div className="bg-white shadow-1 rounded-lg sticky top-4">
      <div
        onClick={(e) => {
          e.preventDefault();
          setToggleDropdown(!toggleDropdown);
        }}
        className={`cursor-pointer flex items-center justify-between py-3 pl-5 pr-5.5 ${
          toggleDropdown && "shadow-filter"
        }`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setToggleDropdown(!toggleDropdown);
          }
        }}
      >
        <div className="flex items-center gap-2">
          <p className="text-dark font-medium">Categories</p>
          {activeCategory && (
            <span className="text-xs text-blue bg-blue/10 px-2 py-0.5 rounded">
              Active
            </span>
          )}
        </div>
        <button
          aria-label={toggleDropdown ? "Collapse categories" : "Expand categories"}
          aria-expanded={toggleDropdown}
          className={`text-dark ease-out duration-200 ${
            toggleDropdown && "rotate-180"
          }`}
        >
          <svg
            className="fill-current"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M4.43057 8.51192C4.70014 8.19743 5.17361 8.161 5.48811 8.43057L12 14.0122L18.5119 8.43057C18.8264 8.16101 19.2999 8.19743 19.5695 8.51192C19.839 8.82642 19.8026 9.29989 19.4881 9.56946L12.4881 15.5695C12.2072 15.8102 11.7928 15.8102 11.5119 15.5695L4.51192 9.56946C4.19743 9.29989 4.161 8.82641 4.43057 8.51192Z"
              fill=""
            />
          </svg>
        </button>
      </div>

      {/* dropdown menu */}
      <div
        className={`flex-col gap-3 py-6 pl-5 pr-5.5 ${
          toggleDropdown ? "flex" : "hidden"
        }`}
        role="menu"
        aria-label="Category filters"
      >
        {/* "All Categories" link */}
        <Link
          href={regionCode ? `/${regionCode}/shop` : "/shop"}
          className={`group flex items-center justify-between ease-out duration-200 hover:text-blue ${
            !activeCategoryId ? "text-blue font-medium" : "text-dark"
          }`}
          role="menuitem"
          aria-current={!activeCategoryId ? "page" : undefined}
        >
          <span className="text-sm text-left">All Categories</span>
          <span
            className={`inline-flex rounded-[30px] text-custom-xs px-2 min-w-[2rem] justify-center ease-out duration-200 ${
              !activeCategoryId
                ? "text-white bg-blue shadow-sm"
                : "bg-gray-2 text-dark group-hover:text-white group-hover:bg-blue"
            }`}
          >
            {categories.reduce((total, cat) => total + (cat.products?.length || 0), 0)}
          </span>
        </Link>

        {categories.map((category) => (
          <CategoryItem 
            key={category.id} 
            category={category} 
            regionCode={regionCode}
            isActive={isCategoryActive(category)}
          />
        ))}
      </div>
    </div>
  </>
    
  );
};

export default CategoryDropdown;