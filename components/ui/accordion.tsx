"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccordionItem = {
  title: string;
  content: string;
};

export function Accordion({ items }: { items: AccordionItem[] }) {
  const [openItem, setOpenItem] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => {
        const isOpen = openItem === idx;

        return (
          <div key={item.title} className="rounded-lg border border-slate-800 bg-[#101826]">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-slate-100"
              onClick={() => setOpenItem(isOpen ? null : idx)}
              aria-expanded={isOpen}
            >
              <span className="font-medium">{item.title}</span>
              <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen ? <p className="border-t border-slate-800 px-4 py-3 text-sm text-slate-300">{item.content}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
