import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("achievement", { orderBy: { date: "desc" }, searchFields: ["title"], softDelete: false });
