# Third-party data — PhysioNet/CinC Challenge 2019

This directory documents the licence of the **only third-party dataset**
redistributed in this repository.

## What is redistributed

Two files in the parent directory contain data extracted from the
PhysioNet/Computing in Cardiology Challenge 2019 training set:

| File | Content |
|---|---|
| `../cohort.ts` | 800 patients, one aggregated row each (median of the first 6 hours), 10 of the 41 source columns |
| `../hourly-records.ts` | 2 complete hourly records (`p000265`, `p000390`), 9 of the 41 source columns |

Everything else in the module (simulated trajectories in `record.ts`, the
trained model, the course text) is our own work.

## Licence

The source files are distributed by PhysioNet under the
**ODC Open Database License (ODbL) v1.0** — see
[`LICENSE-physionet-challenge-2019.txt`](./LICENSE-physionet-challenge-2019.txt),
copied verbatim from
<https://physionet.org/files/challenge-2019/1.0.0/LICENSE.txt>.

Note a discrepancy worth knowing about: the project **landing page**
(<https://physionet.org/content/challenge-2019/1.0.0/>) states
"Creative Commons Attribution 4.0 International Public License", while the
`LICENSE.txt` shipped alongside the data files is the ODbL. The two are not
equivalent — the ODbL adds a share-alike obligation on derivative databases
that CC BY does not have. **We comply with the ODbL**, the stricter of the two,
so that our use is valid under either reading.

## How we comply

- **§4.2 Notices** — the full licence text is included here, and both data
  files carry a header naming the source, the DOI and the licence.
- **§4.3 Produced Work notice** — the site itself displays, next to the
  timeline, a visible notice naming the database with a hyperlink to it.
- **§4.4 Share alike** — `cohort.ts` and `hourly-records.ts` are Derivative
  Databases and are made available under the ODbL, not under the repository's
  MIT or CC BY-SA licences. See the note in the root `LICENSE-CONTENT`.

## Required citations

> Reyna MA, Josef CS, Jeter R, Shashikumar SP, Westover MB, Nemati S,
> Clifford GD, Sharma A. Early Prediction of Sepsis From Clinical Data: The
> PhysioNet/Computing in Cardiology Challenge 2019.
> *Critical Care Medicine* 2020; 48(2): 210–217.

> Reyna, M., Josef, C., Jeter, R., Shashikumar, S., Moody, B., Westover, M. B.,
> Sharma, A., Nemati, S., & Clifford, G. D. (2019). Early Prediction of Sepsis
> from Clinical Data: The PhysioNet/Computing in Cardiology Challenge 2019
> (version 1.0.0). PhysioNet. RRID:SCR_007345.

> Goldberger AL, Amaral LAN, Glass L, Hausdorff JM, Ivanov PCh, Mark RG,
> Mietus JE, Moody GB, Peng C-K, Stanley HE. PhysioBank, PhysioToolkit, and
> PhysioNet: Components of a New Research Resource for Complex Physiologic
> Signals. *Circulation* 2000; 101(23): e215–e220.

## On publishing this data

The source data is **openly downloadable without registration or a data use
agreement**, is de-identified, and its redistribution is expressly permitted by
the licence provided the conditions above are met. Republishing this extract in
a public repository is therefore within the terms.
