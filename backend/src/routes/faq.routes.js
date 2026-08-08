import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("faq", { orderBy: { displayOrder: "asc" }, searchFields: ["question", "category"], softDelete: false, publicWhere: { isPublished: true } });
