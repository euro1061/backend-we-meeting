import Elysia from "elysia";
import reportController from "../controllers/reportController";

const reportRoutes = new Elysia({ prefix: '/api/reports' })
  .use(reportController)

export default reportRoutes