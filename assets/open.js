(() => {
  const form = document.querySelector("#business-file-form");
  if (!form) return;

  const allowedBySlot = {
    customer_calls: new Set(["pdf", "docx", "txt", "mp3", "m4a", "wav", "mp4"]),
    company_presentation: new Set(["pdf", "docx", "pptx", "txt", "md", "png", "jpg", "webp"]),
    anything_else: new Set(["txt"])
  };
  const maximumFiles = 20;
  const maximumFileBytes = 200 * 1024 * 1024;
  const freeMailDomains = new Set(["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "proton.me", "protonmail.com", "mail.ru", "yandex.ru", "yandex.com"]);
  const freeMailNames = new Set(["gmail", "yahoo", "hotmail", "outlook", "icloud", "proton", "protonmail", "yandex"]);
  const uploadState = new Map();
  const submitButton = form.querySelector(".submit-file");
  let freeEmailSubmitAttempts = 0;

  const getField = (id) => document.getElementById(id);
  const setError = (id, message = "") => {
    const node = getField(id);
    if (node) node.textContent = message;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  };

  const extensionOf = (file) => file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "";

  const websiteValue = (mutate = false) => {
    const field = getField("website");
    const value = field.value.trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const normalized = `https://${value}`;
    if (mutate) field.value = normalized;
    return normalized;
  };

  const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const emailDomain = (value) => value.trim().toLowerCase().split("@").pop() || "";
  const freeMailDomain = (value) => {
    const domain = emailDomain(value);
    return freeMailDomains.has(domain) || freeMailNames.has(domain.split(".")[0]);
  };
  const freeMailMessage = "A company address, please — the chronicle goes there.";

  const validateName = (showError = true) => {
    const valid = Boolean(getField("name").value.trim());
    if (showError) setError("name-error", valid ? "" : "Your name is required.");
    return valid;
  };

  const validateEmail = (showError = true, blockFreeMail = false) => {
    const value = getField("work-email").value.trim();
    let message = "";
    let valid = true;
    if (!value) {
      valid = false;
      message = "Work email is required.";
    } else if (!validEmail(value)) {
      valid = false;
      message = "Enter a valid work email.";
    } else if (freeMailDomain(value)) {
      message = freeMailMessage;
      valid = !blockFreeMail;
    }
    if (showError) setError("work-email-error", message);
    return valid;
  };

  const validateWebsite = (showError = true) => {
    const value = websiteValue(showError);
    let message = "";
    let valid = true;
    if (!value) {
      valid = false;
      message = "Your website is required.";
    } else {
      try {
        const parsed = new URL(value);
        valid = parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        valid = false;
      }
      if (!valid) message = "Enter a valid website.";
    }
    if (showError) setError("website-error", message);
    return valid;
  };

  const selectedUploads = () => [...uploadState.entries()].flatMap(([section, files]) => {
    const slot = section.dataset.slot;
    return files.map((file, index) => ({ file, slot, section, index }));
  });

  const validateFiles = (showError = true) => {
    if (showError) {
      setError("customer-calls-error");
      setError("documents-error");
      setError("anything-else-error");
      setError("files-error");
    }
    const files = selectedUploads();
    let valid = true;
    const note = getField("anything-else").value.trim();
    const totalFiles = files.length + (note ? 1 : 0);
    if (totalFiles > maximumFiles) {
      if (showError) setError("files-error", "A business file can contain no more than 20 files.");
      valid = false;
    }
    for (const { file, slot, section } of files) {
      const extension = extensionOf(file);
      const errorId = section.querySelector(".field-error")?.id || "files-error";
      if (!allowedBySlot[slot]?.has(extension)) {
        if (showError) setError(errorId, `${file.name} is not accepted by the current upload server.`);
        valid = false;
        break;
      }
      if (file.size > maximumFileBytes) {
        if (showError) setError(errorId, `${file.name} is larger than the current 200 MB server cap.`);
        valid = false;
        break;
      }
    }
    return valid;
  };

  const requiredFieldsPass = () => validateName(false) && validateEmail(false, false) && validateWebsite(false) && validateFiles(false);

  const refreshSubmitState = () => {
    submitButton.disabled = !requiredFieldsPass();
  };

  const renderFiles = (section) => {
    const list = section.querySelector(".file-list");
    const files = uploadState.get(section) || [];
    list.replaceChildren();
    files.forEach((file, index) => {
      const item = document.createElement("li");
      const detail = document.createElement("span");
      const remove = document.createElement("button");
      const progress = document.createElement("span");
      detail.textContent = `${file.name} · ${formatBytes(file.size)}`;
      remove.type = "button";
      remove.className = "remove-file";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      progress.className = "upload-progress";
      progress.dataset.progress = `${section.dataset.slot}:${index}`;
      item.append(detail, remove, progress);
      remove.addEventListener("click", () => {
        const next = [...files];
        next.splice(index, 1);
        uploadState.set(section, next);
        renderFiles(section);
        validateFiles(true);
        refreshSubmitState();
      });
      list.append(item);
    });
  };

  const addFiles = (section, fileList) => {
    uploadState.set(section, [...(uploadState.get(section) || []), ...fileList]);
    section.querySelector("input[type='file']").value = "";
    renderFiles(section);
    validateFiles(true);
    refreshSubmitState();
  };

  form.querySelectorAll("[data-upload-zone]").forEach((section) => {
    uploadState.set(section, []);
    const input = section.querySelector("input[type='file']");
    const dropZone = section.querySelector(".drop-zone");
    input.addEventListener("change", () => addFiles(section, [...input.files]));
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, () => dropZone.classList.remove("is-dragging"));
    });
    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      addFiles(section, [...event.dataTransfer.files]);
    });
  });

  ["name", "work-email", "website"].forEach((id) => {
    const field = getField(id);
    field.addEventListener("blur", () => {
      if (id === "name") validateName(true);
      if (id === "work-email") {
        freeEmailSubmitAttempts = 0;
        validateEmail(true, false);
      }
      if (id === "website") validateWebsite(true);
      refreshSubmitState();
    });
    field.addEventListener("input", () => {
      if (id === "work-email") freeEmailSubmitAttempts = 0;
      refreshSubmitState();
    });
  });

  form.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.target.matches("input:not([type='file'])")) {
      event.preventDefault();
    }
  });

  const fetchJson = async (url, options) => {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The file could not be received.");
    return payload;
  };

  const uploadFile = (draftId, file, slot, progressNode) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `/api/open/drafts/${draftId}/files`);
    request.responseType = "json";
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    request.setRequestHeader("X-File-Slot", slot);
    request.upload.addEventListener("progress", (event) => {
      if (!progressNode || !event.lengthComputable) return;
      progressNode.style.setProperty("--progress", `${Math.round((event.loaded / event.total) * 100)}%`);
    });
    request.addEventListener("load", () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response || {});
      } else {
        reject(new Error(request.response?.error || "The file could not be received."));
      }
    });
    request.addEventListener("error", () => reject(new Error("The upload failed.")));
    request.send(file);
  });

  const setSubmitLabel = (label) => {
    submitButton.textContent = label;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("form-error");
    const hardValid = validateName(true) && validateEmail(true, false) && validateWebsite(true) && validateFiles(true);
    if (!hardValid) {
      form.querySelector(".field-error:not(:empty)")?.scrollIntoView({ behavior: "smooth", block: "center" });
      refreshSubmitState();
      return;
    }
    const email = getField("work-email").value.trim();
    if (freeMailDomain(email) && freeEmailSubmitAttempts < 1) {
      freeEmailSubmitAttempts += 1;
      setError("work-email-error", freeMailMessage);
      getField("work-email").focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.classList.add("is-busy");
    let draftId = "";
    try {
      const draft = await fetchJson("/api/open/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      draftId = draft.draft_id;
      const uploads = selectedUploads();
      const note = getField("anything-else").value.trim();
      if (note) {
        uploads.push({
          file: new File([note], "anything-else.txt", { type: "text/plain" }),
          slot: "anything_else",
          section: form.querySelector("#anything-else").closest(".form-section")
        });
      }
      setSubmitLabel("Uploading…");
      for (const upload of uploads) {
        const progressNode = upload.section?.querySelector?.(`[data-progress='${upload.slot}:${upload.index}']`);
        await uploadFile(draftId, upload.file, upload.slot, progressNode);
        if (progressNode) progressNode.style.setProperty("--progress", "100%");
      }
      setSubmitLabel("Sending…");
      await fetchJson(`/api/open/drafts/${draftId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: websiteValue(true),
          name: getField("name").value.trim(),
          work_email: email,
          phone: getField("alternate-contact").value.trim() || "email",
          role: getField("role").value.trim(),
          channels: ["Email"]
        })
      });
      getField("confirmation-email").textContent = email;
      getField("open-form-view").hidden = true;
      getField("confirmation-view").hidden = false;
      document.title = "Got it. Your scan is running. | coin.im";
      window.scrollTo({ top: 0, behavior: "instant" });
      getField("confirmation-title").focus({ preventScroll: true });
    } catch (error) {
      setError("form-error", error.message);
      if (draftId) fetch(`/api/open/drafts/${draftId}`, { method: "DELETE" }).catch(() => {});
      setSubmitLabel("Send and start the scan");
      submitButton.classList.remove("is-busy");
      refreshSubmitState();
    }
  });

  refreshSubmitState();
})();
