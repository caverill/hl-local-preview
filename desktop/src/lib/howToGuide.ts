export type HowToMediaItem = {
  label: string;
  /** Prefer MP4 — served from `desktop/public/how-to/` */
  video: string;
  alt: string;
};

export type HowToStep = {
  id: string;
  title: string;
  description: string;
  /** Single video step */
  video?: string;
  /** Multi-video step (e.g. CSS + JS) — use tabs in the modal */
  videos?: HowToMediaItem[];
  gif?: string;
  alt: string;
};

export const HOW_TO_STEPS: HowToStep[] = [
  {
    id: "setup",
    title: "Configure Setup",
    description:
      "Open Setup from the top bar. Choose your project folder, enter your dev site URL (SITE_URL), pick a CSS match mode, and save. Create any missing project files if prompted.",
    video: "/how-to/step-01.mp4",
    alt: "Configuring project folder and site URL in Setup",
  },
  {
    id: "script-files",
    title: "Install script files",
    description:
      "With Stylus (CSS) and Tampermonkey (JavaScript) installed in your browser, start the watcher for the mode you need. Quick Links will then activate — use the Stylus and Tampermonkey entries to install this project's preview scripts.",
    video: "/how-to/step-02.mp4",
    alt: "Installing script files from the quick links",
  },
  {
    id: "edit-css-js",
    title: "Edit CSS and JS in your editor",
    description:
      "Start the CSS and/or JS watcher from the sidebar — you can run one or both. Keep the Stylus install tab open with live reload for CSS. Edit main/styles.css or main/main.js, on save the watcher will rebuild the preview files.",
    videos: [
      {
        label: "CSS",
        video: "/how-to/step-03-css.mp4",
        alt: "Starting the CSS watcher and editing main/styles.css",
      },
      {
        label: "JS",
        video: "/how-to/step-03-js.mp4",
        alt: "Starting the JS watcher and editing main/main.js",
      },
    ],
    alt: "Starting the CSS and JS watchers",
  },
  {
    id: "preview",
    title: "Preview live on your dev site",
    description:
      "With extensions installed and the watcher running, open your dev site. Local CSS and JS previews inject automatically — edit files, save, and refresh to see changes.",
    gif: "/how-to/05-preview.gif",
    alt: "Seeing local CSS and JS changes on the dev site",
  },
];
