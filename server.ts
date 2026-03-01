import express from "express";
import multer from "multer";
import { google } from "googleapis";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const HARDCODED_CLIENT_EMAIL = "eduforum@eduforum-488504.iam.gserviceaccount.com";
const HARDCODED_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCoWCBuq4gwor7v\na5BtWiZaT8KxNUIztOf4FhGk3ei5AzXOUhMOw7oklDULzMAmq8YsA8MpAJI3c6zx\n5CMKD3NW304RN6r2TKOVcuIEC8mTcmIx12vw2C/Cntfv4Dp8AI24JqYsdKk4CYL1\nsHE30y8a8AS/iwpOXWpIy1tdKlY+NIitaChjBZc/Yh15UpOm8GmCzSvXg6giOtjS\ntzB9We2mneKiaigd3V5fkW6mMex7pp1BJemkUKUDIsBK6Tz4up3+eqfxEJW3YCKG\nIf2KGRNHA+3ZWEDpijAPSOVUTQ7kxLbaRz99+X7SC9IZpQOsKXouxKPFp29MQKPS\nPo8zEAtlAgMBAAECggEAIBmBwaiKlP+LWdrQVNGiS4k27hRiNbrSmp8WqTG5LQIc\nMeW7hY6zwULTZJcbsqQBayYiggB+YP15Jjyio8nza8azu5u6STGu5ZHc3/mha7Cd\nYbSae/e1D667LR27+SYf39PaztJF7A4APznwNL1bl47Z0O5BvlSYrh28o6Stgjmx\n24np+MuO84/GwyhonVauDG24kAerTkE95mR6+IMPrEXSm4THSllj/c58DpB0dYiK\nY+FS89daLl7X3zLp/dP9eVinJeTREqfqaQdZFrBTIAQIo8adWBj27+u1btWjmu5u\nSl07vNpUv08O422rHJ8HYzj/8K/bX8ycSP+dSCk0MQKBgQDdQ+J389hnD2AZx0wA\nXml0rGVP9pXu0mAMQtDYYf2P1AJ/+z7/s86Fh38r9NMfpzdcyGQhh+ky8vm0R4FI\nQ4Zr9U1dmFq6Ny3HrQLgviV/P6oo6CDD4HgNVLGtFvxIwNd7maYiVCSG8GoaMZ3+\nvrn5SV4wVM9CD6Sdz47VPcg4qQKBgQDCxXolMD5kJasLvMb2JxQDY/JFXWKMEhwV\nfRNqY/tp+WBWcl5ypEj1RjFhkvggCGrJmtdBEMrsgHZv5AF+GcdrlWjP1KO6bVb+\nBKX/l/Ch0aJBQOvqAUUKwK6l61SDjM17+JncITIdaItlJ41yIYnEGsnQTH8k+lFk\naBKImjOGXQKBgC0ZXxmv/BXVjnLyqk0Q8VG0qdnImvrYqncVT1grcPFV90R6w3Z/\nAcM5wPQGrNmwzZn9xlsHRsL5v2e9g15lVQrALwq6uRNnl88xNnr0htQO9/HqjnMe\nV5nv/18WZkm19LXetXwdxmwyqI26O0fnPCTRjX8waiY+5gC8g5J3S04xAoGAbzo7\nANXGK4bfYTqTHKtAYJdJGZe02WzWIOdmmREz2FcTTwrNKQbsqzVEqgY2MITeBveo\nCX4/hEPwXwGEYLD0E1olmtpCDgq27SVWbtokDyUaVc1vbBkBhpx2oEX944obJrrX\nksBaUDUNtdyaiBzjAdySd6PX0BQrOv2758q3tfkCgYA8uFUv8eo0zJXrjKagLkD7\nnb3GFOZUhsuPyx2fgQ+MWIpLXQhMKFLz2ZbFOZ+AcZtmeZ9/d9YVqkuUEh+L9gBA\nSnCjqY6dbpHNCiRbkBRmJep3626UsGbz5hoR2sD1dKaf4EaGTenzvZjaHoZjxbwP\nscHkWeNGAPad5OiNe74ZfA==\n-----END PRIVATE KEY-----\n";

// Configure multer to store files in memory
const upload = multer({ storage: multer.memoryStorage() });

