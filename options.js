document.addEventListener('DOMContentLoaded', () => {
  const defaultTags = "Ext, Extern, External";
  const defaultReAliases = "Re, Aw, Antw";
  const defaultFwdAliases = "Fwd, WG";

  const debounceDelay = 500;
  const statusDelay = 2000;

  const removeExtTag = document.getElementById('removeExtTag');
  const tagInputGroup = document.getElementById('tagInputGroup');
  const tagsInput = document.getElementById('tags');

  const removePrefix = document.getElementById('removePrefix');
  const prefixOptions = document.getElementById('prefixOptions');
  const collapsePrefix = document.getElementById('collapsePrefix');
  const overwritePrefix = document.getElementById('overwritePrefix');

  const reAliasesInput = document.getElementById('reAliases');
  const fwdAliasesInput = document.getElementById('fwdAliases');

  const status = document.getElementById('status');

  browser.storage.local.get([
    'removeExtTag',
    'tags',
    'removePrefix',
    'prefixOptions',
    'reAliases',
    'fwdAliases'
  ]).then((result) => {
    removeExtTag.checked = result.removeExtTag ?? true;
    tagsInput.value = result.tags?.trim() || defaultTags;

    removePrefix.checked = result.removePrefix ?? true;
    prefixOptions.style.display = removePrefix.checked ? 'block' : 'none';

    if (!result.prefixOptions || (result.prefixOptions !== "collapse" && result.prefixOptions !== "overwrite")) {
      collapsePrefix.checked = true;
    } else {
      collapsePrefix.checked = result.prefixOptions === "collapse";
      overwritePrefix.checked = result.prefixOptions === "overwrite";
    }

    reAliasesInput.value = result.reAliases?.trim() || defaultReAliases;
    fwdAliasesInput.value = result.fwdAliases?.trim() || defaultFwdAliases;

    tagInputGroup.style.display = removeExtTag.checked ? 'block' : 'none';
  });

  function debounce(callback, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(callback, delay);
    };
  }

  const debouncedSaveTags = debounce(() => {
    browser.storage.local.set({
      tags: tagsInput.value
    }).then(() => {
      status.textContent = 'Tags saved.';
      setTimeout(() => status.textContent = '', statusDelay);
    });
  }, debounceDelay);

  const debouncedSaveReAliases = debounce(() => {
    browser.storage.local.set({
      reAliases: reAliases.value
    }).then(() => {
      status.textContent = 'Re aliases saved.';
      setTimeout(() => status.textContent = '', statusDelay);
    });
  }, debounceDelay);

  const debouncedSaveFwdAliases = debounce(() => {
    browser.storage.local.set({
      fwdAliases: fwdAliases.value
    }).then(() => {
      status.textContent = 'Fwd aliases saved.';
      setTimeout(() => status.textContent = '', statusDelay);
    });
  }, debounceDelay);

  function toggleTagInput() {
    tagInputGroup.style.display = removeExtTag.checked ? 'block' : 'none';
    saveStates();
  }

  function togglePrefixOptions() {
    prefixOptions.style.display = removePrefix.checked ? 'block' : 'none';
    saveStates();
  }

  function saveStates() {
    browser.storage.local.set({
      removeExtTag: removeExtTag.checked,
      removePrefix: removePrefix.checked,
      prefixOptions: collapsePrefix.checked ? "collapse" : "overwrite"
    });
  }

  removeExtTag.addEventListener('change', toggleTagInput);
  removePrefix.addEventListener('change', togglePrefixOptions);
  collapsePrefix.addEventListener('change', saveStates);
  overwritePrefix.addEventListener('change', saveStates);

  tagsInput.addEventListener('input', debouncedSaveTags);
  reAliasesInput.addEventListener('input', debouncedSaveReAliases);
  fwdAliasesInput.addEventListener('input', debouncedSaveFwdAliases);
});
