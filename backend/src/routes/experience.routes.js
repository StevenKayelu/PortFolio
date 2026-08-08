import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("experience", { orderBy: { startDate: "desc" }, searchFields: ["title", "organization"] });
