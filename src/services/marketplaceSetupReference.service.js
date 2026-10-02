import Gym from "../models/gyms/Gym.js";
import Trainer from "../models/trainers/Trainer.js";
import Experience from "../models/experiences/Experience.js";
import Category from "../models/categories/Category.js";

export async function getCategoryReferenceImpact(category) {
  const isMain = category.type === "main";
  const [gyms, trainers, experiences, childCategories] = await Promise.all([
    Gym.countDocuments(
      isMain
        ? { category: category.name }
        : { $or: [{ category: category.name }, { tags: category.name }] },
    ),
    Trainer.countDocuments(
      isMain ? { category: category.slug } : { role: category.name },
    ),
    isMain ? Promise.resolve(0) : Experience.countDocuments({ category: category.name }),
    isMain ? Category.countDocuments({ parentCategory: category._id }) : Promise.resolve(0),
  ]);

  return {
    gyms,
    trainers,
    experiences,
    childCategories,
    total: gyms + trainers + experiences + childCategories,
  };
}

export async function getCityGymReferenceCount(cityId) {
  return Gym.countDocuments({ city: cityId });
}
