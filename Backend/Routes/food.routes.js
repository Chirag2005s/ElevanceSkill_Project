const express = require("express");
const router = express.Router();
const {
    getFoods,
    getFoodById,
    createFood,
    updateFood,
    deleteFood,
    createCategory,
    deleteCategory,
} = require("../controllers/food.controller");
const { protect } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");

router.get("/", getFoods);
router.post("/categories", protect, authorizeRoles("restaurant", "admin"), createCategory);
router.delete("/categories/:id", protect, authorizeRoles("restaurant", "admin"), deleteCategory);

router.get("/:id", getFoodById);
router.post("/", protect, authorizeRoles("restaurant", "admin"), createFood);
router.put("/:id", protect, authorizeRoles("restaurant", "admin"), updateFood);
router.delete("/:id", protect, authorizeRoles("restaurant", "admin"), deleteFood);

module.exports = router;

