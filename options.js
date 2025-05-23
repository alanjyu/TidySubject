document.addEventListener('DOMContentLoaded', () => {
  // Default tags to be used if none are saved
  const defaultTags = "EXT, Extern, External";

  const removeExtTag = document.getElementById('removeExtTag');
  const tagInputGroup = document.getElementById('tagInputGroup');
  const tagsInput = document.getElementById('tags');
  const saveTagsButton = document.getElementById('saveTags');
  const status = document.getElementById('status');

  const removePrefix = document.getElementById('removePrefix');
  const prefixOptions = document.getElementById('prefixOptions');
  const collapsePrefix = document.getElementById('collapsePrefix');
  const overwritePrefix = document.getElementById('overwritePrefix');

  // Load saved settings
  browser.storage.local.get([
    'removeExtTag',
    'tags',
    'removePrefix',
    'prefixOptions'
  ]).then((result) => {
    // Initialize Remove EXT Tags checkbox and tags input
    removeExtTag.checked = result.removeExtTag || true;

    // If user has saved tags, show them; else start with default tags
    tagsInput.value = result.tags && result.tags.trim().length > 0 ? result.tags : defaultTags;

    // Initialize Remove Prefix checkbox
    removePrefix.checked = result.collapsePrefix || true;

    // Show/hide prefix options based on removePrefix
    prefixOptions.style.display = removePrefix.checked ? 'block' : 'none';

    // Initialize prefix radio buttons with default to "collapse"
    if (!result.prefixOptions || (result.prefixOptions !== "collapse" && result.prefixOptions !== "overwrite")) {
      collapsePrefix.checked = true;  // default
    } else if (result.prefixOptions === "collapse") {
      collapsePrefix.checked = true;
    } else {
      overwritePrefix.checked = true;
    }
  });

  // Save tags only
  function saveTags() {
    browser.storage.local.set({
      tags: tagsInput.value
    }).then(() => {
      status.textContent = 'Tags saved.';
      setTimeout(() => status.textContent = '', 2000);
    });
  }

  // Auto-save checkbox values
  function saveStates() {
    browser.storage.local.set({
      removeExtTag: removeExtTag.checked,
      removePrefix: removePrefix.checked,
      prefixOptions: collapsePrefix.checked ? "collapse" : "overwrite"
    });
  }

  // Show/hide tag input based on removeExtTag checkbox
  function toggleTagInput() {
    tagInputGroup.style.display = removeExtTag.checked ? 'block' : 'none';
    saveStates();
  }

  // Show/hide prefix options based on removePrefix checkbox
  function togglePrefixOptions() {
    prefixOptions.style.display = removePrefix.checked ? 'block' : 'none';
    saveStates();
  }

  // Attach event listeners
  removeExtTag.addEventListener('change', toggleTagInput);
  removePrefix.addEventListener('change', togglePrefixOptions);

  collapsePrefix.addEventListener('change', saveStates);
  overwritePrefix.addEventListener('change', saveStates);

  saveTagsButton.addEventListener('click', (e) => {
    e.preventDefault();
    saveTags();
  });
});
