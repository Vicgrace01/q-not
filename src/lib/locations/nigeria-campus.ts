/**
 * Q-not Nigeria location directory.
 * State overview coordinates are from Open Admin Data (CC BY 4.0):
 * https://openadmindata.org/ng/states/
 * They are administrative-area reference points, not terminals, pickup points,
 * state capitals, route geometry, or evidence of Q-not operating coverage.
 * UNN campus centre: Mapcarta / OpenStreetMap feature way 883433720.
 * https://mapcarta.com/30719516
 */
export type NigeriaStateLocation = {
  value: string;
  label: string;
  latitude: number;
  longitude: number;
};

export const UNN_NSUKKA_CENTER: [number, number] = [6.86509, 7.40842];
export const UNN_NSUKKA_ZOOM = 15;

export const NIGERIAN_STATE_LOCATIONS: readonly NigeriaStateLocation[] = [
  { value: "Abia", label: "Abia", latitude: 5.432, longitude: 7.488 },
  { value: "Adamawa", label: "Adamawa", latitude: 9.163, longitude: 12.292 },
  { value: "Akwa Ibom", label: "Akwa Ibom", latitude: 4.99, longitude: 7.796 },
  { value: "Anambra", label: "Anambra", latitude: 6.249, longitude: 6.938 },
  { value: "Bauchi", label: "Bauchi", latitude: 10.998, longitude: 9.326 },
  { value: "Bayelsa", label: "Bayelsa", latitude: 4.827, longitude: 5.951 },
  { value: "Benue", label: "Benue", latitude: 7.301, longitude: 8.812 },
  { value: "Borno", label: "Borno", latitude: 11.87, longitude: 13.428 },
  { value: "Cross River", label: "Cross River", latitude: 5.791, longitude: 8.403 },
  { value: "Delta", label: "Delta", latitude: 5.757, longitude: 5.5 },
  { value: "Ebonyi", label: "Ebonyi", latitude: 6.24, longitude: 8.067 },
  { value: "Edo", label: "Edo", latitude: 6.665, longitude: 5.874 },
  { value: "Ekiti", label: "Ekiti", latitude: 7.695, longitude: 5.298 },
  { value: "Enugu", label: "Enugu", latitude: 6.52, longitude: 7.393 },
  { value: "FCT", label: "Federal Capital Territory (Abuja)", latitude: 9.013, longitude: 7.191 },
  { value: "Gombe", label: "Gombe", latitude: 10.431, longitude: 11.225 },
  { value: "Imo", label: "Imo", latitude: 5.566, longitude: 7.033 },
  { value: "Jigawa", label: "Jigawa", latitude: 11.981, longitude: 9.625 },
  { value: "Kaduna", label: "Kaduna", latitude: 10.257, longitude: 7.859 },
  { value: "Kano", label: "Kano", latitude: 11.573, longitude: 8.543 },
  { value: "Katsina", label: "Katsina", latitude: 12.236, longitude: 7.5 },
  { value: "Kebbi", label: "Kebbi", latitude: 11.691, longitude: 3.966 },
  { value: "Kogi", label: "Kogi", latitude: 7.636, longitude: 6.849 },
  { value: "Kwara", label: "Kwara", latitude: 9.093, longitude: 4.567 },
  { value: "Lagos", label: "Lagos", latitude: 6.535, longitude: 3.712 },
  { value: "Nasarawa", label: "Nasarawa", latitude: 8.589, longitude: 8.211 },
  { value: "Niger", label: "Niger", latitude: 9.774, longitude: 5.711 },
  { value: "Ogun", label: "Ogun", latitude: 7.127, longitude: 3.263 },
  { value: "Ondo", label: "Ondo", latitude: 6.824, longitude: 4.869 },
  { value: "Osun", label: "Osun", latitude: 7.538, longitude: 4.521 },
  { value: "Oyo", label: "Oyo", latitude: 8.135, longitude: 3.613 },
  { value: "Plateau", label: "Plateau", latitude: 9.38, longitude: 9.628 },
  { value: "Rivers", label: "Rivers", latitude: 5.023, longitude: 6.836 },
  { value: "Sokoto", label: "Sokoto", latitude: 12.739, longitude: 5.237 },
  { value: "Taraba", label: "Taraba", latitude: 8.059, longitude: 10.386 },
  { value: "Yobe", label: "Yobe", latitude: 11.974, longitude: 11.524 },
  { value: "Zamfara", label: "Zamfara", latitude: 12.013, longitude: 6.051 },
] as const;

export function getNigeriaStateLocation(value: string): NigeriaStateLocation | undefined {
  return NIGERIAN_STATE_LOCATIONS.find((state) => state.value === value);
}