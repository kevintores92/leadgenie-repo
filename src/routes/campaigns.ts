import express from "express";
import { Orchestrator } from "../orchestrator/Orchestrator";
import bodyParser from "body-parser";
import multer from "multer";
import { requireUploadToken } from "../middleware/auth";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export default function (orchestrator: Orchestrator) {
  const router = express.Router();

  // JSON or text/csv direct upload
  router.post(
    "/:campaignId/upload",
    requireUploadToken,
    bodyParser.text({ type: ["text/*", "application/csv"], limit: "5mb" }),
    async (req, res) => {
      try {
        const { campaignId } = req.params;
        let rows: Array<{ phone: string; [k: string]: any }> = [];

        if (Array.isArray(req.body)) {
          rows = req.body as any;
        } else if (typeof req.body === "string" && req.body.trim().length > 0) {
          const text = req.body.trim();
          const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
          if (lines.length > 0 && lines[0].includes(",")) {
              rows = lines.map((ln: string) => {
                const cols = ln.split(",").map((c: string) => c.trim());
                return { phone: cols[0], raw: cols };
              });
            } else {
              rows = lines.map((ln: string) => ({ phone: ln }));
            }
        } else if (req.body && typeof req.body === "object") {
          rows = Array.isArray(req.body) ? req.body : [req.body];
        }

        const result = await orchestrator.uploadList(campaignId, rows);
        res.status(200).send(result);
      } catch (err) {
        console.error("upload error", err);
        res.status(500).send({ ok: false, error: String(err) });
      }
    }
  );

  // multipart file upload (field name: file)
  router.post("/:campaignId/upload-file", requireUploadToken, upload.single("file"), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const file = req.file;
      if (!file) return res.status(400).send({ ok: false, error: "no file" });
      const text = file.buffer.toString("utf8").trim();
      const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      let rows: Array<{ phone: string; [k: string]: any }> = [];
      if (lines.length > 0 && lines[0].includes(",")) {
        rows = lines.map((ln: string) => {
          const cols = ln.split(",").map((c: string) => c.trim());
          return { phone: cols[0], raw: cols };
        });
      } else {
        rows = lines.map((ln: string) => ({ phone: ln }));
      }
      const result = await orchestrator.uploadList(campaignId, rows);
      res.status(200).send(result);
    } catch (err) {
      console.error("upload-file error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  router.post("/:campaignId/start", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const result = await orchestrator.startCampaign(campaignId);
      res.status(200).send(result);
    } catch (err) {
      console.error("start campaign error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  router.get("/:campaignId/status", async (req, res) => {
    try {
      const { campaignId } = req.params;
      const status = await orchestrator.campaignManager.getStatus(campaignId);
      res.status(200).send(status);
    } catch (err) {
      console.error("status error", err);
      res.status(500).send({ ok: false, error: String(err) });
    }
  });

  return router;
}
