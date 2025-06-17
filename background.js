const DEFAULT_TAGS = "EXT, Extern, External";
const DEFAULT_PREFIX_OPTIONS = "overwrite";
const DEFAULT_RE_ALIASES = "Re, Aw, Antw";
const DEFAULT_FWD_ALIASES = "Fw, Fwd, WG";
const DEFAULT_RE_SUBSTITUTE = "Re";
const DEFAULT_FWD_SUBSTITUTE = "Fwd";

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    const existing = await browser.storage.local.get([
      'removeExtTag',
      'tags',
      'removePrefix',
      'prefixOptions',
      'reAliases',
      'fwdAliases',
      'reSubstitutes',
      'fwdSubstitutes'
    ]);

    // Set defaults if they haven't been saved before
    await browser.storage.local.set({
      removeExtTag: existing.removeExtTag ?? true,
      tags: existing.tags ?? DEFAULT_TAGS,
      removePrefix: existing.removePrefix ?? true,
      prefixOptions: existing.prefixOptions ?? DEFAULT_PREFIX_OPTIONS,
      reAliases: existing.reAliases ?? DEFAULT_RE_ALIASES,
      fwdAliases: existing.fwdAliases ?? DEFAULT_FWD_ALIASES,
      reSubstitutes: existing.reSubstitutes ?? DEFAULT_RE_SUBSTITUTE,
      fwdSubstitutes: existing.fwdSubstitutes ?? DEFAULT_FWD_SUBSTITUTE
    });
  }
});

function getTags(subject, userTags) {
  if (!userTags.length) return { tags: '', rest: subject };
  const tagPattern = `\\[\\s*(?:${userTags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})\\s*\\]\\s*:?\s*`;
  const regex = new RegExp(tagPattern, "gi");
  let tags = '';
  let match;
  // Collect all tags
  while ((match = regex.exec(subject)) !== null) {
    tags += match[0].trim() + ' ';
  }
  // Remove all tags from subject
  const rest = subject.replace(regex, '').trim();
  return { tags: tags.trim(), rest };
}

async function getPrefixes () {
  const { reAliases, fwdAliases, reSubstitutes, fwdSubstitutes } = await browser.storage.local.get([
    'reAliases', 'fwdAliases', 'reSubstitutes', 'fwdSubstitutes'
  ]);
  const reList = (reAliases || DEFAULT_RE_ALIASES)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const fwdList = (fwdAliases || DEFAULT_FWD_ALIASES)
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const reSub = (reSubstitutes || DEFAULT_RE_SUBSTITUTE).trim();
  const fwdSub = (fwdSubstitutes || DEFAULT_FWD_SUBSTITUTE).trim();

  return { reList, fwdList, reSub, fwdSub };
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
  const { reList, fwdList, reSub, fwdSub } = await getPrefixes();

  // Normalize mapping
  const normalize = {};
  reList.forEach(alias => normalize[alias.toLowerCase()] = reSub);
  fwdList.forEach(alias => normalize[alias.toLowerCase()] = fwdSub);

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
  const { reList, fwdList, reSub, fwdSub } = await getPrefixes();

  // Build regex for first prefix to keep
  const keepPattern = new RegExp(`^(${[...reList, ...fwdList].map(a => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")}):\\s*`, "i");
  let prefixToKeep = "";
  let prefixNorm = "";

  const firstPrefixMatch = subject.match(keepPattern);
  if (firstPrefixMatch) {
    const raw = firstPrefixMatch[1].toLowerCase();
    if (reList.map(a => a.toLowerCase()).includes(raw)) {
      prefixNorm = reSub;
    } else if (fwdList.map(a => a.toLowerCase()).includes(raw)) {
      prefixNorm = fwdSub;
    } else {
      prefixNorm = firstPrefixMatch[1];
    }
    prefixToKeep = `${prefixNorm}: `;
    subject = subject.slice(firstPrefixMatch[0].length);
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
    
    let removeExtTag = settings.removeExtTag ?? true;
    let removePrefix = settings.removePrefix ?? true;
    let prefixOptions = settings.prefixOptions ?? DEFAULT_PREFIX_OPTIONS;

    let subject = composeDetails.subject;

    // Always extract tags first
    const userTags = (settings.tags || DEFAULT_TAGS).split(",").map(t => t.trim()).filter(Boolean);
    let { tags, rest } = getTags(subject, userTags);

    // Step 1: Remove EXT tags if enabled (skip adding tags back)
    if (removeExtTag) {
      tags = '';
    }

    // Step 2: Process prefixes on the rest of the subject
    if (removePrefix && prefixOptions === "collapse") {
      rest = await collapsePrefixes(rest);
    }
    if (removePrefix && prefixOptions === "overwrite") {
      rest = await overwritePrefixes(rest);
    }

    // Rebuild subject: tags (if not removed) + cleaned rest
    subject = (tags ? tags + ' ' : '') + rest;

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
        await cleanSubjectOnCompose(tab);
      }
    }
  } catch (err) {
    console.error("Error handling compose window:", err);
  }
});