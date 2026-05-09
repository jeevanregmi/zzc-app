const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const folderPath = "C:/Users/jeeva/Desktop/Documents/44";

async function readFiles() {
  const files = await fs.readdir(folderPath);

  const schemes = [];

  for (const file of files) {
    if (file.endsWith(".html")) {
      const filePath = path.join(folderPath, file);

      const html = await fs.readFile(filePath, "utf-8");

      const $ = cheerio.load(html);

      const title = $("title").text().trim();

      const bodyText = $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim();

      schemes.push({
        fileName: file,
        title,
        content: bodyText.substring(0, 5000),
      });
    }
  }

  console.log(schemes);

  await fs.writeJson("schemes.json", schemes, {
    spaces: 2,
  });

  console.log("schemes.json created 🚀");
}

readFiles();