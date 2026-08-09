"use client";

import { usePathname } from "next/navigation";
import { DesktopSidebar } from "./desktop-sidebar";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const publicLanding = pathname === "/";
  return <>{!publicLanding && <DesktopSidebar />}{children}</>;
}
