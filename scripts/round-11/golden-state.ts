/** Round 11: prints the wizard state of the first golden case as JSON (for screenshots of /results). Fixture data only. */
import { GOLDEN_CASES } from '../../tests/lib/golden';
import { buildWizardState } from '../../tests/lib/fixtures';
const spec = GOLDEN_CASES[0];
const st = buildWizardState(spec);
process.stdout.write(JSON.stringify({ id: spec.id, state: st }));
