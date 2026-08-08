import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("galleryItem", { orderBy: { displayOrder: "asc" }, searchFields: ["title", "category"] });
