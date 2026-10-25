# create-apptify

Private, local-only legacy Apptify template tool. This package is not published. The only release package in this workspace is `tratify`; see `../tratify/README.md`. Requires Node.js 22 or later.

```sh
node tooling/create-playground.mjs ../my-app
cd ../my-app
npm install
npm run dev
```

Run the command from the workspace root after preparing the local template with `npm run prepack`. The target must be empty. Edit pages in `src/views/` and navigation in `src/App.vue`. Account forms need your own backend.

Uses the generator and template shipped with `apptify`. The generated app includes a portable library archive in `vendor/`.

`private: true` prevents publishing this package to npm. GitHub Actions publishing is disabled.
