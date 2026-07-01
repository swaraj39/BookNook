export function initials(name = "") {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
export function label(value = "") {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
export function dateText(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
export function validateBookForm(form) {
  const errors = {};
  if (!form.title?.trim()) errors.title = "Title is required.";
  if (!form.author?.trim()) errors.author = "Author is required.";
  if (!form.genreId) errors.genreId = "Genre is required.";
  const loanDays = Number(form.defaultLoanDays);
  if (!Number.isInteger(loanDays) || loanDays < 3 || loanDays > 60) {
    errors.defaultLoanDays = "How long are they holding it hostage? Pick a number between 3 and 60 days.";
  }
  return errors;
}
export function validateRequestForm(form) {
  const errors = {};
  const loanDays = Number(form.requestedLoanDays);
  if (!Number.isInteger(loanDays) || loanDays < 3 || loanDays > 60) {
    errors.requestedLoanDays = "Let's be realistic! Request the book for 3 to 60 days.";
  }
  return errors;
}
export function toBookForm(book) {
  return { ...book, genreId: book.genre?.id };
}

// ---- CSV / spreadsheet import helpers ----

function detectDelimiter(sampleLine) {
  const counts = {
    ",": (sampleLine.match(/,/g) || []).length,
    "\t": (sampleLine.match(/\t/g) || []).length,
    ";": (sampleLine.match(/;/g) || []).length,
  };
  let best = ",";
  let bestCount = 0;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > bestCount) { best = delim; bestCount = count; }
  }
  return best;
}

// Parses CSV (or tab/semicolon-delimited) text into an array of row objects,
// auto-detecting the delimiter so it works whether the file was saved as
// comma-separated or pasted/exported as tab-separated from Excel.
export function parseDelimitedText(text) {
  const cleaned = text.replace(/^\uFEFF/, ""); // strip BOM if present
  const firstLineEnd = cleaned.indexOf("\n");
  const firstLine = firstLineEnd === -1 ? cleaned : cleaned.slice(0, firstLineEnd);
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const next = cleaned[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === delimiter) { row.push(field); field = ""; }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (char === '\r') { /* skip */ }
      else field += char;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => String(cell).trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").toString().trim(); });
      return obj;
    });
}

// Kept for backwards compatibility with anything still calling parseCsv.
export function parseCsv(text) {
  return parseDelimitedText(text);
}

function normalizeKey(key) {
  return String(key || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Maps every header variant we expect to see (export format, the import
// template, manual edits, etc.) onto the canonical field names the backend
// understands.
const IMPORT_HEADER_MAP = {
  title: "Title",
  author: "Author",
  genre: "Genre",
  condition: "Condition",
  loandays: "DefaultLoanDays",
  defaultloandays: "DefaultLoanDays",
  description: "Description",
  descriptionoptional: "Description",
  isbn: "ISBN",
  coverimageurl: "CoverUrl",
  coverimageurloptional: "CoverUrl",
  coverurl: "CoverUrl",
  coverurloptional: "CoverUrl",
  email: "Email",
  owneremail: "Email",
};

// Takes a raw row object (whatever headers the file actually had) and
// returns one with canonical keys: Title, Author, Genre, Condition,
// DefaultLoanDays, Description, CoverUrl, ISBN.
export function normalizeImportRow(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    const mapped = IMPORT_HEADER_MAP[normalizeKey(key)];
    if (mapped) {
      normalized[mapped] = typeof value === "string" ? value.trim() : value;
    }
  });
  return normalized;
}