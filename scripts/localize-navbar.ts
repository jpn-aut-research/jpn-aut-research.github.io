type Language = "ja" | "en" | "de";

const outputDir = Deno.env.get("QUARTO_PROJECT_OUTPUT_DIR") ?? "_site";
const navPages = ["index", "about", "events", "mailing-list", "links", "contact"];
const languageNames: Record<Language, string> = {
  ja: "日本語",
  en: "English",
  de: "Deutsch",
};
const languageAriaLabels: Record<Language, string> = {
  ja: "言語を選択",
  en: "Select language",
  de: "Sprache auswählen",
};
const navLabels: Record<Language, Record<string, string>> = {
  ja: {
    "index": "ホーム",
    "about": "概要",
    "events": "イベント",
    "mailing-list": "メーリングリスト",
    "links": "リンク集",
    "contact": "連絡先",
  },
  en: {
    "index": "Home",
    "about": "About JARNet",
    "events": "Events",
    "mailing-list": "Mailing List",
    "links": "Links",
    "contact": "Contact",
  },
  de: {
    "index": "Start",
    "about": "Über JARNet",
    "events": "Veranstaltungen",
    "mailing-list": "Mailingliste",
    "links": "Links",
    "contact": "Kontakt",
  },
};

const navRegionPattern =
  /<ul class="navbar-nav navbar-nav-scroll me-auto">[\s\S]*?<\/ul>\s*<ul class="navbar-nav navbar-nav-scroll ms-auto">[\s\S]*?<\/ul>\s*(?=\s*<\/div> <!-- \/navcollapse -->)/;

const htmlEscape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const relativeUrl = (
  currentLanguage: Language,
  targetLanguage: Language,
  page: string,
) => {
  const file = `${page}.html`;
  if (currentLanguage === "ja") {
    return targetLanguage === "ja" ? `./${file}` : `./${targetLanguage}/${file}`;
  }
  return targetLanguage === "ja" ? `../${file}` : `../${targetLanguage}/${file}`;
};

const navBlock = (language: Language, currentPage: string) => {
  const items = navPages.map((page) => {
    const isActive = page === currentPage;
    const activeClass = isActive ? " active" : "";
    const ariaCurrent = isActive ? ' aria-current="page"' : "";
    return `  <li class="nav-item">
    <a class="nav-link${activeClass}" href="${relativeUrl(language, language, page)}"${ariaCurrent}> 
<span class="menu-text">${htmlEscape(navLabels[language][page])}</span></a>
  </li>  `;
  }).join("\n");

  return `<ul class="navbar-nav navbar-nav-scroll me-auto">
${items}
</ul>`;
};

const languageSelectorBlock = (language: Language, currentPage: string) => {
  const items = (Object.keys(languageNames) as Language[]).map((targetLanguage) => {
    const isActive = targetLanguage === language;
    const activeClass = isActive ? " active" : "";
    const ariaCurrent = isActive ? ' aria-current="page"' : "";
    return `        <li>
    <a class="dropdown-item${activeClass}" href="${relativeUrl(language, targetLanguage, currentPage)}"${ariaCurrent}>
 <span class="dropdown-text">${htmlEscape(languageNames[targetLanguage])}</span></a>
  </li>  `;
  }).join("\n");

  return `<ul class="navbar-nav navbar-nav-scroll ms-auto">
  <li class="nav-item dropdown language-selector">
    <a class="nav-link dropdown-toggle" href="#" id="nav-menu-language" role="link" data-bs-toggle="dropdown" aria-expanded="false" aria-label="${htmlEscape(languageAriaLabels[language])}">
 <i class="bi bi-globe2" aria-hidden="true"></i>
 <span class="menu-text">${htmlEscape(languageNames[language])}</span>
    </a>
    <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="nav-menu-language">    
${items}
    </ul>
  </li>
</ul>`;
};

const pageInfo = (path: string) => {
  const relativePath = path.replace(`${outputDir}/`, "");
  const parts = relativePath.split("/");
  const language: Language = parts[0] === "en"
    ? "en"
    : parts[0] === "de"
      ? "de"
      : "ja";
  const fileName = parts.at(-1) ?? "index.html";
  const page = fileName.replace(/\.html$/, "");
  return { language, page };
};

async function* htmlFiles(dir: string): AsyncGenerator<string> {
  for await (const entry of Deno.readDir(dir)) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory) {
      yield* htmlFiles(path);
      continue;
    }
    if (entry.isFile && entry.name.endsWith(".html")) {
      yield path;
    }
  }
}

for await (const path of htmlFiles(outputDir)) {
  const { language, page } = pageInfo(path);
  const html = await Deno.readTextFile(path);
  const localizedNav = `${navBlock(language, page)}
            ${languageSelectorBlock(language, page)}`;
  const updated = html.replace(navRegionPattern, localizedNav);
  if (updated !== html) {
    await Deno.writeTextFile(path, updated);
  }
}
