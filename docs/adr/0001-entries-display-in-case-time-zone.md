# Entries display in the Case Time Zone, not the device's current zone

Users cross time zones mid-Case but document every time in the zone where the Case started, so each Case records its Case Time Zone once (from the device, when the Case starts) and every Entry is displayed in that zone regardless of where the user is when saving. Each Entry stores its instant as an absolute UTC moment; the Case Time Zone is purely a display setting, which is what makes correcting a wrong Case Time Zone safe (no stored times change).

## Considered Options

- **Device-local zone per Entry**: rejected; a Case spanning Mountain → Eastern would show mixed zones and force the user to convert by hand.
- **One fixed "home" zone in Settings**: rejected; the starting zone differs from Case to Case.
