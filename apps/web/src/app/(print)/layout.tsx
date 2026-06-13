import React from 'react';

export const metadata = {
  title: 'MyShule - Print Document',
};

export default function PrintLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    // We omit the typical sidebars and navbars here. 
    // This allows the page to be totally clean for printing.
    <div className="bg-gray-200 min-h-screen">
      {children}
    </div>
  );
}
