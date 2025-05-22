async function cleanExtTags(subject) {
  const defaultTags = ["EXT", "EXTERN", "EXTERNAL"];
  const { userTags } = await browser.storage.local.get("tags");
  const tagList = userTags || defaultTags;

  const pattern = tagList
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
  // Normalize spacing
  subject = subject.trim();

  // Match if subject starts with "Fwd:" (case-insensitive)
  let fwdMatch = subject.match(/^(Fwd:\s*)/i);
  let prefixToKeep = "";

  if (fwdMatch) {
    prefixToKeep = fwdMatch[1]; // Keep this first Fwd: prefix with trailing space
    subject = subject.slice(prefixToKeep.length);
  }

  // Define prefixes to remove (case-insensitive)
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

  // Rebuild subject with kept prefix if any
  return prefixToKeep + subject.trim();
}

async function cleanSubjectOnCompose(tab) {
  try {
    const composeDetails = await browser.compose.getComposeDetails(tab.id);

    // Step 1: Remove tags like [EXT]
    let subject = await cleanExtTags(composeDetails.subject);

    // Step 2: Collapse prefixes properly from start
    subject = await collapsePrefixes(subject);

    // Update if changed
    if (subject !== composeDetails.subject) {
      await browser.compose.setComposeDetails(tab.id, { subject });
    }
  } catch (error) {
    console.error("Error cleaning subject:", error);
  }
}

// Execute the function before the email is sent
browser.compose.onBeforeSend.addListener(cleanSubjectOnCompose);
