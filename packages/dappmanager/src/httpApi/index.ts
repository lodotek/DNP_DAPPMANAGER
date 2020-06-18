import http from "http";
import express from "express";
import bodyParser from "body-parser";
import compression from "compression";
import fileUpload from "express-fileupload";
import cors from "cors";
import socketio from "socket.io";
import path from "path";
import params from "../params";
import { isAdmin, isAdminIp } from "./auth";
import { wrapHandler } from "./utils";
import { download } from "./routes/download";
import { upload } from "./routes/upload";
import { containerLogs } from "./routes/containerLogs";
import { downloadUserActionLogs } from "./routes/downloadUserActionLogs";
import * as methods from "../calls";
import { mapSubscriptionsToEventBus } from "../api/subscriptions";
import {
  getRpcHandler,
  subscriptionsFactory,
  Subscriptions,
  subscriptionsData,
  validateSubscriptionsArgsFactory
} from "../common";
import { getEthForwardHandler, isDwebRequest } from "../ethForward";
import {
  subscriptionsLoggerFactory,
  routesLoggerFactory
} from "../api/middleware";
import { logs } from "../logs";

const httpApiPort = params.HTTP_API_PORT;
const uiFilesPath = params.UI_FILES_PATH;
const whitelist = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://my.dappnode"
];

/**
 * HTTP API
 *
 * [NOTE] This API is not secure
 * - It can't use HTTPS for the limitations with internal IPs certificates
 *
 * [NOTE] To enable express debugging set ENV DEBUG=express:*
 */
export default function startHttpApi(
  port: number | string = httpApiPort
): void {
  const app = express();
  const server = new http.Server(app);
  const io = socketio(server, { serveClient: false });

  io.use((socket, next) => {
    const ip = socket.handshake.address;
    if (isAdminIp(ip)) next();
    else next(new Error(`Requires admin permission. Forbidden ip: ${ip}`));
  });

  io.on("connection", function(socket) {
    console.log(`Socket connected`, socket.id);
  });

  // Subscriptions
  const subscriptions = subscriptionsFactory<Subscriptions>(
    io,
    subscriptionsData,
    {
      loggerMiddleware: subscriptionsLoggerFactory(),
      validateArgs: validateSubscriptionsArgsFactory()
    }
  );
  mapSubscriptionsToEventBus(subscriptions);

  const loggerMiddleware = routesLoggerFactory();
  const rpcHandler = getRpcHandler(methods, loggerMiddleware);
  const ethForwardHandler = getEthForwardHandler();

  // Intercept decentralized website requests first
  app.use((req, res, next) => {
    if (isDwebRequest(req)) ethForwardHandler(req, res);
    else next();
  });
  // default options. ALL CORS + limit fileSize and file count
  app.use(fileUpload({ limits: { fileSize: 500 * 1024 * 1024, files: 10 } }));
  // CORS config follows https://stackoverflow.com/questions/50614397/value-of-the-access-control-allow-origin-header-in-the-response-must-not-be-th
  app.use(cors({ credentials: true, origin: whitelist }));
  app.use(compression());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(path.resolve(uiFilesPath), { maxAge: "1d" })); // Express uses "ETags" (hashes of the files requested) to know when the file changed

  // Ping - health check
  app.get("/ping", isAdmin, (req, res) => res.send(req.body));

  // Methods that do not fit into RPC
  app.get("/container-logs/:id", isAdmin, wrapHandler(containerLogs));
  app.get("/download/:fileId", isAdmin, wrapHandler(download));
  app.get("/user-action-logs", isAdmin, wrapHandler(downloadUserActionLogs));
  app.post("/upload", isAdmin, wrapHandler(upload));

  // Rest of RPC methods
  app.post(
    "/rpc",
    isAdmin,
    wrapHandler(async (req, res) => res.send(await rpcHandler(req.body)))
  );

  // Serve UI. React-router, index.html at all routes
  app.get("*", (req, res) =>
    res.sendFile(path.resolve(uiFilesPath, "index.html"))
  );

  server.listen(port, () => logs.info(`HTTP API ${port}`));
}