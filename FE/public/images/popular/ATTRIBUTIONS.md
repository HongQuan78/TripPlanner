# Popular-city tile photographs

The six images in this directory back the popular-search tiles on the landing page
(`FE/src/features/destinations/popularCities.ts`). Every one requires attribution
(`attributionRequired: true` in the Wikimedia Commons metadata), which is rendered on the
landing page itself beneath the tile rail — see `.railCredit` in `SearchPage.module.css`.

Each file was downloaded from Wikimedia Commons via `Special:FilePath/<file>?width=640`
on 2026-07-30, so these are resized derivatives of the originals rather than byte-identical
copies. Four of the six are share-alike licensed: a further derivative of those four must
carry the same licence. The images are vendored rather than hotlinked so the landing page has
no cross-origin subresources and cannot silently degrade if a Commons file is renamed or
removed.

| File | City | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `danang.jpg` | Đà Nẵng | Somerset999 | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [Dragon Bridge, Da Nang during day - 20230819 (cropped).jpg](https://commons.wikimedia.org/wiki/File:Dragon_Bridge,_Da_Nang_during_day_-_20230819_(cropped).jpg) |
| `paris.jpg` | Paris | Yann Caradec | [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0) | [La Tour Eiffel vue de la Tour Saint-Jacques, Paris août 2014 (2).jpg](https://commons.wikimedia.org/wiki/File:La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques,_Paris_ao%C3%BBt_2014_(2).jpg) |
| `tokyo.jpg` | Tokyo | Morio | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Skyscrapers of Shinjuku 2009 January.jpg](https://commons.wikimedia.org/wiki/File:Skyscrapers_of_Shinjuku_2009_January.jpg) |
| `rome.jpg` | Rome | Diliff | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) | [Trevi Fountain, Rome, Italy 2 - May 2007.jpg](https://commons.wikimedia.org/wiki/File:Trevi_Fountain,_Rome,_Italy_2_-_May_2007.jpg) |
| `barcelona.jpg` | Barcelona | M McBey | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Evening light over Barcelona.jpg](https://commons.wikimedia.org/wiki/File:Evening_light_over_Barcelona.jpg) |
| `newyork.jpg` | New York | Dllu | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0) | [View of Empire State Building from Rockefeller Center New York City dllu (cropped).jpg](https://commons.wikimedia.org/wiki/File:View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_(cropped).jpg) |

## Adding or replacing a tile image

1. Pick a Commons file whose licence permits reuse, and confirm its author and licence from
   the file page rather than from a search result.
2. Download it at display size: `curl -L -o <slug>.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/<File name>?width=640"`.
   Commons rate-limits bursts with HTTP 429 and `curl` will happily save the error page as
   `<slug>.jpg`, so verify the result is a real JPEG (`head -c2 <slug>.jpg | od -An -tx1`
   must be `ffd8`) before committing.
3. Add the `credit` block in `popularCities.ts` and a row in this table. A `null` credit is
   supported by the type and simply omits that image from the on-page notice — use it only
   for genuinely public-domain or self-produced images.
