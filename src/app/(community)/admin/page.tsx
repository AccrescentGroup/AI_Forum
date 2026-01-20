import { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession, canAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Package,
  FolderOpen,
  Tag,
  Users,
  Plus,
  Edit,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Admin",
  description: "Admin dashboard",
};

async function getProducts() {
  return db.product.findMany({
    orderBy: { ordering: "asc" },
    include: {
      _count: { select: { topics: true, categories: true } },
    },
  });
}

async function getCategories() {
  return db.category.findMany({
    orderBy: { ordering: "asc" },
    include: {
      product: { select: { name: true, slug: true } },
      _count: { select: { topics: true } },
    },
  });
}

async function getTags() {
  return db.tag.findMany({
    orderBy: { usageCount: "desc" },
    take: 50,
  });
}

async function getUserStats() {
  const [total, admins, mods, trusted] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "MODERATOR" } }),
    db.user.count({ where: { role: "TRUSTED" } }),
  ]);
  return { total, admins, mods, trusted };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const session = await getSession();

  if (!session?.user?.id || !canAdmin(session.user.role)) {
    redirect("/community");
  }

  const tab = searchParams.tab ?? "products";
  const [products, categories, tags, userStats] = await Promise.all([
    getProducts(),
    getCategories(),
    getTags(),
    getUserStats(),
  ]);

  const statusColors = {
    ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    BETA: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    HIDDEN: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage products, categories, and users</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tags</p>
                <p className="text-2xl font-bold">{tags.length}</p>
              </div>
              <Tag className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">{userStats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={tab}>
        <TabsList className="mb-6">
          <TabsTrigger value="products" asChild>
            <Link href="/admin?tab=products">
              <Package className="h-4 w-4 mr-2" />
              Products
            </Link>
          </TabsTrigger>
          <TabsTrigger value="categories" asChild>
            <Link href="/admin?tab=categories">
              <FolderOpen className="h-4 w-4 mr-2" />
              Categories
            </Link>
          </TabsTrigger>
          <TabsTrigger value="tags" asChild>
            <Link href="/admin?tab=tags">
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </Link>
          </TabsTrigger>
          <TabsTrigger value="users" asChild>
            <Link href="/admin?tab=users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Manage community products</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-lg"
                        style={{ backgroundColor: product.color ?? "#6366f1" }}
                      >
                        {product.icon ?? product.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{product.name}</h3>
                          <Badge className={statusColors[product.status]}>
                            {product.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          /{product.slug} • {product._count.topics} topics • {product._count.categories} categories
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>Manage topic categories</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {category.product?.name ?? "Global"} • {category._count.topics} topics
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tags</CardTitle>
                  <CardDescription>Manage topic tags</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tag
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="text-sm py-1 px-3"
                    style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                  >
                    {tag.name}
                    <span className="ml-2 text-muted-foreground">({tag.usageCount})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
              <CardDescription>Overview of user roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{userStats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 text-center">
                  <p className="text-2xl font-bold text-red-600">{userStats.admins}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 text-center">
                  <p className="text-2xl font-bold text-purple-600">{userStats.mods}</p>
                  <p className="text-sm text-muted-foreground">Moderators</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-center">
                  <p className="text-2xl font-bold text-blue-600">{userStats.trusted}</p>
                  <p className="text-sm text-muted-foreground">Trusted Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

