/**
 * Avatar utilisateur cliquable avec édition de photo (camera/galerie/retirer).
 *
 * - Affiche la photo si user.avatar (data URL) présent, sinon les initiales sur fond brand
 * - Tap → propose 3 actions via Alert : Modifier / Retirer / Annuler
 *   (le "Modifier" déclenche un second Alert pour choisir caméra ou galerie)
 */
import { Camera } from 'lucide-react-native';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../auth/store';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { colors, fontSize, fontWeight, shadow } from '../theme';
import { initials } from '../utils/format';

interface Props {
  size?: number;
}

export function ProfileAvatar({ size = 96 }: Props) {
  const user = useAuth((s) => s.user);
  const { open, remove, busy } = useAvatarUpload();

  const onPress = () => {
    if (busy) return;
    if (user?.avatar) {
      Alert.alert(
        'Photo de profil',
        undefined,
        [
          { text: 'Modifier', onPress: open },
          { text: 'Retirer', style: 'destructive', onPress: remove },
          { text: 'Annuler', style: 'cancel' },
        ],
      );
    } else {
      open();
    }
  };

  const fontPx = Math.max(16, Math.round(size * 0.36));

  return (
    <Pressable onPress={onPress} disabled={busy}>
      <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />
        ) : (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.letters, { fontSize: fontPx }]}>{initials(user?.prenom, user?.nom)}</Text>
          </View>
        )}
        {/* Petit bouton caméra en bas à droite */}
        <View style={[styles.cameraBadge, { right: size * 0.04, bottom: size * 0.04 }]}>
          {busy ? <ActivityIndicator color={colors.textInverse} size="small" /> : <Camera size={14} color={colors.textInverse} />}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    backgroundColor: colors.primary,
    ...shadow.card,
  },
  img: { resizeMode: 'cover' },
  fallback: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  letters: { color: colors.textInverse, fontWeight: fontWeight.bold },
  cameraBadge: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bgCard,
  },
});
