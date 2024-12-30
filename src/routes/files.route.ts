import { Hono } from "hono";
import { ContextExtended } from "../types";

const files = new Hono<ContextExtended>();

// Route to get all files (empty list for now)
/*files.get("/", (ctx) => {
  return ctx.json([]);
});
*/

// Route to list all files in the bucket
files.get("/list", async (ctx) => {
  const bucket = ctx.env.R2_BUCKET;

  try {
    const objects = await bucket.list();
    //console.log(objects); // Log the raw response
    const keys = objects.objects.map((object) => object.key);
    return ctx.json({ success: true, keys });
  } catch (error) {
    return ctx.json({
      success: false,
      message: "Error listing objects",
      error: error.message,
    });
  }
});

// Route to upload a file
files.post("/upload", async (ctx) => {
  const formData = await ctx.req.formData();
  const file = formData.get("file"); // Assuming 'file' is the key in the form

  if (!file) {
    return ctx.json({ success: false, message: "No file uploaded" });
  }

  // Append timestamp to the file name to ensure uniqueness
  const timestamp = Date.now();
  const uniqueFilename = `${timestamp}-${file.name}`;

  try {
    // Upload the file with the new unique filename
    await ctx.env.R2_BUCKET.put(uniqueFilename, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return ctx.json({
      success: true,
      message: "File uploaded successfully",
      filename: uniqueFilename,
    });
  } catch (error) {
    return ctx.json({
      success: false,
      message: "Error uploading file",
      error: error.message,
    });
  }
});

// Route to delete a specific file by ID
files.delete("/:id", async (ctx) => {
  const filename = ctx.req.param("id"); // Use ctx.req.param() to access the URL parameter

  if (!filename) {
    return ctx.json({
      success: false,
      message: "No file key provided",
    });
  }

  try {
    // Attempt to delete the file from the R2 bucket
    await ctx.env.R2_BUCKET.delete(filename);

    return ctx.json({
      success: true,
      message: `File ${filename} deleted successfully`,
    });
  } catch (error) {
    return ctx.json({
      success: false,
      message: `Error deleting file ${filename}`,
      error: error.message,
    });
  }
});

// Route to get a specific file by ID
files.get("/:id", async (ctx) => {
  const filename = ctx.req.param("id"); // Get the file key (ID) from the URL parameter

  if (!filename) {
    return ctx.json({
      success: false,
      message: "No file key provided",
    });
  }

  try {
    // Attempt to retrieve the file from the R2 bucket using the key (filename)
    const file = await ctx.env.R2_BUCKET.get(filename);

    if (file) {
      // File exists, return the file content with the appropriate content type
      return ctx.body(file.body, {
        headers: { "Content-Type": file.httpMetadata.contentType },
      });
    } else {
      return ctx.json({
        success: false,
        message: `File with key ${filename} not found`,
      });
    }
  } catch (error) {
    return ctx.json({
      success: false,
      message: `Error retrieving file ${filename}`,
      error: error.message,
    });
  }
});

export default files;
