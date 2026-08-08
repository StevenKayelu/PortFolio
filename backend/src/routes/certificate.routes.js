import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("certificate", { orderBy: { issueDate: "desc" }, searchFields: ["title", "institution", "category"] });
