"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface ProductSwitcherProps {
  products: Product[];
  currentProduct?: Product;
}

export function ProductSwitcher({ products, currentProduct }: ProductSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 px-3">
          {currentProduct ? (
            <>
              <div
                className="h-4 w-4 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: currentProduct.color ?? "#6366f1" }}
              >
                {currentProduct.icon ?? currentProduct.name[0]}
              </div>
              <span className="hidden sm:inline-block max-w-[100px] truncate">
                {currentProduct.name}
              </span>
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline-block">All Products</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Switch Product</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/community"
            className={cn(
              "flex items-center gap-2",
              !currentProduct && "font-medium"
            )}
            onClick={() => setOpen(false)}
          >
            <Package className="h-4 w-4" />
            All Products
            {!currentProduct && <Check className="ml-auto h-4 w-4" />}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {products.map((product) => (
          <DropdownMenuItem key={product.id} asChild>
            <Link
              href={`/community/${product.slug}`}
              className={cn(
                "flex items-center gap-2",
                currentProduct?.id === product.id && "font-medium"
              )}
              onClick={() => setOpen(false)}
            >
              <div
                className="h-4 w-4 rounded flex items-center justify-center text-xs text-white"
                style={{ backgroundColor: product.color ?? "#6366f1" }}
              >
                {product.icon ?? product.name[0]}
              </div>
              {product.name}
              {currentProduct?.id === product.id && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

