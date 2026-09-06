# Control-height verification

Before screenshots show the production analytics toolbar with a synthetic project. The date fieldset measured 54px while Filters, chip/remove, Clear and Export measured 44px.

After screenshots use a local fixture importing the actual shared components and application stylesheet. The fixture contains synthetic data only; Arabic labels and RTL direction test layout robustness, not an available Arabic product locale.

Measured at 1440, 390 and 320px viewport widths in LTR and RTL:
- Large reporting controls and icon actions: 44px.
- Single-line date fieldset: 44px including its decoration.
- At 320px the date choices wrap into two 44px rows with a 4px gap (92px outer group), without clipping or shrinking touch targets.
- Default form/input/select/action peers: 36px.
- Compact controls: 32px.
- Document width equals scroll width in all six states.

The custom-date popup uses Base UI available-space dimensions. At 320px RTL it measured x5, y328, width295, height511; Apply ended at827 in an844px viewport. At390px it ended at839. Escape returned focus to the trigger. The filter menu stayed inside the viewport. Screenshots use normal viewport captures because full-page capture with Windows scrollbars can crop RTL content.

Validation: pnpm health passed, including529 app tests across114 files. React Doctor's blocking check passed with354 existing warnings. Independent source review found no blockers. This is local component verification; deployed application acceptance is a separate release check. Static screenshots and recorded geometry cover this layout change; no motion behavior changed.