// API Route to start a resumable upload session
app.post("/api/start-upload", express.json(), async (req, res) => {
  try {
    const { filename, mimeType, folderId } = req.body;
    
    if (!filename || !mimeType) {
      return res.status(400).json({ error: "Filename and mimeType are required" });
    }

    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || HARDCODED_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || HARDCODED_PRIVATE_KEY;
    // Default to Discussion folder if no folderId provided
    const targetFolderId = folderId || "0AL-ZXsu4-gFtUk9PVA";

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: "Google Drive credentials not configured on server." 
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const fileMetadata: any = { name: filename };
    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
    }

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token.token}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': mimeType,
    };
    
    // Always set Origin to ensure Google Drive allows CORS for the browser's PUT request
    const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
    headers['Origin'] = origin;

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(fileMetadata),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to create upload session: ${errText}`);
    }

    const uploadUrl = response.headers.get('Location');
    if (!uploadUrl) throw new Error('No upload URL returned');

    res.json({ uploadUrl });
  } catch (error: any) {
    console.error("Start upload error:", error);
    res.status(500).json({ error: error.message || "Failed to start upload" });
  }
});

// API Route to make a file public and get its links
app.post("/api/make-file-public", express.json(), async (req, res) => {
  try {
    const { fileId } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || HARDCODED_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || HARDCODED_PRIVATE_KEY;

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Make the file public
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });

    // Get the file links
    const file = await drive.files.get({
      fileId: fileId,
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    res.json({ success: true, file: file.data });
  } catch (error: any) {
    console.error("Make file public error:", error);
    res.status(500).json({ error: error.message || "Failed to make file public" });
  }
});

const LIBRARY_FOLDER_ID = "1RxAUIiU-wZ14cPfKgtQ5kce-WAuJl9QY";

// API Route to list files in the Library folder
app.get("/api/library/files", async (req, res) => {
  try {
    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || HARDCODED_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || HARDCODED_PRIVATE_KEY;

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: "Google Drive credentials not configured on server." 
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
      },
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    const response = await drive.files.list({
      q: `'${LIBRARY_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, iconLink)',
      orderBy: 'createdTime desc',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives'
    });

    res.json({ files: response.data.files || [] });
  } catch (error: any) {
    console.error("List library files error:", error);
    res.status(500).json({ error: error.message || "Failed to list library files" });
  }
});

// API Route to upload a file to the Library folder
app.post("/api/library/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || HARDCODED_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || HARDCODED_PRIVATE_KEY;

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: "Google Drive credentials not configured on server." 
      });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Decode filename to support UTF-8 characters properly
    const decodedFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    const fileMetadata: any = {
      name: decodedFilename,
      parents: [LIBRARY_FOLDER_ID],
      // The driveId must be the root ID of the Shared Drive ("EDU-FORUM")
      driveId: "0AL-ZXsu4-gFtUk9PVA"
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer),
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, name, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    // Make the file public
    if (driveRes.data.id) {
      await drive.permissions.create({
        fileId: driveRes.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
    }

    res.json({ success: true, file: driveRes.data });
  } catch (error: any) {
    console.error("Library upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload to Library" });
  }
});

// Legacy API Route for uploading to Google Drive (kept for fallback)
app.post("/api/upload-drive", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || HARDCODED_CLIENT_EMAIL;
    const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || HARDCODED_PRIVATE_KEY;
    // Hardcode the Shared Drive ID to bypass any cached environment variables
    const GOOGLE_DRIVE_FOLDER_ID = "0AL-ZXsu4-gFtUk9PVA";

    if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
      return res.status(500).json({ 
        error: "Google Drive credentials not configured on server. Please set GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY." 
      });
    }

    // Initialize Google Auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_CLIENT_EMAIL,
        // Handle escaped newlines in the private key string
        private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    // Decode filename to support UTF-8 characters properly
    const decodedFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    // Prepare file metadata
    const fileMetadata: any = {
      name: decodedFilename,
    };
    
    // If a specific folder ID is provided, upload it there
    if (GOOGLE_DRIVE_FOLDER_ID) {
      fileMetadata.parents = [GOOGLE_DRIVE_FOLDER_ID];
    }

    // Prepare media stream
    const media = {
      mimeType: req.file.mimetype,
      body: Readable.from(req.file.buffer),
    };

    // Upload to Drive
    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink, webContentLink",
      supportsAllDrives: true,
    });

    // Make the file public so it can be viewed by anyone in the forum
    if (driveRes.data.id) {
      await drive.permissions.create({
        fileId: driveRes.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });
    }

    res.json({ success: true, file: driveRes.data });
  } catch (error: any) {
    console.error("Drive upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload to Google Drive" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Error handling middleware to always return JSON for API routes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err);
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    } else {
      next(err);
    }
  });

  // Only listen on a port if we are NOT running in a serverless environment like Vercel
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

// Export the Express app for Vercel Serverless Functions
export default app;
