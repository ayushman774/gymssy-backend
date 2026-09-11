import authorizeRoles from "./roleMiddleware.js";

const adminMiddleware = authorizeRoles("admin");

export default adminMiddleware;
