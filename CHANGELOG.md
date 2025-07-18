## 0.7.0 [2025-06-17]
- Added dark mode support and improved the Settings UI
- Fixed edge cases in "collapse" mode
- Improved prefix handling even when Ext tags are not tidied

## 0.6.0 [2025-06-12]
- Changed the default prefix option to "overwrite"
- Added user-configurable prefix substitutes
- Added reset buttons for all input fields
- Redesigned Settings UI
- Tags and prefixes are now handled more reliably

## 0.5.0 [2025-05-28]
- Added user-configurable prefixes

## 0.4.0 [2025-05-28]
- Fixed edge cases where "ext" appears as part of a word (e.g., *next* is no longer affected)
- Subject cleanup now occurs when composing (e.g., on reply/forward), not when sending
- Added an action popup menu accessible from the toolbar
- Prefix counters are now incremented correctly when collapsing (e.g., Re: Re\*3: $\rightarrow$ Re\*4:)

## 0.3.0 [2025-05-23]
- Added a settings page with user-configurable options and custom tag input

## 0.2.0 [2025-05-22]
- Added support for removing outdated "extern" tags (e.g., [EXT], EXTERN, EXTERNAL)
- Added collapsing of common prefixes chronologically (e.g., Re, Fwd, Aw, Antw $\rightarrow$ Re: Fwd: Re\*2)
