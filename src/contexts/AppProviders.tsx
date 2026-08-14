import React, { PropsWithChildren } from "react";
import { AuthProvider } from "./AuthContext";
import { CatalogProvider } from "./CatalogContext";
import { LibraryProvider } from "./LibraryContext";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AuthProvider>
      <CatalogProvider>
        <LibraryProvider>{children}</LibraryProvider>
      </CatalogProvider>
    </AuthProvider>
  );
}
