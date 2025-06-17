const DEFAULT_RE_ALIASES = "Re, Aw, Antw";
const DEFAULT_FWD_ALIASES = "Fw, Fwd, WG";
const DEFAULT_RE_SUBSTITUTE = "Re";
const DEFAULT_FWD_SUBSTITUTE = "Fwd";
const DEFAULT_TAGS = "EXT, Extern, External";

document.addEventListener('DOMContentLoaded', () => {
  const debounceDelay = 500;

  const removeExtTag = document.getElementById('removeExtTag');
  const tagInputGroup = document.getElementById('tagInputGroup');
  const tagInput = document.getElementById('tagInput');

  const removePrefix = document.getElementById('removePrefix');
  const prefixOptions = document.getElementById('prefixOptions');
  const collapsePrefix = document.getElementById('collapsePrefix');
  const overwritePrefix = document.getElementById('overwritePrefix');
  const prefixExample = document.getElementById("prefixExample");

  const reAliasesInput = document.getElementById('reAliases');
  const fwdAliasesInput = document.getElementById('fwdAliases');
  const reSubstitutesInput = document.getElementById('reSubstitutes');
  const fwdSubstitutesInput = document.getElementById('fwdSubstitutes');

  const resetTagsButton = document.getElementById('resetTags');
  const resetReAliasesButton = document.getElementById('resetReAliases');
  const resetFwdAliasesButton = document.getElementById('resetFwdAliases');
  const resetReSubstitutesButton = document.getElementById('resetReSubstitutes');
  const resetFwdSubstitutesButton = document.getElementById('resetFwdSubstitutes');

  const status = document.getElementById('status');

  browser.storage.local.get([
    'removeExtTag',
    'tags',
    'removePrefix',
    'prefixOptions',
    'reAliases',
    'fwdAliases',
    'reSubstitutes',
    'fwdSubstitutes'
  ]).then((result) => {
    removeExtTag.checked = result.removeExtTag ?? true;
    tagInput.value = result.tags?.trim() || DEFAULT_TAGS;

    removePrefix.checked = result.removePrefix ?? true;
    prefixOptions.style.display = removePrefix.checked ? 'flex' : 'none';

    if (!result.prefixOptions || (result.prefixOptions !== "collapse" && result.prefixOptions !== "overwrite")) {
      collapsePrefix.checked = true;
    } else {
      collapsePrefix.checked = result.prefixOptions === "collapse";
      overwritePrefix.checked = result.prefixOptions === "overwrite";
    }

    reAliasesInput.value = result.reAliases?.trim() || DEFAULT_RE_ALIASES;
    fwdAliasesInput.value = result.fwdAliases?.trim() || DEFAULT_FWD_ALIASES;
    reSubstitutesInput.value = result.reSubstitutes?.trim() || DEFAULT_RE_SUBSTITUTE;
    fwdSubstitutesInput.value = result.fwdSubstitutes?.trim() || DEFAULT_FWD_SUBSTITUTE;

    tagInputGroup.style.display = removeExtTag.checked ? 'flex' : 'none';
    updateExampleText();
  });

  function debounce(callback, delay) {
    let timeout;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(callback, delay);
    };
  }

  function flashSaved(input) {
    input.classList.remove('input-saved'); // Restart animation if needed
    void input.offsetWidth; // Force reflow
    input.classList.add('input-saved');
  }

  const debouncedSaveTags = debounce(() => {
    browser.storage.local.set({
      tags: tagInput.value
    });
    flashSaved(tagInput);
  }, debounceDelay);

  const debouncedSaveReAliases = debounce(() => {
    browser.storage.local.set({
      reAliases: reAliasesInput.value
    });
    flashSaved(reAliasesInput);
  }, debounceDelay);

  const debouncedSaveFwdAliases = debounce(() => {
    browser.storage.local.set({
      fwdAliases: fwdAliasesInput.value
    });
    flashSaved(fwdAliasesInput);
  }, debounceDelay);

  const debouncedSaveReSubstitutes = debounce(() => {
    browser.storage.local.set({
      reSubstitutes: reSubstitutesInput.value
    });
    flashSaved(reSubstitutesInput);
  }, debounceDelay);

  const debouncedSaveFwdSubstitutes = debounce(() => {
    browser.storage.local.set({
      fwdSubstitutes: fwdSubstitutesInput.value
    });
    flashSaved(fwdSubstitutesInput);
  }, debounceDelay);

  function toggleTagInput() {
    tagInputGroup.style.display = removeExtTag.checked ? 'flex' : 'none';
    saveStates();
  }

  function togglePrefixOptions() {
    prefixOptions.style.display = removePrefix.checked ? 'flex' : 'none';
    saveStates();
  }

  function saveStates() {
    browser.storage.local.set({
      removeExtTag: removeExtTag.checked,
      removePrefix: removePrefix.checked,
      prefixOptions: collapsePrefix.checked ? "collapse" : "overwrite"
    });
  }

  function updateExampleText() {
    if (overwritePrefix.checked) {
      prefixExample.innerHTML = "Fwd: Re: Aw: Re: → Fwd:";
    } else if (collapsePrefix.checked) {
      prefixExample.innerHTML = "Fwd: Re: Aw: Re: → Fwd: Re*3:";
    }
  }

  updateExampleText();

  // Update on change
  overwritePrefix.addEventListener("change", updateExampleText);
  collapsePrefix.addEventListener("change", updateExampleText);

  overwritePrefix.addEventListener('change', saveStates);
  collapsePrefix.addEventListener('change', saveStates);

  removeExtTag.addEventListener('change', toggleTagInput);
  removePrefix.addEventListener('change', togglePrefixOptions);

  tagInput.addEventListener('input', debouncedSaveTags);
  reAliasesInput.addEventListener('input', debouncedSaveReAliases);
  fwdAliasesInput.addEventListener('input', debouncedSaveFwdAliases);

  reSubstitutesInput.addEventListener('input', debouncedSaveReSubstitutes);
  fwdSubstitutesInput.addEventListener('input', debouncedSaveFwdSubstitutes);

  // Reset buttons
  resetTagsButton.addEventListener('click', () => {
    tagInput.value = DEFAULT_TAGS;
    debouncedSaveTags();
  });
  resetReAliasesButton.addEventListener('click', () => {
    reAliasesInput.value = DEFAULT_RE_ALIASES;
    debouncedSaveReAliases();
  });
  resetFwdAliasesButton.addEventListener('click', () => {
    fwdAliasesInput.value = DEFAULT_FWD_ALIASES;
    debouncedSaveFwdAliases();
  });
  resetReSubstitutesButton.addEventListener('click', () => {
    reSubstitutesInput.value = DEFAULT_RE_SUBSTITUTE;
    debouncedSaveReSubstitutes();
  });
  resetFwdSubstitutesButton.addEventListener('click', () => {
    fwdSubstitutesInput.value = DEFAULT_FWD_SUBSTITUTE;
    debouncedSaveFwdSubstitutes();
  });
});