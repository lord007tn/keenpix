# Pipeline width validation evidence

These screenshots render the actual PipelineSettings component and production stylesheet at 320 × 900 and 1440 × 900. The fixture uses a synthetic project and stubs the server function and router invalidation; it is local UI evidence, not production acceptance.

Both views show an invalid negative width, an associated inline error, and disabled Save. No document overflow was observed. Correcting the width to 1000 removed the error; Tab focused the enabled Save button and Enter submitted the synthetic project ID and maxWidth 1000 to the stub. Component regressions also verify negative, fractional and over-limit rejection, blank/zero clearing, the valid upper boundary, and existing project-switch isolation. There is no motion to demonstrate; screenshots and the keyboard interaction checks cover the changed behavior.
