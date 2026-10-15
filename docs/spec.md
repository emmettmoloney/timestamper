# TimeStamper build spec

Agreed decisions as of 14 Oct 2026. Terms follow [CONTEXT.md](../CONTEXT.md). Prototypes live in `prototype/` and are throwaway.

## Product

- PWA, plain HTML/JS, no framework, on-device storage only (no server, accounts, sync or export integration). Hosted on GitHub Pages.
- Each Entry stores an absolute instant; the Case Time Zone only controls display ([ADR 0001](adr/0001-entries-display-in-case-time-zone.md)).
- A Case starts on the first Save with no Active Case, using the phone's current zone. New Case closes it (with confirmation).
- Stale Case: Save after 4 hours with no Entry asks "Start a new case?" first.
- An Entry needs an Operation, a Note, or both. Fields clear after Save; toast "Saved 14:07 MDT".
- Edits keep the Original Timestamp and mark the Entry as edited. Late Entries can be added to any Case and are marked "Added".
- Entries and Cases can be deleted, always with an in-app confirmation. Nothing is ever deleted automatically.
- Case Time Zone can be corrected on the Review page; Cases can be renamed (optional).
- Copy log button: plain text of the Case Log, including the UTC offset. No reminder prompts.
- Data protection: request persistent storage; one-time "Add to Home Screen" guide on iPhone and Android until installed.
- Privacy: Note placeholder "Times & events only, no patient identifiers"; warning in Settings.

## Display

- 24-hour time, no seconds, zone abbreviation (`14:07 MDT`). Date shown once per day as a heading (`14 Oct 2026`).
- All times in a fixed-width font; body text in the regular font.

## Screens

- **Navigation bar** (prototype variant C): Log · Review · Settings. The active tab fills with the highlight color.
- **Log**
  - Top: the case line (variant A) shows the case name and start time, with an outlined **New case** button.
  - Below that: the Operation dropdown and the Note field.
  - Then the **Save is the clock** button (variant B): a large button showing the live time in the Case Time Zone, the zone, "phone shows …" when the phone's zone differs, and "Tap to save".
- **Review**
  - Top: "This case" / "All cases" segmented control (variant C). Past Cases appear only under "All cases".
  - "This case": case header, then the vertical timeline (variant B), then Copy log, Add Entry (a Late Entry) and Delete case. Tap an Entry to edit or delete it; the edit sheet opens with no field focused, so the date picker stays closed until tapped.
- **Settings**
  - Installed version (from the offline cache name, set by `VERSION` in `sw.js`) under the heading.
  - Appearance picker, then the Operation list: add, rename, reorder (↑/↓), remove, and restore the default list.
  - Default Operations: Arrive Airport 1, Depart Airport 1, Arrive Airport 2, Depart Airport 2, Arrive Sending, Depart Sending, Arrive Receiving, Handoff.
  - Privacy warning.

## Palettes

Hex values are taken from `prototype/palettes-v2.prototype.html`.

| Option | Use | bg | ink | Save button (bg / text) |
|---|---|---|---|---|
| Match phone (default) | Graphite E-Ink when the phone is light, Amber Instrument when it is dark | | | |
| Graphite E-Ink | Light mode; glare-resistant, monochrome | #e8e8e4 | #111111 | #111111 / #ffffff |
| Amber Instrument | Dark mode; dim cab at night, unaided eyes | #120e08 | #ffb000 | #ffb000 / #120e08 |
| Sunlight | Direct sun, maximum contrast | #ffffff | #000000 | #000000 / #fffd30 |
| Night (red) | Dark cockpit, unaided eyes; never under NVGs | #000000 | #e0392b | #3d0000 / #ff5040 |
| NVG (green) | Under goggles, brightness at minimum | #000000 | #3b9a48 | #062b0c / #5cc96b |

- In Night and NVG, delete buttons use a dashed outline instead of a red color.
- Night shows a reminder to switch to NVG before putting on goggles.
- NVG shows a reminder to set brightness to minimum and to test the palette under goggles before flight. Phone screens are not NVIS-certified.
