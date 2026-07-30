export interface PopularCityCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
}

export interface PopularCity {
  name: string;
  imageUrl: string | null;
  credit: PopularCityCredit | null;
}

const COMMONS_FILE = 'https://commons.wikimedia.org/wiki/File';

export const POPULAR_CITIES: readonly PopularCity[] = [
  {
    name: 'Đà Nẵng',
    imageUrl: '/images/popular/danang.jpg',
    credit: {
      author: 'Somerset999',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: `${COMMONS_FILE}:Dragon_Bridge,_Da_Nang_during_day_-_20230819_(cropped).jpg`,
    },
  },
  {
    name: 'Paris',
    imageUrl: '/images/popular/paris.jpg',
    credit: {
      author: 'Yann Caradec',
      license: 'CC BY-SA 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0',
      sourceUrl: `${COMMONS_FILE}:La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques,_Paris_ao%C3%BBt_2014_(2).jpg`,
    },
  },
  {
    name: 'Tokyo',
    imageUrl: '/images/popular/tokyo.jpg',
    credit: {
      author: 'Morio',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
      sourceUrl: `${COMMONS_FILE}:Skyscrapers_of_Shinjuku_2009_January.jpg`,
    },
  },
  {
    name: 'Rome',
    imageUrl: '/images/popular/rome.jpg',
    credit: {
      author: 'Diliff',
      license: 'CC BY 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
      sourceUrl: `${COMMONS_FILE}:Trevi_Fountain,_Rome,_Italy_2_-_May_2007.jpg`,
    },
  },
  {
    name: 'Barcelona',
    imageUrl: '/images/popular/barcelona.jpg',
    credit: {
      author: 'M McBey',
      license: 'CC BY 2.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/2.0',
      sourceUrl: `${COMMONS_FILE}:Evening_light_over_Barcelona.jpg`,
    },
  },
  {
    name: 'New York',
    imageUrl: '/images/popular/newyork.jpg',
    credit: {
      author: 'Dllu',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      sourceUrl: `${COMMONS_FILE}:View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_(cropped).jpg`,
    },
  },
];
