const fs = require("fs-extra");
const path = require("path");
const cheerio = require("cheerio");

const folderPath = "C:/Users/jeeva/Desktop/Documents/44";

async function cleanImport() {
  const files = await fs.readdir(folderPath);

  const schemes = [];

  for (const file of files) {

    if (file.endsWith(".html")) {

      const filePath = path.join(folderPath, file);

      const html = await fs.readFile(filePath, "utf-8");

      const $ = cheerio.load(html);

      $("script").remove();
      $("style").remove();
      $("noscript").remove();

      const title =
        $("h1").first().text().trim() ||
        $("title").text().trim();

      const paragraphs = [];

      $("p").each((i, el) => {

        const text = $(el)
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 80) {
          paragraphs.push(text);
        }

      });

      schemes.push({
        title,
        content: paragraphs.slice(0, 8),
        sourceFile: file,
      });
    }
  }

  await fs.writeJson("cleanSchemes.json", schemes, {
    spaces: 2,
  });

  console.log("cleanSchemes.json created 🚀");
}

cleanImport();