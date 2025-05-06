import { Router } from "express";
import {
  createDrep,
  getDrepProfile,
  getDrepProposals,
  getDrepSearch,
  getDreps,
  getDrepStatus,
  searchIndexedDrepsByName,
  getIndexedDrepsCount,
  getIndexedDrepsPaginated
} from "../controllers/drepController";

const drepRoutes = Router();

drepRoutes.get("/", getDreps);
drepRoutes.post("/create", createDrep);
drepRoutes.post("/drep-profile", getDrepProfile);
drepRoutes.get("/query", getDrepSearch);
drepRoutes.get("/proposals/:drep_id", getDrepProposals);
drepRoutes.get("/status/:drep_id", getDrepStatus);
drepRoutes.get("/indexed/search", searchIndexedDrepsByName);
drepRoutes.get("/indexed/count", getIndexedDrepsCount);
drepRoutes.get("/indexed", getIndexedDrepsPaginated);

export default drepRoutes;
