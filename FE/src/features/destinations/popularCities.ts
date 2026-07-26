export interface PopularCity {
  name: string;
  imageUrl: string | null;
}

const COMMONS_FILE_PATH = 'https://commons.wikimedia.org/wiki/Special:FilePath';

export const POPULAR_CITIES: readonly PopularCity[] = [
  {
    name: 'Đà Nẵng',
    imageUrl: `${COMMONS_FILE_PATH}/Dragon_Bridge%2C_Da_Nang_during_day_-_20230819_%28cropped%29.jpg?width=640`,
  },
  {
    name: 'Paris',
    imageUrl: `${COMMONS_FILE_PATH}/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg?width=640`,
  },
  {
    name: 'Tokyo',
    imageUrl: `${COMMONS_FILE_PATH}/Skyscrapers_of_Shinjuku_2009_January.jpg?width=640`,
  },
  {
    name: 'Rome',
    imageUrl: `${COMMONS_FILE_PATH}/Trevi_Fountain%2C_Rome%2C_Italy_2_-_May_2007.jpg?width=640`,
  },
  {
    name: 'Barcelona',
    imageUrl: `${COMMONS_FILE_PATH}/Evening_light_over_Barcelona.jpg?width=640`,
  },
  {
    name: 'New York',
    imageUrl: `${COMMONS_FILE_PATH}/View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%28cropped%29.jpg?width=640`,
  },
];
