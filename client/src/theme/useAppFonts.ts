import { useFonts } from 'expo-font';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  CormorantGaramond_500Medium_Italic
} from '@expo-google-fonts/cormorant-garamond';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold
} from '@expo-google-fonts/playfair-display';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';

export function useAppFonts() {
  const [loaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_500Medium_Italic,
    GreatVibes_400Regular
  });
  return loaded;
};
