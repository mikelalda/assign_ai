# JavaScript unit tests

Jest tests of the AMD modules in `amd/src`, run in a simulated browser (jsdom).

- The modules of this plugin are loaded from `amd/src` as they are.
- Moodle's modules (`core/ajax`, `core/str`, `core/modal`...) are replaced by the
  small fakes in `mocks/`.
- `core/templates` renders this plugin's real Mustache templates, so the tests
  work on the same markup as the site. `{{#str}}` prints the string identifier
  in brackets, for example `[addactivityai]`.
- The web services answer what each test sets with `setResponses()` from
  `core/ajax`.

Run them with Node 18 or later:

```bash
cd tests/jsunit
npm ci
npm test
```
