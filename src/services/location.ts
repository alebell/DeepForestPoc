import Geolocation from '@react-native-community/geolocation';

type LocationOptions = {
  highAccuracy?: boolean;
  timeoutMs?: number;
  maximumAgeMs?: number;
};

export const getCurrentLocation = (
  options: LocationOptions = {},
): Promise<any> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => resolve(position),
      error => reject(error),
      {
        enableHighAccuracy: options.highAccuracy ?? true,
        timeout: options.timeoutMs ?? 5000,
        maximumAge: options.maximumAgeMs ?? 0,
      },
    );
  });
};
