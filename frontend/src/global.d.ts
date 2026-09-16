// Type declaration for @countrystatecity/countries-browser which ships without bundled TypeScript types.
declare module '@countrystatecity/countries-browser' {
  export interface ICountry {
    name: string;
    iso2: string;
    [key: string]: any;
  }
  export interface IState {
    name: string;
    iso2: string;
    [key: string]: any;
  }
  export interface ICity {
    name: string;
    [key: string]: any;
  }
  export function getCountries(): Promise<ICountry[]>;
  export function getStatesOfCountry(countryCode: string): Promise<IState[]>;
  export function getCitiesOfState(countryCode: string, stateCode: string): Promise<ICity[]>;
}
