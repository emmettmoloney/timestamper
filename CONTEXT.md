# TimeStamper

A field tool for recording the exact times that phases of a movement occur, across fixed wing, rotor wing, and ground transport, for later documentation.

## Language

**Case**:
A single job the user is working, from start to close; every Entry belongs to exactly one Case. A Case starts with the first Entry saved while no Case is open, and closes when the user chooses New Case.
_Avoid_: Mission, trip, job, run

**Active Case**:
The one open Case that new Entries are saved into.

**Stale Case**:
An Active Case with no Entry in the last 4 hours; saving into it first asks whether to start a new Case.

**Case Time Zone**:
The time zone in effect on the device when the Case was started; all Entries in the Case are displayed in it, regardless of where the user is now. The user may correct it afterwards.
_Avoid_: Home time zone, local time

**Entry**:
One recorded moment in a Case: a Timestamp plus an Operation, a free-text Note, or both (at least one is required).
_Avoid_: Log, record, stamp

**Operation**:
A predefined name for a common movement phase, chosen from a list (e.g. Arrive Airport 1, Depart Sending, Handoff). The app does not track which asset an Operation refers to; that is the user's concern.
_Avoid_: Event, phase, action

**Note**:
Free text the user types on an Entry, used alone or alongside an Operation.

**Sending / Receiving**:
The location the movement starts from and the location it ends at.

**Airport 1 / Airport 2**:
The first and second airports used in a Case, in the order they are reached.

**Late Entry**:
An Entry added afterwards from the review page with a hand-entered Timestamp; marked like an Edited Entry because it was not captured live. Labelled "Added" in the app.

**Past Case**:
Any Case that is no longer the Active Case; still viewable, editable, and deletable.

**Case Log**:
All Entries of a Case in time order, shown on the review page for the user to copy into their documentation by hand.

**Timestamp**:
The instant an Entry occurred, shown as date, time, and Case Time Zone.

**Original Timestamp**:
The instant Save was pressed; kept unchanged even if the Entry's Timestamp is later corrected.

**Edited Entry**:
An Entry whose Timestamp or content was changed after saving; it is visibly marked and retains its Original Timestamp.
