// Host file plumbing for the local backup (ARCHITECTURE section 3: browser
// adapters). The application layer owns the file contents; this module only
// moves text between the device and the browser.

export interface PickedTextFile {
  readonly name: string;
  readonly text: string;
}

/** Saves `text` under `name` through a temporary download anchor. */
export function downloadTextFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  // Safari and Firefox only honour a download from an anchor that is in the
  // document, and Safari can still be starting the download when the blob is
  // released, so the anchor is attached for the click and the URL is revoked
  // well after it (the window file-saver uses for the same reason).
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 40_000);
}

export function readTextFile(file: File): Promise<PickedTextFile> {
  return file.text().then((text) => ({ name: file.name, text }));
}

/** Opens the OS picker for a `.json` file. Resolves null when the user closes
 * it without choosing. The input is mounted inside the open dialog: a background
 * subtree is inert while a dialog is open and would swallow the click. */
export function pickTextFile(): Promise<PickedTextFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0] ?? null;
      input.remove();
      if (file === null) {
        resolve(null);
        return;
      }
      readTextFile(file).then(resolve, () => resolve(null));
    });
    // Not every browser fires this on a cancelled picker; the input stays
    // hidden and inert either way.
    input.addEventListener('cancel', () => {
      input.remove();
      resolve(null);
    });
    const dialogs = document.querySelectorAll('[role="dialog"]');
    (dialogs[dialogs.length - 1] ?? document.body).appendChild(input);
    input.click();
  });
}
