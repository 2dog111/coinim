(() => {
  const form = document.querySelector("#business-file-form");
  if (!form) return;

  const allowedExtensions = new Set([
    "pdf", "docx", "pptx", "txt", "md", "mp3", "m4a", "wav", "mp4", "png", "jpg", "webp"
  ]);
  const maximumFiles = 20;
  const maximumFileBytes = 200 * 1024 * 1024;
  const contactButtons = [...form.querySelectorAll(".contact-choice")];
  const submitButton = form.querySelector(".submit-file");

  const setError = (id, message = "") => {
    const node = document.getElementById(id);
    if (node) node.textContent = message;
  };

  const clearErrors = () => {
    ["website-error", "files-error", "name-error", "work-email-error", "phone-error", "channels-error", "form-error"]
      .forEach((id) => setError(id));
  };

  const selectedChannels = () => contactButtons
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.dataset.channel);

  const collectedFiles = () => [...form.querySelectorAll(".upload-section")].flatMap((section) => {
    const slot = section.dataset.slot;
    return [...section.querySelectorAll("input[type='file']")].flatMap((input) =>
      [...input.files].map((file) => ({ file, slot }))
    );
  });

  const validate = () => {
    clearErrors();
    let valid = true;
    const required = [
      ["name", "name-error", "Your name is required."],
      ["work-email", "work-email-error", "Work email is required."],
      ["phone", "phone-error", "Phone is required."]
    ];
    required.forEach(([fieldId, errorId, message]) => {
      const field = document.getElementById(fieldId);
      if (!field.value.trim()) {
        setError(errorId, message);
        valid = false;
      }
    });

    const email = document.getElementById("work-email");
    if (email.value.trim() && !email.validity.valid) {
      setError("work-email-error", "Enter a valid work email.");
      valid = false;
    }

    const website = document.getElementById("website");
    if (website.value.trim() && !website.validity.valid) {
      setError("website-error", "Enter a website beginning with http:// or https://.");
      valid = false;
    }

    if (!selectedChannels().length) {
      setError("channels-error", "Choose at least one way for us to reach you.");
      valid = false;
    }

    const files = collectedFiles();
    if (files.length > maximumFiles) {
      setError("files-error", "A business file can contain no more than 20 files.");
      valid = false;
    }
    for (const { file } of files) {
      const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";
      if (!allowedExtensions.has(extension)) {
        setError("files-error", `${file.name} is not an accepted file type.`);
        valid = false;
        break;
      }
      if (file.size > maximumFileBytes) {
        setError("files-error", `${file.name} is larger than 200 MB.`);
        valid = false;
        break;
      }
    }
    return valid;
  };

  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The file could not be received.");
    return payload;
  };

  contactButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", selected ? "false" : "true");
      button.classList.toggle("is-selected", !selected);
      setError("channels-error");
    });
  });

  form.querySelectorAll(".add-file").forEach((button) => {
    button.addEventListener("click", () => {
      const section = button.closest(".upload-section");
      const source = section.querySelector("input[type='file']");
      const input = source.cloneNode();
      input.value = "";
      section.querySelector(".file-inputs").append(input);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) {
      form.querySelector(".field-error:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitButton.disabled = true;
    let draftId = "";
    try {
      const draft = await fetchJson("/api/open/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      draftId = draft.draft_id;
      for (const { file, slot } of collectedFiles()) {
        await fetchJson(`/api/open/drafts/${draftId}/files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
            "X-File-Slot": slot
          },
          body: file
        });
      }
      await fetchJson(`/api/open/drafts/${draftId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: document.getElementById("website").value.trim(),
          name: document.getElementById("name").value.trim(),
          work_email: document.getElementById("work-email").value.trim(),
          phone: document.getElementById("phone").value.trim(),
          role: document.getElementById("role").value.trim(),
          channels: selectedChannels()
        })
      });
      document.getElementById("open-form-view").hidden = true;
      document.getElementById("confirmation-view").hidden = false;
      document.title = "Received | coin.im";
      window.scrollTo({ top: 0, behavior: "instant" });
      document.getElementById("confirmation-title").focus({ preventScroll: true });
    } catch (error) {
      setError("form-error", error.message);
      if (draftId) fetch(`/api/open/drafts/${draftId}`, { method: "DELETE" }).catch(() => {});
    } finally {
      submitButton.disabled = false;
    }
  });
})();
