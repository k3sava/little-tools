import { createContext, useContext } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const BreadcrumbContext = createContext<BreadcrumbItem[]>([]);
export const useBreadcrumb = () => useContext(BreadcrumbContext);
