import React from "react";
import { useListProducts } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Products() {
  const { data, isLoading } = useListProducts();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1 text-sm">Product catalog and pricing.</p>
          </div>
          <Button className="bg-primary text-white"><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
        </div>

        <Card className="glass-panel border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Name / Code</th>
                  <th className="px-6 py-4 font-medium">Category</th>
                  <th className="px-6 py-4 font-medium text-right">Unit Price</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td></tr>
                ) : data?.data?.map(prod => (
                  <tr key={prod.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" /> {prod.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 ml-6">{prod.code || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{prod.category || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      ${prod.unitPrice.toLocaleString()} {prod.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={prod.isActive ? 'border-green-500/30 text-green-400' : 'border-white/10 text-muted-foreground'}>
                        {prod.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
