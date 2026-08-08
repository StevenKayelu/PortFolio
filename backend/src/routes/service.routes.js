import { createCrudRouter } from "./crudRouterFactory.js";
export default createCrudRouter("service", {
    orderBy: { displayOrder: "asc" },
    searchFields: ["title", "description"],
    publicWhere: {
        isActive: true
    },
    softDelete: false
});