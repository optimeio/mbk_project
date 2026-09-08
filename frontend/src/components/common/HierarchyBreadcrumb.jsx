"use client";

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";


const HierarchyBreadcrumb = ({ items = [] }) => {
  if (!items.length) return null;

  const renderCrumb = (item) => {
    const content = item.value || item.label;

    if (item.to) {
      return (
        <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 font-medium text-slate-700 hover:text-blue-700">
          <Link href={item.to}>{content}</Link>
        </Button>
      );
    }

    if (item.onClick) {
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={item.onClick}
          className="h-auto px-2 py-1 font-medium text-slate-700 hover:text-blue-700"
        >
          {content}
        </Button>
      );
    }

    return <span className="px-2 py-1 font-medium text-slate-700">{content}</span>;
  };

  return (
    <Card className="mb-4 border-slate-200 shadow-sm">
      <CardContent className="px-3 py-2">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-center gap-1">
                {renderCrumb(item)}
                {index < items.length - 1 ? (
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                ) : null}
              </li>
            ))}
          </ol>
        </nav>
      </CardContent>
    </Card>
  );
};

export default HierarchyBreadcrumb;
