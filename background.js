browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await browser.storage.local.get([
      'removeExtTag',
      'tags',
      'removePrefix',
      'prefixOptions'
    ]);

    // Only set defaults if they haven't been saved before
    await browser.storage.local.set({
      removeExtTag: existing.removeExtTag ?? true,
      tags: existing.tags ?? "EXT, Extern, External",
      removePrefix: existing.removePrefix ?? true,
      prefixOptions: existing.prefixOptions ?? "collapse"
    });
  }
});

async function cleanExtTags(subject) {
  const defaultTags = ["EXT", "Extern", "External"]; // default tags with preferred casing
  const result = await browser.storage.local.get("tags");
  const userTagsRaw = result.tags || "";

  // Parse user tags from comma-separated string, trim whitespace, filter out empty strings
  const userTags = userTagsRaw
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  // Combine default and user tags, avoiding duplicates (case-insensitive)
  const combinedTags = [
    ...defaultTags,
    ...userTags.filter(
      ut => !defaultTags.some(dt => dt.toLowerCase() === ut.toLowerCase())
    ),
  ];

  // Build regex pattern to match tags with optional brackets and colon, case-insensitive
  const pattern = combinedTags
    .map(tag => `(?:\\[\\s*${tag}\\s*\\]|${tag})\\s*:?\s*`)
    .join("|");

  const regex = new RegExp(`(?:${pattern})`, "gi");

  return subject.replace(regex, "").trim();
}


function collapsePrefixes(subject) {
  // Find matching prefixes at the start of the subject
  const prefixRegex = /(Re|Aw|Antw|Fwd|WG)\s*:/gi;
  const normalize = {
    re: "Re",
    aw: "Re",
    antw: "Re",
    fwd: "Fwd",
    wg: "Fwd",
  };

  let prefixes = [];
  let rest = subject;

  // Extract prefixes from the start repeatedly
  while (true) {
    const match = rest.match(/^(Re|Aw|Antw|Fwd|WG)\s*:/i);
    if (!match) break;
    prefixes.push(match[1].toLowerCase());
    rest = rest.slice(match[0].length).trimStart();
  }

  if (prefixes.length === 0) {
    return subject; // no prefixes found
  }

  // Group consecutive prefixes by type
  const collapsed = [];
  let prev = null;
  let count = 0;

  for (const prefix of prefixes) {
    if (prefix === prev) {
      count++;
    } else {
      if (prev !== null) collapsed.push({ prefix: prev, count });
      prev = prefix;
      count = 1;
    }
  }
  if (prev !== null) collapsed.push({ prefix: prev, count });

  // Build collapsed prefix string
  const prefixStr = collapsed
    .map(({ prefix, count }) => {
      const norm = normalize[prefix] || prefix;
      return count > 1 ? `${norm}*${count}:` : `${norm}:`;
    })
    .join(" ");

  return `${prefixStr} ${rest}`.trim();
}


function overwritePrefixes(subject) {
  subject = subject.trim();

  // Try to find the first prefix "Re:" or "Fwd:" at the start (case-insensitive)
  let prefixToKeep = "";

  // Check for "Re:" or "Fwd:" at the start of the subject
  const firstPrefixMatch = subject.match(/^(Re:|Fwd:)\s*/i);
  if (firstPrefixMatch) {
    prefixToKeep = firstPrefixMatch[0]; // Keep the entire matched prefix with trailing space
    subject = subject.slice(prefixToKeep.length);
  }

  // Prefixes to remove repeatedly from the start (including [EXT], [Extern], Re:, Fwd:)
  const prefixes = [
    /^\[EXT\]\s*/i,
    /^\[Extern\]\s*/i,
    /^Re:\s*/i,
    /^Fwd:\s*/i,
  ];

  // Remove all these prefixes repeatedly from the start
  let prefixFound = true;
  while (prefixFound) {
    prefixFound = false;
    for (const prefixRegex of prefixes) {
      if (prefixRegex.test(subject)) {
        subject = subject.replace(prefixRegex, "");
        prefixFound = true;
      }
    }
  }

  // Return rebuilt subject with the kept prefix + trimmed remainder
  return prefixToKeep + subject.trim();
}



async function cleanSubjectOnCompose(tab) {
  try {
    let composeDetails = await browser.compose.getComposeDetails(tab.id);

    let settings = await browser.storage.local.get([
      'removeExtTag',
      'tags',
      'removePrefix',
      'prefixOptions'
    ]);
    
    // Fallback to default settings if not set
    let removeExtTag = settings.removeExtTag ?? true;
    let removePrefix = settings.removePrefix ?? true;
    let prefixOptions = settings.prefixOptions ?? "collapse";

    // Get the subject from compose details
    let subject = composeDetails.subject;

    // Step 1: Remove EXT tags if enabled
    if (removeExtTag) {
      subject = await cleanExtTags(subject);
    }

    // Step 2A: Collapse prefixes if enabled
    if (removePrefix && prefixOptions === "collapse") {
      subject = collapsePrefixes(subject);
    }

    // Step 2B: Overwrite prefixes if enabled
    if (removePrefix && prefixOptions === "overwrite") {
      subject = overwritePrefixes(subject);
    }

    // Only update if subject changed
    if (subject !== composeDetails.subject) {
      await browser.compose.setComposeDetails(tab.id, { subject });
    }
  } catch (error) {
    console.error("Error cleaning subject:", error);
  }
}


// Execute the function before the email is sent
browser.compose.onBeforeSend.addListener(cleanSubjectOnCompose);
