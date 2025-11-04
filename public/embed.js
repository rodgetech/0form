/**
 * Oform Embed Script
 *
 * Usage Mode 1 - Create inline iframe:
 * <script src="https://your-domain.com/embed.js" data-form-id="your-form-id"></script>
 *
 * Usage Mode 2 - Enhance existing iframe (no duplicates):
 * <iframe src="https://your-domain.com/f/your-form-id" class="oform-embed"></iframe>
 * <script src="https://your-domain.com/embed.js"></script>
 *
 * Optional attributes for Mode 1:
 * - data-height: Custom height (default: "600px")
 *
 * Example:
 * <script src="https://your-domain.com/embed.js" data-form-id="abc123" data-height="800px"></script>
 */
(() => {
  // Get the current script element
  const currentScript = document.currentScript;

  if (!currentScript) {
    console.error(
      "[Oform Embed] Error: document.currentScript is not available"
    );
    return;
  }

  // Get the origin from the script src
  const scriptSrc = currentScript.src;
  const scriptUrl = new URL(scriptSrc);
  const origin = scriptUrl.origin;

  // Read configuration from data attributes
  const formId = currentScript.dataset.formId;
  const height = currentScript.dataset.height || "600px";

  // MODE 1: Create new iframe if data-form-id is provided
  if (formId) {
    // Create the iframe element
    const iframe = document.createElement("iframe");
    iframe.src = `${origin}/f/${formId}`;
    iframe.style.width = "100%";
    iframe.style.height = height;
    iframe.style.border = "0";
    iframe.frameBorder = "0";
    iframe.setAttribute("allow", "microphone; camera; clipboard-write");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("title", "Oform Embedded Form");
    iframe.classList.add("oform-embed");

    // Insert the iframe after the script tag
    currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
  }

  // MODE 2: Enhance existing iframes with class="oform-embed"
  // This runs regardless of whether we created a new iframe above
  const existingIframes = document.querySelectorAll("iframe.oform-embed");

  existingIframes.forEach((iframe) => {
    // Ensure iframe has proper attributes
    if (!iframe.getAttribute("allow")) {
      iframe.setAttribute("allow", "microphone; camera; clipboard-write");
    }
    if (!iframe.getAttribute("title")) {
      iframe.setAttribute("title", "Oform Embedded Form");
    }

    // Add responsive sizing listener for this iframe
    window.addEventListener("message", (event) => {
      // Verify the message is from our iframe
      if (event.origin !== origin) {
        return;
      }

      // Handle resize messages
      if (event.data && event.data.type === "oform-resize") {
        const newHeight = event.data.height;
        if (newHeight && typeof newHeight === "number") {
          iframe.style.height = `${newHeight}px`;
        }
      }
    });
  });
})();
