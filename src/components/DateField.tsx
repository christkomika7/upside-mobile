/**
 * Saisie de date au format JJ/MM/AAAA — masque appliqué à la volée, garde la
 * valeur affichée en FR et expose un helper de conversion vers ISO YYYY-MM-DD
 * pour l'envoi à l'API.
 *
 * Usage type :
 *   <DateField label="Du" value={from} onChangeText={setFrom} />
 *   // au moment d'envoyer à l'API : frToIso(from)
 */
import { TextField } from './TextField';
import { maskDateFr } from '../utils/format';

interface Props {
  label?: string;
  value: string;             // Valeur affichée en format FR (JJ/MM/AAAA ou partiel)
  onChangeText: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function DateField({ label, value, onChangeText, placeholder = 'JJ/MM/AAAA', editable }: Props) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(raw) => onChangeText(maskDateFr(raw))}
      placeholder={placeholder}
      keyboardType="number-pad"
      inputMode="numeric"
      maxLength={10}
      autoCapitalize="none"
      autoCorrect={false}
      editable={editable}
    />
  );
}
