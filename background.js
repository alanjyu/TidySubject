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
  const defaultTags = ["EXT", "Extern", "External"];
  const result = await browser.storage.local.get("tags");
  const userTagsRaw = result.tags || "";

  const userTags = userTagsRaw
    .split(",")
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);

  const combinedTags = [
    ...defaultTags,
    ...userTags.filter(
      ut => !defaultTags.some(dt => dt.toLowerCase() === ut.toLowerCase())
    ),
  ];

  // Build a regex to match tags like [EXT], EXT:, or EXT (not attached to a word)
  const pattern = combinedTags
    .map(tag => `(?:\\[\\s*${tag}\\s*\\]|\\b${tag}\\b)\\s*:?\s*`)
    .join("|");

  const regex = new RegExp(`(?:${pattern})`, "gi");

  return subject.replace(regex, "").trim();
}


function collapsePrefixes(subject) {
  subject = subject.trim();

  // Normalize mapping
  const normalize = {
    re: "Re",
    aw: "Re",
    antw: "Re",
    fwd: "Fwd",
    wg: "Fwd"
  };

  const prefixPattern = /^(Re|Aw|Antw|Fwd|WG)(\*([0-9]+))?:\s*/i;
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

browser.windows.onCreated.addListener(async (window) => {
  try {
    const tabs = await browser.tabs.query({ windowId: window.id });

    for (const tab of tabs) {
      // Only handle tabs of type 'messageCompose'
      if (tab.type === "messageCompose") {
        setTimeout(async () => {
          await cleanSubjectOnCompose(tab);
        }, 250); // Delay to ensure compose window is fully loaded
      }
    }
  } catch (err) {
    console.error("Error handling compose window:", err);
  }
});

