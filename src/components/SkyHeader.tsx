/**
 * Bannière d'accueil — refaite d'après la première maquette.
 *
 * La v1 posait ici une photo de CIEL BLEU (`assets/sky.png`), vestige d'une
 * direction artistique antérieure : sur la palette forêt, elle jurait
 * franchement, et son fond codé en dur (#F6F8F7) ne correspondait même plus au
 * fond de l'application, ce qui laissait une couture visible au raccord.
 *
 * Le modèle met à la place une canopée sombre, et fait flotter dessus une
 * pastille de verre portant LE chiffre du moment. C'est ce qui est repris ici :
 * un dégradé forêt (aucune photo à charger, donc aucun temps d'affichage), la
 * pastille de verre, et le nom en blanc.
 *
 * Le nom du composant est conservé : les écrans qui l'importent n'ont pas à
 * changer.
 */
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fontSize, fontWeight, spacing } from '../theme';
import { initials } from '../utils/format';

interface Props {
  prenom?: string | null;
  nom?: string | null;
  height?: number;
  /** Chiffre affiché dans la pastille de verre (loyer du mois, solde…). */
  figure?: string;
  /** Libellé sous ce chiffre. */
  figureLabel?: string;
}

export function SkyHeader({ prenom, nom, height = 210, figure, figureLabel }: Props) {
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 44);
  const total = height + safeTop;

  return (
    <View style={[styles.wrap, { height: total }]}>
      <LinearGradient
        colors={['#046A63', '#00887F', '#3FA9A0']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Raccord vers le décor. Il visait `colors.bgApp` — devenu TRANSPARENT
          depuis que le décor est peint en amont : les deux extrémités du fondu
          étaient alors transparentes, si bien qu'il ne fondait plus rien et
          laissait une arête franche au bas du bandeau. On vise donc la teinte
          haute du décor, seule valeur qui referme réellement le raccord. */}
      <LinearGradient
        colors={['rgba(247,243,237,0)', '#F7F3ED']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomFade}
      />

      <View style={[styles.rangee, { top: safeTop + 10 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetters}>{initials(prenom, nom)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Bonjour,</Text>
          <Text style={styles.name} numberOfLines={2}>
            {prenom ?? ''} {nom ?? ''}
          </Text>
        </View>
        {figure ? (
          <BlurView intensity={26} tint="light" style={styles.pastille}>
            <View style={styles.pastilleFond}>
              <Text style={styles.figure} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {figure}
              </Text>
              {figureLabel ? <Text style={styles.figureLabel} numberOfLines={1}>{figureLabel}</Text> : null}
            </View>
          </BlurView>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', overflow: 'hidden', position: 'relative' },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },

  // Cercle de verre du modèle, décalé à droite pour laisser respirer le nom.
  pastille: { width: 92, height: 92, borderRadius: 46, overflow: 'hidden' },
  pastilleFond: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: 46,
  },
  figure: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  figureLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textAlign: 'center',
  },

  rangee: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // Blanc franc, et non le jeton devenu translucide : sur le vert profond du
    // bandeau, une pastille translucide virait au gris et perdait son relief.
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#313A39',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarLetters: { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  hello: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.85)', fontWeight: fontWeight.medium },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#FFFFFF' },
});
