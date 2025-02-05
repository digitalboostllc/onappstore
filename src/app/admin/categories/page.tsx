import { getCategories } from "@/lib/categories"
import AdminCategoriesPage from "./page.client"

export default async function Page() {
  const categories = await getCategories()
  return <AdminCategoriesPage categories={categories} />
} 
