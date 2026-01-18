# Spelling List Sorter

Practice spelling words by hearing them aloud, typing what you hear, and dragging each card into the right word family bucket.

## Live site
- https://gentle-smoke-0a84cc810.4.azurestaticapps.net/

## Run locally
- Install dependencies: `npm install`
- Start the dev server: `npm run dev` then open http://localhost:3000
- Build a static export: `npm run build` (output in `out/`)

## Add a new week
1. Open `src/data/spelling-lists.json`.
2. Add an object with an `id`, `label`, `groups`, and `words` array. `groups` defines the bucket headings and order.
3. Each word entry needs a `word`, a `sentence` (used for the speech prompt), and a `group` that matches one of the group keys.
4. Restart the dev server (or rebuild) so the new list shows up in the dropdown.
5. Want to contribute it back? See the GitHub workflow below.

Example entry:

```json
{
  "id": "sort-28",
  "label": "Sort #28",
  "groups": ["group-a", "group-b", "oddball"],
  "words": [
    { "word": "example", "sentence": "Use me in a sentence.", "group": "group-a" }
  ]
}
```

### GitHub workflow (add-and-PR)
1. Clone the repo: `git clone https://github.com/kevinfosterNG/spelling-list.git && cd spelling-list`
2. Create a branch: `git checkout -b add-week-28` (replace the name as needed).
3. Add your list in `src/data/spelling-lists.json`, then run `npm test` (if present) or at least `npm run build` to ensure it exports cleanly.
4. Commit and push: `git commit -am "Add week 28 list"` then `git push origin add-week-28`.
5. Open a Pull Request to `main` on GitHub: https://github.com/kevinfosterNG/spelling-list/pulls and include a note about the new week you added.
