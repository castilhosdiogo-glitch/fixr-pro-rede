import { motion } from "framer-motion";
import { useCategories } from "@/hooks/useCategories";
import CategoryButton from "@/components/CategoryButton";

const CategoriesSection = () => {
  const { data: categories = [] } = useCategories();

  return (
    <section className="px-4 py-8 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <h2 className="font-display text-lg text-foreground">Categorias</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Encontre por tipo de serviço</p>
        </div>
      </motion.div>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((category, i) => (
          <CategoryButton key={category.id} category={category} compact index={i} />
        ))}
      </div>
    </section>
  );
};

export default CategoriesSection;
