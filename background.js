browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await browser.storage.local.get([
      'removeExtTag',
      'tags',
      'removePrefix',
      'prefixOptions',
      'reAliases',
      'fwdAliases'
    ]);

    // Set defaults if they haven't been saved before
    await browser.storage.local.set({
      removeExtTag: existing.removeExtTag ?? true,
      tags: existing.tags ?? "EXT, Extern, External",
      removePrefix: existing.removePrefix ?? true,
      prefixOptions: existing.prefixOptions ?? "collapse",
      reAliases: existing.reAliases ?? "Re, Aw, Antw",
      fwdAliases: existing.fwdAliases ?? "Fwd, WG"
    });
  }
});

async function getAliases() {
  const { reAliases, fwdAliases } = await browser.storage.local.get(['reAliases', 'fwdAliases']);
  const reList = (reAliases || "Re, Aw, Antw")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const fwdList = (fwdAliases || "Fwd, WG")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return { reList, fwdList };
}

async function cleanExtTags(subject) {
  const storedTags = await browser.storage.local.get("tags");
  const userTagsRaw = storedTags.tags || "";

  const userTags = userTagsRaw
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  if (userTags.length === 0) {
    // If no tags configured, just return subject as-is
    return subject;
  }

  const pattern = userTags
    .map(tag => `(?:\\[\\s*${tag}\\s*\\]|\\b${tag}\\b)\\s*:?\s*`)
    .join("|");

  const regex = new RegExp(`(?:${pattern})`, "gi");

  return subject.replace(regex, "").trim();
}

async function collapsePrefixes(subject) {
  subject = subject.trim();
  const { reList, fwdList } = await getAliases();

  // Normalize mapping
  const normalize = {};
  reList.forEach(alias => normalize[alias.toLowerCase()] = "Re");
  fwdList.forEach(alias => normalize[alias.toLowerCase()] = "Fwd");

  const allAliases = [...reList, ...fwdList].map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const prefixPattern = new RegExp(`^(${allAliases.join("|")})(\\*([0-9]+))?:\\s*`, "i");
  const prefixes = [];
  let rest = subject;

  // Extract prefixes in order
  while (true) {
    const match = rest.match(prefixPattern);
    if (!match) break;

    const raw = match[1].toLowerCase();
    const norm = normalize[raw] || raw;
    const count = match[3] ? parseInt(match[3], 10) : 1;

    prefixes.push({ type: norm, count });
    rest = rest.slice(match[0].length).trimStart();
  }

  if (prefixes.length === 0) return subject;

  // Collapse consecutive same-type prefixes
  const collapsed = [];
  for (const { type, count } of prefixes) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.type === type) {
      last.count += count;
    } else {
      collapsed.push({ type, count });
    }
  }

  // Rebuild subject
  const prefixString = collapsed.map(({ type, count }) =>
    count > 1 ? `${type}*${count}:` : `${type}:`
  ).join(" ");

  return `${prefixString} ${rest}`.trim();
}

async function overwritePrefixes(subject) {
  subject = subject.trim();
  const { reList, fwdList } = await getAliases();

  // Build regex for first prefix to keep
  const keepPattern = new RegExp(`^(${[...reList, ...fwdList].map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")}):\\s*`, "i");
  let prefixToKeep = "";

  const firstPrefixMatch = subject.match(keepPattern);
  if (firstPrefixMatch) {
    prefixToKeep = firstPrefixMatch[0];
    subject = subject.slice(prefixToKeep.length);
  }

  // Remove all user-defined prefixes repeatedly from the start
  const allPatterns = [...reList, ...fwdList].map(alias =>
    new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*`, "i")
  );

  let prefixFound = true;
  while (prefixFound) {
    prefixFound = false;
    for (const prefixRegex of allPatterns) {
      if (prefixRegex.test(subject)) {
        subject = subject.replace(prefixRegex, "");
        prefixFound = true;
      }
    }
  }

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
      subject = await collapsePrefixes(subject);
    }

    // Step 2B: Overwrite prefixes if enabled
    if (removePrefix && prefixOptions === "overwrite") {
      subject = await overwritePrefixes(subject);
    }

    // Only update if subject changed
    if (subject !== composeDetails.subject) {
      await browser.compose.setComposeDetails(tab.id, { subject });
    }
  } catch (error) {
    console.error("Error cleaning subject:", error);
  }
}

browser.windows.onCreated.addListener(async (window) => {
  try {
    const tabs = await browser.tabs.query({ windowId: window.id });

    for (const tab of tabs) {
      // Only handle tabs of type 'messageCompose'
      if (tab.type === "messageCompose") {
        setTimeout(async () => {
          await cleanSubjectOnCompose(tab);
        }, 100); // Delay to ensure compose window is fully loaded
      }
    }
  } catch (err) {
    console.error("Error handling compose window:", err);
  }
});