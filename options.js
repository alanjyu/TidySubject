document.addEventListener("DOMContentLoaded", async () => {
  const { tags } = await browser.storage.local.get("tags");
  document.getElementById("tags").value = tags ? tags.join(", ") : "EXT", "EXTERN", "EXTERNAL";
});

document.getElementById("tagForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tagInput = document.getElementById("tags").value;
  const tagArray = tagInput.split(",").map(t => t.trim()).filter(Boolean);
  await browser.storage.local.set({ tags: tagArray });

  document.getElementById("status").textContent = "Tags saved!";
  setTimeout(() => {
    document.getElementById("status").textContent = "";
  }, 2000);
});
