import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("skill", { orderBy: { displayOrder: "asc" }, searchFields: ["name"] });
